import { Prisma } from '@prisma/client';
import { money, prisma } from '../lib/prisma';
import { appendFinanceEntry, lockFinanceLedger } from '../lib/financeAudit';
import { page } from '../lib/respond';
import { findLive, live } from '../lib/live';
import type {
  CreateCharityActivityInput,
  ListCharityQuery,
  UpdateCharityActivityInput,
} from '../schemas/finance.schema';

/**
 * Charity: what the church gave away, and to whom it paid it.
 *
 * `code` runs in the year's `CH-` series like the other finance records, so a receipt in a folder can
 * be found by number. Status is `recorded → verified`, or `flagged` when the spend needs answering
 * for — the console's screen labels `verified` as "Audited & Cleared".
 */

const activityInclude = { ledBy: { select: { id: true, name: true } } } satisfies Prisma.CharityActivityInclude;
type ActivityRow = Prisma.CharityActivityGetPayload<{ include: typeof activityInclude }>;

const toPublicActivity = (row: ActivityRow) => ({ ...row, amount: money(row.amount) });

export async function listActivities(query: ListCharityQuery) {
  const where: Prisma.CharityActivityWhereInput = {
    ...live,
    ...(query.initiative ? { initiative: query.initiative } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? { occurredAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
    ...(query.q
      ? {
          OR: [
            { code: { contains: query.q, mode: 'insensitive' as const } },
            { item: { contains: query.q, mode: 'insensitive' as const } },
            { initiative: { contains: query.q, mode: 'insensitive' as const } },
            { vendor: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, rows, totalSpent, byInitiative] = await Promise.all([
    prisma.charityActivity.count({ where }),
    prisma.charityActivity.findMany({
      where,
      include: activityInclude,
      orderBy: { occurredAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.charityActivity.aggregate({ where, _sum: { amount: true } }),
    prisma.charityActivity.groupBy({ by: ['initiative'], where, _sum: { amount: true } }),
  ]);

  return {
    data: rows.map(toPublicActivity),
    meta: page(total, query),
    totals: {
      amount: money(totalSpent._sum.amount),
      // Per initiative, because "how much did the water project cost?" is the question a treasurer
      // is actually asked, and it should not need four filtered requests to answer.
      byInitiative: byInitiative
        .map((row) => ({ initiative: row.initiative, amount: money(row._sum.amount) ?? 0 }))
        .sort((a, b) => b.amount - a.amount),
    },
  };
}

export async function getActivity(id: string) {
  const activity = await findLive({ where: { id }, include: activityInclude }, prisma.charityActivity, 'That charity record does not exist');
  return toPublicActivity(activity);
}

export async function createActivity(input: CreateCharityActivityInput, actorId: string) {
  const occurredAt = input.occurredAt ?? new Date();
  const prefix = `CH-${occurredAt.getFullYear()}-`;

  return prisma.$transaction(async (tx) => {
    await lockFinanceLedger(tx);

    const last = await tx.charityActivity.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const issued = last?.code ? Number.parseInt(last.code.slice(prefix.length), 10) : 0;

    const activity = await tx.charityActivity.create({
      data: {
        code: `${prefix}${String((Number.isFinite(issued) ? issued : 0) + 1).padStart(4, '0')}`,
        item: input.item,
        initiative: input.initiative,
        vendor: input.vendor ?? null,
        amount: new Prisma.Decimal(input.amount.toFixed(2)),
        occurredAt,
        status: input.status,
        notes: input.notes ?? null,
        ledById: actorId,
      },
      include: activityInclude,
    });

    await appendFinanceEntry(tx, {
      action: 'recorded',
      entityName: 'CharityActivity',
      entityId: activity.id,
      summary: `${activity.code}: KSh ${money(activity.amount)} - ${activity.item} for ${activity.initiative}`,
      amount: activity.amount,
      actorId,
      after: { code: activity.code, item: activity.item, initiative: activity.initiative, amount: money(activity.amount) },
    });

    return toPublicActivity(activity);
  });
}

/**
 * Correcting a charity row is allowed — a mistyped vendor or an item that turns out to have been
 * mislabelled is not an accounting event — but the change is recorded before and after, and the
 * amount is one of the things that can be corrected, so the ledger shows both figures.
 */
export async function updateActivity(id: string, input: UpdateCharityActivityInput, actorId: string) {
  const before = await findLive({ where: { id } }, prisma.charityActivity, 'That charity record does not exist');

  return prisma.$transaction(async (tx) => {
    const activity = await tx.charityActivity.update({
      where: { id },
      data: {
        ...(input.item === undefined ? {} : { item: input.item }),
        ...(input.initiative === undefined ? {} : { initiative: input.initiative }),
        ...(input.vendor === undefined ? {} : { vendor: input.vendor }),
        ...(input.amount === undefined ? {} : { amount: new Prisma.Decimal(input.amount.toFixed(2)) }),
        ...(input.occurredAt === undefined ? {} : { occurredAt: input.occurredAt }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.notes === undefined ? {} : { notes: input.notes }),
      },
      include: activityInclude,
    });

    await appendFinanceEntry(tx, {
      action: 'updated',
      entityName: 'CharityActivity',
      entityId: id,
      summary: `${activity.code}: ${activity.item} corrected${money(before.amount) === money(activity.amount) ? '' : ` - KSh ${money(before.amount)} becomes KSh ${money(activity.amount)}`}`,
      amount: activity.amount,
      actorId,
      before: { item: before.item, initiative: before.initiative, vendor: before.vendor, amount: money(before.amount), status: before.status },
      after: { item: activity.item, initiative: activity.initiative, vendor: activity.vendor, amount: money(activity.amount), status: activity.status },
    });

    return toPublicActivity(activity);
  });
}
