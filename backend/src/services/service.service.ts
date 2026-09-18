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

/**
 * Two services cannot be in the same room at the same moment.
 *
 * Checked on the instant rather than on the day, because the clash a parish actually has is the 11am
 * service booked over the 11am service — not two services on one Sunday, which is most Sundays.
 * Templates are exempt: a template is a shape rather than a booking, and one of them carries no
 * particular time at all.
 */
async function assertNoClash(venue: string, heldAt: Date, exceptId?: string) {
  const clash = await prisma.service.findFirst({
    where: {
      ...live,
      isTemplate: false,
      heldAt,
      venue: { equals: venue, mode: 'insensitive' },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { title: true },
  });
  if (clash) {
    throw new AppError(409, `${clash.title} is already booked at ${venue} for that time`, 'venue_clash');
  }
}

export async function listServices(query: ListServicesQuery) {
  const where: Prisma.ServiceWhereInput = {
    ...live,
    ...(query.kind ? { kind: query.kind } : {}),
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
      // Counted live only: a duty taken off the roster is in the Trash, not still on duty.
      include: { _count: { select: { liturgy: { where: live }, attendance: { where: live }, roster: { where: live } } } },
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
  if (!input.isTemplate) await assertNoClash(input.venue, input.heldAt);

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

  if (input.officiantId) {
    const officiant = await prisma.member.findFirst({ where: { id: input.officiantId, ...live } });
    if (!officiant) throw new AppError(400, 'That officiant is not on the register', 'unknown_member');
  }
  // Moving a service is exactly the moment a clash appears, so the same rule runs here — excluding
  // the service being moved, which is of course booked at its own time.
  if (!(input.isTemplate ?? before.isTemplate)) {
    await assertNoClash(input.venue ?? before.venue, input.heldAt ?? before.heldAt, id);
  }

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

/** A row that counts a crowd rather than naming a person, which is what a census is. */
const isCensusRow = (row: RecordAttendanceInput) => !row.memberId && !row.visitorName;

/**
 * Record a census in one call: a Sunday is several rows, and a half-written census is a wrong one.
 *
 * Two rules keep the numbers honest, and both exist because of what a duplicated row does to every
 * figure built on top of it — the report, the certificate, the attendance trend.
 *
 * A **census is the service's own count**, so recording one again revises it rather than adding a
 * second: a clerk who saves twice must not count the congregation twice. The replaced figures go
 * into the audit line, so the correction is visible rather than silent. Only the kinds being written
 * are replaced; a rehearsal's own count against the same service is a different question.
 *
 * A **named person attends once**, so a member who already has a row against this service is refused
 * rather than counted again. Visitors are additive: welcoming somebody is an event, and two guests
 * can share a name.
 */
export async function recordAttendance(serviceId: string | null, rows: RecordAttendanceInput[], actorId: string) {
  for (const row of rows) {
    if (row.memberId) {
      const member = await prisma.member.findFirst({ where: { id: row.memberId, ...live } });
      if (!member) throw new AppError(400, `Member ${row.memberId} is not on the register`, 'unknown_member');
    }
  }

  const census = rows.filter(isCensusRow);
  const members = rows.map((row) => row.memberId).filter((value): value is string => Boolean(value));
  const censusKinds = [...new Set(census.map((row) => row.kind))];

  const result = await prisma.$transaction(async (tx) => {
    let replaced: string | null = null;
    if (serviceId && censusKinds.length > 0) {
      const previous = await tx.attendance.findMany({
        where: { serviceId, ...live, memberId: null, visitorName: null, kind: { in: censusKinds } },
        orderBy: { recordedAt: 'asc' },
      });
      if (previous.length > 0) {
        replaced = `${previous.reduce((sum, row) => sum + row.count, 0)} across ${previous.length} row(s)`;
        await tx.attendance.deleteMany({ where: { id: { in: previous.map((row) => row.id) } } });
      }
    }

    if (serviceId && members.length > 0) {
      const alreadyCounted = await tx.attendance.findFirst({
        where: { serviceId, ...live, memberId: { in: members } },
        select: { memberId: true },
      });
      if (alreadyCounted) {
        throw new AppError(409, 'That member is already counted at this service', 'attendance_recorded');
      }
    }

    const created = await tx.attendance.createMany({
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
        summary: `Recorded ${created.count} attendance row(s)${serviceId ? ' against a service' : ''}${
          replaced ? `, replacing a census of ${replaced}` : ''
        }`,
        ...(replaced ? { before: { census: replaced } } : {}),
        after: { census: census.map((row) => ({ kind: row.kind, count: row.count })) },
      },
    });
    return { recorded: created.count, replaced: Boolean(replaced) };
  });

  return result;
}

/**
 * The attendance filter, owned here so the CSV export composes the same one as the list — an export
 * that re-typed these conditions could quietly disagree with the screen it mirrors.
 */
export function attendanceWhere(query: ListAttendanceQuery): Prisma.AttendanceWhereInput {
  return {
    ...live,
    ...(query.serviceId ? { serviceId: query.serviceId } : {}),
    ...(query.memberId ? { memberId: query.memberId } : {}),
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.from || query.to
      ? { recordedAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  };
}

export async function listAttendance(query: ListAttendanceQuery) {
  const where = attendanceWhere(query);

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
 *
 * A report that has been signed off is read-only to everybody but an administrator. The signature is
 * what a board minute refers to, so revising the text underneath one silently would make the minute
 * describe a document that no longer exists; an administrator who does revise it leaves the audit
 * line saying so.
 */
export async function upsertReport(
  serviceId: string,
  input: UpsertServiceReportInput,
  actorId: string,
  mayReviseSignedOff = false,
) {
  const service = await findLive(prisma.service, serviceId, 'That service does not exist');

  const existing = await prisma.serviceReport.findFirst({
    where: { serviceId, ...live },
    select: { finalizedAt: true },
  });
  if (existing?.finalizedAt && !mayReviseSignedOff) {
    throw new AppError(
      409,
      'This report has been signed off. An administrator can revise it.',
      'report_signed_off',
    );
  }

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
        summary: `Wrote the report for ${service.title}${existing?.finalizedAt ? ', revising a signed-off report' : ''}`,
      },
    });
    // Money leaves as a number; see lib/prisma.money for why it is Decimal inside.
    return { ...report, offeringsTotal: money(report.offeringsTotal) };
  });
}

/**
 * Sign the report off, which is the act that closes a service.
 *
 * Idempotent in the sense that matters: signing a report that is already signed leaves the original
 * date alone rather than restamping it, because the date a report was declared finished is a fact
 * about that day and not about when somebody last pressed the button.
 */
export async function finalizeReport(serviceId: string, actorId: string) {
  const service = await findLive(prisma.service, serviceId, 'That service does not exist');
  const report = await prisma.serviceReport.findFirst({ where: { serviceId, ...live } });
  if (!report) throw new AppError(409, 'Write the report before signing it off', 'no_report');

  return prisma.$transaction(async (tx) => {
    const finalized = report.finalizedAt
      ? report
      : await tx.serviceReport.update({ where: { id: report.id }, data: { finalizedAt: new Date() } });

    if (!report.finalizedAt) {
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'update',
          entityName: 'ServiceReport',
          entityId: report.id,
          summary: `Signed off the report for ${service.title}`,
          after: { finalizedAt: finalized.finalizedAt },
        },
      });
    }

    return { ...finalized, offeringsTotal: money(finalized.offeringsTotal) };
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
