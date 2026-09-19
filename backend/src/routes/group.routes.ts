import { Router } from 'express';
import * as groupController from '../controllers/group.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';

/**
 * `/api/groups` — the fellowships that meet midweek, their rolls, and their meetings.
 *
 * Same guards as `/api/ministries`, because a group is the other half of the same panel: any
 * signed-in account may read, staff may convene, and only an administrator retires a whole circle.
 * `/meetings` is declared before `/:id` for the usual reason — "meetings" is not a group id.
 */
export const groupRouter = Router();

const WRITERS = requireRole('super_admin', 'admin', 'staff');
const ADMINS = requireRole('admin');

groupRouter.use(requireAuth, moduleGate('groups'), requireWritableSubscription);

groupRouter.get('/meetings', asyncHandler(groupController.listMeetings));

groupRouter.get('/', asyncHandler(groupController.listGroups));
groupRouter.post('/', WRITERS, asyncHandler(groupController.createGroup));
groupRouter.get('/:id', asyncHandler(groupController.getGroup));
groupRouter.patch('/:id', WRITERS, asyncHandler(groupController.updateGroup));
groupRouter.delete('/:id', ADMINS, asyncHandler(groupController.retireGroup));

// The roll: adding someone, changing what they do, taking them off.
groupRouter.post('/:id/members', WRITERS, asyncHandler(groupController.addMember));
groupRouter.patch('/members/:id', WRITERS, asyncHandler(groupController.updateMember));
groupRouter.delete('/members/:id', WRITERS, asyncHandler(groupController.removeMember));

// The record of gatherings, with the count a cell leader reports.
groupRouter.post('/:id/meetings', WRITERS, asyncHandler(groupController.recordMeeting));
groupRouter.patch('/meetings/:id', WRITERS, asyncHandler(groupController.updateMeeting));
