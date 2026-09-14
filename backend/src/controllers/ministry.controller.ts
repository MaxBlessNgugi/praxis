import type { Request, Response } from 'express';
import {
  addMinistryMemberSchema,
  createMinistrySchema,
  listMinistriesQuerySchema,
  rosterQuerySchema,
  updateMinistryMemberSchema,
  updateMinistrySchema,
} from '../schemas/ministry.schema';
import * as ministryService from '../services/ministry.service';
import { created, noContent, ok } from '../lib/respond';
import { actor, id } from '../lib/request';
import { retireReasonSchema } from '../schemas/common';

export async function listMinistries(req: Request, res: Response): Promise<void> {
  const result = await ministryService.listMinistries(listMinistriesQuerySchema.parse(req.query));
  res.json(result);
}

export async function getMinistry(req: Request, res: Response): Promise<void> {
  ok(res, await ministryService.getMinistry(id(req)));
}

export async function createMinistry(req: Request, res: Response): Promise<void> {
  created(res, await ministryService.createMinistry(createMinistrySchema.parse(req.body), actor(req)));
}

export async function updateMinistry(req: Request, res: Response): Promise<void> {
  ok(res, await ministryService.updateMinistry(id(req), updateMinistrySchema.parse(req.body), actor(req)));
}

export async function retireMinistry(req: Request, res: Response): Promise<void> {
  ok(res, await ministryService.retireMinistry(id(req), retireReasonSchema.parse(req.query), actor(req)));
}

export async function addMember(req: Request, res: Response): Promise<void> {
  created(res, await ministryService.addMinistryMember(id(req), addMinistryMemberSchema.parse(req.body), actor(req)));
}

export async function updateMember(req: Request, res: Response): Promise<void> {
  ok(res, await ministryService.updateMinistryMember(id(req), updateMinistryMemberSchema.parse(req.body), actor(req)));
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  await ministryService.removeMinistryMember(id(req), actor(req));
  noContent(res);
}

/** Both roster screens: the same query, read with and without `leadershipOnly`. */
export async function roster(req: Request, res: Response): Promise<void> {
  const result = await ministryService.roster(rosterQuerySchema.parse(req.query));
  res.json(result);
}
