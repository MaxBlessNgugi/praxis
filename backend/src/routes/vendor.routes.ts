import { Router } from 'express';
import * as vendorController from '../controllers/vendor.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requirePlatformAdmin } from '../middleware/authenticate';

/**
 * `/api/vendor` — Praxis's own view of the churches it serves.
 *
 * The one place in the service that deliberately steps across tenants, and it is why the gate is a
 * flag on the account (`isPlatformAdmin`) rather than a role: every church has a `super_admin`, and a
 * role check would hand every parish owner the whole customer list.
 *
 * The router is behind `requireAuth` as well, so a vendor action is still a named person doing it, and
 * still lands in an audit log.
 */
export const vendorRouter = Router();

/**
 * Closing a visit, before the vendor gate below and deliberately so.
 *
 * A support session is the *church's* access rather than the vendor's — while it is open the operator
 * cannot reach the rest of these routes — so the one call that must keep working is the one that ends
 * it. Mounted ahead of `use` because an Express router applies middleware only to the routes declared
 * after it.
 */
vendorRouter.post('/support-sessions/end', requireAuth, asyncHandler(vendorController.endSupportSession));

vendorRouter.use(requireAuth, requirePlatformAdmin);

vendorRouter.get('/organizations', asyncHandler(vendorController.listOrganizations));
vendorRouter.get('/organizations/:id', asyncHandler(vendorController.getOrganization));
vendorRouter.get('/organizations/:id/stats', asyncHandler(vendorController.organizationStats));
vendorRouter.post('/organizations/:id/suspension', asyncHandler(vendorController.setSuspension));
vendorRouter.post('/organizations/:id/support-sessions', asyncHandler(vendorController.startSupportSession));
vendorRouter.post('/organizations/:id/plan', asyncHandler(vendorController.assignPlan));
vendorRouter.post('/organizations/:id/payments', asyncHandler(vendorController.recordPayment));

vendorRouter.get('/plans', asyncHandler(vendorController.listPlans));
vendorRouter.put('/plans/:key', asyncHandler(vendorController.savePlan));
