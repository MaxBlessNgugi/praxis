import type { Request, Response } from 'express';
import { createMemberSchema, listMembersQuerySchema, retireMemberSchema, updateMemberSchema } from '../schemas/member.schema';
import * as memberService from '../services/member.service';
import { created, ok } from '../lib/respond';
import { actor, id } from '../lib/request';

export async function listMembers(req: Request, res: Response): Promise<void> {
  const { data, meta } = await memberService.listMembers(listMembersQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function getMember(req: Request, res: Response): Promise<void> {
  ok(res, await memberService.getMember(id(req)));
}

export async function createMember(req: Request, res: Response): Promise<void> {
  created(res, await memberService.createMember(createMemberSchema.parse(req.body), actor(req)));
}

export async function updateMember(req: Request, res: Response): Promise<void> {
  ok(res, await memberService.updateMember(id(req), updateMemberSchema.parse(req.body), actor(req)));
}

export async function restoreMember(req: Request, res: Response): Promise<void> {
  // The id here is the archive record's, not the member's: the Trash screen lists archive rows.
  ok(res, await memberService.restoreMember(id(req), actor(req)));
}

/**
 * `DELETE /api/members/:id?reason=request&reasonLabel=...`
 *
 * The reason arrives as query parameters rather than a body: a DELETE with a required JSON body is
 * a request many clients and proxies will not send, and the reason is not optional — a retirement
 * nobody can explain is the thing the archive exists to prevent.
 */
export async function deleteMember(req: Request, res: Response): Promise<void> {
  ok(res, await memberService.retireMember(id(req), retireMemberSchema.parse(req.query), actor(req)));
}
