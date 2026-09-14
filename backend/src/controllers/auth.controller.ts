import type { Request, Response } from 'express';
import { loginSchema } from '../schemas/auth.schema';
import * as authService from '../services/auth.service';
import { unauthorizedError } from '../middleware/errorHandler';
import { ok } from '../lib/respond';

/**
 * Controllers do three things and no more: validate, call the service, shape the response. Anything
 * that decides something belongs in the service, where it can be called without a request.
 */

/** Both endpoints answer `{ data }` like every other route: one shape, so a client parses one way. */
export async function login(req: Request, res: Response): Promise<void> {
  ok(res, await authService.login(loginSchema.parse(req.body), req.ip));
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (!req.user) throw unauthorizedError();
  await authService.logout(req.user.id, req.ip);
  // 204: the client discards the token. See authService.logout for why there is nothing to revoke.
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw unauthorizedError();
  ok(res, await authService.currentUser(req.user.id));
}
