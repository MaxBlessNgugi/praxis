import type { Role, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { signAccessToken, verifyPassword } from '../lib/auth';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { live } from '../lib/live';
import type { LoginInput } from '../schemas/auth.schema';

/**
 * Lockout policy. These belong in `config/env.ts` once the church has an opinion on them; they are
 * named constants here so the policy is at least visible and in one place.
 */
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

type UserWithRole = User & { role: Role | null };

/** What a client is allowed to see. The password hash never crosses this boundary. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  roleKey: string | null;
  /** The register record this account belongs to, or null for an office login. */
  memberId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export function toPublicUser(user: UserWithRole): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleKey: user.role?.key ?? null,
    memberId: user.memberId,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

/** Rights, resolved for the caller: the role's JSON, or nothing if the account has no role. */
export function rightsFor(user: UserWithRole): { panels: Record<string, boolean>; actions: Record<string, boolean> } {
  return {
    panels: (user.role?.panels as Record<string, boolean>) ?? {},
    actions: (user.role?.actions as Record<string, boolean>) ?? {},
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

  await prisma.auditLog.create({
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
    token: signAccessToken({ sub: signedIn.id }),
    expiresIn: env.JWT_EXPIRES_IN,
    user: toPublicUser(signedIn),
    rights: rightsFor(signedIn),
  };
}

/**
 * Sign out.
 *
 * There is nothing to revoke. The token is a signed statement that lives on the client until it
 * expires, and this endpoint cannot unsign it — so it records the intent and tells the truth. Making
 * logout real means either a denylist or a short-lived token with a refresh flow; until one of those
 * exists, a stolen token remains valid for up to its full lifetime, and the frontend must discard it.
 */
export async function logout(userId: string, ip?: string): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: 'update',
      entityName: 'User',
      entityId: userId,
      summary: 'Signed out (client discards the token; it is not revocable server-side)',
      ipAddress: ip ?? null,
    },
  });
}

/** The caller's own record, for the console to hydrate on load. */
export async function currentUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...live },
    include: { role: true },
  });
  if (!user) throw new AppError(404, 'That account no longer exists', 'not_found');
  return { user: toPublicUser(user), rights: rightsFor(user) };
}
