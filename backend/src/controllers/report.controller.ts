import type { Request, Response } from 'express';
import { z } from 'zod';
import * as reportService from '../services/report.service';
import { ok } from '../lib/respond';
import { window } from '../schemas/common';

/** The only input any report takes: which period to answer for. */
const rangeQuerySchema = z.object(window);

export async function overview(req: Request, res: Response): Promise<void> {
  ok(res, await reportService.overview(rangeQuerySchema.parse(req.query)));
}

export async function members(_req: Request, res: Response): Promise<void> {
  ok(res, await reportService.memberReport());
}

export async function giving(req: Request, res: Response): Promise<void> {
  ok(res, await reportService.givingReport(rangeQuerySchema.parse(req.query)));
}

export async function attendance(req: Request, res: Response): Promise<void> {
  ok(res, await reportService.attendanceReport(rangeQuerySchema.parse(req.query)));
}

export async function ministries(_req: Request, res: Response): Promise<void> {
  ok(res, await reportService.ministryReport());
}

export async function governance(req: Request, res: Response): Promise<void> {
  ok(res, await reportService.governanceReport(rangeQuerySchema.parse(req.query)));
}
