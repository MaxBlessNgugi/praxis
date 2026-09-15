import type { Request, Response } from 'express';
import { changePasswordSchema, loginSchema, signupSchema, switchOrganizationSchema } from '../schemas/auth.schema';
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
 * Changing your own password. Answers 204 and nothing else: there is nothing useful to send back, and
 * echoing anything about a password invites it into a log.
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) throw unauthorizedError();
  await authService.changeOwnPassword(req.user.id, changePasswordSchema.parse(req.body), req.ip);
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

/** Move the session to another church the account serves, and hand back a token for it. */
export async function switchOrganization(req: Request, res: Response): Promise<void> {
  if (!req.user) throw unauthorizedError();
  const { organizationId } = switchOrganizationSchema.parse(req.body);
  ok(res, await authService.switchOrganization(req.user.id, organizationId));
}
