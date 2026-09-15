import type { NextFunction, Request, Response } from 'express';
import { basePrisma, prisma } from '../lib/prisma';
import { live } from '../lib/live';
import { verifyAccessToken } from '../lib/auth';
import { runWithTenant } from '../lib/tenant';
import { AppError, forbiddenError, unauthorizedError } from './errorHandler';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  roleKey: string | null;
  /** The role's own title, so a screen can label the person without looking it up again. */
  roleName: string | null;
  /** The register record this account belongs to, when it has one. Null for office logins. */
  memberId: string | null;
  /** A Praxis employee. It is what opens `/api/vendor`, and nothing else does. */
  isPlatformAdmin: boolean;
  panels: Record<string, boolean>;
  actions: Record<string, boolean>;
  /** The church this request is acting for. Every query it makes is scoped to this. */
  organizationId: string;
  /**
   * True while a Praxis operator is working inside this church on a support session.
   *
   * Read by the vendor block above all: it is what tells the console it must keep showing whose
   * access this is, and it is why a support session is a visible state rather than an invisible
   * privilege.
   */
  supportSession: boolean;
}

export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  /// Null until the church finishes its welcome wizard. Carried in the request context so `/me` can
  /// answer from what was already resolved instead of looking the church up a second time.
  onboardedAt: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organization?: ActiveOrganization;
    }
  }
}

/**
 * Resolves the caller — and the church they are acting for — from the bearer token on every request.
 *
 * The account is re-read from the database rather than trusted from the token. A token minted seven
 * days ago says nothing about whether that person still works here, whether their rights were
 * narrowed yesterday, whether the account was locked an hour ago, or whether they still serve the
 * church the token names — so the checks below are the ones that matter, and the token is only proof
 * of *which* account is asking.
 *
 * Rights come from the **membership**, not the account: one login can serve several churches, as an
 * administrator in one and a viewer in another. The account's own role is the default a membership
 * is created with.
 *
 * The membership lookup is the one read in the request that cannot be tenant-scoped, because
 * resolving the tenant is what it is for — hence `basePrisma`. Everything after it runs inside
 * `runWithTenant`, so every query the handler makes is scoped to this church.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw unauthorizedError('Send an Authorization: Bearer <token> header');

    const token = header.slice('Bearer '.length).trim();
    const { sub, org, imp } = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: { id: sub, ...live },
      include: { role: true },
    });
    if (!user) throw unauthorizedError('That account no longer exists');
    if (!user.isActive) throw unauthorizedError('That account has been deactivated');
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(423, 'This account is temporarily locked after repeated failed sign-ins', 'locked');
    }

    // A support session: a Praxis operator acting inside a church they do not belong to. Resolved
    // before the membership below, because there is no membership to find — and refused unless the
    // claim is set *and* the account is genuinely platform staff, so a forged or replayed claim from
    // an ordinary account does nothing. Closing the visit is the one vendor route such a token may
    // still reach, which is why `/api/vendor/support-sessions/end` sits outside the vendor gate.
    if (imp) {
      if (!user.isPlatformAdmin || !org) {
        throw forbiddenError('That access token is not valid for a support session');
      }
      const organization = await basePrisma.organization.findFirst({
        where: { id: org, deletedAt: null },
        select: { id: true, name: true, slug: true, isActive: true, onboardedAt: true },
      });
      if (!organization) throw forbiddenError('That church no longer exists');

      // The authority of a support session is the church's own highest role. An operator is not a
      // super admin *of* this parish — they are looking at it as one — which is exactly why the
      // session is time-boxed and written into the church's audit log rather than granted quietly.
      const supportRole = await basePrisma.role.findFirst({ where: { key: 'super_admin' } });

      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        roleKey: supportRole?.key ?? 'super_admin',
        roleName: supportRole?.name ?? 'Super Administrator',
        memberId: null,
        // Deliberately false, even though the account is platform staff: a visit is the church's own
        // access, held for an hour, and the vendor screens — which step across every church — are not
        // part of it. An operator who needs them closes the visit and uses their own session.
        isPlatformAdmin: false,
        panels: (supportRole?.panels as Record<string, boolean>) ?? {},
        actions: (supportRole?.actions as Record<string, boolean>) ?? {},
        organizationId: organization.id,
        supportSession: true,
      };
      req.organization = {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        onboardedAt: organization.onboardedAt?.toISOString() ?? null,
      };

      runWithTenant({ organizationId: organization.id }, () => next());
      return;
    }

    // The token may name a church; without one (a token minted before a switch, or before this
    // feature existed) the account's default membership answers.
    const membership = await basePrisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
        ...live,
        ...(org ? { organizationId: org } : {}),
        organization: { isActive: true, deletedAt: null },
      },
      include: { role: true, organization: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    if (!membership) {
      // Before the generic refusal, the one case that has its own sentence: a membership that exists
      // but whose church is switched off. "You do not serve this church" would send a church office
      // hunting for a permissions problem it does not have.
      const suspended = await basePrisma.organizationMember.findFirst({
        where: { userId: user.id, isActive: true, ...live, ...(org ? { organizationId: org } : {}) },
        include: { organization: { select: { name: true, isActive: true } } },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
      if (suspended && !suspended.organization.isActive) {
        throw new AppError(
          403,
          `${suspended.organization.name} is suspended on Praxis. Nothing has been deleted — the records are here and Praxis can switch the church back on. Contact Praxis to restore access.`,
          'organization_suspended',
        );
      }
      throw forbiddenError(
        org
          ? 'That account does not serve this church'
          : 'This account is not attached to a church yet — ask an administrator to add it to one',
      );
    }

    // A membership carries the authority; the account's own role is the fallback an account created
    // before memberships existed still has.
    const role = membership.role ?? user.role;

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleKey: role?.key ?? null,
      roleName: role?.name ?? null,
      memberId: user.memberId,
      isPlatformAdmin: user.isPlatformAdmin,
      panels: (role?.panels as Record<string, boolean>) ?? {},
      actions: (role?.actions as Record<string, boolean>) ?? {},
      organizationId: membership.organizationId,
      supportSession: false,
    };
    req.organization = {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      onboardedAt: membership.organization.onboardedAt?.toISOString() ?? null,
    };

    runWithTenant({ organizationId: membership.organizationId }, () => next());
  } catch (error) {
    next(error);
  }
}

/** The name the route files use; identical behaviour, since resolving the caller *is* the check. */
export const requireAuth = authenticate;

/**
 * Refuses a caller whose role is not in the list.
 *
 * `super_admin` is always allowed: an owner locked out of their own system by a rights edit is a
 * support call nobody can resolve.
 */
/**
 * Refuses a caller who is not a Praxis employee.
 *
 * The vendor routes are the only ones that cross between churches, and this is the flag that says so.
 * It is deliberately not a role: every church has a `super_admin` of its own, and a role check would
 * hand every parish owner the whole customer list. The flag is set by the platform, defaults to false,
 * and there is no endpoint that sets it — provisioning an operator is an operator's own job.
 */
export function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(unauthorizedError());
    return;
  }
  if (req.user.isPlatformAdmin) {
    next();
    return;
  }
  next(forbiddenError('This is Praxis staff tooling'));
}

export function requireRole(...allowed: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorizedError());
      return;
    }
    if (req.user.roleKey === 'super_admin' || (req.user.roleKey && allowed.includes(req.user.roleKey))) {
      next();
      return;
    }
    next(forbiddenError(`This action needs one of: ${allowed.join(', ')}`));
  };
}
