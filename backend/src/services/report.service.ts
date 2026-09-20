import { Prisma } from '@prisma/client';
import { money, prisma } from '../lib/prisma';
import { live, liveSql } from '../lib/live';
import { requireTenantId } from '../lib/tenant';

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
 *
 * The church is filtered here by hand, and has to be: raw SQL is the one place the tenant-scoped
 * client cannot reach, so a query written here is a query that scopes itself or leaks.
 */
async function givingByMonth(range: Range) {
  const organizationId = requireTenantId();
  const [tithes, offerings] = await Promise.all([
    prisma.$queryRaw<Array<{ month: Date; total: Prisma.Decimal }>>`
      SELECT date_trunc('month', "receivedAt") AS month, SUM("amount") AS total
      FROM "Tithe" WHERE ${liveSql} AND "organizationId" = ${organizationId} ${since('"receivedAt"', range)}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<Array<{ month: Date; total: Prisma.Decimal }>>`
      SELECT date_trunc('month', "receivedAt") AS month, SUM("amount") AS total
      FROM "Offering" WHERE ${liveSql} AND "organizationId" = ${organizationId} ${since('"receivedAt"', range)}
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
  const [byStatus, byLocation, households, householdsWithSizes, headlessHouseholds, recent] = await Promise.all([
    prisma.member.groupBy({ by: ['status'], where: live, _count: true }),
    prisma.member.groupBy({ by: ['location'], where: live, _count: true }),
    prisma.household.count({ where: live }),
    prisma.household.findMany({
      where: live,
      select: { id: true, name: true, unitNumber: true, _count: { select: { members: { where: live } } } },
    }),
    prisma.household.count({ where: { ...live, members: { none: { isHouseholdHead: true, deletedAt: null } } } }),
    prisma.member.findMany({
      where: live,
      select: { joinedAt: true },
      orderBy: { joinedAt: 'asc' },
    }),
  ]);

  // The census the console draws counts baptism records, envelopes issued and the under-19 roll, so
  // those travel with the rest of the register's totals. Nursery to Grade 12 is the under-19 band,
  // and a member with no date of birth on file is left out of it rather than guessed into an age.
  const today = new Date();
  const youthCutoff = new Date(today.getFullYear() - 19, today.getMonth(), today.getDate());
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const [byBaptismType, envelopesIssued, baptismsThisYear, youth] = await Promise.all([
    prisma.member.groupBy({ by: ['baptismType'], where: live, _count: true }),
    prisma.member.count({ where: { ...live, envelopeNumber: { not: null } } }),
    prisma.member.count({ where: { ...live, baptismDate: { gte: startOfYear } } }),
    prisma.member.count({ where: { ...live, dateOfBirth: { gte: youthCutoff } } }),
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

  const total = byStatus.reduce((sum, row) => sum + row._count, 0);

  return {
    total,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count])),
    byBaptismType: Object.fromEntries(byBaptismType.map((row) => [row.baptismType, row._count])),
    // 'Baptized or dedicated': the two kinds a certificate can be printed from, as opposed to 'none'.
    withBaptismRecord: total - (byBaptismType.find((row) => row.baptismType === 'none')?._count ?? 0),
    envelopesIssued,
    baptismsThisYear,
    youth,
    byLocation: byLocation.map((row) => ({ location: row.location, members: row._count })).sort((a, b) => b.members - a.members),
    // The pastoral shape of the roll: how many homes have nobody recorded as their head, and the
    // largest ones — a visit list a pastor can act on, not just a count.
    households: {
      total: households,
      ...sizes,
      headless: headlessHouseholds,
      largest: [...householdsWithSizes]
        .sort((a, b) => b._count.members - a._count.members)
        .slice(0, 10)
        .map((row) => ({ id: row.id, name: row.name, unitNumber: row.unitNumber, members: row._count.members })),
    },
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

/**
 * The inventory report: what the church owns, what it is worth, and where the shelf is thin.
 *
 * Aggregated in SQL for the same reason giving is — a register of a few thousand lines grouped into
 * a handful of rows the screen can draw — and scoped by hand because it is raw SQL. Variance is read
 * from approved stock takes only: a count still in review is somebody's opinion until an
 * administrator signs it.
 */
export async function inventoryReport() {
  const organizationId = requireTenantId();

  const [totals, byCategory, byLocation, byCondition, byCustodian, lowStock, variances, maintenanceDue, movementsByKind] = await Promise.all([
    prisma.$queryRaw<Array<{ kind: string; lines: bigint; quantity: bigint; value: Prisma.Decimal | null }>>`
      SELECT "kind", COUNT(*) AS lines, COALESCE(SUM("quantity"), 0) AS quantity, COALESCE(SUM("quantity" * "cost"), 0) AS value
      FROM "InventoryItem" WHERE ${liveSql} AND "organizationId" = ${organizationId} AND "status" != 'disposed'
      GROUP BY "kind"`,
    prisma.$queryRaw<Array<{ category: string; lines: bigint; value: Prisma.Decimal | null }>>`
      SELECT "category", COUNT(*) AS lines, COALESCE(SUM("quantity" * "cost"), 0) AS value
      FROM "InventoryItem" WHERE ${liveSql} AND "organizationId" = ${organizationId} AND "status" != 'disposed'
      GROUP BY "category" ORDER BY 3 DESC`,
    prisma.$queryRaw<Array<{ location: string; lines: bigint; quantity: bigint }>>`
      SELECT "location", COUNT(*) AS lines, COALESCE(SUM("quantity"), 0) AS quantity
      FROM "InventoryItem" WHERE ${liveSql} AND "organizationId" = ${organizationId} AND "status" != 'disposed'
      GROUP BY "location" ORDER BY 2 DESC LIMIT 20`,
    prisma.$queryRaw<Array<{ condition: string; lines: bigint }>>`
      SELECT "condition", COUNT(*) AS lines
      FROM "InventoryItem" WHERE ${liveSql} AND "organizationId" = ${organizationId} AND "kind" = 'asset' AND "condition" IS NOT NULL
      GROUP BY "condition"`,
    // The join makes "deletedAt" ambiguous, so this one names the table instead of reusing liveSql.
    prisma.$queryRaw<Array<{ custodian: string | null; lines: bigint }>>`
      SELECT m."firstName" || ' ' || m."lastName" AS custodian, COUNT(*) AS lines
      FROM "InventoryItem" i JOIN "Member" m ON m.id = i."custodianId"
      WHERE i."deletedAt" IS NULL AND i."organizationId" = ${organizationId} AND i."status" != 'disposed'
      GROUP BY m.id, m."firstName", m."lastName" ORDER BY 2 DESC`,
    prisma.inventoryItem.findMany({
      where: { ...live, reorderAt: { not: null } },
      select: { id: true, sku: true, name: true, quantity: true, reorderAt: true, unit: true, location: true },
      orderBy: { quantity: 'asc' },
      take: 15,
    }),
    prisma.stockTake.findMany({
      where: { status: 'approved', variance: { not: 0 } },
      include: { item: { select: { id: true, name: true, sku: true } } },
      orderBy: { approvedAt: 'desc' },
      take: 10,
    }),
    prisma.maintenanceRecord.findMany({
      // Due means the date has arrived. Nothing here is overdue-shaming: the shelf of things that
      // need a mechanic is short, and the console orders it by how overdue each one is.
      where: { nextDueAt: { lte: new Date() }, item: { deletedAt: null } },
      include: { item: { select: { id: true, name: true, sku: true, location: true } } },
      orderBy: { nextDueAt: 'asc' },
      take: 15,
    }),
    prisma.stockMovement.groupBy({ by: ['kind'], _count: true }),
  ]);

  const consumables = totals.find((row) => row.kind === 'consumable');
  const assets = totals.find((row) => row.kind === 'asset');
  const stockValue = money(consumables?.value ?? null) ?? 0;
  const assetValue = money(assets?.value ?? null) ?? 0;
  const n = (value: bigint | undefined) => Number(value ?? 0);

  return {
    totals: {
      consumableLines: n(consumables?.lines),
      consumableQuantity: n(consumables?.quantity),
      assetLines: n(assets?.lines),
      assetQuantity: n(assets?.quantity),
      stockValue,
      assetValue,
      totalValue: stockValue + assetValue,
    },
    byCategory: byCategory.map((row) => ({ category: row.category, lines: n(row.lines), value: money(row.value) ?? 0 })),
    byLocation: byLocation.map((row) => ({ location: row.location, lines: n(row.lines), quantity: n(row.quantity) })),
    byCondition: byCondition.map((row) => ({ condition: row.condition, lines: n(row.lines) })),
    byCustodian: byCustodian.map((row) => ({ custodian: row.custodian, lines: n(row.lines) })),
    lowStock: lowStock.filter((item) => item.quantity <= (item.reorderAt ?? 0)),
    maintenanceDue: maintenanceDue.map((record) => ({
      id: record.id,
      servicedAt: record.servicedAt,
      nextDueAt: record.nextDueAt,
      provider: record.provider,
      item: record.item,
    })),
    recentVariances: variances.map((take) => ({
      id: take.id,
      approvedAt: take.approvedAt,
      variance: take.variance,
      item: take.item,
      countedQuantity: take.countedQuantity,
      bookQuantity: take.bookQuantity,
    })),
    movementsByKind: Object.fromEntries(movementsByKind.map((row) => [row.kind, row._count])),
  };
}
