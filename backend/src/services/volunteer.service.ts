import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { page } from '../lib/respond';
import type { CreateDutyInput, ListRosterQuery, RequestSwapInput, UpdateDutyInput } from '../schemas/service.schema';

const dutyInclude = {
  service: { select: { id: true, title: true, heldAt: true, venue: true } },
  holder: { select: { id: true, firstName: true, lastName: true, initials: true, phone: true } },
} satisfies Prisma.RosterDutyInclude;

export async function listRoster(query: ListRosterQuery) {
  const where: Prisma.RosterDutyWhereInput = {
    deletedAt: null,
    ...(query.serviceId ? { serviceId: query.serviceId } : {}),
    ...(query.memberId ? { memberId: query.memberId } : {}),
    ...(query.ministryId ? { ministryId: query.ministryId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? { service: { heldAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.rosterDuty.count({ where }),
    prisma.rosterDuty.findMany({
      where,
      include: dutyInclude,
      orderBy: [{ service: { heldAt: 'asc' } }, { roleTitle: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, meta: page(total, query) };
}

export async function createDuty(serviceId: string, input: CreateDutyInput, actorId: string) {
  const [service, member] = await Promise.all([
    prisma.service.findFirst({ where: { id: serviceId, deletedAt: null } }),
    prisma.member.findFirst({ where: { id: input.memberId, deletedAt: null } }),
  ]);
  if (!service) throw new AppError(404, 'That service does not exist', 'not_found');
  if (!member) throw new AppError(400, 'That volunteer is not on the register', 'unknown_member');

  return prisma.$transaction(async (tx) => {
    const duty = await tx.rosterDuty.create({ data: { ...input, serviceId }, include: dutyInclude });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'RosterDuty',
        entityId: duty.id,
        summary: `Rostered ${member.firstName} ${member.lastName} as ${duty.roleTitle} for ${service.title}`,
      },
    });
    return duty;
  });
}

export async function updateDuty(id: string, input: UpdateDutyInput, actorId: string) {
  const before = await prisma.rosterDuty.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw new AppError(404, 'That duty is not on the roster', 'not_found');

  return prisma.$transaction(async (tx) => {
    const duty = await tx.rosterDuty.update({ where: { id }, data: input, include: dutyInclude });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'RosterDuty',
        entityId: id,
        summary: `Updated ${duty.roleTitle} (${before.status} becomes ${duty.status})`,
        before: { status: before.status },
        after: { status: duty.status },
      },
    });
    return duty;
  });
}

export async function removeDuty(id: string, actorId: string) {
  const duty = await prisma.rosterDuty.findFirst({ where: { id, deletedAt: null } });
  if (!duty) throw new AppError(404, 'That duty is not on the roster', 'not_found');

  return prisma.$transaction(async (tx) => {
    await tx.rosterDuty.update({ where: { id }, data: { deletedAt: new Date(), status: 'cancelled' } });
    await tx.auditLog.create({
      data: { actorId, action: 'delete', entityName: 'RosterDuty', entityId: id, summary: `Removed ${duty.roleTitle} from the roster` },
    });
  });
}

/**
 * A volunteer asks for cover.
 *
 * Refused when the duty has already happened or is already covered, because a swap request against
 * a completed duty is a question nobody can answer — and refused when one is already open, so the
 * roster never holds two competing claims on the same slot.
 */
export async function requestSwap(dutyId: string, input: RequestSwapInput, actorId: string, requesterMemberId: string) {
  const duty = await prisma.rosterDuty.findFirst({ where: { id: dutyId, deletedAt: null }, include: { swapRequests: true } });
  if (!duty) throw new AppError(404, 'That duty is not on the roster', 'not_found');
  if (duty.memberId !== requesterMemberId) throw new AppError(403, 'Only the volunteer holding this duty can ask for cover', 'not_duty_holder');
  if (duty.status === 'completed' || duty.status === 'missed') throw new AppError(409, 'That duty has already happened', 'duty_closed');
  if (duty.swapRequests.some((request) => request.status === 'requested')) {
    throw new AppError(409, 'A swap request is already open for this duty', 'swap_open');
  }

  if (input.replacementId) {
    const replacement = await prisma.member.findFirst({ where: { id: input.replacementId, deletedAt: null } });
    if (!replacement) throw new AppError(400, 'That replacement is not on the register', 'unknown_member');
  }

  return prisma.$transaction(async (tx) => {
    const request = await tx.swapRequest.create({
      data: { dutyId, requestedById: duty.memberId, replacementId: input.replacementId ?? null, reason: input.reason },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'SwapRequest',
        entityId: request.id,
        summary: `Swap requested for ${duty.roleTitle}: ${input.reason}`,
      },
    });
    return request;
  });
}

export async function listSwaps(status: 'requested' | 'approved' | 'declined' | 'cancelled' | undefined) {
  return prisma.swapRequest.findMany({
    where: status ? { status } : {},
    include: {
      duty: { include: { service: { select: { id: true, title: true, heldAt: true } } } },
      requestedBy: { select: { id: true, firstName: true, lastName: true, initials: true } },
      replacement: { select: { id: true, firstName: true, lastName: true, initials: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Approve or decline a swap.
 *
 * Approving does two things that must not be able to half-happen: the duty changes hands and the
 * request is closed with who decided and when. Both inside one transaction, because a reassigned
 * duty with an open request is worse than either outcome alone.
 *
 * When nobody has been named as the replacement, the duty is marked `replaced` and stays against
 * its original holder. That is a deliberate second-best: a roster slot of "ushering, replaced" is a
 * visible gap somebody has to fill, whereas silently keeping the old name would hide it. It cannot
 * be cleared instead, because `RosterDuty.memberId` is required — making it nullable is the schema
 * change that would let an approved swap leave the slot genuinely unassigned.
 */
export async function decideSwap(id: string, decision: 'approved' | 'declined', note: string | undefined, actorId: string) {
  const request = await prisma.swapRequest.findUnique({ where: { id }, include: { duty: true } });
  if (!request) throw new AppError(404, 'That swap request does not exist', 'not_found');
  if (request.status !== 'requested') throw new AppError(409, `This request was already ${request.status}`, 'already_decided');

  return prisma.$transaction(async (tx) => {
    const decided = await tx.swapRequest.update({
      where: { id },
      data: { status: decision, decidedById: actorId, decidedAt: new Date(), ...(note ? { reason: note } : {}) },
    });

    if (decision === 'approved') {
      await tx.rosterDuty.update({
        where: { id: request.dutyId },
        data: request.replacementId
          ? { memberId: request.replacementId, status: 'scheduled' }
          : { status: 'replaced' },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'SwapRequest',
        entityId: id,
        summary: `${decision === 'approved' ? 'Approved' : 'Declined'} a swap for ${request.duty.roleTitle}`,
      },
    });
    return decided;
  });
}
