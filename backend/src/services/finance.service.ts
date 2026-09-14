import { Prisma } from '@prisma/client';
import { money, prisma } from '../lib/prisma';
import { appendFinanceEntry } from '../lib/financeAudit';
import { FINANCE_ENTITY_NAMES, restoreArchived, retireRecord } from '../lib/archive';
import { page } from '../lib/respond';
import type {
  FinanceSummaryQuery,
  ListFinanceAuditQuery,
  ListTrashQuery,
  VoidFinanceRecordInput,
} from '../schemas/finance.schema';

/**
 * The finance module's shared rules: what the whole treasury adds up to, how a financial record is
 * voided and brought back, and how the ledger is read.
 *
 * Voiding lives here rather than five times over because it must behave identically for a tithe and
 * for a project: the row stays, the reason is kept, the archive entry is written, and the ledger gets
 * a line — in one transaction. Five copies of that rule is five chances for one of them to forget the
 * ledger.
 */

// ---------------------------------------------------------------------------------------------
// Voiding and restoring
// ---------------------------------------------------------------------------------------------

/**
 * The finance entities the voiding endpoint accepts, and the archive name each one retires as.
 *
 * The URL says `tithe`, the archive says `Tithe`, and the table is the archive module's business — it
 * already holds that mapping for both retiring and restoring, so this is only the translation the
 * endpoint needs. A project contribution is here for the same reason as the rest: a pledge keyed
 * against the wrong campaign has to be voidable without deleting the evidence that it was entered.
 */
const FINANCE_ENTITIES = {
  tithe: 'Tithe',
  offering: 'Offering',
  project: 'Project',
  contribution: 'ProjectContribution',
  welfare: 'WelfareDisbursement',
  charity: 'CharityActivity',
} as const;

export type FinanceEntity = keyof typeof FINANCE_ENTITIES;

const ARCHIVE_NAME_TO_ENTITY = new Map<string, FinanceEntity>(
  Object.entries(FINANCE_ENTITIES).map(([entity, archiveName]) => [archiveName, entity as FinanceEntity]),
);

/**
 * The label the Trash screen shows: whatever a person would recognise the row by.
 *
 * Plain ASCII punctuation throughout this file's stored text, deliberately. A Postgres created under
 * a Windows locale (English_Kenya here) is WIN1252, not UTF8, and an em dash or an arrow in an audit
 * summary makes the INSERT fail — which surfaces as a 500 *inside the payment's transaction*, so the
 * money is refused because of a punctuation mark. Nothing the app writes is allowed to depend on the
 * database's encoding; the encoding is fixed separately, in the README's setup steps.
 */
function labelOf(entity: FinanceEntity, row: Record<string, unknown>): string {
  switch (entity) {
    case 'tithe':
      return `${String(row.txCode)} - ${String(row.donorName)}`;
    case 'offering':
      return String(row.txCode);
    case 'project':
      return String(row.name);
    case 'contribution':
      return `${String(row.txCode)} - ${String(row.donorName)}`;
    case 'welfare':
      return `${String(row.caseCode)} - ${String(row.beneficiaryName)}`;
    case 'charity':
      return `${String(row.code)} - ${String(row.item)}`;
  }
}

const amountOf = (entity: FinanceEntity, row: Record<string, unknown>): Prisma.Decimal =>
  (entity === 'project' ? row.targetAmount : row.amount) as Prisma.Decimal;

export async function voidRecord(entity: FinanceEntity, id: string, input: VoidFinanceRecordInput, actorId: string) {
  const archiveName = FINANCE_ENTITIES[entity];

  return retireRecord(archiveName, id, {
    reason: input.reason,
    reasonLabel: input.reasonLabel,
    actorId,
    missing: `That ${entity} record does not exist`,
    label: (row) => labelOf(entity, row),
    // The ledger line commits with the void or not at all: a payment voided without its entry is the
    // hole the chain exists to close.
    after: async (tx, row) => {
      await appendFinanceEntry(tx, {
        action: 'voided',
        entityName: archiveName,
        entityId: id,
        summary: `${labelOf(entity, row)} voided: ${input.reasonLabel}`,
        amount: amountOf(entity, row),
        actorId,
        before: { voided: false },
        after: { voided: true, reason: input.reason, reasonLabel: input.reasonLabel },
      });
    },
  });
}

/**
 * Bring a voided record back — the finance door, which may only open for money. The rule itself
 * lives in lib/archive, shared with the admin trash.
 */
export function restoreRecord(recordId: string, actorId: string) {
  return restoreArchived(recordId, actorId, FINANCE_ENTITY_NAMES);
}

export async function listTrash(query: ListTrashQuery) {
  const where: Prisma.SoftDeletedRecordWhereInput = {
    entityName: { in: [...ARCHIVE_NAME_TO_ENTITY.keys()] },
    restoredAt: null,
  };

  const [total, rows] = await Promise.all([
    prisma.softDeletedRecord.count({ where }),
    prisma.softDeletedRecord.findMany({
      where,
      orderBy: { deletedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    data: rows,
    meta: page(total, query),
  };
}

// ---------------------------------------------------------------------------------------------
// The audit ledger
// ---------------------------------------------------------------------------------------------

export async function listAudit(query: ListFinanceAuditQuery) {
  const where: Prisma.FinanceAuditEntryWhereInput = {
    ...(query.entityName ? { entityName: query.entityName } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.from || query.to
      ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  };

  const [total, rows, totalValue] = await Promise.all([
    prisma.financeAuditEntry.count({ where }),
    prisma.financeAuditEntry.findMany({
      where,
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { sequence: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.financeAuditEntry.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    data: rows.map((entry) => ({ ...entry, amount: money(entry.amount) })),
    meta: page(total, query),
    totals: { amount: money(totalValue._sum.amount) },
  };
}

// ---------------------------------------------------------------------------------------------
// The treasury at a glance
// ---------------------------------------------------------------------------------------------

/**
 * Every total the finance section needs, for one period.
 *
 * No date range means all time, which is deliberate: defaulting to "this month" would show a
 * treasurer a screen full of zeroes on the first of the month and look broken. Range filtering is
 * the caller's decision, and the console passes its own.
 */
export async function summary(query: FinanceSummaryQuery) {
  const window = query.from || query.to ? { gte: query.from, lte: query.to } : undefined;
  const live = { deletedAt: null };

  const [tithes, offerings, contributions, welfare, charity, givenByMethod, givenByCategory] = await Promise.all([
    prisma.tithe.aggregate({ where: { ...live, ...(window ? { receivedAt: window } : {}) }, _sum: { amount: true }, _count: true }),
    prisma.offering.aggregate({ where: { ...live, ...(window ? { receivedAt: window } : {}) }, _sum: { amount: true }, _count: true }),
    prisma.projectContribution.groupBy({
      by: ['kind'],
      where: { ...live, ...(window ? { contributedAt: window } : {}) },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.welfareDisbursement.groupBy({
      by: ['status'],
      where: { ...live, ...(window ? { requestedAt: window } : {}) },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.charityActivity.aggregate({ where: { ...live, ...(window ? { occurredAt: window } : {}) }, _sum: { amount: true }, _count: true }),
    prisma.tithe.groupBy({
      by: ['method'],
      where: { ...live, ...(window ? { receivedAt: window } : {}) },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.tithe.groupBy({
      by: ['category'],
      where: { ...live, ...(window ? { receivedAt: window } : {}) },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const contributionTotals = { cash: 0, pledges: 0, cashCount: 0, pledgeCount: 0 };
  for (const row of contributions) {
    const sum = money(row._sum.amount) ?? 0;
    if (row.kind === 'pledge') {
      contributionTotals.pledges += sum;
      contributionTotals.pledgeCount += row._count;
    } else {
      contributionTotals.cash += sum;
      contributionTotals.cashCount += row._count;
    }
  }

  const welfareTotals = { disbursed: 0, awaitingPayment: 0, declined: 0, openCases: 0 };
  for (const row of welfare) {
    const sum = money(row._sum.amount) ?? 0;
    if (row.status === 'disbursed') welfareTotals.disbursed += sum;
    else if (row.status === 'approved') welfareTotals.awaitingPayment += sum;
    else if (row.status === 'declined') welfareTotals.declined += sum;
    else welfareTotals.openCases += row._count;
  }

  const titheTotal = money(tithes._sum.amount) ?? 0;
  const offeringTotal = money(offerings._sum.amount) ?? 0;

  return {
    period: { from: query.from ?? null, to: query.to ?? null },
    giving: {
      tithes: { total: titheTotal, count: tithes._count },
      offerings: { total: offeringTotal, count: offerings._count },
      total: titheTotal + offeringTotal,
    },
    projects: {
      cash: contributionTotals.cash,
      pledges: contributionTotals.pledges,
      contributions: contributionTotals.cashCount,
      pledgeCount: contributionTotals.pledgeCount,
      // What the church actually holds today, which is cash only.
      received: contributionTotals.cash,
    },
    welfare: welfareTotals,
    charity: { total: money(charity._sum.amount) ?? 0, count: charity._count },
    givingByMethod: givenByMethod
      .map((row) => ({ method: row.method, amount: money(row._sum.amount) ?? 0, count: row._count }))
      .sort((a, b) => b.amount - a.amount),
    givingByCategory: givenByCategory
      .map((row) => ({ category: row.category, amount: money(row._sum.amount) ?? 0, count: row._count }))
      .sort((a, b) => b.amount - a.amount),
  };
}
