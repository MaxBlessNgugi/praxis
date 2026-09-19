import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { assertMemberOnRegister } from './member.service';
import { page } from '../lib/respond';
import { retireRecord } from '../lib/archive';
import { findLive, includingRetired, live } from '../lib/live';
import type { RetireReason } from '../schemas/common';
import type {
  AddGroupMemberInput,
  CreateGroupInput,
  CreateGroupMeetingInput,
  ListGroupsQuery,
  ListGroupMeetingsQuery,
  UpdateGroupInput,
  UpdateGroupMeetingInput,
} from '../schemas/group.schema';

/**
 * Groups & fellowships: the small congregations that meet midweek.
 *
 * A ministry is service; a group is belonging. The two domains share a shape — a named unit, a roll,
 * a leader — because a church office thinks of them in one breath, but the group's own datum is the
 * **meeting**: when the circle actually gathered and how many came. Ministries report work; groups
 * report presence.
 */

const memberSelect = { id: true, firstName: true, lastName: true, initials: true, phone: true } as const;

const groupInclude = {
  leader: { select: memberSelect },
  // The roll size is what the groups screen shows beside each name.
  _count: { select: { members: { where: live } } },
} satisfies Prisma.GroupInclude;

export async function listGroups(query: ListGroupsQuery) {
  const where: Prisma.GroupWhereInput = {
    ...live,
    ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    ...(query.leaderId ? { leaderId: query.leaderId } : {}),
    ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
  };

  const [total, data] = await Promise.all([
    prisma.group.count({ where }),
    prisma.group.findMany({
      where,
      include: groupInclude,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, meta: page(total, query) };
}

export function getGroup(id: string) {
  return findLive(prisma.group, id, 'That group does not exist', {
    include: {
      leader: { select: memberSelect },
      members: {
        where: live,
        include: { member: { select: memberSelect } },
        orderBy: [{ roleTitle: 'asc' }, { joinedAt: 'asc' }],
      },
      meetings: {
        where: live,
        orderBy: { metAt: 'desc' },
        take: 12,
      },
    },
  });
}

export async function createGroup(input: CreateGroupInput, actorId: string) {
  if (input.leaderId) await assertMemberOnRegister(input.leaderId, 'That leader');

  return prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
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
      data: { actorId, action: 'create', entityName: 'Group', entityId: group.id, summary: `Started the group ${group.name}` },
    });
    return group;
  });
}

export async function updateGroup(id: string, input: UpdateGroupInput, actorId: string) {
  const before = await findLive(prisma.group, id, 'That group does not exist');
  if (input.leaderId) await assertMemberOnRegister(input.leaderId, 'That leader');

  return prisma.$transaction(async (tx) => {
    const group = await tx.group.update({
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
        entityName: 'Group',
        entityId: id,
        summary: `Updated the group ${group.name}`,
        before: { name: before.name, leaderId: before.leaderId, isActive: before.isActive },
        after: { name: group.name, leaderId: group.leaderId, isActive: group.isActive },
      },
    });
    return group;
  });
}

export async function retireGroup(id: string, input: RetireReason, actorId: string) {
  // A group disappears only once nobody belongs to it — the same rule as a ministry, because the
  // failure it prevents is the same: living people pointing at a circle the screen no longer lists.
  const group = await findLive(prisma.group, id, 'That group does not exist');

  const belonging = await prisma.groupMember.count({ where: { groupId: id, ...live } });
  if (belonging > 0) {
    throw new AppError(409, `${belonging} member(s) still belong to ${group.name}; take them off the roll first`, 'group_has_members');
  }

  return retireRecord('Group', id, {
    ...input,
    actorId,
    missing: 'That group does not exist',
    label: (row) => String(row.name),
  });
}

// -------------------------------------------------------------------------------------------
// The roll
// -------------------------------------------------------------------------------------------

export async function addGroupMember(groupId: string, input: AddGroupMemberInput, actorId: string) {
  const group = await findLive(prisma.group, groupId, 'That group does not exist');
  await assertMemberOnRegister(input.memberId);

  // Retired rows too: the unique key still holds their row, so a second insert would collide.
  const existing = await prisma.groupMember.findFirst({ where: { groupId, memberId: input.memberId, ...includingRetired } });

  return prisma.$transaction(async (tx) => {
    // Someone who left and came back is re-rolled rather than refused — the same courtesy the
    // ministry roll extends, and for the same soft-delete reason.
    const row = existing
      ? await tx.groupMember.update({
          where: { id: existing.id },
          data: { roleTitle: input.roleTitle, deletedAt: null },
          include: { member: { select: memberSelect } },
        })
      : await tx.groupMember.create({
          data: { groupId, memberId: input.memberId, roleTitle: input.roleTitle },
          include: { member: { select: memberSelect } },
        });

    await tx.auditLog.create({
      data: {
        actorId,
        action: existing ? 'update' : 'create',
        entityName: 'GroupMember',
        entityId: row.id,
        summary: `${row.member.firstName} ${row.member.lastName} joined ${group.name} as ${row.roleTitle}`,
      },
    });
    return row;
  });
}

export async function updateGroupMember(id: string, input: { roleTitle: string }, actorId: string) {
  const before = await findLive(prisma.groupMember, id, 'That member is not on this group roll', {
    include: { member: { select: memberSelect }, group: { select: { name: true } } },
  });

  return prisma.$transaction(async (tx) => {
    const row = await tx.groupMember.update({
      where: { id },
      data: { roleTitle: input.roleTitle },
      include: { member: { select: memberSelect }, group: { select: { name: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'GroupMember',
        entityId: id,
        summary: `${row.member.firstName} ${row.member.lastName} on ${row.group.name}: ${before.roleTitle} becomes ${row.roleTitle}`,
        before: { roleTitle: before.roleTitle },
        after: { roleTitle: row.roleTitle },
      },
    });
    return row;
  });
}

export async function removeGroupMember(id: string, actorId: string) {
  const row = await findLive(prisma.groupMember, id, 'That member is not on this group roll', {
    include: { member: { select: memberSelect }, group: { select: { name: true } } },
  });

  return prisma.$transaction(async (tx) => {
    await tx.groupMember.update({ where: { id }, data: { deletedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'delete',
        entityName: 'GroupMember',
        entityId: id,
        summary: `${row.member.firstName} ${row.member.lastName} left ${row.group.name}`,
      },
    });
  });
}

// -------------------------------------------------------------------------------------------
// The meetings
// -------------------------------------------------------------------------------------------

export async function recordGroupMeeting(groupId: string, input: CreateGroupMeetingInput, actorId: string) {
  const group = await findLive(prisma.group, groupId, 'That group does not exist');

  return prisma.$transaction(async (tx) => {
    const meeting = await tx.groupMeeting.create({
      data: { groupId, metAt: input.metAt, hostName: input.hostName ?? null, notes: input.notes ?? null, attendedCount: input.attendedCount },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'GroupMeeting',
        entityId: meeting.id,
        summary: `${group.name} met with ${meeting.attendedCount} present`,
      },
    });
    return meeting;
  });
}

export async function updateGroupMeeting(id: string, input: UpdateGroupMeetingInput, actorId: string) {
  const before = await findLive(prisma.groupMeeting, id, 'That meeting does not exist');

  return prisma.$transaction(async (tx) => {
    const meeting = await tx.groupMeeting.update({
      where: { id },
      data: {
        ...(input.metAt === undefined ? {} : { metAt: input.metAt }),
        ...(input.hostName === undefined ? {} : { hostName: input.hostName }),
        ...(input.notes === undefined ? {} : { notes: input.notes }),
        ...(input.attendedCount === undefined ? {} : { attendedCount: input.attendedCount }),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'GroupMeeting',
        entityId: id,
        summary: `Meeting of ${before.metAt.toISOString().slice(0, 10)}: attendance now ${meeting.attendedCount}`,
        before: { attendedCount: before.attendedCount },
        after: { attendedCount: meeting.attendedCount },
      },
    });
    return meeting;
  });
}

export async function listGroupMeetings(query: ListGroupMeetingsQuery) {
  const where: Prisma.GroupMeetingWhereInput = {
    ...live,
    ...(query.groupId ? { groupId: query.groupId } : {}),
  };

  const [total, data, byGroup] = await Promise.all([
    prisma.groupMeeting.count({ where }),
    prisma.groupMeeting.findMany({
      where,
      include: { group: { select: { id: true, name: true } } },
      orderBy: { metAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.groupMeeting.groupBy({ by: ['groupId'], where: live, _sum: { attendedCount: true }, _count: true }),
  ]);

  return {
    data,
    meta: page(total, query),
    totals: {
      meetings: byGroup.reduce((sum, row) => sum + row._count, 0),
      attendance: byGroup.reduce((sum, row) => sum + (row._sum.attendedCount ?? 0), 0),
    },
  };
}
