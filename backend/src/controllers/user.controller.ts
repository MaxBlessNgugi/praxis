import type { Request, Response } from 'express';
import {
  assignRoleSchema,
  createUserSchema,
  listUsersQuerySchema,
  removeUserSchema,
  updateUserSchema,
} from '../schemas/user.schema';
import * as userService from '../services/user.service';
import { ok } from '../lib/respond';
import { actor } from '../lib/request';

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = listUsersQuerySchema.parse(req.query);
  const { data, meta } = await userService.listUsers(query);
  res.json({ data, meta });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const input = createUserSchema.parse(req.body);
  res.status(201).json({ data: await userService.createUser(input, actor(req)) });
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
