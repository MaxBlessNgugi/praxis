import type { Request, Response } from 'express';
import { requestUpgradeSchema } from '../schemas/billing.schema';
import * as billingService from '../services/billing.service';
import { forbiddenError, unauthorizedError } from '../middleware/errorHandler';
import { ok } from '../lib/respond';
import type { AuthenticatedUser } from '../middleware/authenticate';

/** The caller, who is always present on these routes: `requireAuth` runs first. */
function actor(req: Request): AuthenticatedUser {
  if (!req.user) throw unauthorizedError();
  return req.user;
}

/** The church's own billing picture: what it is on, what it owes, and what it is waiting for. */
export async function getSubscription(_req: Request, res: Response): Promise<void> {
  ok(res, await billingService.currentSubscription());
}

export async function listPlans(_req: Request, res: Response): Promise<void> {
  ok(res, await billingService.planCatalogue());
}

export async function listPayments(_req: Request, res: Response): Promise<void> {
  ok(res, await billingService.listPayments());
}

/**
 * Ask Praxis to move this church to another plan.
 *
 * The office may ask; only the vendor may decide. That asymmetry is the whole shape of manual billing,
 * and it is enforced here rather than by hiding a button.
 */
export async function requestUpgrade(req: Request, res: Response): Promise<void> {
  const user = actor(req);
  if (!user.actions.edit) throw forbiddenError('Your role can see the subscription but not change it');
  ok(res, await billingService.requestUpgrade(requestUpgradeSchema.parse(req.body), user.id));
}
