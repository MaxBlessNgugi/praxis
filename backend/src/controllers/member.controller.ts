import type { Request, Response } from 'express';
import {
  createMemberSchema,
  listMembersQuerySchema,
  memberImportSchema,
  retireMemberSchema,
  updateMemberSchema,
} from '../schemas/member.schema';
import * as memberService from '../services/member.service';
import * as memberImport from '../services/memberImport.service';
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

/**
 * Importing a register from a spreadsheet.
 *
 * A POST that usually writes nothing, which is the point: with no mapping it reports the file's
 * columns, with `dryRun` it reports what each row would do, and only a third request that repeats
 * the file writes. Nothing is committed by a request a person has not read the answer to.
 */
export async function importMembers(req: Request, res: Response): Promise<void> {
  ok(res, await memberImport.importMembers(memberImportSchema.parse(req.body), actor(req)));
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
