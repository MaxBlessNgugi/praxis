import type { Request, Response } from 'express';
import {
  addGroupMemberSchema,
  createGroupMeetingSchema,
  createGroupSchema,
  listGroupMeetingsQuerySchema,
  listGroupsQuerySchema,
  updateGroupMeetingSchema,
  updateGroupMemberSchema,
  updateGroupSchema,
} from '../schemas/group.schema';
import * as groupService from '../services/group.service';
import { created, noContent, ok } from '../lib/respond';
import { actor, id } from '../lib/request';
import { retireReasonSchema } from '../schemas/common';

export async function listGroups(req: Request, res: Response): Promise<void> {
  res.json(await groupService.listGroups(listGroupsQuerySchema.parse(req.query)));
}

export async function getGroup(req: Request, res: Response): Promise<void> {
  ok(res, await groupService.getGroup(id(req)));
}

export async function createGroup(req: Request, res: Response): Promise<void> {
  created(res, await groupService.createGroup(createGroupSchema.parse(req.body), actor(req)));
}

export async function updateGroup(req: Request, res: Response): Promise<void> {
  ok(res, await groupService.updateGroup(id(req), updateGroupSchema.parse(req.body), actor(req)));
}

export async function retireGroup(req: Request, res: Response): Promise<void> {
  ok(res, await groupService.retireGroup(id(req), retireReasonSchema.parse(req.query), actor(req)));
}

export async function addMember(req: Request, res: Response): Promise<void> {
  created(res, await groupService.addGroupMember(id(req), addGroupMemberSchema.parse(req.body), actor(req)));
}

export async function updateMember(req: Request, res: Response): Promise<void> {
  ok(res, await groupService.updateGroupMember(id(req), updateGroupMemberSchema.parse(req.body), actor(req)));
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  await groupService.removeGroupMember(id(req), actor(req));
  noContent(res);
}

export async function recordMeeting(req: Request, res: Response): Promise<void> {
  created(res, await groupService.recordGroupMeeting(id(req), createGroupMeetingSchema.parse(req.body), actor(req)));
}

export async function updateMeeting(req: Request, res: Response): Promise<void> {
  ok(res, await groupService.updateGroupMeeting(id(req), updateGroupMeetingSchema.parse(req.body), actor(req)));
}

export async function listMeetings(req: Request, res: Response): Promise<void> {
  res.json(await groupService.listGroupMeetings(listGroupMeetingsQuerySchema.parse(req.query)));
}
