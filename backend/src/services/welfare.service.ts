import { Prisma } from '@prisma/client';
import { money, prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { appendFinanceEntry } from '../lib/financeAudit';
import { assertMemberOnRegister } from './member.service';
import { page } from '../lib/respond';
import type {
  DecideWelfareInput,
  DisburseWelfareInput,
  ListWelfareQuery,
  OpenWelfareCaseInput,
} from '../schemas/finance.schema';

/**
 * Welfare: relief given to a household in trouble.
 *
 * A case moves `requested → approved → disbursed`, or `requested → declined` at the approval step.
 * The path is enforced rather than assumed, because the whole point of the fund is to answer two
 * different questions honestly — "what has been promised?" and "what has actually left the account?"
 * — and a case that can jump straight to `disbursed` answers neither.
 */

const caseInclude = {
  member: { select: { id: true, firstName: true, lastName: true, initials: true, phone: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, name: true } },
} satisfies Prisma.WelfareDisbursementInclude;

type WelfareRow = Prisma.WelfareDisbursementGetPayload<{ include: typeof caseInclude }>;

const toPublicCase = (row: WelfareRow) => ({ ...row, amount: money(row.amount) });

export async function listCases(query: ListWelfareQuery) {
  const where: Prisma.WelfareDisbursementWhereInput = {
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.memberId ? { memberId: query.memberId } : {}),
    ...(query.from || query.to
      ? { requestedAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
    ...(query.q
      ? {
          OR: [
            { caseCode: { contains: query.q, mode: 'insensitive' as const } },
            { beneficiaryName: { contains: query.q, mode: 'insensitive' as const } },
            { purpose: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, rows, byStatus] = await Promise.all([
    prisma.welfareDisbursement.count({ where }),
    prisma.welfareDisbursement.findMany({
      where,
      include: caseInclude,
      orderBy: [{ requestedAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.welfareDisbursement.groupBy({
      by: ['status'],
      where: { ...where, status: undefined },
      _sum: { amount: true },
    }),
  ]);

  // The fund's two running totals: money actually paid out, and money promised but not yet paid.
  const totals = { disbursed: 0, awaitingPayment: 0 };
  for (const row of byStatus) {
    const sum = money(row._sum.amount) ?? 0;
    if (row.status === 'disbursed') totals.disbursed += sum;
    else if (row.status === 'approved') totals.awaitingPayment += sum;
  }

  return {
    data: rows.map(toPublicCase),
    meta: page(total, query),
    totals,
  };
}

export async function getCase(id: string) {
  const welfareCase = await prisma.welfareDisbursement.findFirst({ where: { id, deletedAt: null }, include: caseInclude });
  if (!welfareCase) throw new AppError(404, 'That welfare case does not exist', 'not_found');
  return toPublicCase(welfareCase);
}

export async function openCase(input: OpenWelfareCaseInput, actorId: string) {
  if (input.memberId) await assertMemberOnRegister(input.memberId, 'That beneficiary');
  if (input.assignedToId) await assertMemberOnRegister(input.assignedToId, 'That deacon');

  const requestedAt = new Date();
  const prefix = `WF-${requestedAt.getFullYear()}-`;

  return prisma.$transaction(async (tx) => {
    const last = await tx.welfareDisbursement.findFirst({
      where: { caseCode: { startsWith: prefix } },
      orderBy: { caseCode: 'desc' },
      select: { caseCode: true },
    });
    const issued = last?.caseCode ? Number.parseInt(last.caseCode.slice(prefix.length), 10) : 0;

    const welfareCase = await tx.welfareDisbursement.create({
      data: {
        caseCode: `${prefix}${String((Number.isFinite(issued) ? issued : 0) + 1).padStart(4, '0')}`,
        memberId: input.memberId ?? null,
        beneficiaryName: input.beneficiaryName,
        amount: new Prisma.Decimal(input.amount.toFixed(2)),
        purpose: input.purpose,
        category: input.category,
        assignedToId: input.assignedToId ?? null,
        notes: input.notes ?? null,
        requestedAt,
      },
      include: caseInclude,
    });

    await appendFinanceEntry(tx, {
      action: 'recorded',
      entityName: 'WelfareDisbursement',
      entityId: welfareCase.id,
      summary: `${welfareCase.caseCode}: KSh ${money(welfareCase.amount)} requested for ${welfareCase.beneficiaryName} (${welfareCase.category})`,
      amount: welfareCase.amount,
      actorId,
      after: { caseCode: welfareCase.caseCode, beneficiaryName: welfareCase.beneficiaryName, amount: money(welfareCase.amount), category: welfareCase.category },
    });

    return toPublicCase(welfareCase);
  });
}

export async function decideCase(id: string, input: DecideWelfareInput, actorId: string) {
  const existing = await prisma.welfareDisbursement.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError(404, 'That welfare case does not exist', 'not_found');
  if (existing.status !== 'requested') {
    throw new AppError(409, `That case was already ${existing.status}`, 'already_decided');
  }

  return prisma.$transaction(async (tx) => {
    const welfareCase = await tx.welfareDisbursement.update({
      where: { id },
      data: {
        status: input.decision,
        approvedById: actorId,
        ...(input.note ? { notes: input.note } : {}),
      },
      include: caseInclude,
    });

    await appendFinanceEntry(tx, {
      action: input.decision,
      entityName: 'WelfareDisbursement',
      entityId: id,
      summary: `${welfareCase.caseCode}: ${input.decision} - KSh ${money(welfareCase.amount)} for ${welfareCase.beneficiaryName}${input.note ? ` (${input.note})` : ''}`,
      amount: welfareCase.amount,
      actorId,
      before: { status: existing.status },
      after: { status: welfareCase.status },
    });

    return toPublicCase(welfareCase);
  });
}

/** The moment money actually leaves. Recorded separately from approval, with its own date. */
export async function disburseCase(id: string, input: DisburseWelfareInput, actorId: string) {
  const existing = await prisma.welfareDisbursement.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError(404, 'That welfare case does not exist', 'not_found');
  if (existing.status !== 'approved') {
    throw new AppError(
      409,
      existing.status === 'disbursed' ? 'That case has already been paid out' : 'Only an approved case can be paid out',
      'not_approved',
    );
  }

  const disbursedAt = input.disbursedAt ?? new Date();

  return prisma.$transaction(async (tx) => {
    const welfareCase = await tx.welfareDisbursement.update({
      where: { id },
      data: { status: 'disbursed', disbursedAt, ...(input.note ? { notes: input.note } : {}) },
      include: caseInclude,
    });

    await appendFinanceEntry(tx, {
      action: 'disbursed',
      entityName: 'WelfareDisbursement',
      entityId: id,
      summary: `${welfareCase.caseCode}: KSh ${money(welfareCase.amount)} paid out to ${welfareCase.beneficiaryName}`,
      amount: welfareCase.amount,
      actorId,
      before: { status: existing.status, disbursedAt: null },
      after: { status: welfareCase.status, disbursedAt: disbursedAt.toISOString() },
    });

    return toPublicCase(welfareCase);
  });
}
