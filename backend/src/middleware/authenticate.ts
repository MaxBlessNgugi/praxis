import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { live } from '../lib/live';
import { verifyAccessToken } from '../lib/auth';
import { AppError, forbiddenError, unauthorizedError } from './errorHandler';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  roleKey: string | null;
  /** The register record this account belongs to, when it has one. Null for office logins. */
  memberId: string | null;
  panels: Record<string, boolean>;
  actions: Record<string, boolean>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Resolves the caller from the bearer token on every request.
 *
 * The account is re-read from the database rather than trusted from the token. A token minted seven
 * days ago says nothing about whether that person still works here, whether their rights were
 * narrowed yesterday, or whether the account was locked an hour ago — so the checks below are the
 * ones that matter, and the token is only proof of *which* account is asking.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw unauthorizedError('Send an Authorization: Bearer <token> header');

    const token = header.slice('Bearer '.length).trim();
    const { sub } = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: { id: sub, ...live },
      include: { role: true },
    });
    if (!user) throw unauthorizedError('That account no longer exists');
    if (!user.isActive) throw unauthorizedError('That account has been deactivated');
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(423, 'This account is temporarily locked after repeated failed sign-ins', 'locked');
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleKey: user.role?.key ?? null,
      memberId: user.memberId,
      panels: (user.role?.panels as Record<string, boolean>) ?? {},
      actions: (user.role?.actions as Record<string, boolean>) ?? {},
    };

    next();
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
