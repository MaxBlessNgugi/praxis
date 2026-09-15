import { Router } from 'express';
import * as ministryController from '../controllers/ministry.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';

/**
 * `/api/ministries` — the groups, their leaders, and who serves on them.
 *
 * `/roster` is declared before `/:id`: without that, "roster" would be read as a ministry id. The
 * console's Leadership Roles and Volunteer Roles screens are one query with `leadershipOnly`.
 */
export const ministryRouter = Router();

const WRITERS = requireRole('super_admin', 'admin', 'staff');
const ADMINS = requireRole('admin');

ministryRouter.use(requireAuth, requireWritableSubscription);

ministryRouter.get('/roster', asyncHandler(ministryController.roster));

ministryRouter.get('/', asyncHandler(ministryController.listMinistries));
ministryRouter.post('/', WRITERS, asyncHandler(ministryController.createMinistry));
ministryRouter.get('/:id', asyncHandler(ministryController.getMinistry));
ministryRouter.patch('/:id', WRITERS, asyncHandler(ministryController.updateMinistry));
ministryRouter.delete('/:id', ADMINS, asyncHandler(ministryController.retireMinistry));

// The roll: adding someone, changing what they do, taking them off.
ministryRouter.post('/:id/members', WRITERS, asyncHandler(ministryController.addMember));
ministryRouter.patch('/members/:id', WRITERS, asyncHandler(ministryController.updateMember));
ministryRouter.delete('/members/:id', WRITERS, asyncHandler(ministryController.removeMember));
