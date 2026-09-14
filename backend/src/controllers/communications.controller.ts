import type { Request, Response } from 'express';
import {
  answerPrayerRequestSchema,
  celebrationsQuerySchema,
  createAnnouncementSchema,
  createBroadcastSchema,
  createEventSchema,
  createPrayerRequestSchema,
  listAnnouncementsQuerySchema,
  listBroadcastsQuerySchema,
  listEventsQuerySchema,
  listPrayerRequestsQuerySchema,
  sendBroadcastSchema,
  updateAnnouncementSchema,
  updateBroadcastSchema,
  updateEventSchema,
  updatePrayerRequestSchema,
} from '../schemas/communications.schema';
import * as communications from '../services/communications.service';
import { created, ok } from '../lib/respond';
import { actor, id } from '../lib/request';
import { retireReasonSchema } from '../schemas/common';

export async function listAnnouncements(req: Request, res: Response): Promise<void> {
  const result = await communications.listAnnouncements(listAnnouncementsQuerySchema.parse(req.query));
  res.json(result);
}

export async function getAnnouncement(req: Request, res: Response): Promise<void> {
  ok(res, await communications.getAnnouncement(id(req)));
}

export async function createAnnouncement(req: Request, res: Response): Promise<void> {
  created(res, await communications.createAnnouncement(createAnnouncementSchema.parse(req.body), actor(req)));
}

export async function updateAnnouncement(req: Request, res: Response): Promise<void> {
  ok(res, await communications.updateAnnouncement(id(req), updateAnnouncementSchema.parse(req.body), actor(req)));
}

export async function retireAnnouncement(req: Request, res: Response): Promise<void> {
  ok(res, await communications.retireAnnouncement(id(req), retireReasonSchema.parse(req.query), actor(req)));
}

export async function listBroadcasts(req: Request, res: Response): Promise<void> {
  const result = await communications.listBroadcasts(listBroadcastsQuerySchema.parse(req.query));
  res.json(result);
}

export async function getBroadcast(req: Request, res: Response): Promise<void> {
  ok(res, await communications.getBroadcast(id(req)));
}

export async function createBroadcast(req: Request, res: Response): Promise<void> {
  created(res, await communications.createBroadcast(createBroadcastSchema.parse(req.body), actor(req)));
}

export async function updateBroadcast(req: Request, res: Response): Promise<void> {
  ok(res, await communications.updateBroadcast(id(req), updateBroadcastSchema.parse(req.body), actor(req)));
}

export async function sendBroadcast(req: Request, res: Response): Promise<void> {
  ok(res, await communications.sendBroadcast(id(req), sendBroadcastSchema.parse(req.body), actor(req)));
}

export async function retireBroadcast(req: Request, res: Response): Promise<void> {
  ok(res, await communications.retireBroadcast(id(req), retireReasonSchema.parse(req.query), actor(req)));
}

export async function listEvents(req: Request, res: Response): Promise<void> {
  const result = await communications.listEvents(listEventsQuerySchema.parse(req.query));
  res.json(result);
}

export async function getEvent(req: Request, res: Response): Promise<void> {
  ok(res, await communications.getEvent(id(req)));
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  created(res, await communications.createEvent(createEventSchema.parse(req.body), actor(req)));
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
  ok(res, await communications.updateEvent(id(req), updateEventSchema.parse(req.body), actor(req)));
}

export async function retireEvent(req: Request, res: Response): Promise<void> {
  ok(res, await communications.retireEvent(id(req), retireReasonSchema.parse(req.query), actor(req)));
}

export async function listPrayerRequests(req: Request, res: Response): Promise<void> {
  const result = await communications.listPrayerRequests(listPrayerRequestsQuerySchema.parse(req.query));
  res.json(result);
}

export async function getPrayerRequest(req: Request, res: Response): Promise<void> {
  ok(res, await communications.getPrayerRequest(id(req)));
}

export async function createPrayerRequest(req: Request, res: Response): Promise<void> {
  created(res, await communications.createPrayerRequest(createPrayerRequestSchema.parse(req.body), actor(req)));
}

export async function updatePrayerRequest(req: Request, res: Response): Promise<void> {
  ok(res, await communications.updatePrayerRequest(id(req), updatePrayerRequestSchema.parse(req.body), actor(req)));
}

export async function answerPrayerRequest(req: Request, res: Response): Promise<void> {
  ok(res, await communications.answerPrayerRequest(id(req), answerPrayerRequestSchema.parse(req.body ?? {}), actor(req)));
}

export async function retirePrayerRequest(req: Request, res: Response): Promise<void> {
  ok(res, await communications.retirePrayerRequest(id(req), retireReasonSchema.parse(req.query), actor(req)));
}

export async function listCelebrations(req: Request, res: Response): Promise<void> {
  const result = await communications.celebrations(celebrationsQuerySchema.parse(req.query));
  res.json(result);
}
