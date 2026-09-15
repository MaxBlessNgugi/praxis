import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { money } from '../lib/prisma';
import { page } from '../lib/respond';
import { retireRecord } from '../lib/archive';
import { findLive, live } from '../lib/live';
import { AppError } from '../middleware/errorHandler';
import type {
  CreateServiceInput,
  ListAttendanceQuery,
  ListServicesQuery,
  LiturgyItemInput,
  RecordAttendanceInput,
  RetireServiceInput,
  UpdateServiceInput,
  UpsertServiceReportInput,
} from '../schemas/service.schema';

const serviceInclude = {
  officiant: { select: { id: true, firstName: true, lastName: true, initials: true } },
  liturgy: { where: live, orderBy: { position: 'asc' } },
} satisfies Prisma.ServiceInclude;

export async function listServices(query: ListServicesQuery) {
  const where: Prisma.ServiceWhereInput = {
    ...live,
    ...(query.venue ? { venue: query.venue } : {}),
    ...(query.isTemplate === undefined ? {} : { isTemplate: query.isTemplate }),
    ...(query.from || query.to
      ? { heldAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      include: { _count: { select: { liturgy: true, attendance: true, roster: true } } },
      orderBy: { heldAt: query.sort === 'upcoming' ? 'asc' : 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, meta: page(total, query) };
}

export async function getService(id: string) {
  const service = await findLive(prisma.service, id, 'That service does not exist', { include: serviceInclude });
  return service;
}

export async function createService(input: CreateServiceInput, actorId: string) {
  if (input.officiantId) {
    const officiant = await prisma.member.findFirst({ where: { id: input.officiantId, ...live } });
    if (!officiant) throw new AppError(400, 'That officiant is not on the register', 'unknown_member');
  }

  return prisma.$transaction(async (tx) => {
    const service = await tx.service.create({ data: input, include: serviceInclude });
    await tx.auditLog.create({
      data: { actorId, action: 'create', entityName: 'Service', entityId: service.id, summary: `Created ${service.title}` },
    });
    return service;
  });
}

export async function updateService(id: string, input: UpdateServiceInput, actorId: string) {
  const before = await findLive(prisma.service, id, 'That service does not exist');

  return prisma.$transaction(async (tx) => {
    const service = await tx.service.update({ where: { id }, data: input, include: serviceInclude });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Service',
        entityId: id,
        summary: `Updated ${service.title}`,
        before: { heldAt: before.heldAt, venue: before.venue, officiantId: before.officiantId },
        after: { heldAt: service.heldAt, venue: service.venue, officiantId: service.officiantId },
      },
    });
    return service;
  });
}

export async function retireService(id: string, input: RetireServiceInput, actorId: string) {
  return retireRecord('Service', id, {
    reason: input.reason,
    reasonLabel: input.reasonLabel,
    actorId,
    missing: 'That service does not exist',
    label: (row) => String(row.title),
  });
}

/**
 * Replace a service's order of service with the list that was sent.
 *
 * The old rows are removed rather than soft-deleted. They are not a record anybody restores — the
 * liturgy that was *actually used* is what matters, and that is the report, not an abandoned draft
 * of the running order. Removing them also frees the `(serviceId, position)` unique key inside the
 * same transaction, so the new arrangement can be written without a collision.
 */
export async function replaceLiturgy(serviceId: string, items: LiturgyItemInput[], actorId: string) {
  const service = await findLive(prisma.service, serviceId, 'That service does not exist');

  return prisma.$transaction(async (tx) => {
    await tx.orderOfServiceItem.deleteMany({ where: { serviceId } });
    await tx.orderOfServiceItem.createMany({
      data: items.map((item, index) => ({ ...item, serviceId, position: index + 1 })),
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Service',
        entityId: serviceId,
        summary: `Set the order of service for ${service.title} (${items.length} items)`,
      },
    });
    return tx.orderOfServiceItem.findMany({ where: { serviceId }, orderBy: { position: 'asc' } });
  });
}

/** Record a census in one call: a Sunday is several rows, and a half-written census is a wrong one. */
export async function recordAttendance(serviceId: string | null, rows: RecordAttendanceInput[], actorId: string) {
  for (const row of rows) {
    if (row.memberId) {
      const member = await prisma.member.findFirst({ where: { id: row.memberId, ...live } });
      if (!member) throw new AppError(400, `Member ${row.memberId} is not on the register`, 'unknown_member');
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const result = await tx.attendance.createMany({
      data: rows.map((row) => ({
        serviceId,
        kind: row.kind,
        count: row.count,
        memberId: row.memberId ?? null,
        visitorName: row.visitorName ?? null,
        notes: row.notes ?? null,
        ...(row.recordedAt ? { recordedAt: row.recordedAt } : {}),
      })),
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'Attendance',
        entityId: serviceId ?? 'unassigned',
        summary: `Recorded ${result.count} attendance row(s)${serviceId ? ' against a service' : ''}`,
      },
    });
    return result.count;
  });

  return { recorded: created };
}

export async function listAttendance(query: ListAttendanceQuery) {
  const where: Prisma.AttendanceWhereInput = {
    ...live,
    ...(query.serviceId ? { serviceId: query.serviceId } : {}),
    ...(query.memberId ? { memberId: query.memberId } : {}),
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.from || query.to
      ? { recordedAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  };

  const [total, data] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      include: { member: { select: { id: true, firstName: true, lastName: true, initials: true } } },
      orderBy: { recordedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data, meta: page(total, query) };
}

/**
 * The census for one service.
 *
 * Visitors are counted from the rows that *name* a visitor rather than from a census row, because
 * "23 visitors" typed into a note is not a number the system can trust; naming them is.
 */
export async function attendanceSummary(serviceId: string) {
  await findLive(prisma.service, serviceId, 'That service does not exist');

  const rows = await prisma.attendance.findMany({ where: { serviceId, ...live } });
  const byKind: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    total += row.count;
    byKind[row.kind] = (byKind[row.kind] ?? 0) + row.count;
  }

  return {
    serviceId,
    attendanceRows: rows.length,
    totalCounted: total,
    namedMembers: rows.filter((row) => row.memberId !== null).length,
    namedVisitors: rows.filter((row) => row.visitorName !== null).length,
    byKind,
  };
}

/**
 * Write or revise the one report for a service.
 *
 * `upsert` on the unique `serviceId`: a report is revised, not accumulated, so nobody has to decide
 * later which of three drafts is true.
 */
export async function upsertReport(serviceId: string, input: UpsertServiceReportInput, actorId: string) {
  const service = await findLive(prisma.service, serviceId, 'That service does not exist');

  const { offeringsTotal, ...rest } = input;
  const data = {
    ...rest,
    ...(offeringsTotal === undefined ? {} : { offeringsTotal: new Prisma.Decimal(offeringsTotal.toFixed(2)) }),
  };

  return prisma.$transaction(async (tx) => {
    const report = await tx.serviceReport.upsert({
      where: { serviceId },
      create: { ...data, serviceId, preparedById: actorId },
      update: data,
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'ServiceReport',
        entityId: report.id,
        summary: `Wrote the report for ${service.title}`,
      },
    });
    // Money leaves as a number; see lib/prisma.money for why it is Decimal inside.
    return { ...report, offeringsTotal: money(report.offeringsTotal) };
  });
}

export async function getReport(serviceId: string) {
  const report = await prisma.serviceReport.findFirst({
    where: { serviceId, ...live },
    include: { preparedBy: { select: { id: true, name: true } } },
  });
  if (!report) throw new AppError(404, 'That service has no report yet', 'not_found');
  return { ...report, offeringsTotal: money(report.offeringsTotal) };
}
