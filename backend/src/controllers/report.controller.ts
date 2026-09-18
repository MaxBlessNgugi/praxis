import type { Request, Response } from 'express';
import { z } from 'zod';
import * as reportService from '../services/report.service';
import * as exportService from '../services/export.service';
import { ok } from '../lib/respond';
import { window } from '../schemas/common';
import { listGivingQuerySchema } from '../schemas/finance.schema';
import { listAttendanceQuerySchema } from '../schemas/service.schema';
import { listHouseholdsQuerySchema } from '../schemas/household.schema';

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

export async function inventory(_req: Request, res: Response): Promise<void> {
  ok(res, await reportService.inventoryReport());
}

// -------------------------------------------------------------------------------------------
// CSV exports — the ledgers, as files, under the same gates and filters as their screens
// -------------------------------------------------------------------------------------------

/**
 * A CSV download is the file itself, not an envelope — the client names it from the header.
 *
 * The body goes out as a Buffer because `res.send(string)` strips a leading BOM, and the BOM is
 * what makes Excel open the accented names correctly.
 */
function csv(res: Response, filename: string, body: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(body, 'utf8'));
}

export async function tithesExport(req: Request, res: Response): Promise<void> {
  const file = await exportService.tithesCsv(listGivingQuerySchema.parse(req.query));
  csv(res, file.filename, file.csv);
}

export async function offeringsExport(req: Request, res: Response): Promise<void> {
  const file = await exportService.offeringsCsv(listGivingQuerySchema.parse(req.query));
  csv(res, file.filename, file.csv);
}

export async function attendanceExport(req: Request, res: Response): Promise<void> {
  const file = await exportService.attendanceCsv(listAttendanceQuerySchema.parse(req.query));
  csv(res, file.filename, file.csv);
}

export async function householdsExport(req: Request, res: Response): Promise<void> {
  const file = await exportService.householdsCsv(listHouseholdsQuerySchema.parse(req.query));
  csv(res, file.filename, file.csv);
}
