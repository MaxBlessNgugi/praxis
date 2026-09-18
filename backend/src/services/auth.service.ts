import type { Organization, Role, User } from '@prisma/client';
import { basePrisma, clientFor, prisma } from '../lib/prisma';
import { generateResetToken, hashPassword, hashResetToken, signAccessToken, verifyPassword } from '../lib/auth';
import { emailStatus, sendEmail } from '../lib/email';
import { env } from '../config/env';
import { requireTenantId } from '../lib/tenant';
import { AppError, forbiddenError, unauthorizedError } from '../middleware/errorHandler';
import { live } from '../lib/live';
import { defaultPlan, subscriptionForOrganization, currentSubscription } from './billing.service';
import type { AuthenticatedUser } from '../middleware/authenticate';
import type {
  ChangePasswordInput,
  LoginInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  SignupInput,
  UpdateOwnProfileInput,
} from '../schemas/auth.schema';

/**
 * Lockout policy. These belong in `config/env.ts` once the church has an opinion on them; they are
 * named constants here so the policy is at least visible and in one place.
 */
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

type UserWithRole = User & { role: Role | null };

type MembershipWithContext = {
  organizationId: string;
  role: Role | null;
  organization: Organization;
};

/** What the console is told about a church it may act for. */
export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  /** Null on a church that signed itself up and has not been through the welcome wizard. */
  onboardedAt: string | null;
}

function toPublicOrganization(organization: Organization): PublicOrganization {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    onboardedAt: organization.onboardedAt?.toISOString() ?? null,
  };
}

/**
 * The church an account lands in when it signs in without naming one, and its authority there.
 *
 * This is the one read that cannot be tenant-scoped, since resolving the tenant is what it is for —
 * so it is made deliberately, here, and nowhere else outside `authenticate`.
 */
async function defaultMembershipFor(userId: string): Promise<MembershipWithContext | null> {
  return basePrisma.organizationMember.findFirst({
    where: { userId, isActive: true, ...live, organization: { isActive: true, deletedAt: null } },
    include: { role: true, organization: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
}

/** What a client is allowed to see. The password hash never crosses this boundary. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  roleKey: string | null;
  /** The role's own title, for a screen that has to label the person. A church can rename it. */
  roleName: string | null;
  /** A Praxis employee. It is what opens the vendor screens, and nothing else does. */
  isPlatformAdmin: boolean;
  /** The register record this account belongs to, or null for an office login. */
  memberId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/** `role` is the caller's authority in the church they are acting for, which may differ from the
 *  account's own role: the same person can administer one parish and only read another. */
export function toPublicUser(user: UserWithRole, role: Role | null = user.role): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleKey: role?.key ?? null,
    roleName: role?.name ?? null,
    isPlatformAdmin: user.isPlatformAdmin,
    memberId: user.memberId,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

/** Rights, resolved for the caller: the role's JSON, or nothing if the account has no role. */
export function rightsFor(user: UserWithRole): { panels: Record<string, boolean>; actions: Record<string, boolean> } {
  return rightsForRole(user.role);
}

export function rightsForRole(role: Role | null): { panels: Record<string, boolean>; actions: Record<string, boolean> } {
  return {
    panels: (role?.panels as Record<string, boolean>) ?? {},
    actions: (role?.actions as Record<string, boolean>) ?? {},
  };
}

async function recordFailedAttempt(user: UserWithRole): Promise<void> {
  const failedAttempts = user.failedAttempts + 1;
  const shouldLock = failedAttempts >= MAX_LOGIN_ATTEMPTS;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedAttempts: shouldLock ? 0 : failedAttempts,
      lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : user.lockedUntil,
    },
  });
}

/**
 * Sign in.
 *
 * Two details are doing real work. An unknown email and a wrong password return the *same* message,
 * because a different one tells an attacker which addresses are real. And the lockout is counted on
 * the account, not the connection: the parish office has one shared machine, so per-IP would punish
 * everyone for one person's typos.
 */
export async function login(input: LoginInput, ip?: string) {
  const user = await prisma.user.findFirst({
    where: { email: input.email.toLowerCase(), ...live },
    include: { role: true },
  });

  if (!user) throw new AppError(401, 'Those credentials do not match an account', 'invalid_credentials');

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw new AppError(423, `This account is locked for another ${minutes} minute(s)`, 'locked');
  }

  if (!user.isActive) throw new AppError(403, 'This account has been deactivated', 'deactivated');

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    await recordFailedAttempt(user);
    throw new AppError(401, 'Those credentials do not match an account', 'invalid_credentials');
  }

  const signedIn = await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    include: { role: true },
  });

  // A login with no church behind it has nothing to scope anything to, so it is refused here rather
  // than at the first query.
  const membership = await defaultMembershipFor(signedIn.id);
  if (!membership) {
    // The one case that deserves its own sentence: a membership that exists, in a church that Praxis
    // has switched off. "Not attached to a church" would send a parish office hunting for a
    // permissions problem it does not have, and the reason is on file with the operator.
    const suspended = await basePrisma.organizationMember.findFirst({
      where: { userId: signedIn.id, isActive: true, ...live, organization: { isActive: false, deletedAt: null } },
      include: { organization: { select: { name: true } } },
    });
    if (suspended) {
      throw new AppError(
        403,
        `${suspended.organization.name} is suspended on Praxis. Contact Praxis to have it switched back on.`,
        'organization_suspended',
      );
    }
    throw forbiddenError('This account is not attached to a church yet — ask an administrator to add it to one');
  }
  const role = membership.role ?? signedIn.role;

  // Signing in happens before any request context exists, so this one write names its church
  // explicitly rather than inheriting one — the same reason `authenticate` reads memberships
  // unscoped.
  await clientFor(membership.organizationId).auditLog.create({
    data: {
      actorId: signedIn.id,
      action: 'login',
      entityName: 'User',
      entityId: signedIn.id,
      summary: `${signedIn.name} signed in`,
      ipAddress: ip ?? null,
    },
  });

  return {
    token: signAccessToken({ sub: signedIn.id, org: membership.organizationId, ver: signedIn.tokenVersion }),
    expiresIn: env.JWT_EXPIRES_IN,
    user: toPublicUser(signedIn, role),
    organization: toPublicOrganization(membership.organization),
    rights: rightsForRole(role),
    // The console's billing banner and its access gate both need this on the first paint, and the
    // church is known by now — asking the client to fetch it separately would be a second round trip
    // that the sign-in page would have to hold the screen open for.
    subscription: await subscriptionForOrganization(membership.organizationId),
  };
}

/**
 * A church signing itself up.
 *
 * Four rows have to exist together or not at all — the church, its profile, its first administrator and
 * a subscription on the free period — so this is one transaction. A church that exists with no account
 * that can sign into it is a support ticket nobody can resolve, and an account with no church can sign
 * in and reach nothing.
 *
 * It runs on the unscoped client and names the church in every row, for the same reason signing in
 * does: it is *creating* the tenant, so there is no context to inherit yet. Once it returns, the token
 * it mints carries the church like any other, and every later request is scoped as usual.
 */
export async function signup(input: SignupInput, ip?: string) {
  const email = input.email.toLowerCase();
  const existing = await basePrisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing) {
    throw new AppError(409, 'An account already uses that email address — sign in instead, or use another address', 'email_taken');
  }

  const role = await basePrisma.role.findFirst({ where: { key: 'super_admin' } });
  if (!role) throw new AppError(503, 'The platform is not provisioned yet — ask Praxis to finish setting it up', 'no_roles');
  const plan = await defaultPlan();

  const slug = await availableSlug(input.churchName);
  const trialEndsAt = plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 86_400_000) : null;

  const created = await basePrisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.churchName,
        slug,
        profile: {
          create: {
            name: input.churchName,
            // The wizard asks where the church meets; the country is what the signup form already
            // knows, and a profile with no location would fail its own validation later.
            location: input.country,
            phone: input.phone,
            email,
          },
        },
      },
    });

    const user = await tx.user.create({
      data: {
        name: input.adminName,
        email,
        passwordHash: await hashPassword(input.password),
        roleId: role.id,
        lastLoginAt: new Date(),
        memberships: { create: { organizationId: organization.id, roleId: role.id, isDefault: true } },
      },
    });

    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        planId: plan.id,
        status: 'trial',
        trialEndsAt,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        actorId: user.id,
        action: 'create',
        entityName: 'Organization',
        entityId: organization.id,
        summary: `${input.churchName} signed up for Praxis on the ${plan.name} plan`,
        ipAddress: ip ?? null,
      },
    });

    return { organization, user };
  });

  await sendWelcomeEmail(input.adminName, email, input.churchName, plan.trialDays);

  // The same shape `login` answers, so the console's sign-in and sign-up paths converge immediately
  // and a new church is inside its own console with no second step.
  return {
    token: signAccessToken({ sub: created.user.id, org: created.organization.id, ver: created.user.tokenVersion }),
    expiresIn: env.JWT_EXPIRES_IN,
    user: toPublicUser({ ...created.user, role }),
    organization: toPublicOrganization(created.organization),
    rights: rightsForRole(role),
    subscription: await subscriptionForOrganization(created.organization.id),
  };
}

/**
 * The one message the system sends that is not a church's own campaign: a church's first administrator
 * is told their console is ready.
 *
 * Best effort by design. An installation with no provider configured — the default — sends nothing and
 * the signup still succeeds; a provider that is having a bad morning must not cost a church its
 * account. The failure is logged rather than raised, which is the whole difference between a welcome
 * note and a signup that cannot complete.
 */
async function sendWelcomeEmail(name: string, email: string, churchName: string, trialDays: number): Promise<void> {
  if (!emailStatus().configured) return;

  const trial =
    trialDays > 0
      ? `Your free ${trialDays}-day period has started, and the console says how long is left on the home screen.`
      : 'Your plan is set up and ready to use.';

  try {
    await sendEmail({
      to: [email],
      subject: `${churchName} is on Praxis`,
      text: `Hello ${name},\n\n${churchName}'s Praxis console is ready. Sign in at ${env.PUBLIC_APP_URL} with this address and the password you chose.\n\n${trial}\n\nPraxis Church OS`,
    });
  } catch (error) {
    console.warn(`Welcome email to ${email} failed:`, error instanceof Error ? error.message : error);
  }
}

/**
 * A URL-ish handle for the church, unique across the platform.
 *
 * Two parishes genuinely share a name — "Grace Chapel" is not rare — so the second one becomes
 * `grace-chapel-2` rather than being refused. The unique index is the real guard; this loop only
 * avoids handing the signup form a conflict it would have to explain.
 */
async function availableSlug(churchName: string): Promise<string> {
  const base =
    churchName
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'church';

  const taken = await basePrisma.organization.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const used = new Set(taken.map((row) => row.slug));
  if (!used.has(base)) return base;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Move the session to another church the account serves.
 *
 * The church is a claim in the token, so switching mints a new one — which means the old token keeps
 * working for the church it named until it expires. That is the same honest limitation as logout:
 * tokens are signed statements and cannot be unsigned. What it does buy is that a client cannot
 * point itself at a parish by editing a request header; it has to be given a token for it.
 */
export async function switchOrganization(userId: string, organizationId: string) {
  const membership = await basePrisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      isActive: true,
      ...live,
      organization: { isActive: true, deletedAt: null },
    },
    include: { role: true, organization: true, user: { include: { role: true } } },
  });
  if (!membership) throw forbiddenError('That account does not serve this church');

  // Written the way sign-in is: the move between churches is an act worth a line in the church's own
  // log, in the log of the church being moved *into*.
  await clientFor(membership.organizationId).auditLog.create({
    data: {
      actorId: userId,
      action: 'login',
      entityName: 'User',
      entityId: userId,
      summary: `${membership.user.name} switched this session to ${membership.organization.name}`,
      ipAddress: null,
    },
  });

  return {
    token: signAccessToken({ sub: userId, org: membership.organizationId, ver: membership.user.tokenVersion }),
    expiresIn: env.JWT_EXPIRES_IN,
    organization: toPublicOrganization(membership.organization),
    rights: rightsForRole(membership.role),
    subscription: await subscriptionForOrganization(membership.organizationId),
    user: toPublicUser(membership.user, membership.role),
    organizations: await organizationsFor(userId),
  };
}

/**
 * Changing your own password.
 *
 * Four decisions are worth stating. The current password is checked even though the caller holds a
 * valid token, because a token is exactly the thing that gets copied off a shared parish machine and
 * the account owner is who must still be able to end that. A successful change clears any lockout,
 * which is the honest reading of it: the person who can prove they know the password is the person
 * the lock was protecting. The new password may not be the old one, because "change it" that leaves
 * it unchanged is a false sense of having done something. And it bumps `tokenVersion`, which ends
 * every other session on the account — so the copy of the token that prompted the change stops
 * working.
 *
 * The caller's own session is not ended by that bump: a fresh token is minted from the new version
 * and returned, which is the difference between "you are still signed in here" and "that other
 * machine is not".
 */
export async function changeOwnPassword(
  userId: string,
  input: ChangePasswordInput,
  ip?: string,
): Promise<{ token: string; expiresIn: string }> {
  const user = await prisma.user.findFirst({ where: { id: userId, ...live } });
  if (!user) throw unauthorizedError();

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AppError(400, 'That is not your current password', 'wrong_password');
  }
  if (await verifyPassword(input.newPassword, user.passwordHash)) {
    throw new AppError(400, 'That is already your password — choose a different one', 'password_unchanged');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(input.newPassword),
      // A lockout is lifted by the person proving they know the password it was guarding.
      failedAttempts: 0,
      lockedUntil: null,
      tokenVersion: { increment: 1 },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'update',
      entityName: 'User',
      entityId: user.id,
      summary: `${user.name} changed their own password; every other session was ended`,
      ipAddress: ip ?? null,
    },
  });

  return {
    token: signAccessToken({ sub: updated.id, org: requireTenantId(), ver: updated.tokenVersion }),
    expiresIn: env.JWT_EXPIRES_IN,
  };
}

/**
 * A reset link, requested from the sign-in screen by somebody who is not signed in.
 *
 * Three things are deliberate. The answer is **the same whether or not the address is registered**,
 * because a different one turns this endpoint into a way to find out who has an account here — which
 * is why the response carries nothing about the *send*: a field saying "delivered" would say
 * "delivered" for a registered address and nothing for a stranger, and the oracle would be back.
 * What it does carry is whether this *installation* can send mail at all, which is the same answer
 * for every caller. Asking again **replaces** the previous link rather than adding a second, so a
 * stolen old email is not a second key. And a send that cannot happen is never reported as one: with
 * no provider configured nothing is delivered, and in development the link comes back in the
 * response so the flow can still be finished on a laptop.
 */
export interface PasswordResetRequestResult {
  message: string;
  /**
   * Whether this server has an email provider at all. A property of the installation, deliberately
   * not of the address: nothing in this answer may differ between a known account and a stranger.
   */
  canSendEmail: boolean;
  /** How long a link stays good, so the screen can say it without hard-coding the policy. */
  expiresInMinutes: number;
  /** Development only, and only when nothing could be sent. Never present in production. */
  devLink?: string;
}

export async function requestPasswordReset(
  input: PasswordResetRequestInput,
  ip?: string,
): Promise<PasswordResetRequestResult> {
  const canSendEmail = emailStatus().configured;
  const answer: PasswordResetRequestResult = {
    message: 'If that address belongs to an account, a reset link is on its way.',
    canSendEmail,
    expiresInMinutes: env.RESET_TOKEN_TTL_MINUTES,
  };

  const user = await basePrisma.user.findFirst({ where: { email: input.email.toLowerCase(), ...live } });
  // No account, or a deactivated one: the same answer, no token, no mail. A deactivated account
  // cannot be reset into working order by whoever holds the address — that is an administrator's act.
  if (!user || !user.isActive) return answer;

  await basePrisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  const token = generateResetToken();
  await basePrisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + env.RESET_TOKEN_TTL_MINUTES * 60_000),
      requestedIp: ip ?? null,
    },
  });

  const link = `${env.PUBLIC_APP_URL.replace(/\/$/, '')}/?reset=${encodeURIComponent(token)}`;

  if (!canSendEmail) {
    if (env.NODE_ENV === 'development') answer.devLink = link;
    await auditAcrossMemberships(user.id, 'Password reset requested (no email provider is configured, so nothing was sent)', ip);
    return answer;
  }

  const report = await sendEmail({
    to: [user.email],
    subject: `${env.APP_NAME}: reset your password`,

    text: [
      `Hello ${user.name},`,
      '',
      'Somebody asked to reset the password for this Praxis account. If that was you, open this link:',
      '',
      link,
      '',
      `The link can be used once and expires in ${env.RESET_TOKEN_TTL_MINUTES} minutes.`,
      'If it was not you, nothing has changed and you can ignore this message.',
    ].join('\n'),
  });

  // The provider's own result goes to the audit log rather than to the caller: it would otherwise be
  // the same oracle under a different name.
  await auditAcrossMemberships(
    user.id,
    report.delivered > 0
      ? 'Password reset requested; the link was emailed'
      : 'Password reset requested; the provider refused the send',
    ip,
  );
  return answer;
}

/**
 * Spending a reset link.
 *
 * The row is the authority, not the request: a link that is unknown, already spent or past its expiry
 * is refused with one sentence that says none of those things in particular. A successful reset bumps
 * `tokenVersion` like a password change, so every session that existed before it is over — which is
 * the point of resetting a password you believe somebody else has.
 */
export async function confirmPasswordReset(input: PasswordResetConfirmInput, ip?: string): Promise<void> {
  const row = await basePrisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(input.token) },
    include: { user: true },
  });

  if (!row || row.usedAt || row.expiresAt <= new Date() || row.user.deletedAt) {
    throw new AppError(400, 'That reset link is no longer valid. Ask for a new one.', 'invalid_reset_token');
  }
  if (!row.user.isActive) throw new AppError(403, 'This account has been deactivated', 'deactivated');
  if (await verifyPassword(input.password, row.user.passwordHash)) {
    throw new AppError(400, 'That is already your password — choose a different one', 'password_unchanged');
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  await basePrisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash, tokenVersion: { increment: 1 }, failedAttempts: 0, lockedUntil: null },
    });
    await tx.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: now } });
    // Any other link that was outstanding dies with this one: the password has just been replaced, so
    // a second email from ten minutes ago must not be a way back in.
    await tx.passwordResetToken.deleteMany({ where: { userId: row.userId, usedAt: null } });
  });

  await auditAcrossMemberships(row.userId, `${row.user.name} reset their password with an emailed link`, ip);
}

/**
 * One audit line in every church the account serves.
 *
 * A password event on an account that belongs to a parish office is the parish's business, and the
 * audit log is per church — so the line is written where somebody will actually read it rather than
 * in one arbitrary church. Both reset paths run outside a request context (the caller is not signed
 * in), which is why each line names its church explicitly through `clientFor`.
 */
async function auditAcrossMemberships(userId: string, summary: string, ip?: string): Promise<void> {
  const memberships = await basePrisma.organizationMember.findMany({
    where: { userId, isActive: true, ...live },
    select: { organizationId: true },
  });

  await Promise.all(
    memberships.map((membership) =>
      clientFor(membership.organizationId).auditLog.create({
        data: {
          actorId: userId,
          action: 'update',
          entityName: 'User',
          entityId: userId,
          summary,
          ipAddress: ip ?? null,
        },
      }),
    ),
  );
}

/**
 * Sign out.
 *
 * This discards the caller's token on the client and records the intent; it cannot unsign a token
 * that is already in somebody's browser. What *does* end sessions server-side is a password change or
 * a reset, which bump the account's `tokenVersion` and are refused by `authenticate` from then on. So
 * the honest statement is: sign out here, change your password if you believe a token was copied, and
 * "sign out everywhere" is the latter. A denylist would make the former real as well; it is not built
 * yet, and this comment is the place that says so.
 */
export async function logout(userId: string, ip?: string): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: 'update',
      entityName: 'User',
      entityId: userId,
      summary: 'Signed out (this browser discards its token; change the password to end every session)',
      ipAddress: ip ?? null,
    },
  });
}

/**
 * The caller's own record, for the console to hydrate on load.
 *
 * The church comes from the request's tenant context, so the membership read below is already
 * scoped to it — the caller cannot ask this endpoint which other parishes they serve.
 */
/**
 * The session as the console should see it — for the church *this request* is acting for.
 *
 * Who the caller is, which church they are in and what they may do all come from the request context
 * that `authenticate` already resolved, rather than from a fresh lookup of the account's first
 * membership. The difference is what a support session needs: a visiting operator holds no membership
 * in the church they are inside, so re-deriving the church here would answer with the operator's own
 * parish while every other request in the same session is scoped to the visited one — the console
 * would print one church's name above another church's records.
 *
 * Only the account row and the church's commercial standing are read here, because both change
 * without the token knowing: an account deactivated five minutes ago, a trial that ended this morning.
 */
export async function currentUser(
  auth: Pick<AuthenticatedUser, 'id' | 'roleKey' | 'roleName' | 'panels' | 'actions' | 'isPlatformAdmin'>,
  organization: { id: string; name: string; slug: string; onboardedAt: string | null },
) {
  const user = await prisma.user.findFirst({ where: { id: auth.id, ...live } });
  if (!user) throw new AppError(404, 'That account no longer exists', 'not_found');

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleKey: auth.roleKey,
      roleName: auth.roleName,
      isPlatformAdmin: auth.isPlatformAdmin,
      memberId: user.memberId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    } satisfies PublicUser,
    organization,
    rights: { panels: auth.panels, actions: auth.actions },
    subscription: await currentSubscription(),
  };
}

/** Every church an account may act for — what the console's church switcher lists. */
export async function organizationsFor(userId: string) {
  const memberships = await basePrisma.organizationMember.findMany({
    where: { userId, isActive: true, ...live, organization: { isActive: true, deletedAt: null } },
    include: { role: true, organization: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  return memberships.map((membership) => ({
    ...toPublicOrganization(membership.organization),
    roleKey: membership.role?.key ?? null,
    isDefault: membership.isDefault,
  }));
}

/**
 * A signed-in account renaming itself.
 *
 * The email is deliberately absent from this endpoint — it is the account's identity across every
 * church it serves, and how its password mail is addressed, so changing it is an administrator's act
 * through the accounts screen. The name is cosmetic and self-owned.
 */
export async function updateOwnProfile(
  userId: string,
  input: UpdateOwnProfileInput,
  ip?: string,
): Promise<{ name: string }> {
  const user = await prisma.user.findFirst({ where: { id: userId, ...live } });
  if (!user) throw new AppError(404, 'That account no longer exists', 'not_found');

  await prisma.user.update({ where: { id: userId }, data: { name: input.name } });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: 'update',
      entityName: 'User',
      entityId: userId,
      summary: `Changed the name on their own account from "${user.name}" to "${input.name}"`,
      ipAddress: ip ?? null,
    },
  });
  return { name: input.name };
}
