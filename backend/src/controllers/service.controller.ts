import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createDutySchema,
  createServiceSchema,
  decideSwapSchema,
  listAttendanceQuerySchema,
  listRosterQuerySchema,
  listServicesQuerySchema,
  recordAttendanceBulkSchema,
  replaceLiturgySchema,
  requestSwapSchema,
  retireServiceSchema,
  updateDutySchema,
  updateServiceSchema,
  upsertServiceReportSchema,
} from '../schemas/service.schema';
import * as serviceService from '../services/service.service';
import * as volunteerService from '../services/volunteer.service';
import { created, noContent, ok } from '../lib/respond';
import { actor, id } from '../lib/request';
import { AppError } from '../middleware/errorHandler';

/**
 * The Member this signed-in account belongs to.
 *
 * `User.memberId` is what makes this answerable. Without it the server can only verify *which
 * account* is asking, not which volunteer, and "I am asking for cover on my own duty" would be an
 * unchecked claim rather than a fact.
 */
function requesterMemberId(req: Request): string {
  const memberId = req.user?.memberId;
  if (!memberId) {
    throw new AppError(
      409,
      'This account is not linked to a member record, so it cannot request a swap for itself',
      'account_not_linked',
    );
  }
  return memberId;
}

export async function listServices(req: Request, res: Response): Promise<void> {
  const { data, meta } = await serviceService.listServices(listServicesQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function getService(req: Request, res: Response): Promise<void> {
  ok(res, await serviceService.getService(id(req)));
}

export async function createService(req: Request, res: Response): Promise<void> {
  created(res, await serviceService.createService(createServiceSchema.parse(req.body), actor(req)));
}

export async function updateService(req: Request, res: Response): Promise<void> {
  ok(res, await serviceService.updateService(id(req), updateServiceSchema.parse(req.body), actor(req)));
}

/**
 * `DELETE /api/services/:id?reason=duplicate&reasonLabel=...`
 *
 * Query parameters rather than a body, for the same reason as the members module: a DELETE with a
 * required JSON body is one many clients and proxies will not send.
 */
export async function retireService(req: Request, res: Response): Promise<void> {
  ok(res, await serviceService.retireService(id(req), retireServiceSchema.parse(req.query), actor(req)));
}

export async function putLiturgy(req: Request, res: Response): Promise<void> {
  const { items } = replaceLiturgySchema.parse(req.body);
  ok(res, await serviceService.replaceLiturgy(id(req), items, actor(req)));
}

export async function recordAttendance(req: Request, res: Response): Promise<void> {
  const { rows } = recordAttendanceBulkSchema.parse(req.body);
  created(res, await serviceService.recordAttendance(id(req), rows, actor(req)));
}

export async function listAttendance(req: Request, res: Response): Promise<void> {
  const { data, meta } = await serviceService.listAttendance(listAttendanceQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function attendanceSummary(req: Request, res: Response): Promise<void> {
  ok(res, await serviceService.attendanceSummary(id(req)));
}

/**
 * An administrator may revise a report that has already been signed off; everybody else is refused
 * with an explanation. The service layer holds that rule, because the stored row has to be read to
 * know whether it applies — this only tells it who is asking.
 */
export async function putReport(req: Request, res: Response): Promise<void> {
  const mayReviseSignedOff = req.user?.roleKey === 'admin' || req.user?.roleKey === 'super_admin';
  ok(
    res,
    await serviceService.upsertReport(
      id(req),
      upsertServiceReportSchema.parse(req.body),
      actor(req),
      mayReviseSignedOff,
    ),
  );
}

export async function finalizeReport(req: Request, res: Response): Promise<void> {
  ok(res, await serviceService.finalizeReport(id(req), actor(req)));
}

export async function getReport(req: Request, res: Response): Promise<void> {
  ok(res, await serviceService.getReport(id(req)));
}

// ---------------------------------------------------------------------------------------------
// Roster and swaps
// ---------------------------------------------------------------------------------------------

export async function listRoster(req: Request, res: Response): Promise<void> {
  const { data, meta } = await volunteerService.listRoster(listRosterQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function createDuty(req: Request, res: Response): Promise<void> {
  created(res, await volunteerService.createDuty(id(req), createDutySchema.parse(req.body), actor(req)));
}

export async function updateDuty(req: Request, res: Response): Promise<void> {
  ok(res, await volunteerService.updateDuty(id(req), updateDutySchema.parse(req.body), actor(req)));
}

export async function removeDuty(req: Request, res: Response): Promise<void> {
  await volunteerService.removeDuty(id(req), actor(req));
  noContent(res);
}

export async function listSwaps(req: Request, res: Response): Promise<void> {
  const { status } = z
    .object({ status: z.enum(['requested', 'approved', 'declined', 'cancelled']).optional() })
    .parse(req.query);
  ok(res, await volunteerService.listSwaps(status));
}

export async function requestSwap(req: Request, res: Response): Promise<void> {
  created(
    res,
    await volunteerService.requestSwap(id(req), requestSwapSchema.parse(req.body), actor(req), requesterMemberId(req)),
  );
}

export async function decideSwap(req: Request, res: Response): Promise<void> {
  const { decision, note } = decideSwapSchema.parse(req.body);
  ok(res, await volunteerService.decideSwap(id(req), decision, note, actor(req)));
}
