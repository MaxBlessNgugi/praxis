import { Prisma } from '@prisma/client';
import { money, prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { appendFinanceEntry, lockFinanceLedger } from '../lib/financeAudit';
import { assertMemberOnRegister } from './member.service';
import { page } from '../lib/respond';
import { findLive, live } from '../lib/live';
import type { ListGivingQuery, RecordOfferingInput, RecordTitheInput } from '../schemas/finance.schema';

/**
 * Money received: tithes and offerings.
 *
 * These two share this file because they are the same act — a gift is banked, gets a code in the
 * year's series, and is written to the ledger — and differ only in what they point at: a tithe names
 * a giver, an offering names the service it was collected at.
 *
 * Neither has an update. A payment that was keyed wrongly is voided with a reason and re-recorded;
 * editing the amount in place would erase the only evidence that the first figure ever existed.
 */

const titheInclude = {
  member: { select: { id: true, firstName: true, lastName: true, initials: true } },
  recordedBy: { select: { id: true, name: true } },
} satisfies Prisma.TitheInclude;

const offeringInclude = {
  service: { select: { id: true, title: true, heldAt: true } },
  recordedBy: { select: { id: true, name: true } },
} satisfies Prisma.OfferingInclude;

type TitheRow = Prisma.TitheGetPayload<{ include: typeof titheInclude }>;
type OfferingRow = Prisma.OfferingGetPayload<{ include: typeof offeringInclude }>;

/** Money leaves as a number; see lib/prisma.money for why it is Decimal inside. */
const toPublicTithe = (row: TitheRow) => ({ ...row, amount: money(row.amount) });
const toPublicOffering = (row: OfferingRow) => ({ ...row, amount: money(row.amount) });

/**
 * `TX-2025-0007` becomes `TX-2025-0008`.
 *
 * The next code comes from the highest one already issued rather than from a count, because a count
 * reuses a code the moment a record is voided — and two payments sharing a transaction code is a
 * reconciliation problem nobody can untangle a year later. Zero-padded to four so that string order
 * is numeric order. Callers hold the ledger lock, so this is not a race.
 */
export function nextInSeries(lastCode: string | null | undefined, prefix: string): string {
  const issued = lastCode ? Number.parseInt(lastCode.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(issued) ? issued + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

const yearPrefix = (prefix: string, at: Date) => `${prefix}-${at.getFullYear()}-`;

// ---------------------------------------------------------------------------------------------
// Tithes
// ---------------------------------------------------------------------------------------------

export async function recordTithe(input: RecordTitheInput, actorId: string) {
  if (input.memberId) await assertMemberOnRegister(input.memberId);

  const receivedAt = input.receivedAt ?? new Date();
  const prefix = yearPrefix('TX', receivedAt);
  const amount = new Prisma.Decimal(input.amount.toFixed(2));

  return prisma.$transaction(async (tx) => {
    await lockFinanceLedger(tx);

    const last = await tx.tithe.findFirst({
      where: { txCode: { startsWith: prefix } },
      orderBy: { txCode: 'desc' },
      select: { txCode: true },
    });

    const tithe = await tx.tithe.create({
      data: {
        txCode: nextInSeries(last?.txCode, prefix),
        memberId: input.memberId ?? null,
        donorName: input.donorName,
        envelopeNo: input.envelopeNo ?? null,
        amount,
        method: input.method,
        category: input.category,
        reference: input.reference ?? null,
        receivedAt,
        recordedById: actorId,
      },
      include: titheInclude,
    });

    await appendFinanceEntry(tx, {
      action: 'recorded',
      entityName: 'Tithe',
      entityId: tithe.id,
      summary: `${tithe.txCode}: ${tithe.donorName} gave KSh ${money(tithe.amount)} (${tithe.category}, ${tithe.method})`,
      amount: tithe.amount,
      actorId,
      after: { txCode: tithe.txCode, donorName: tithe.donorName, amount: money(tithe.amount), method: tithe.method },
    });

    return toPublicTithe(tithe);
  });
}

export async function listTithes(query: ListGivingQuery) {
  const where: Prisma.TitheWhereInput = {
    ...live,
    ...(query.memberId ? { memberId: query.memberId } : {}),
    ...(query.method ? { method: query.method } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.minAmount === undefined ? {} : { amount: { gte: query.minAmount } }),
    ...receivedBetween(query),
    ...(query.q
      ? {
          OR: [
            { donorName: { contains: query.q, mode: 'insensitive' as const } },
            { txCode: { contains: query.q, mode: 'insensitive' as const } },
            { envelopeNo: { contains: query.q, mode: 'insensitive' as const } },
            { reference: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.TitheOrderByWithRelationInput =
    query.sort === 'recent' ? { receivedAt: 'desc' } : query.sort === 'oldest' ? { receivedAt: 'asc' } : { amount: 'desc' };

  const [total, rows, totalGiven] = await Promise.all([
    prisma.tithe.count({ where }),
    prisma.tithe.findMany({
      where,
      include: titheInclude,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.tithe.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    data: rows.map(toPublicTithe),
    meta: page(total, query),
    totals: { amount: money(totalGiven._sum.amount) },
  };
}

export async function getTithe(id: string) {
  const tithe = await findLive(prisma.tithe, id, 'That tithe record does not exist', { include: titheInclude });
  return toPublicTithe(tithe);
}

// ---------------------------------------------------------------------------------------------
// Offerings
// ---------------------------------------------------------------------------------------------

export async function recordOffering(input: RecordOfferingInput, actorId: string) {
  if (input.serviceId) {
    const service = await prisma.service.findFirst({ where: { id: input.serviceId, ...live }, select: { id: true } });
    if (!service) throw new AppError(400, 'That service does not exist', 'unknown_service');
  }

  const receivedAt = input.receivedAt ?? new Date();
  const prefix = yearPrefix('OF', receivedAt);
  const amount = new Prisma.Decimal(input.amount.toFixed(2));

  return prisma.$transaction(async (tx) => {
    await lockFinanceLedger(tx);

    const last = await tx.offering.findFirst({
      where: { txCode: { startsWith: prefix } },
      orderBy: { txCode: 'desc' },
      select: { txCode: true },
    });

    const offering = await tx.offering.create({
      data: {
        txCode: nextInSeries(last?.txCode, prefix),
        serviceId: input.serviceId ?? null,
        amount,
        method: input.method,
        category: input.category,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        receivedAt,
        recordedById: actorId,
      },
      include: offeringInclude,
    });

    await appendFinanceEntry(tx, {
      action: 'recorded',
      entityName: 'Offering',
      entityId: offering.id,
      summary: `${offering.txCode}: KSh ${money(offering.amount)} collected (${offering.category}, ${offering.method})`,
      amount: offering.amount,
      actorId,
      after: { txCode: offering.txCode, serviceId: offering.serviceId, amount: money(offering.amount) },
    });

    return toPublicOffering(offering);
  });
}

export async function listOfferings(query: ListGivingQuery) {
  const where: Prisma.OfferingWhereInput = {
    ...live,
    ...(query.method ? { method: query.method } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.minAmount === undefined ? {} : { amount: { gte: query.minAmount } }),
    ...receivedBetween(query),
    ...(query.q
      ? {
          OR: [
            { txCode: { contains: query.q, mode: 'insensitive' as const } },
            { category: { contains: query.q, mode: 'insensitive' as const } },
            { reference: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.OfferingOrderByWithRelationInput =
    query.sort === 'recent' ? { receivedAt: 'desc' } : query.sort === 'oldest' ? { receivedAt: 'asc' } : { amount: 'desc' };

  const [total, rows, totalCollected] = await Promise.all([
    prisma.offering.count({ where }),
    prisma.offering.findMany({
      where,
      include: offeringInclude,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.offering.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    data: rows.map(toPublicOffering),
    meta: page(total, query),
    totals: { amount: money(totalCollected._sum.amount) },
  };
}

export async function getOffering(id: string) {
  const offering = await findLive(prisma.offering, id, 'That offering record does not exist', { include: offeringInclude });
  return toPublicOffering(offering);
}

/** Either end of the window may be left open; both together are inclusive. */
function receivedBetween(query: { from?: Date; to?: Date }) {
  if (!query.from && !query.to) return {};
  return { receivedAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } };
}
