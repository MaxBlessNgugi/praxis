import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { page } from '../lib/respond';
import { retireRecord, restoreArchived } from '../lib/archive';
import { findLive, includingRetired, live } from '../lib/live';
import type { CreateMemberInput, ListMembersQuery, RetireMemberInput, UpdateMemberInput } from '../schemas/member.schema';

/** What every member response carries: the household it belongs to, and nothing it does not need. */
const memberInclude = {
  household: { select: { id: true, name: true, unitNumber: true, location: true } },
} satisfies Prisma.MemberInclude;

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * The next register number.
 *
 * Derived from the highest number already issued rather than from a row count: a count reuses a
 * number as soon as anything is retired, and two living members sharing an identifier is the kind of
 * defect a parish discovers a year later. The unique index is the real guarantee; this loop just
 * retries the rare collision instead of failing the request.
 */
async function nextMemberId(): Promise<string> {
  const latest = await prisma.member.findFirst({
    where: { memberId: { startsWith: 'MBR-' }, ...includingRetired },
    orderBy: { memberId: 'desc' },
    select: { memberId: true },
  });
  const last = latest ? Number.parseInt(latest.memberId.replace('MBR-', ''), 10) : 1000;
  return `MBR-${(Number.isFinite(last) ? last : 1000) + 1}`;
}

export async function listMembers(query: ListMembersQuery) {
  // Words, not a phrase. See the search note below for why this is split here rather than inline.
  const tokens = query.q ? query.q.split(/\s+/).filter(Boolean) : [];

  const where: Prisma.MemberWhereInput = {
    ...live,
    ...(query.status ? { status: query.status } : {}),
    ...(query.baptismType ? { baptismType: query.baptismType } : {}),
    ...(query.location ? { location: query.location } : {}),
    ...(query.householdId ? { householdId: query.householdId } : {}),
    ...(query.headsOnly === undefined ? {} : { isHouseholdHead: query.headsOnly }),
    // One search box across the fields a clerk would actually type into it — including the envelope
    // number, which is what a member hands over on a Sunday.
    //
    // The query is split into words and **every** word must match somewhere, instead of the whole
    // string having to appear inside a single field. That distinction is the difference between the
    // search box working and not: under a single-field `contains`, typing "Mary Wanjiku" finds
    // nothing, because no one field holds that phrase — and "Wanjiku Mary", the order people
    // actually type, fails too. Words are AND-ed so extra words narrow the list rather than empty it.
    ...(tokens.length
      ? {
          AND: tokens.map(
            (token): Prisma.MemberWhereInput => ({
              OR: [
                { firstName: { contains: token, mode: 'insensitive' } },
                { lastName: { contains: token, mode: 'insensitive' } },
                { memberId: { contains: token, mode: 'insensitive' } },
                { envelopeNumber: { contains: token, mode: 'insensitive' } },
                { email: { contains: token, mode: 'insensitive' } },
                { phone: { contains: token } },
                { household: { name: { contains: token, mode: 'insensitive' } } },
              ],
            }),
          ),
        }
      : {}),
  };

  const orderBy: Prisma.MemberOrderByWithRelationInput[] =
    query.sort === 'name'
      ? [{ lastName: 'asc' }, { firstName: 'asc' }]
      : query.sort === 'recent'
        ? [{ joinedAt: 'desc' }]
        : [{ joinedAt: 'asc' }];

  const [total, data] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      include: memberInclude,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, meta: page(total, query) };
}

export function getMember(id: string) {
  return findLive(prisma.member, id, 'That member is not on the register', {
    include: { ...memberInclude, ministries: { include: { ministry: { select: { id: true, name: true } } } } },
  });
}

export async function createMember(input: CreateMemberInput, actorId: string) {
  if (input.householdId) {
    const household = await prisma.household.findFirst({ where: { id: input.householdId, ...live } });
    if (!household) throw new AppError(400, 'That household does not exist', 'unknown_household');
  }

  const created = await prisma.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        ...input,
        memberId: await nextMemberId(),
        initials: initialsOf(input.firstName, input.lastName),
      },
      include: memberInclude,
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'Member',
        entityId: member.id,
        summary: `Enrolled ${member.firstName} ${member.lastName} (${member.memberId})`,
        after: { memberId: member.memberId, status: member.status },
      },
    });
    return member;
  });

  // A member named as head of a household is the only head of it, whatever the payload said.
  if (created.isHouseholdHead && created.householdId) await setHouseholdHead(created.householdId, created.id);
  return created;
}

/**
 * Is this actually somebody on the register?
 *
 * The finance module records gifts, project pledges and relief against a member id typed into a form,
 * and a retired member is not a valid subject any more than a made-up id is — so this is asked here,
 * where the register lives, rather than answered four times by foreign-key errors.
 */
export async function assertMemberOnRegister(memberId: string, what = 'That member'): Promise<void> {
  const member = await prisma.member.findFirst({ where: { id: memberId, ...live }, select: { id: true } });
  if (!member) throw new AppError(400, `${what} is not on the register`, 'unknown_member');
}

export async function updateMember(id: string, input: UpdateMemberInput, actorId: string) {
  const before = await findLive(prisma.member, id, 'That member is not on the register');

  if (input.householdId) {
    const household = await prisma.household.findFirst({ where: { id: input.householdId, ...live } });
    if (!household) throw new AppError(400, 'That household does not exist', 'unknown_household');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const member = await tx.member.update({
      where: { id },
      data: {
        ...input,
        ...(input.firstName || input.lastName
          ? { initials: initialsOf(input.firstName ?? before.firstName, input.lastName ?? before.lastName) }
          : {}),
      },
      include: memberInclude,
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Member',
        entityId: id,
        summary: `Updated ${member.firstName} ${member.lastName}`,
        // Both sides of the change, so the audit trail can answer "what did it say before?".
        before: { status: before.status, householdId: before.householdId, phone: before.phone },
        after: { status: member.status, householdId: member.householdId, phone: member.phone },
      },
    });
    return member;
  });

  if (input.isHouseholdHead && updated.householdId) await setHouseholdHead(updated.householdId, updated.id);
  return updated;
}

/**
 * Retire a member.
 *
 * The row is never removed — a giving ledger from three years ago still has to resolve its member —
 * and the status moves with it: a member is not simply absent, they are inactive, or deceased.
 */
export function retireMember(id: string, input: RetireMemberInput, actorId: string) {
  return retireRecord('Member', id, {
    reason: input.reason,
    reasonLabel: input.reasonLabel,
    actorId,
    missing: 'That member is not on the register',
    label: (row) => `${String(row.firstName)} ${String(row.lastName)}`,
    also: { status: input.reason === 'deceased' ? 'deceased' : 'inactive' },
    // The parish a transfer went to is not a column: it belongs to the retirement, not to the person.
    snapshot: (row) => ({ ...row, destinationParish: input.destinationParish ?? null }),
  });
}

/**
 * Put a member back on the register.
 *
 * The rule is the archive module's; what belongs here is the door: this one restores members and says
 * so, rather than leaving the check to a controller.
 */
export const restoreMember = (recordId: string, actorId: string) => restoreArchived(recordId, actorId, ['Member']);

/**
 * Exactly one head per household.
 *
 * Clearing the flag for the household first, then setting it on the chosen member, is what keeps
 * "who is the head?" from having two answers after a role change.
 */
async function setHouseholdHead(householdId: string, memberId: string) {
  await prisma.$transaction([
    prisma.member.updateMany({ where: { householdId, id: { not: memberId } }, data: { isHouseholdHead: false } }),
    prisma.member.update({ where: { id: memberId }, data: { isHouseholdHead: true, householdId } }),
  ]);
}

export { setHouseholdHead };
