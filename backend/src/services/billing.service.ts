import { Prisma, type Plan, type Subscription, type SubscriptionStatus } from '@prisma/client';
import { basePrisma, clientFor, money, prisma, type Db } from '../lib/prisma';
import { requireTenantId } from '../lib/tenant';
import { live } from '../lib/live';
import { page } from '../lib/respond';
import { AppError, notFoundError } from '../middleware/errorHandler';
import type {
  AssignPlanInput,
  CreatePlanInput,
  ListOrganizationsQuery,
  RecordPaymentInput,
  RequestUpgradeInput,
} from '../schemas/billing.schema';

/**
 * Plans, subscriptions and the money that moves between them.
 *
 * Three decisions shape everything below.
 *
 * **A plan is a platform row; a subscription belongs to one church.** The catalogue is the same for
 * every parish, so it is not per-tenant — but a subscription carries `organizationId`, so the church's
 * own screens read theirs through the tenant-scoped client and cannot see anybody else's. The vendor's
 * operations deliberately step outside that, and each says so where it does.
 *
 * **Status is a decision *and* a date.** `active` is what somebody recorded when the money arrived;
 * whether the period has run out since is a fact about the calendar. `nextStatus` holds the second
 * half, in one place, so the gate, the church's billing screen and the vendor's list cannot disagree.
 *
 * **A lapsed church can still read.** Writes stop, the console says why, and nothing is deleted —
 * see `middleware/subscription.ts`. A church locked out of its own register by a bookkeeping slip is a
 * worse failure than an unbilled month.
 */

const DAY = 86_400_000;

/**
 * How long a church keeps working after its trial or paid period ends.
 *
 * Two weeks is not a billing nicety: a parish treasurer's handover, a harvest month, a treasurer's own
 * travel, all of it happens. The gate stays open through the grace period and *says so* the whole time,
 * so the lapse is never a surprise when writes finally stop.
 */
export const GRACE_DAYS = 14;

export interface PlanLimits {
  maxMembers?: number;
  maxUsers?: number;
}

/** Dates move by calendar month, not by thirty days: a church that pays on the 15th is due on the 15th. */
function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function limitsOf(plan: Pick<Plan, 'limits'>): PlanLimits {
  const raw = (plan.limits ?? {}) as Record<string, unknown>;
  const read = (key: string) => (typeof raw[key] === 'number' ? (raw[key] as number) : undefined);
  return { maxMembers: read('maxMembers'), maxUsers: read('maxUsers') };
}

/** What the console is told about a plan. Money leaves as a plain number, like everywhere else. */
export interface PublicPlan {
  key: string;
  name: string;
  tagline: string | null;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  trialDays: number;
  limits: PlanLimits;
  features: string[];
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
}

export function toPublicPlan(plan: Plan): PublicPlan {
  return {
    key: plan.key,
    name: plan.name,
    tagline: plan.tagline,
    price: money(plan.price) ?? 0,
    currency: plan.currency,
    interval: plan.interval,
    trialDays: plan.trialDays,
    limits: limitsOf(plan),
    features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
    isPublic: plan.isPublic,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  };
}

export interface SubscriptionView {
  status: SubscriptionStatus;
  plan: PublicPlan;
  /** Null once the church is paying; kept afterwards so the screen can say when the trial ran out. */
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  requestedPlan: { key: string; name: string } | null;
  requestedAt: string | null;
  notes: string | null;
  /** Days left in the trial or the paid period — negative once it has passed. */
  daysLeft: number | null;
  /** The day writes stop if nothing is paid. Null while the church owes nothing. */
  graceEndsAt: string | null;
  usage: { members: number; users: number };
  limits: PlanLimits;
  /** The sentence the console puts at the top of the screen, written once, here. */
  headline: string;
}

interface Clocked {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

/**
 * What the calendar says the status should be.
 *
 * A payment is a *decision* and its expiry is a *fact*, and they never live in the same column — so
 * the stored status is the last decision and this is the fact applied to it. A church that pays comes
 * back to `active` from anywhere, including `expired`, which is the whole point of not deleting
 * anything when a subscription lapses.
 */
export function nextStatus(subscription: Clocked, now = new Date()): SubscriptionStatus {
  const grace = GRACE_DAYS * DAY;
  const ended = (date: Date | null) => date !== null && now.getTime() > date.getTime();

  switch (subscription.status) {
    case 'trial':
      if (!subscription.trialEndsAt) return 'trial';
      if (now.getTime() > subscription.trialEndsAt.getTime() + grace) return 'expired';
      return ended(subscription.trialEndsAt) ? 'past_due' : 'trial';
    case 'active':
      return ended(subscription.currentPeriodEnd) ? 'past_due' : 'active';
    case 'past_due':
      if (!subscription.currentPeriodEnd) return 'past_due';
      return now.getTime() > subscription.currentPeriodEnd.getTime() + grace ? 'expired' : 'past_due';
    case 'cancelled':
      // Leaving is not the same as lapsing: a church that gave notice keeps its access to the end of
      // the period it has already paid for.
      return ended(subscription.currentPeriodEnd) ? 'expired' : 'cancelled';
    case 'expired':
      return 'expired';
  }
}

/** Whole days from now until `date`, or null when there is no date to count to. */
function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / DAY);
}

function graceEndsAt(subscription: Clocked): Date | null {
  const ends = subscription.status === 'trial' ? subscription.trialEndsAt : subscription.currentPeriodEnd;
  if (!ends) return null;
  return new Date(ends.getTime() + GRACE_DAYS * DAY);
}

/**
 * The sentence the console shows. Written here rather than in the React component because the answer
 * depends on the dates, and a client that re-derives it from a status string will eventually disagree
 * with the server about whether a church is in trouble.
 */
function headlineFor(status: SubscriptionStatus, plan: Plan, clock: Clocked): string {
  const planName = plan.name;
  switch (status) {
    case 'trial': {
      const left = daysUntil(clock.trialEndsAt);
      return left === null
        ? `You are on the ${planName} plan's free period.`
        : `Your free ${planName} trial ends in ${left} day${left === 1 ? '' : 's'}.`;
    }
    case 'active': {
      const left = daysUntil(clock.currentPeriodEnd);
      return left === null
        ? `Your ${planName} subscription is paid up.`
        : `Your ${planName} subscription is paid up until ${clock.currentPeriodEnd?.toDateString() ?? 'the end of the period'} (${left} day${left === 1 ? '' : 's'}).`;
    }
    case 'past_due': {
      const left = daysUntil(clock.currentPeriodEnd ?? clock.trialEndsAt);
      if (left === null) return `Your ${planName} plan is waiting to be paid — please speak to Praxis.`;
      // A period that has not ended yet: an operator has marked the church unpaid because the invoice
      // has gone out and the money is expected. Counting down from a date still in the future would
      // report the church as late for days it has not had yet, so this case says what is true.
      if (left > 0) {
        return `Your ${planName} payment for the period ending ${clock.currentPeriodEnd?.toDateString() ?? 'this period'} has been requested — everything still works.`;
      }
      const over = Math.abs(left);
      return `Your ${planName} payment is ${over} day${over === 1 ? '' : 's'} overdue. Everything still works — please arrange it with Praxis.`;
    }
    case 'cancelled':
      return `Your ${planName} subscription is cancelled and runs to the end of the paid period.`;
    case 'expired':
      return `Your ${planName} subscription has lapsed, so the records are read-only until it is restored. Nothing has been deleted.`;
  }
}

async function usageFor(client: Db): Promise<{ members: number; users: number }> {
  const [members, users] = await Promise.all([
    client.member.count({ where: live }),
    client.organizationMember.count({ where: { isActive: true, ...live } }),
  ]);
  return { members, users };
}

type SubscriptionWithPlan = Subscription & { plan: Plan; requestedPlan: Plan | null };

function toView(subscription: SubscriptionWithPlan, status: SubscriptionStatus, usage: { members: number; users: number }): SubscriptionView {
  return {
    status,
    plan: toPublicPlan(subscription.plan),
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
    requestedPlan: subscription.requestedPlan ? { key: subscription.requestedPlan.key, name: subscription.requestedPlan.name } : null,
    requestedAt: subscription.requestedAt?.toISOString() ?? null,
    notes: subscription.notes,
    daysLeft: daysUntil(status === 'trial' ? subscription.trialEndsAt : subscription.currentPeriodEnd),
    graceEndsAt: status === 'active' || status === 'cancelled' ? null : (graceEndsAt(subscription)?.toISOString() ?? null),
    usage,
    limits: limitsOf(subscription.plan),
    headline: headlineFor(status, subscription.plan, subscription),
  };
}

/**
 * This church's subscription, with the clock's verdict applied.
 *
 * The verdict is written back when it has changed — once per state change, not once per request — so
 * the row the vendor lists and the row the church reads are the same row. A church with no
 * subscription at all answers null rather than throwing: that is an operator-created parish that has
 * not been put on a plan yet, which is a gap to fill, not a lapse to punish.
 */
async function subscriptionView(client: Db, organizationId: string): Promise<SubscriptionView | null> {
  const row = await client.subscription.findFirst({
    where: { organizationId },
    include: { plan: true, requestedPlan: true },
  });
  if (!row) return null;

  const status = nextStatus(row);
  if (status !== row.status) {
    await client.subscription.update({ where: { id: row.id }, data: { status } });
  }

  return toView({ ...row, status }, status, await usageFor(client));
}

export const currentSubscription = (): Promise<SubscriptionView | null> => subscriptionView(prisma, requireTenantId());

/**
 * The same view for a church named explicitly, for the two moments that run before a request context
 * exists: signing in, and signing a church up. Both already know which church they mean.
 */
export const subscriptionForOrganization = (organizationId: string): Promise<SubscriptionView | null> =>
  subscriptionView(clientFor(organizationId), organizationId);

/** The plan a church lands on when it has not chosen one: the first one the platform offers. */
export async function defaultPlan(): Promise<Plan> {
  const plan = await basePrisma.plan.findFirst({
    where: { isActive: true, isPublic: true },
    orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  });
  if (!plan) throw new AppError(503, 'No subscription plan is configured — ask Praxis to add one', 'no_plan_configured');
  return plan;
}

/** The plans a church may move to. The largest parishes are quoted by hand, so they are not listed. */
export async function planCatalogue(): Promise<PublicPlan[]> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true, isPublic: true },
    orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  });
  return plans.map(toPublicPlan);
}

/** Every plan, including the ones only Praxis offers. The vendor's list. */
export async function allPlans(): Promise<PublicPlan[]> {
  const plans = await basePrisma.plan.findMany({ orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }] });
  return plans.map(toPublicPlan);
}

export async function listPayments() {
  const payments = await prisma.subscriptionPayment.findMany({
    include: { recordedBy: { select: { id: true, name: true } } },
    orderBy: { receivedAt: 'desc' },
    take: 50,
  });
  return payments.map((payment) => ({
    ...payment,
    amount: money(payment.amount) ?? 0,
    receivedAt: payment.receivedAt.toISOString(),
    createdAt: payment.createdAt.toISOString(),
    periodStart: payment.periodStart?.toISOString() ?? null,
    periodEnd: payment.periodEnd?.toISOString() ?? null,
  }));
}

/**
 * A church asking to move up (or down).
 *
 * The request is a row rather than an email, so the office is not the only one holding it: the vendor's
 * list shows what each church is waiting for. Nothing changes about the plan until Praxis confirms,
 * which is what "manual billing for now" has to mean if the invoices are to mean anything.
 */
export async function requestUpgrade(input: RequestUpgradeInput, actorId: string): Promise<SubscriptionView | null> {
  const organizationId = requireTenantId();
  const subscription = await prisma.subscription.findFirst({ where: { organizationId } });
  if (!subscription) throw notFoundError('A subscription for this church');

  const plan = await prisma.plan.findFirst({ where: { key: input.planKey, isActive: true } });
  if (!plan) throw notFoundError(`The ${input.planKey} plan`);

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscription.id },
      data: { requestedPlanId: plan.id, requestedAt: new Date(), ...(input.note ? { notes: input.note } : {}) },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Subscription',
        entityId: subscription.id,
        summary: `Asked Praxis to move to the ${plan.name} plan`,
      },
    });
  });

  return currentSubscription();
}

/**
 * Refuse the write that would take a church past its plan.
 *
 * Called from the two services that create the limited things — a member and an account — rather than
 * from a route, so a new endpoint that creates one is covered without remembering this exists. A plan
 * whose `limits` do not mention the key is unlimited, and a church with no subscription at all is not
 * gated: see `currentSubscription`.
 */
export async function assertWithinPlan(limit: 'maxMembers' | 'maxUsers', adding = 1): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription || subscription.status === 'expired') return;

  const cap = subscription.limits[limit];
  if (cap === undefined) return;

  const used = limit === 'maxMembers' ? subscription.usage.members : subscription.usage.users;
  if (used + adding <= cap) return;

  const what = limit === 'maxMembers' ? 'people on the register' : 'staff accounts';
  // A batch says how much room is left, because "move to a larger plan" is the wrong advice for a
  // spreadsheet that only overshoots by nine rows.
  const detail =
    adding === 1
      ? `The ${subscription.plan.name} plan covers ${cap} ${what}, and this church is using all of them. Move to a larger plan and the office can carry on straight away.`
      : `The ${subscription.plan.name} plan covers ${cap} ${what}: ${Math.max(0, cap - used)} left, and this would add ${adding}. Move to a larger plan, or bring the rest in afterwards.`;
  throw new AppError(402, detail, 'plan_limit_reached');
}

// ==================== the vendor's side ====================
/**
 * Everything below deliberately steps outside one church.
 *
 * A vendor is not inside a parish — that is the whole point of the role — so these reads span churches
 * and these writes name the church they act for. They are reached only through `requirePlatformAdmin`,
 * and `clientFor(organizationId)` keeps the writes to a church the operator is looking at rather than
 * letting them inherit whichever church the operator's own account happens to sit in.
 */

export interface VendorOrganization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  onboardedAt: string | null;
  createdAt: string;
  /** The clock's verdict, not the stored decision — see `nextStatus`. */
  status: SubscriptionStatus | 'none';
  plan: { key: string; name: string } | null;
  requestedPlan: { key: string; name: string } | null;
  requestedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  usage: { members: number; users: number };
  limits: PlanLimits;
  /** What the church pays each period, for the vendor's own arithmetic. */
  price: number;
  currency: string;
}

type OrganizationWithSubscription = Prisma.OrganizationGetPayload<{
  include: {
    subscription: { include: { plan: true; requestedPlan: true } };
    _count: { select: { members: true; memberships: true } };
  };
}>;

function toVendorOrganization(row: OrganizationWithSubscription): VendorOrganization {
  const subscription = row.subscription;
  const status: SubscriptionStatus | 'none' = subscription ? nextStatus(subscription) : 'none';
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.isActive,
    onboardedAt: row.onboardedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    status,
    plan: subscription ? { key: subscription.plan.key, name: subscription.plan.name } : null,
    requestedPlan: subscription?.requestedPlan ? { key: subscription.requestedPlan.key, name: subscription.requestedPlan.name } : null,
    requestedAt: subscription?.requestedAt?.toISOString() ?? null,
    trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    graceEndsAt: subscription ? (graceEndsAt(subscription)?.toISOString() ?? null) : null,
    usage: { members: row._count.members, users: row._count.memberships },
    limits: subscription ? limitsOf(subscription.plan) : {},
    price: subscription ? (money(subscription.plan.price) ?? 0) : 0,
    currency: subscription?.plan.currency ?? 'KES',
  };
}

/**
 * How many churches the vendor list reads at once.
 *
 * It is filtered and paged in memory on purpose. `past_due` and `expired` are the clock's verdict
 * rather than stored columns, so a `WHERE status = 'expired'` would answer a different question than
 * the operator asked — and a list of overdue churches that quietly omits the one whose period ended
 * this morning is worse than no filter at all. A few hundred parishes is the shape of this list.
 */
const VENDOR_LIST_LIMIT = 500;

/** Every church, its standing, and what it is waiting for. */
export async function listOrganizations(query: ListOrganizationsQuery) {
  const rows = await basePrisma.organization.findMany({
    where: {
      ...live,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { slug: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    include: {
      subscription: { include: { plan: true, requestedPlan: true } },
      _count: { select: { members: { where: live }, memberships: { where: { isActive: true, ...live } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: VENDOR_LIST_LIMIT,
  });

  const all = rows.map(toVendorOrganization);
  const filtered = query.status ? all.filter((row) => row.status === query.status) : all;
  const start = (query.page - 1) * query.pageSize;

  return { data: filtered.slice(start, start + query.pageSize), meta: page(filtered.length, query) };
}

export async function organizationSubscription(organizationId: string): Promise<VendorOrganization> {
  const row = await basePrisma.organization.findFirst({
    where: { id: organizationId, ...live },
    include: {
      subscription: { include: { plan: true, requestedPlan: true } },
      _count: { select: { members: { where: live }, memberships: { where: { isActive: true, ...live } } } },
    },
  });
  if (!row) throw notFoundError('That church');
  return toVendorOrganization(row);
}

/** Create or change a plan. Keyed on `key`, so seeding and the vendor screen use one door. */
export async function savePlan(input: CreatePlanInput, actorId: string): Promise<PublicPlan> {
  const data = {
    name: input.name,
    tagline: input.tagline ?? null,
    price: new Prisma.Decimal(input.price),
    currency: input.currency,
    interval: input.interval,
    trialDays: input.trialDays,
    limits: input.limits as Prisma.InputJsonValue,
    features: input.features as Prisma.InputJsonValue,
    isPublic: input.isPublic,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  };

  const plan = await basePrisma.plan.upsert({
    where: { key: input.key },
    create: { key: input.key, ...data },
    update: data,
  });

  // A plan is not any one church's, but the audit line has to be filed somewhere, and the operator's
  // own church is the honest place: a parish's history should stay a record of its own staff. The
  // church being changed gets its own entry inside `assignPlan` and `recordPayment`.
  await basePrisma.auditLog.create({
    data: {
      organizationId: requireTenantId(),
      actorId,
      action: 'update',
      entityName: 'Plan',
      entityId: plan.id,
      summary: `Saved the ${plan.name} plan (${input.currency} ${input.price}/${input.interval})`,
    },
  });

  return toPublicPlan(plan);
}

/** Put a church on a plan, start or extend a trial, or record a decision the clock cannot derive. */
export async function assignPlan(organizationId: string, input: AssignPlanInput, actorId: string): Promise<VendorOrganization> {
  const plan = await basePrisma.plan.findFirst({ where: { key: input.planKey, isActive: true } });
  if (!plan) throw notFoundError(`The ${input.planKey} plan`);

  // The clock (`nextStatus`) can only *advance* a decision — it can never see that `active` has no
  // paid period behind it, or that `past_due` has nothing overdue — so a pinned status without its
  // dates would freeze a church into a state every later read silently agrees with. Refuse those
  // here rather than write a row the calendar cannot correct.
  if ((input.status === 'active' || input.status === 'past_due') && !input.periodMonths) {
    throw new AppError(
      400,
      `Setting a church to ${input.status} needs the months already paid, so the period it names is real. Record a payment instead, or grant trial days.`,
      'status_needs_period',
    );
  }

  const now = new Date();
  const client = clientFor(organizationId);

  const period = input.periodMonths
    ? { currentPeriodStart: now, currentPeriodEnd: addMonths(now, input.periodMonths) }
    : {};
  const trial = input.trialDays !== undefined ? { trialEndsAt: new Date(now.getTime() + input.trialDays * DAY) } : {};

  await client.$transaction(async (tx) => {
    const subscription = await tx.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId: plan.id,
        status: input.status ?? (input.trialDays !== undefined ? 'trial' : 'active'),
        ...trial,
        ...period,
        notes: input.note ?? null,
      },
      update: {
        planId: plan.id,
        ...(input.status ? { status: input.status } : {}),
        // A plan change answers whatever the church asked for, so the request is cleared with it.
        requestedPlanId: null,
        requestedAt: null,
        ...(input.note ? { notes: input.note } : {}),
        // Granting trial days closes any paid period — the two are alternatives — and the status
        // follows the dates rather than staying behind: a church whose period was just cleared cannot
        // honestly still read "paid up". (With no status given, `create` already lands on trial; on
        // update the clock cannot see this gap, because `active` with no period only expires, so the
        // decision is made here where the dates change.)
        ...(input.trialDays !== undefined
          ? {
              trialEndsAt: new Date(now.getTime() + input.trialDays * DAY),
              currentPeriodEnd: null,
              currentPeriodStart: null,
              ...(input.status ? {} : { status: 'trial' }),
            }
          : {}),
        // A period already paid and a trial are alternatives, so recording one ends the other — the
        // same rule `recordPayment` applies. Without this, a vendor could open a paid period on a
        // trialing church and watch the row still read "Trial", with the month they had just recorded
        // invisible until the trial ran out on its own.
        ...(input.periodMonths ? { trialEndsAt: null, ...(input.status ? {} : { status: 'active' }) } : {}),
        ...period,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Subscription',
        entityId: subscription.id,
        summary: `Moved to the ${plan.name} plan${input.status ? ` (${input.status})` : ''}${
          input.trialDays !== undefined ? `, ${input.trialDays} days of trial` : ''
        }`,
      },
    });
  });

  return organizationSubscription(organizationId);
}

/**
 * Record money that arrived outside the product, and open the period it buys.
 *
 * The period starts when the old one ends rather than on the day the money came in, so a church that
 * pays two weeks early gets those two weeks *added* — the alternative punishes the parishes that pay
 * on time, which is a strange way to run a subscription.
 *
 * The payment is written first and the subscription second, in one transaction: a period that opened
 * with no payment behind it would be a church using the system for free, and a payment with no period
 * would be money the office cannot trace to anything.
 */
/**
 * The money a church has paid, for the vendor's view of it.
 *
 * A payment's audit line lands in the *church's* log, where the people it concerns can see it; the
 * vendor's read of the same rows is a read, and needs no log of its own.
 */
export async function paymentsForOrganization(organizationId: string) {
  const payments = await clientFor(organizationId).subscriptionPayment.findMany({
    include: { recordedBy: { select: { id: true, name: true } } },
    orderBy: { receivedAt: 'desc' },
    take: 100,
  });
  return payments.map((payment) => ({
    id: payment.id,
    amount: money(payment.amount) ?? 0,
    currency: payment.currency,
    method: payment.method,
    reference: payment.reference,
    periodStart: payment.periodStart?.toISOString() ?? null,
    periodEnd: payment.periodEnd?.toISOString() ?? null,
    receivedAt: payment.receivedAt.toISOString(),
    note: payment.note,
    recordedBy: payment.recordedBy?.name ?? null,
  }));
}

export async function recordPayment(organizationId: string, input: RecordPaymentInput, actorId: string) {
  const client = clientFor(organizationId);
  const subscription = await client.subscription.findFirst({ where: { organizationId }, include: { plan: true } });
  if (!subscription) throw notFoundError('A subscription for that church');

  const receivedAt = input.receivedAt ?? new Date();
  const periodStart =
    subscription.currentPeriodEnd && subscription.currentPeriodEnd > receivedAt ? subscription.currentPeriodEnd : receivedAt;
  const periodEnd = addMonths(periodStart, input.months);

  return client.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.create({
      data: {
        organizationId,
        subscriptionId: subscription.id,
        amount: new Prisma.Decimal(input.amount),
        currency: subscription.plan.currency,
        method: input.method,
        reference: input.reference ?? null,
        periodStart,
        periodEnd,
        receivedAt,
        note: input.note ?? null,
        recordedById: actorId,
      },
    });

    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        trialEndsAt: null,
        // Paying answers any upgrade request: the plan is now whatever they paid for.
        requestedPlanId: null,
        requestedAt: null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'SubscriptionPayment',
        entityId: payment.id,
        summary: `Recorded ${subscription.plan.currency} ${input.amount} by ${input.method}${
          input.reference ? ` (${input.reference})` : ''
        }, covering to ${periodEnd.toDateString()}`,
      },
    });

    return { ...payment, amount: money(payment.amount) ?? 0 };
  });
}
