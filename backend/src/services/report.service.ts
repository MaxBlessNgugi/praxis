import { Prisma } from '@prisma/client';
import { money, prisma } from '../lib/prisma';
import { live, liveSql } from '../lib/live';

/**
 * Reports: the aggregate questions a council asks.
 *
 * Every answer here is computed from the live rows rather than from a stored total, so a report can
 * never disagree with the ledger it summarises. Money is converted to a plain number at this edge,
 * like everywhere else; nothing here writes.
 */

export interface Range {
  from?: Date;
  to?: Date;
}

/** A parameterised date filter, composed rather than concatenated. */
const since = (column: string, range: Range) => {
  const parts: Prisma.Sql[] = [];
  if (range.from) parts.push(Prisma.sql`AND ${Prisma.raw(column)} >= ${range.from}`);
  if (range.to) parts.push(Prisma.sql`AND ${Prisma.raw(column)} <= ${range.to}`);
  return parts.length ? Prisma.sql`${Prisma.join(parts, ' ')}` : Prisma.empty;
};

/**
 * One series per kind of giving, grouped by month in the database.
 *
 * Grouping in SQL rather than in JavaScript means a year of giving is one row per month instead of
 * every payment, which is the difference between a report that scales and one that does not.
 */
async function givingByMonth(range: Range) {
  const [tithes, offerings] = await Promise.all([
    prisma.$queryRaw<Array<{ month: Date; total: Prisma.Decimal }>>`
      SELECT date_trunc('month', "receivedAt") AS month, SUM("amount") AS total
      FROM "Tithe" WHERE ${liveSql} ${since('"receivedAt"', range)}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<Array<{ month: Date; total: Prisma.Decimal }>>`
      SELECT date_trunc('month', "receivedAt") AS month, SUM("amount") AS total
      FROM "Offering" WHERE ${liveSql} ${since('"receivedAt"', range)}
      GROUP BY 1 ORDER BY 1`,
  ]);

  const months = new Map<string, { month: string; tithes: number; offerings: number; total: number }>();
  const add = (key: Date, field: 'tithes' | 'offerings', value: number) => {
    const label = key.toISOString().slice(0, 7);
    const row = months.get(label) ?? { month: label, tithes: 0, offerings: 0, total: 0 };
    row[field] += value;
    row.total += value;
    months.set(label, row);
  };

  for (const row of tithes) add(row.month, 'tithes', money(row.total) ?? 0);
  for (const row of offerings) add(row.month, 'offerings', money(row.total) ?? 0);

  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Everything the home screen's cards and the reports panel's header need, in one round trip. */
export async function overview(range: Range) {
  const window = range.from || range.to ? { gte: range.from, lte: range.to } : undefined;

  const [
    membersActive,
    membersTotal,
    households,
    ministriesActive,
    tithes,
    offerings,
    contributions,
    welfareDisbursed,
    charity,
    pendingResolutions,
    upcomingMeetings,
    nextEvents,
    recentActivity,
    lastService,
  ] = await Promise.all([
    prisma.member.count({ where: { ...live, status: 'active' } }),
    prisma.member.count({ where: live }),
    prisma.household.count({ where: live }),
    prisma.ministry.count({ where: { ...live, isActive: true } }),
    prisma.tithe.aggregate({ where: { ...live, ...(window ? { receivedAt: window } : {}) }, _sum: { amount: true } }),
    prisma.offering.aggregate({ where: { ...live, ...(window ? { receivedAt: window } : {}) }, _sum: { amount: true } }),
    prisma.projectContribution.aggregate({ where: { ...live, kind: 'cash', ...(window ? { contributedAt: window } : {}) }, _sum: { amount: true } }),
    prisma.welfareDisbursement.aggregate({ where: { ...live, status: 'disbursed', ...(window ? { requestedAt: window } : {}) }, _sum: { amount: true } }),
    prisma.charityActivity.aggregate({ where: { ...live, ...(window ? { occurredAt: window } : {}) }, _sum: { amount: true } }),
    prisma.resolution.count({ where: { ...live, stage: 'proposed' } }),
    prisma.meeting.count({ where: { ...live, status: 'scheduled', heldAt: { gte: new Date() } } }),
    prisma.event.findMany({ where: { ...live, endsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 5 }),
    prisma.auditLog.findMany({
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.service.findFirst({ where: { ...live, heldAt: { lte: new Date() } }, orderBy: { heldAt: 'desc' } }),
  ]);

  const giving = (money(tithes._sum.amount) ?? 0) + (money(offerings._sum.amount) ?? 0);

  return {
    period: { from: range.from ?? null, to: range.to ?? null },
    cards: {
      activeMembers: membersActive,
      membersTotal,
      households,
      activeMinistries: ministriesActive,
      giving,
      tithes: money(tithes._sum.amount) ?? 0,
      offerings: money(offerings._sum.amount) ?? 0,
      projectCash: money(contributions._sum.amount) ?? 0,
      welfareDisbursed: money(welfareDisbursed._sum.amount) ?? 0,
      charitySpend: money(charity._sum.amount) ?? 0,
      pendingResolutions,
      upcomingMeetings,
    },
    nextEvents,
    lastService,
    recentActivity,
  };
}

export async function memberReport() {
  const [byStatus, byLocation, households, householdsWithSizes, recent] = await Promise.all([
    prisma.member.groupBy({ by: ['status'], where: live, _count: true }),
    prisma.member.groupBy({ by: ['location'], where: live, _count: true }),
    prisma.household.count({ where: live }),
    prisma.household.findMany({
      where: live,
      select: { id: true, name: true, unitNumber: true, _count: { select: { members: { where: live } } } },
    }),
    prisma.member.findMany({
      where: live,
      select: { joinedAt: true },
      orderBy: { joinedAt: 'asc' },
    }),
  ]);

  // Joining dates are few enough to fold in memory, and doing it here keeps the query portable.
  const byYear = new Map<string, number>();
  for (const row of recent) {
    const year = String(row.joinedAt.getFullYear());
    byYear.set(year, (byYear.get(year) ?? 0) + 1);
  }

  const sizes = { household: 0, single: 0, large: 0 };
  for (const row of householdsWithSizes) {
    if (row._count.members === 1) sizes.single += 1;
    else if (row._count.members >= 6) sizes.large += 1;
    else sizes.household += 1;
  }

  return {
    total: byStatus.reduce((sum, row) => sum + row._count, 0),
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count])),
    byLocation: byLocation.map((row) => ({ location: row.location, members: row._count })).sort((a, b) => b.members - a.members),
    households: { total: households, ...sizes },
    joinedByYear: [...byYear.entries()].map(([year, members]) => ({ year, members })).sort((a, b) => a.year.localeCompare(b.year)),
  };
}

export async function givingReport(range: Range) {
  const window = range.from || range.to ? { gte: range.from, lte: range.to } : undefined;

  const [byMethod, byCategory, byMonth, tithes, offerings, contributions] = await Promise.all([
    prisma.tithe.groupBy({ by: ['method'], where: { ...live, ...(window ? { receivedAt: window } : {}) }, _sum: { amount: true }, _count: true }),
    prisma.tithe.groupBy({ by: ['category'], where: { ...live, ...(window ? { receivedAt: window } : {}) }, _sum: { amount: true }, _count: true }),
    givingByMonth(range),
    prisma.tithe.aggregate({ where: { ...live, ...(window ? { receivedAt: window } : {}) }, _sum: { amount: true }, _count: true }),
    prisma.offering.aggregate({ where: { ...live, ...(window ? { receivedAt: window } : {}) }, _sum: { amount: true }, _count: true }),
    prisma.projectContribution.groupBy({
      by: ['kind'],
      where: { ...live, ...(window ? { contributedAt: window } : {}) },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const projects = { cash: 0, pledges: 0 };
  for (const row of contributions) {
    const sum = money(row._sum.amount) ?? 0;
    if (row.kind === 'pledge') projects.pledges += sum;
    else projects.cash += sum;
  }

  return {
    period: { from: range.from ?? null, to: range.to ?? null },
    tithes: { total: money(tithes._sum.amount) ?? 0, count: tithes._count },
    offerings: { total: money(offerings._sum.amount) ?? 0, count: offerings._count },
    total: (money(tithes._sum.amount) ?? 0) + (money(offerings._sum.amount) ?? 0),
    byMonth,
    byMethod: byMethod.map((row) => ({ method: row.method, amount: money(row._sum.amount) ?? 0, count: row._count })).sort((a, b) => b.amount - a.amount),
    byCategory: byCategory.map((row) => ({ category: row.category, amount: money(row._sum.amount) ?? 0, count: row._count })).sort((a, b) => b.amount - a.amount),
    projects,
  };
}

export async function attendanceReport(range: Range) {
  const where: Prisma.AttendanceWhereInput = {
    ...live,
    ...(range.from || range.to ? { recordedAt: { gte: range.from, lte: range.to } } : {}),
  };

  const [byKind, rows, servicesHeld] = await Promise.all([
    prisma.attendance.groupBy({ by: ['kind'], where, _sum: { count: true }, _count: true }),
    prisma.attendance.findMany({
      where: { ...where, serviceId: { not: null } },
      select: { serviceId: true, count: true, service: { select: { id: true, title: true, heldAt: true, venue: true } } },
    }),
    prisma.service.count({ where: { ...live, ...(range.from || range.to ? { heldAt: { gte: range.from, lte: range.to } } : {}) } }),
  ]);

  const perService = new Map<string, { serviceId: string; title: string; heldAt: Date; venue: string; counted: number }>();
  for (const row of rows) {
    if (!row.service) continue;
    const entry = perService.get(row.service.id) ?? {
      serviceId: row.service.id,
      title: row.service.title,
      heldAt: row.service.heldAt,
      venue: row.service.venue,
      counted: 0,
    };
    entry.counted += row.count;
    perService.set(row.service.id, entry);
  }

  const series = [...perService.values()].sort((a, b) => a.heldAt.getTime() - b.heldAt.getTime());
  const totalCounted = byKind.reduce((sum, row) => sum + (row._sum.count ?? 0), 0);

  return {
    period: { from: range.from ?? null, to: range.to ?? null },
    servicesHeld,
    attendanceRows: byKind.reduce((sum, row) => sum + row._count, 0),
    totalCounted,
    averagePerService: series.length === 0 ? 0 : Math.round(totalCounted / series.length),
    byKind: Object.fromEntries(byKind.map((row) => [row.kind, { counted: row._sum.count ?? 0, rows: row._count }])),
    byService: series,
  };
}

export async function ministryReport() {
  const [ministries, unassigned] = await Promise.all([
    prisma.ministry.findMany({
      where: live,
      select: {
        id: true,
        name: true,
        isActive: true,
        meetingDay: true,
        leader: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: { where: live } } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.member.count({ where: { ...live, status: 'active', ministries: { none: live } } }),
  ]);

  const serving = ministries.reduce((sum, row) => sum + row._count.members, 0);
  return {
    ministries: ministries.map((row) => ({
      id: row.id,
      name: row.name,
      isActive: row.isActive,
      meetingDay: row.meetingDay,
      leader: row.leader,
      members: row._count.members,
      // A ministry with nobody on its roll is the one a report should surface, not bury.
      needsAttention: row._count.members === 0 || !row.leader,
    })),
    total: ministries.length,
    active: ministries.filter((row) => row.isActive).length,
    serving,
    withoutALeader: ministries.filter((row) => !row.leader).length,
    // Named members who serve nowhere: the invitation list, and the reason this report exists.
    activeMembersServingNowhere: unassigned,
  };
}

export async function governanceReport(range: Range) {
  const window = range.from || range.to ? { gte: range.from, lte: range.to } : undefined;

  const [meetingsByKind, meetingsByStatus, resolutionsByStage, documentsByKind, recentMeetings, recentResolutions] = await Promise.all([
    prisma.meeting.groupBy({ by: ['kind'], where: live, _count: true }),
    prisma.meeting.groupBy({ by: ['status'], where: live, _count: true }),
    prisma.resolution.groupBy({ by: ['stage'], where: live, _count: true }),
    prisma.governanceDocument.groupBy({ by: ['kind'], where: { ...live, isActive: true }, _count: true }),
    prisma.meeting.findMany({
      where: { ...live, ...(window ? { heldAt: window } : {}) },
      orderBy: { heldAt: 'desc' },
      take: 10,
      select: { id: true, title: true, kind: true, status: true, heldAt: true, attendees: true, quorumMet: true },
    }),
    prisma.resolution.findMany({
      where: { ...live, ...(window ? { councilDate: window } : {}) },
      orderBy: { councilDate: 'desc' },
      take: 10,
      select: { id: true, code: true, title: true, stage: true, sponsor: true, councilDate: true },
    }),
  ]);

  return {
    period: { from: range.from ?? null, to: range.to ?? null },
    meetings: {
      byKind: Object.fromEntries(meetingsByKind.map((row) => [row.kind, row._count])),
      byStatus: Object.fromEntries(meetingsByStatus.map((row) => [row.status, row._count])),
      total: meetingsByKind.reduce((sum, row) => sum + row._count, 0),
    },
    resolutions: {
      byStage: Object.fromEntries(resolutionsByStage.map((row) => [row.stage, row._count])),
      total: resolutionsByStage.reduce((sum, row) => sum + row._count, 0),
    },
    documents: { byKind: Object.fromEntries(documentsByKind.map((row) => [row.kind, row._count])) },
    recentMeetings,
    recentResolutions,
  };
}
