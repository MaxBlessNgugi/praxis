import { basePrisma, clientFor, money } from '../lib/prisma';
import { live } from '../lib/live';
import { signAccessToken, SUPPORT_SESSION_MINUTES } from '../lib/auth';
import { AppError, notFoundError } from '../middleware/errorHandler';
import type { ActiveOrganization } from '../middleware/authenticate';

/**
 * The operator's side of Praxis: the things you do *to* a church rather than inside one.
 *
 * Three operations, and each one exists because something goes wrong that a parish office cannot fix
 * from its own console.
 *
 * **Suspension** is the switch for a church that has to stop — a subscription that will not be
 * renewed, a disputed account, a support investigation. It is one column (`Organization.isActive`),
 * because a switch with state in two places is a switch that disagrees with itself. Sign-in and every
 * request already refuse an inactive church, and the refusal now says *suspended* rather than "you do
 * not serve this church", which is the difference between one telephone call and an afternoon of
 * permissions debugging.
 *
 * **A support session** is how an operator looks at a church's records without asking for a password
 * over the telephone. It mints a short-lived token whose subject is still the *operator* — so every
 * row they touch names them — and whose church is the one being visited, and it writes the start and
 * the end into that church's own audit log. A church can therefore read exactly who was inside its
 * records and when, which is what makes the feature defensible rather than merely convenient.
 *
 * **Statistics** are what an operator needs before answering the telephone: how big is this parish,
 * is the office actually using it, and when did anything last happen here.
 *
 * The money side of the vendor console — plans, periods, payments — is in `billing.service.ts`, which
 * is where the arithmetic for it already lives. This file is the church, not the invoice.
 */

export interface SuspensionInput {
  suspended: boolean;
  /** Why. Refused when it is missing, because a church that is switched off deserves a reason on file. */
  reason: string;
}

/** Who is asking, and which church their own account sits in. */
export interface SuspensionActor {
  id: string;
  organizationId: string;
}

/**
 * Switch a church on or off.
 *
 * The audit row is written in the *church's* log rather than the operator's, and deliberately: the
 * one thing that must not happen is a parish discovering months later that its access was cut and
 * finding no trace of who did it or why.
 */
export async function setSuspension(organizationId: string, input: SuspensionInput, actorId: string, actorOrganizationId: string) {
  const organization = await basePrisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    select: { id: true, name: true, isActive: true },
  });
  if (!organization) throw notFoundError('That church');

  // A foot-gun the first live test found: `authenticate` refuses every request from a suspended
  // church, including the operator's own, so suspending the church your account belongs to locks you
  // out of the screen that would switch it back on. Refused rather than merely warned about, because
  // the way out of it is the one thing this action removes.
  if (input.suspended && actorOrganizationId === organizationId) {
    throw new AppError(
      409,
      'You cannot switch off the church your own account belongs to — every request it makes, including this one, would be refused. Use a Praxis account outside it.',
      'would_lock_itself_out',
    );
  }

  const isActive = !input.suspended;
  // A second click is a 409 rather than a silent success: the operator should be told the state did
  // not change, rather than left believing the second press did something the first did not.
  if (organization.isActive === isActive) {
    throw new AppError(
      409,
      `${organization.name} is already ${isActive ? 'active' : 'suspended'}`,
      'already_in_that_state',
    );
  }

  const client = clientFor(organizationId);
  await client.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: organizationId }, data: { isActive } });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'Organization',
        entityId: organizationId,
        summary: input.suspended
          ? `${organization.name} was suspended on Praxis: ${input.reason}`
          : `${organization.name} was switched back on: ${input.reason}`,
      },
    });
  });

  return { id: organizationId, name: organization.name, isActive };
}

export interface SupportSession {
  token: string;
  /** ISO timestamp, so the console can count down against the server's own clock rather than its own. */
  expiresAt: string;
  minutes: number;
  organization: ActiveOrganization;
}

/**
 * Begin a support session inside one church.
 *
 * The token carries `imp: true` and names the church, which is the only combination the authenticate
 * middleware accepts from an account that does not serve it. It expires in an hour: long enough for a
 * morning's investigation, short enough that a leaked tab is not a standing key to somebody's
 * register.
 *
 * Who may start one is not decided here — `/api/vendor` is already behind `requirePlatformAdmin`, and
 * the middleware re-checks the same flag on every request the session makes, so a token minted for an
 * operator who is later demoted stops working the moment they are.
 */
export async function startSupportSession(
  organizationId: string,
  reason: string,
  operator: { id: string; name: string },
): Promise<SupportSession> {
  const organization = await basePrisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    select: { id: true, name: true, slug: true, isActive: true, onboardedAt: true },
  });
  if (!organization) throw notFoundError('That church');

  const expiresAt = new Date(Date.now() + SUPPORT_SESSION_MINUTES * 60_000);

  // Written into the church's own trail before the token is handed over: if the audit write fails,
  // there is no session to explain.
  await clientFor(organizationId).auditLog.create({
    data: {
      actorId: operator.id,
      action: 'view',
      entityName: 'Organization',
      entityId: organizationId,
      summary: `${operator.name} from Praxis opened a support session in ${organization.name}: ${reason}`,
    },
  });

  return {
    token: signAccessToken({ sub: operator.id, org: organizationId, imp: true }, `${SUPPORT_SESSION_MINUTES}m`),
    expiresAt: expiresAt.toISOString(),
    minutes: SUPPORT_SESSION_MINUTES,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      onboardedAt: organization.onboardedAt?.toISOString() ?? null,
    },
  };
}

/**
 * End a support session.
 *
 * Called from *inside* the session, so the closing row lands in the same church's log as the opening
 * one and the pair reads as a visit with a beginning and an end. It is best effort by nature — an
 * operator who simply closes the tab leaves the opening row as the record, and the token expires
 * within the hour either way.
 */
export async function endSupportSession(organizationId: string, reason: string, operatorId: string, operatorName: string) {
  await clientFor(organizationId).auditLog.create({
    data: {
      actorId: operatorId,
      action: 'view',
      entityName: 'Organization',
      entityId: organizationId,
      summary: `${operatorName} from Praxis closed the support session: ${reason}`,
    },
  });
  return { ended: true };
}

export interface OrganizationStats {
  members: number;
  activeMembers: number;
  households: number;
  ministries: number;
  services: number;
  staffAccounts: number;
  giving: { tithes: number; offerings: number; currency: string };
  files: number;
  /** The last thing that happened here, from the church's own audit log. Null until it works. */
  lastActivity: { summary: string; at: string; actor: string | null } | null;
}

/**
 * What an operator wants to know before picking up the telephone.
 *
 * Counts, not analyses: whether the office is actually using the console is answered by "18 members,
 * 34 tithes, last write yesterday", and a live aggregate over a year of giving is not worth
 * recomputing per church in a list of hundreds. It is one church at a time, on demand.
 */
export async function organizationStats(organizationId: string): Promise<OrganizationStats> {
  const client = clientFor(organizationId);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [members, activeMembers, households, ministries, services, staffAccounts, files, titheSum, offeringSum, lastAudit] =
    await Promise.all([
      client.member.count({ where: live }),
      client.member.count({ where: { ...live, status: 'active' } }),
      client.household.count({ where: live }),
      client.ministry.count({ where: live }),
      client.service.count({ where: live }),
      client.organizationMember.count({ where: { isActive: true, ...live } }),
      client.storedFile.count({ where: live }),
      client.tithe.aggregate({ where: { ...live, receivedAt: { gte: yearStart } }, _sum: { amount: true } }),
      client.offering.aggregate({ where: { ...live, receivedAt: { gte: yearStart } }, _sum: { amount: true } }),
      // No `live` filter: the audit log is append-only and has no `deletedAt` to filter on.
      client.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true } } },
      }),
    ]);

  // The church's own currency, from its plan: printing shillings to a Lagos parish would be a small
  // embarrassment in a screen an operator reads out loud.
  const plan = await client.subscription.findFirst({ include: { plan: { select: { currency: true } } } });

  return {
    members,
    activeMembers,
    households,
    ministries,
    services,
    staffAccounts,
    files,
    giving: {
      tithes: money(titheSum._sum.amount) ?? 0,
      offerings: money(offeringSum._sum.amount) ?? 0,
      currency: plan?.plan.currency ?? 'KES',
    },
    lastActivity: lastAudit
      ? {
          summary: lastAudit.summary ?? `${lastAudit.action} on ${lastAudit.entityName}`,
          at: lastAudit.createdAt.toISOString(),
          actor: lastAudit.actor?.name ?? null,
        }
      : null,
  };
}
