import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createRoleSchema,
  listAuditQuerySchema,
  listTrashQuerySchema,
  updateRoleSchema,
} from '../schemas/admin.schema';
import * as adminService from '../services/admin.service';
import { created, ok } from '../lib/respond';
import { actor, id } from '../lib/request';

export async function listTrash(req: Request, res: Response): Promise<void> {
  const result = await adminService.listTrash(listTrashQuerySchema.parse(req.query));
  res.json(result);
}

export async function restoreRecord(req: Request, res: Response): Promise<void> {
  ok(res, await adminService.restoreRecord(id(req), actor(req)));
}

export async function listAudit(req: Request, res: Response): Promise<void> {
  const result = await adminService.listAudit(listAuditQuerySchema.parse(req.query));
  res.json(result);
}

/** `GET /api/admin/audit/Member/<id>` — one record's whole history, both logs. */
export async function recordHistory(req: Request, res: Response): Promise<void> {
  const params = z.object({ entityName: z.string().trim().min(1).max(60), entityId: z.string().trim().min(1).max(60) }).parse(req.params);
  ok(res, await adminService.recordHistory(params.entityName, params.entityId));
}

export async function listRoles(_req: Request, res: Response): Promise<void> {
  ok(res, await adminService.listRoles());
}

export async function getRole(req: Request, res: Response): Promise<void> {
  ok(res, await adminService.getRole(req.params.key as string));
}

export async function createRole(req: Request, res: Response): Promise<void> {
  created(res, await adminService.createRole(createRoleSchema.parse(req.body), actor(req)));
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  ok(res, await adminService.updateRole(req.params.key as string, updateRoleSchema.parse(req.body), actor(req)));
}
