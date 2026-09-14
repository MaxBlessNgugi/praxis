import type { Request, Response } from 'express';
import {
  createHouseholdSchema,
  linkMemberSchema,
  listHouseholdsQuerySchema,
  setHeadSchema,
  updateHouseholdSchema,
} from '../schemas/household.schema';
import * as householdService from '../services/household.service';
import { created, ok } from '../lib/respond';
import { actor, id } from '../lib/request';
import { retireReasonSchema } from '../schemas/common';

export async function listHouseholds(req: Request, res: Response): Promise<void> {
  const { data, meta } = await householdService.listHouseholds(listHouseholdsQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function getHousehold(req: Request, res: Response): Promise<void> {
  ok(res, await householdService.getHousehold(id(req)));
}

export async function createHousehold(req: Request, res: Response): Promise<void> {
  created(res, await householdService.createHousehold(createHouseholdSchema.parse(req.body), actor(req)));
}

export async function updateHousehold(req: Request, res: Response): Promise<void> {
  ok(res, await householdService.updateHousehold(id(req), updateHouseholdSchema.parse(req.body), actor(req)));
}

export async function linkMember(req: Request, res: Response): Promise<void> {
  ok(res, await householdService.linkMember(id(req), linkMemberSchema.parse(req.body), actor(req)));
}

export async function setHead(req: Request, res: Response): Promise<void> {
  const { memberId } = setHeadSchema.parse(req.body);
  ok(res, await householdService.setHead(id(req), memberId, actor(req)));
}

export async function unlinkMember(req: Request, res: Response): Promise<void> {
  ok(res, await householdService.unlinkMember(id(req), req.params.memberId as string, actor(req)));
}

export async function retireHousehold(req: Request, res: Response): Promise<void> {
  ok(res, await householdService.retireHousehold(id(req), retireReasonSchema.parse(req.query), actor(req)));
}
