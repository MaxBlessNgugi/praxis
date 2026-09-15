import type { Request, Response } from 'express';
import {
  assignPlanSchema,
  createPlanSchema,
  listOrganizationsQuerySchema,
  recordPaymentSchema,
} from '../schemas/billing.schema';
import { setSuspensionSchema, supportSessionSchema } from '../schemas/vendor.schema';
import * as billingService from '../services/billing.service';
import * as vendorService from '../services/vendor.service';
import { AppError, forbiddenError, unauthorizedError } from '../middleware/errorHandler';
import { created, ok } from '../lib/respond';

/**
 * The vendor's console: every church, what it is on, and the money that has come in.
 *
 * The only routes in the service that cross between churches, which is why they are behind
 * `requirePlatformAdmin` and why nothing here is reachable with a church's own login. The service
 * beneath names the church each write is for, rather than inheriting whichever church the operator's
 * own account happens to sit in.
 */

function actor(req: Request): { id: string; name: string; organizationId: string } {
  if (!req.user) throw unauthorizedError();
  return { id: req.user.id, name: req.user.name, organizationId: req.user.organizationId };
}

function organizationId(req: Request): string {
  const value = req.params.id;
  if (!value) throw new AppError(400, 'Name the church this is for', 'missing_organization');
  return value;
}

export async function listOrganizations(req: Request, res: Response): Promise<void> {
  const result = await billingService.listOrganizations(listOrganizationsQuerySchema.parse(req.query));
  res.json(result);
}

export async function getOrganization(req: Request, res: Response): Promise<void> {
  ok(res, await billingService.organizationSubscription(organizationId(req)));
}

/** Every plan, including the ones Praxis only offers in a conversation. */
export async function listPlans(_req: Request, res: Response): Promise<void> {
  // `ok` is the one place the envelope is written; wrapping the array again here would hand the
  // console `{ data: { data: [...] } }`, which reads as "this list has no item type" on the screen.
  ok(res, await billingService.allPlans());
}

/** Create or change a plan. The key in the path is the identity; the body cannot rename it. */
export async function savePlan(req: Request, res: Response): Promise<void> {
  const input = createPlanSchema.parse({ ...req.body, key: req.params.key });
  ok(res, await billingService.savePlan(input, actor(req).id));
}

export async function assignPlan(req: Request, res: Response): Promise<void> {
  ok(res, await billingService.assignPlan(organizationId(req), assignPlanSchema.parse(req.body), actor(req).id));
}

export async function recordPayment(req: Request, res: Response): Promise<void> {
  created(res, await billingService.recordPayment(organizationId(req), recordPaymentSchema.parse(req.body), actor(req).id));
}

/** How big this church is and whether it is actually being used. */
export async function organizationStats(req: Request, res: Response): Promise<void> {
  ok(res, await vendorService.organizationStats(organizationId(req)));
}

/** Switch a church off, or back on. The reason lands in the church's own audit log. */
export async function setSuspension(req: Request, res: Response): Promise<void> {
  const input = setSuspensionSchema.parse(req.body);
  const who = actor(req);
  ok(res, await vendorService.setSuspension(organizationId(req), input, who.id, who.organizationId));
}

/**
 * Open a support session: a short-lived token that lets the operator work inside this church.
 *
 * The token is returned to the console, which swaps it in for the operator's own and shows a strip
 * saying whose access it is. Nothing about the church's records changes; the visit itself is written
 * into their log before the token is handed over.
 */
export async function startSupportSession(req: Request, res: Response): Promise<void> {
  const { reason } = supportSessionSchema.parse(req.body);
  ok(res, await vendorService.startSupportSession(organizationId(req), reason, actor(req)));
}

/** Close the session, from inside it, so the closing line joins the opening one. */
export async function endSupportSession(req: Request, res: Response): Promise<void> {
  if (!req.user?.supportSession) throw forbiddenError('There is no support session to close');
  const { reason } = supportSessionSchema.parse(req.body);
  ok(res, await vendorService.endSupportSession(req.user.organizationId, reason, req.user.id, req.user.name));
}
