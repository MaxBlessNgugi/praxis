import type { Request, Response } from 'express';
import {
  assignRoleSchema,
  createUserSchema,
  inviteUserSchema,
  listUsersQuerySchema,
  removeUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from '../schemas/user.schema';
import * as userService from '../services/user.service';
import { ok } from '../lib/respond';
import { actor } from '../lib/request';
import { unauthorizedError } from '../middleware/errorHandler';

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = listUsersQuerySchema.parse(req.query);
  const { data, meta } = await userService.listUsers(query);
  res.json({ data, meta });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const input = createUserSchema.parse(req.body);
  res.status(201).json({ data: await userService.createUser(input, actor(req)) });
}

/**
 * Invite an account: it is created immediately but only its owner's activation link can make it
 * sign-in-able. 201 because the account row exists; the body carries whether the link could be
 * emailed, and a development handover link when no provider is configured.
 */
export async function inviteUser(req: Request, res: Response): Promise<void> {
  const input = inviteUserSchema.parse(req.body);
  if (!req.user) throw unauthorizedError();
  res.status(201).json({ data: await userService.inviteUser(input, req.user) });
}

/** Re-issue the activation link for an invited account that never finished signing up. */
export async function resendInvitation(req: Request, res: Response): Promise<void> {
  if (!req.user) throw unauthorizedError();
  res.json({ data: await userService.resendInvitation(req.params.id as string, req.user) });
}

/** 204: an administrator set this password and already knows it. Nothing is echoed back. */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { password } = resetPasswordSchema.parse(req.body);
  // The whole account rather than its id: this is the one administrative action where what the actor
  // may do depends on the actor's own role.
  if (!req.user) throw unauthorizedError();
  await userService.resetPassword(req.params.id as string, password, req.user);
  res.status(204).send();
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const input = updateUserSchema.parse(req.body);
  res.json({ data: await userService.updateUser(req.params.id as string, input, actor(req)) });
}

export async function assignRole(req: Request, res: Response): Promise<void> {
  const { roleKey } = assignRoleSchema.parse(req.body);
  res.json({ data: await userService.assignRole(req.params.id as string, roleKey, actor(req)) });
}

export async function removeUser(req: Request, res: Response): Promise<void> {
  // As query parameters, like every other retirement in the system: a DELETE that requires a JSON
  // body is a request many clients and proxies will not send.
  ok(res, await userService.removeUser(req.params.id as string, removeUserSchema.parse(req.query), actor(req)));
}
