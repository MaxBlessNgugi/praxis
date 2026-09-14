import { Prisma } from '@prisma/client';
import { money, prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { appendFinanceEntry, lockFinanceLedger } from '../lib/financeAudit';
import { assertMemberOnRegister } from './member.service';
import { nextInSeries } from './giving.service';
import { page } from '../lib/respond';
import type {
  CreateProjectInput,
  ListContributionsQuery,
  ListProjectsQuery,
  RecordContributionInput,
  UpdateProjectInput,
} from '../schemas/finance.schema';

/**
 * Project funding.
 *
 * Progress is not a stored percentage — it is asked of the contributions every time, because a
 * denominator that lives in one column and a numerator that lives in another is how a fundraising
 * board ends up disagreeing with the ledger. The screen wants three things and gets all three: cash
 * banked, pledges signed, and what is left against the target.
 */

const contributionInclude = {
  member: { select: { id: true, firstName: true, lastName: true, initials: true } },
} satisfies Prisma.ProjectContributionInclude;

type ContributionRow = Prisma.ProjectContributionGetPayload<{ include: typeof contributionInclude }>;

const toPublicContribution = (row: ContributionRow) => ({ ...row, amount: money(row.amount) });

interface FundingTotals {
  cash: number;
  pledges: number;
  target: number;
}

/** Percentage funded, rounded to one decimal. A target of zero would divide by zero, so it answers 0. */
function percentFunded({ cash, pledges, target }: FundingTotals): number {
  if (target <= 0) return 0;
  return Math.round(((cash + pledges) / target) * 1000) / 10;
}

async function totalsFor(projectIds: string[]): Promise<Map<string, FundingTotals>> {
  if (projectIds.length === 0) return new Map();

  const [projects, grouped] = await Promise.all([
    prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, targetAmount: true } }),
    prisma.projectContribution.groupBy({
      by: ['projectId', 'kind'],
      where: { projectId: { in: projectIds }, deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  const totals = new Map<string, FundingTotals>(
    projects.map((project) => [project.id, { cash: 0, pledges: 0, target: money(project.targetAmount) ?? 0 }]),
  );
  for (const row of grouped) {
    const entry = totals.get(row.projectId);
    if (!entry) continue;
    const sum = money(row._sum.amount) ?? 0;
    if (row.kind === 'pledge') entry.pledges += sum;
    else entry.cash += sum;
  }
  return totals;
}

const withProgress = (project: { id: string } & Record<string, unknown>, totals: Map<string, FundingTotals>) => {
  const funding = totals.get(project.id) ?? { cash: 0, pledges: 0, target: 0 };
  return {
    ...project,
    targetAmount: money(project.targetAmount as Prisma.Decimal),
    funding: {
      ...funding,
      receivedOrPledged: funding.cash + funding.pledges,
      outstanding: Math.max(funding.target - funding.cash - funding.pledges, 0),
      percentFunded: percentFunded(funding),
    },
  };
};

export async function listProjects(query: ListProjectsQuery) {
  const where: Prisma.ProjectWhereInput = {
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: [{ status: 'asc' }, { startsAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  const totals = await totalsFor(rows.map((row) => row.id));
  return {
    data: rows.map((project) => withProgress(project as { id: string } & Record<string, unknown>, totals)),
    meta: page(total, query),
  };
}

export async function getProject(id: string) {
  const project = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  if (!project) throw new AppError(404, 'That project does not exist', 'not_found');

  const totals = await totalsFor([project.id]);
  const contributorCount = await prisma.projectContribution.count({ where: { projectId: id, deletedAt: null } });
  return { ...withProgress(project as { id: string } & Record<string, unknown>, totals), contributorCount };
}

export async function createProject(input: CreateProjectInput, actorId: string) {
  const targetAmount = new Prisma.Decimal(input.targetAmount.toFixed(2));

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        targetAmount,
        status: input.status,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'Project',
        entityId: project.id,
        summary: `Opened the project ${project.name} with a target of KSh ${money(project.targetAmount)}`,
      },
    });
    return withProgress(project as { id: string } & Record<string, unknown>, await totalsFor([project.id]));
  });
}

/**
 * Project metadata is editable; contributions are not.
 *
 * A target or a status changes as a campaign evolves, and each change is worth recording — so the
 * before and after go into the ledger. What was actually given is a different matter and is never
 * edited, only voided.
 */
export async function updateProject(id: string, input: UpdateProjectInput, actorId: string) {
  const before = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw new AppError(404, 'That project does not exist', 'not_found');

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.targetAmount === undefined ? {} : { targetAmount: new Prisma.Decimal(input.targetAmount.toFixed(2)) }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.startsAt === undefined ? {} : { startsAt: input.startsAt }),
        ...(input.endsAt === undefined ? {} : { endsAt: input.endsAt }),
      },
    });

    await appendFinanceEntry(tx, {
      action: 'updated',
      entityName: 'Project',
      entityId: id,
      summary: `Updated ${project.name} (${before.status} becomes ${project.status}, target KSh ${money(before.targetAmount)} becomes KSh ${money(project.targetAmount)})`,
      amount: project.targetAmount,
      actorId,
      before: { name: before.name, status: before.status, targetAmount: money(before.targetAmount) },
      after: { name: project.name, status: project.status, targetAmount: money(project.targetAmount) },
    });

    return withProgress(project as { id: string } & Record<string, unknown>, await totalsFor([project.id]));
  });
}

export async function listContributions(projectId: string, query: ListContributionsQuery) {
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true } });
  if (!project) throw new AppError(404, 'That project does not exist', 'not_found');

  const where: Prisma.ProjectContributionWhereInput = {
    projectId,
    deletedAt: null,
    ...(query.kind ? { kind: query.kind } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.projectContribution.count({ where }),
    prisma.projectContribution.findMany({
      where,
      include: contributionInclude,
      orderBy: { contributedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    data: rows.map(toPublicContribution),
    meta: page(total, query),
  };
}

export async function recordContribution(projectId: string, input: RecordContributionInput, actorId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
  if (!project) throw new AppError(404, 'That project does not exist', 'not_found');
  if (project.status === 'completed') {
    throw new AppError(409, 'That project is closed; reopen it before recording against it', 'project_closed');
  }
  if (input.memberId) await assertMemberOnRegister(input.memberId);

  const contributedAt = input.contributedAt ?? new Date();
  const prefix = `PC-${contributedAt.getFullYear()}-`;
  const amount = new Prisma.Decimal(input.amount.toFixed(2));

  return prisma.$transaction(async (tx) => {
    await lockFinanceLedger(tx);

    const last = await tx.projectContribution.findFirst({
      where: { txCode: { startsWith: prefix } },
      orderBy: { txCode: 'desc' },
      select: { txCode: true },
    });

    const contribution = await tx.projectContribution.create({
      data: {
        txCode: nextInSeries(last?.txCode, prefix),
        projectId,
        memberId: input.memberId ?? null,
        donorName: input.donorName,
        amount,
        method: input.method,
        kind: input.kind,
        reference: input.reference ?? null,
        contributedAt,
      },
      include: contributionInclude,
    });

    await appendFinanceEntry(tx, {
      action: 'recorded',
      entityName: 'ProjectContribution',
      entityId: contribution.id,
      summary: `${contribution.txCode}: ${contribution.donorName} ${input.kind === 'pledge' ? 'pledged' : 'gave'} KSh ${money(contribution.amount)} to ${project.name}`,
      amount: contribution.amount,
      actorId,
      after: { projectId, kind: contribution.kind, amount: money(contribution.amount), donorName: contribution.donorName },
    });

    return toPublicContribution(contribution);
  });
}
