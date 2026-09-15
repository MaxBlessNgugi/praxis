import { Router } from 'express';
import * as householdController from '../controllers/household.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';

/** `/api/households` — grouping, membership and headship. Same read/write/retire split as members. */
export const householdRouter = Router();

householdRouter.use(requireAuth, requireWritableSubscription);

householdRouter.get('/', asyncHandler(householdController.listHouseholds));
householdRouter.get('/:id', asyncHandler(householdController.getHousehold));

householdRouter.post('/', requireRole('super_admin', 'admin', 'staff'), asyncHandler(householdController.createHousehold));
householdRouter.patch('/:id', requireRole('super_admin', 'admin', 'staff'), asyncHandler(householdController.updateHousehold));

householdRouter.post('/:id/members', requireRole('super_admin', 'admin', 'staff'), asyncHandler(householdController.linkMember));
householdRouter.post('/:id/head', requireRole('super_admin', 'admin', 'staff'), asyncHandler(householdController.setHead));
householdRouter.delete('/:id/members/:memberId', requireRole('super_admin', 'admin', 'staff'), asyncHandler(householdController.unlinkMember));

householdRouter.delete('/:id', requireRole('admin'), asyncHandler(householdController.retireHousehold));
