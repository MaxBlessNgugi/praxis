import { Router } from 'express';
import * as billingController from '../controllers/billing.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth } from '../middleware/authenticate';

/**
 * `/api/billing` — a church's own subscription.
 *
 * Deliberately **not** behind `requireWritableSubscription`: a church whose subscription has lapsed is
 * exactly the church that has to be able to read what it owes and ask to be put back on a plan. The
 * gate closes the operating modules; this is the door out.
 *
 * Everything here is read through the tenant-scoped client, so a church sees its own subscription and
 * the same request cannot reach another's. The vendor's view of the same tables lives at
 * `/api/vendor`, which is a different door with a different key.
 */
export const billingRouter = Router();

billingRouter.use(requireAuth, moduleGate('settings'));

billingRouter.get('/plans', asyncHandler(billingController.listPlans));
billingRouter.get('/subscription', asyncHandler(billingController.getSubscription));
billingRouter.get('/payments', asyncHandler(billingController.listPayments));
billingRouter.post('/request-upgrade', asyncHandler(billingController.requestUpgrade));
