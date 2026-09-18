import type { Request, Response } from 'express';
import {
  changePasswordSchema,
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  signupSchema,
  switchOrganizationSchema,
  updateOwnProfileSchema,
} from '../schemas/auth.schema';
import * as authService from '../services/auth.service';
import { unauthorizedError } from '../middleware/errorHandler';
import { created, ok } from '../lib/respond';

/**
 * Controllers do three things and no more: validate, call the service, shape the response. Anything
 * that decides something belongs in the service, where it can be called without a request.
 */

/** Both endpoints answer `{ data }` like every other route: one shape, so a client parses one way. */
export async function login(req: Request, res: Response): Promise<void> {
  ok(res, await authService.login(loginSchema.parse(req.body), req.ip));
}

/**
 * A church signing itself up.
 *
 * `201`, because this creates a church rather than opening a session on one that exists — and the body
 * is the sign-in answer, so the console can drop the new administrator straight into their own console.
 */
export async function signup(req: Request, res: Response): Promise<void> {
  created(res, await authService.signup(signupSchema.parse(req.body), req.ip));
}

/**
 * Changing your own password.
 *
 * The answer is a **fresh token** and nothing else about the password. It has to be a token: the change
 * ends every other session on the account, including the one that asked, so a client that was handed
 * nothing would be signed out by its own successful request.
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) throw unauthorizedError();
  ok(res, await authService.changeOwnPassword(req.user.id, changePasswordSchema.parse(req.body), req.ip));
}

/**
 * Asking for a reset link. Always `202`, with the same body, whether or not the address is known —
 * that uniformity is the feature (see the service), not politeness.
 */
export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  res.status(202).json({ data: await authService.requestPasswordReset(passwordResetRequestSchema.parse(req.body), req.ip) });
}

/** Spending the link. `204`: there is nothing to hand back but the news that it worked. */
export async function confirmPasswordReset(req: Request, res: Response): Promise<void> {
  await authService.confirmPasswordReset(passwordResetConfirmSchema.parse(req.body), req.ip);
  res.status(204).send();
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (!req.user) throw unauthorizedError();
  await authService.logout(req.user.id, req.ip);
  // 204: the client discards the token. See authService.logout for why there is nothing to revoke.
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.organization) throw unauthorizedError();
  ok(res, {
    ...(await authService.currentUser(req.user, req.organization)),
    organizations: await authService.organizationsFor(req.user.id),
  });
}

/** The signed-in account renaming itself. The email is the office's to change, not the caller's. */
export async function updateOwnProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) throw unauthorizedError();
  const input = updateOwnProfileSchema.parse(req.body);
  ok(res, await authService.updateOwnProfile(req.user.id, input, req.ip));
}

/** Move the session to another church the account serves, and hand back a token for it. */
export async function switchOrganization(req: Request, res: Response): Promise<void> {
  if (!req.user) throw unauthorizedError();
  const { organizationId } = switchOrganizationSchema.parse(req.body);
  ok(res, await authService.switchOrganization(req.user.id, organizationId));
}
