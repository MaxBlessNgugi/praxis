import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { assertMemberOnRegister } from './member.service';
import { page } from '../lib/respond';
import { retireRecord } from '../lib/archive';
import { findLive, includingRetired, live } from '../lib/live';
import type { RetireReason } from '../schemas/common';
import type {
  AddMinistryMemberInput,
  CreateMinistryInput,
  ListMinistriesQuery,
  RosterQuery,
  UpdateMinistryInput,
  UpdateMinistryMemberInput,
} from '../schemas/ministry.schema';

/**
 * Ministries: the groups a church runs, who leads them, and who serves on them.
 *
 * Leadership is not a separate table. A ministry has one `leaderId` — the person answerable for it —
 * while `MinistryMember.roleTitle` records what everyone else does. The console's Leadership Roles
 * and Volunteer Roles screens are the two ways of reading that one arrangement.
 */

const memberSelect = { id: true, firstName: true, lastName: true, initials: true, phone: true } as const;

const rosterInclude = {
  ministry: { select: { id: true, name: true } },
  member: { select: memberSelect },
} satisfies Prisma.MinistryMemberInclude;

export async function listMinistries(query: ListMinistriesQuery) {
  const where: Prisma.MinistryWhereInput = {
    ...live,
    ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    ...(query.leaderId ? { leaderId: query.leaderId } : {}),
    ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
  };

  const [total, data] = await Promise.all([
    prisma.ministry.count({ where }),
    prisma.ministry.findMany({
      where,
      include: {
        leader: { select: memberSelect },
        // The roll size is what the ministries screen shows beside each name.
        _count: { select: { members: { where: live } } },
      },
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, meta: page(total, query) };
}

export function getMinistry(id: string) {
  return findLive(
    {
      where: { id },
      include: {
        leader: { select: memberSelect },
        members: {
          where: live,
          include: { member: { select: memberSelect } },
          orderBy: [{ roleTitle: 'asc' }, { joinedAt: 'asc' }],
        },
      },
    },
    prisma.ministry,
    'That ministry does not exist',
  );
}

export async function createMinistry(input: CreateMinistryInput, actorId: string) {
  if (input.leaderId) await assertMemberOnRegister(input.leaderId, 'That leader');

  return prisma.$transaction(async (tx) => {
    const ministry = await tx.ministry.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        leaderId: input.leaderId ?? null,
        meetingDay: input.meetingDay ?? null,
        location: input.location ?? null,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: { actorId, action: 'create', entityName: 'Ministry', entityId: ministry.id, summary: `Started the ministry ${ministry.name}` },
    });
    return ministry;
  });
}

export async function updateMinistry(id: string, input: UpdateMinistryInput, actorId: string) {
  const before = await findLive({ where: { id } }, prisma.ministry, 'That ministry does not exist');
  if (input.leaderId) await assertMemberOnRegister(input.leaderId, 'That leader');

  return prisma.$transaction(async (tx) => {
    const ministry = await tx.ministry.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.leaderId === undefined ? {} : { leaderId: input.leaderId }),
        ...(input.meetingDay === undefined ? {} : { meetingDay: input.meetingDay }),
        ...(input.location === undefined ? {} : { location: input.location }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Ministry',
        entityId: id,
        summary: `Updated the ministry ${ministry.name}`,
        before: { name: before.name, leaderId: before.leaderId, isActive: before.isActive },
        after: { name: ministry.name, leaderId: ministry.leaderId, isActive: ministry.isActive },
      },
    });
    return ministry;
  });
}

export async function retireMinistry(id: string, input: RetireReason, actorId: string) {
  // A ministry disappears only once nobody serves on it; the alternative is living people pointing at
  // a department the screen no longer lists. Read for the count, not for existence.
  const ministry = await findLive({ where: { id } }, prisma.ministry, 'That ministry does not exist');

  const serving = await prisma.ministryMember.count({ where: { ministryId: id, ...live } });
  if (serving > 0) {
    throw new AppError(409, `${serving} member(s) still serve on ${ministry.name}; take them off the roll first`, 'ministry_has_members');
  }

  return retireRecord('Ministry', id, {
    ...input,
    actorId,
    missing: 'That ministry does not exist',
    label: (row) => String(row.name),
  });
}

// -------------------------------------------------------------------------------------------
// The roll
// -------------------------------------------------------------------------------------------

export async function addMinistryMember(ministryId: string, input: AddMinistryMemberInput, actorId: string) {
  const ministry = await findLive({ where: { id: ministryId } }, prisma.ministry, 'That ministry does not exist');
  await assertMemberOnRegister(input.memberId);

  // Retired rows too: the unique key still holds their row, so a second insert would collide.
  const existing = await prisma.ministryMember.findFirst({ where: { ministryId, memberId: input.memberId, ...includingRetired } });

  return prisma.$transaction(async (tx) => {
    // Someone who left and came back is re-rolled rather than refused: the unique key still holds
    // their row, so a second insert would collide with a record nobody can see.
    const row = existing
      ? await tx.ministryMember.update({
          where: { id: existing.id },
          data: { roleTitle: input.roleTitle, deletedAt: null },
          include: rosterInclude,
        })
      : await tx.ministryMember.create({
          data: { ministryId, memberId: input.memberId, roleTitle: input.roleTitle },
          include: rosterInclude,
        });

    await tx.auditLog.create({
      data: {
        actorId,
        action: existing ? 'update' : 'create',
        entityName: 'MinistryMember',
        entityId: row.id,
        summary: `${row.member.firstName} ${row.member.lastName} joined ${ministry.name} as ${row.roleTitle}`,
      },
    });
    return row;
  });
}

export async function updateMinistryMember(id: string, input: UpdateMinistryMemberInput, actorId: string) {
  const before = await findLive({ where: { id }, include: rosterInclude }, prisma.ministryMember, 'That member is not on this ministry roll');

  return prisma.$transaction(async (tx) => {
    const row = await tx.ministryMember.update({ where: { id }, data: { roleTitle: input.roleTitle }, include: rosterInclude });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'MinistryMember',
        entityId: id,
        summary: `${row.member.firstName} ${row.member.lastName} on ${row.ministry.name}: ${before.roleTitle} becomes ${row.roleTitle}`,
        before: { roleTitle: before.roleTitle },
        after: { roleTitle: row.roleTitle },
      },
    });
    return row;
  });
}

export async function removeMinistryMember(id: string, actorId: string) {
  const row = await findLive({ where: { id }, include: rosterInclude }, prisma.ministryMember, 'That member is not on this ministry roll');

  return prisma.$transaction(async (tx) => {
    await tx.ministryMember.update({ where: { id }, data: { deletedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'delete',
        entityName: 'MinistryMember',
        entityId: id,
        summary: `${row.member.firstName} ${row.member.lastName} left ${row.ministry.name}`,
      },
    });
  });
}

/**
 * The leadership and volunteer screens.
 *
 * `leadershipOnly` keeps the rows whose title is more than membership — anything that is not the
 * default "Member" — which is how the console separates the people who carry a role from the people
 * who turn up.
 */
export async function roster(query: RosterQuery) {
  const where: Prisma.MinistryMemberWhereInput = {
    ...live,
    ...(query.ministryId ? { ministryId: query.ministryId } : {}),
    ...(query.leadershipOnly ? { roleTitle: { not: 'Member' } } : {}),
    ...(query.q
      ? {
          OR: [
            { roleTitle: { contains: query.q, mode: 'insensitive' as const } },
            { member: { is: { OR: [{ firstName: { contains: query.q, mode: 'insensitive' as const } }, { lastName: { contains: query.q, mode: 'insensitive' as const } }] } } },
            { ministry: { is: { name: { contains: query.q, mode: 'insensitive' as const } } } },
          ],
        }
      : {}),
  };

  const [total, data, byMinistry] = await Promise.all([
    prisma.ministryMember.count({ where }),
    prisma.ministryMember.findMany({
      where,
      include: rosterInclude,
      orderBy: [{ ministry: { name: 'asc' } }, { roleTitle: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ministryMember.groupBy({ by: ['ministryId'], where: live, _count: true }),
  ]);

  return { data, meta: page(total, query), totals: { serving: byMinistry.reduce((sum, row) => sum + row._count, 0) } };
}
