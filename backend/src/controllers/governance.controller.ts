import type { Request, Response } from 'express';
import {
  createDocumentSchema,
  createMeetingSchema,
  createResolutionSchema,
  decideResolutionSchema,
  listDocumentsQuerySchema,
  listMeetingsQuerySchema,
  listResolutionsQuerySchema,
  updateDocumentSchema,
  updateMeetingSchema,
  updateResolutionSchema,
} from '../schemas/governance.schema';
import * as governance from '../services/governance.service';
import { created, ok } from '../lib/respond';
import { actor, id } from '../lib/request';
import { retireReasonSchema } from '../schemas/common';

// Meetings
export async function listMeetings(req: Request, res: Response): Promise<void> {
  const result = await governance.listMeetings(listMeetingsQuerySchema.parse(req.query));
  res.json(result);
}

export async function getMeeting(req: Request, res: Response): Promise<void> {
  ok(res, await governance.getMeeting(id(req)));
}

export async function createMeeting(req: Request, res: Response): Promise<void> {
  created(res, await governance.createMeeting(createMeetingSchema.parse(req.body), actor(req)));
}

export async function updateMeeting(req: Request, res: Response): Promise<void> {
  ok(res, await governance.updateMeeting(id(req), updateMeetingSchema.parse(req.body), actor(req)));
}

export async function sealMinutes(req: Request, res: Response): Promise<void> {
  ok(res, await governance.sealMinutes(id(req), actor(req)));
}

export async function retireMeeting(req: Request, res: Response): Promise<void> {
  ok(res, await governance.retireMeeting(id(req), retireReasonSchema.parse(req.query), actor(req)));
}

// Resolutions
export async function listResolutions(req: Request, res: Response): Promise<void> {
  const result = await governance.listResolutions(listResolutionsQuerySchema.parse(req.query));
  res.json(result);
}

export async function getResolution(req: Request, res: Response): Promise<void> {
  ok(res, await governance.getResolution(id(req)));
}

export async function createResolution(req: Request, res: Response): Promise<void> {
  created(res, await governance.createResolution(createResolutionSchema.parse(req.body), actor(req)));
}

export async function updateResolution(req: Request, res: Response): Promise<void> {
  ok(res, await governance.updateResolution(id(req), updateResolutionSchema.parse(req.body), actor(req)));
}

export async function decideResolution(req: Request, res: Response): Promise<void> {
  ok(res, await governance.decideResolution(id(req), decideResolutionSchema.parse(req.body), actor(req)));
}

export async function retireResolution(req: Request, res: Response): Promise<void> {
  ok(res, await governance.retireResolution(id(req), retireReasonSchema.parse(req.query), actor(req)));
}

// Documents
export async function listDocuments(req: Request, res: Response): Promise<void> {
  const result = await governance.listDocuments(listDocumentsQuerySchema.parse(req.query));
  res.json(result);
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  ok(res, await governance.getDocument(id(req)));
}

export async function createDocument(req: Request, res: Response): Promise<void> {
  created(res, await governance.createDocument(createDocumentSchema.parse(req.body), actor(req)));
}

export async function updateDocument(req: Request, res: Response): Promise<void> {
  ok(res, await governance.updateDocument(id(req), updateDocumentSchema.parse(req.body), actor(req)));
}

export async function retireDocument(req: Request, res: Response): Promise<void> {
  ok(res, await governance.retireDocument(id(req), retireReasonSchema.parse(req.query), actor(req)));
}
