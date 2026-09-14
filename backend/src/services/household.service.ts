import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { setHouseholdHead } from './member.service';
import { page } from '../lib/respond';
import { retireRecord } from '../lib/archive';
import type { RetireReason } from '../schemas/common';
import type { CreateHouseholdInput, LinkMemberInput, ListHouseholdsQuery, UpdateHouseholdInput } from '../schemas/household.schema';

const householdInclude = {
  members: {
    select: { id: true, memberId: true, firstName: true, lastName: true, initials: true, householdRole: true, isHouseholdHead: true, phone: true },
    orderBy: [{ isHouseholdHead: 'desc' }, { firstName: 'asc' }],
  },
} satisfies Prisma.HouseholdInclude;

export async function listHouseholds(query: ListHouseholdsQuery) {
  const where: Prisma.HouseholdWhereInput = {
    deletedAt: null,
    ...(query.location ? { location: query.location } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { unitNumber: { contains: query.q, mode: 'insensitive' } },
            { address: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.household.count({ where }),
    prisma.household.findMany({
      where,
      include: { _count: { select: { members: true } } },
      orderBy: { unitNumber: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, meta: page(total, query) };
}

export async function getHousehold(id: string) {
  const household = await prisma.household.findFirst({ where: { id, deletedAt: null }, include: householdInclude });
  if (!household) throw new AppError(404, 'That household does not exist', 'not_found');
  return household;
}

export async function createHousehold(input: CreateHouseholdInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const household = await tx.household.create({ data: input, include: householdInclude });
    await tx.auditLog.create({
      data: { actorId, action: 'create', entityName: 'Household', entityId: household.id, summary: `Created ${household.name} (${household.unitNumber})` },
    });
    return household;
  });
}

export async function updateHousehold(id: string, input: UpdateHouseholdInput, actorId: string) {
  const before = await prisma.household.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw new AppError(404, 'That household does not exist', 'not_found');

  return prisma.$transaction(async (tx) => {
    const household = await tx.household.update({ where: { id }, data: input, include: householdInclude });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Household',
        entityId: id,
        summary: `Updated ${household.name}`,
        before: { name: before.name, address: before.address },
        after: { name: household.name, address: household.address },
      },
    });
    return household;
  });
}

/**
 * Attach a member to a household.
 *
 * A member belongs to one household at a time — moving them is a move, not an addition — so the
 * member's `householdId` is simply set. `makeHead` then routes through the same head-of-household
 * rule used everywhere else, rather than a second implementation of it.
 */
export async function linkMember(householdId: string, input: LinkMemberInput, actorId: string) {
  const [household, member] = await Promise.all([
    prisma.household.findFirst({ where: { id: householdId, deletedAt: null } }),
    prisma.member.findFirst({ where: { id: input.memberId, deletedAt: null } }),
  ]);
  if (!household) throw new AppError(404, 'That household does not exist', 'not_found');
  if (!member) throw new AppError(404, 'That member is not on the register', 'not_found');

  await prisma.$transaction(async (tx) => {
    await tx.member.update({
      where: { id: member.id },
      data: { householdId, householdRole: input.makeHead ? 'Head' : input.householdRole },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Household',
        entityId: householdId,
        summary: `Linked ${member.firstName} ${member.lastName} to ${household.name}`,
        before: { householdId: member.householdId },
        after: { householdId },
      },
    });
  });

  if (input.makeHead) await setHouseholdHead(householdId, member.id);
  return getHousehold(householdId);
}

/** Move headship to one of this household's members. Refuses anyone who is not in it. */
export async function setHead(householdId: string, memberId: string, actorId: string) {
  const household = await prisma.household.findFirst({ where: { id: householdId, deletedAt: null } });
  if (!household) throw new AppError(404, 'That household does not exist', 'not_found');

  const member = await prisma.member.findFirst({ where: { id: memberId, householdId, deletedAt: null } });
  if (!member) throw new AppError(400, 'That member is not part of this household', 'not_in_household');

  await setHouseholdHead(householdId, member.id);
  await prisma.auditLog.create({
    data: {
      actorId,
      action: 'update',
      entityName: 'Household',
      entityId: householdId,
      summary: `${member.firstName} ${member.lastName} is now head of ${household.name}`,
    },
  });
  return getHousehold(householdId);
}

export async function unlinkMember(householdId: string, memberId: string, actorId: string) {
  const member = await prisma.member.findFirst({ where: { id: memberId, householdId, deletedAt: null } });
  if (!member) throw new AppError(404, 'That member is not part of this household', 'not_found');

  await prisma.$transaction(async (tx) => {
    await tx.member.update({ where: { id: memberId }, data: { householdId: null, isHouseholdHead: false, householdRole: null } });
    await tx.auditLog.create({
      data: { actorId, action: 'update', entityName: 'Household', entityId: householdId, summary: `Unlinked ${member.firstName} ${member.lastName}` },
    });
  });
  return getHousehold(householdId);
}

/**
 * Retire a household only once nobody is in it.
 *
 * Retiring it with members attached would leave living people pointing at a household the register
 * no longer shows — either they move first, or the household stays.
 */
export async function retireHousehold(id: string, input: RetireReason, actorId: string) {
  // Read for the count, not for existence: a household with people still in it stays, and that is a
  // rule about households rather than about retiring. The archive module re-reads the row itself, so
  // a household emptied a moment ago is still handled correctly.
  const household = await prisma.household.findFirst({
    where: { id, deletedAt: null },
    include: { _count: { select: { members: { where: { deletedAt: null } } } } },
  });
  if (!household) throw new AppError(404, 'That household does not exist', 'not_found');
  if (household._count.members > 0) {
    throw new AppError(409, `Move the ${household._count.members} member(s) out of this household first`, 'household_not_empty');
  }

  return retireRecord('Household', id, {
    ...input,
    actorId,
    missing: 'That household does not exist',
    label: (row) => String(row.name),
  });
}
