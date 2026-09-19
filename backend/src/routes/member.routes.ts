import { Router } from 'express';
import * as memberController from '../controllers/member.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';

/**
 * `/api/members` — the register.
 *
 * Reading is open to anyone signed in; writing needs staff; *destroying* needs admin. That split is
 * the point: an usher updating a phone number and the same person retiring a member are different
 * acts, and only the first is an everyday one.
 */
export const memberRouter = Router();

memberRouter.use(requireAuth, moduleGate('members'), requireWritableSubscription);

// Declared before `/:id`, or "trash" would be read as a member id. The *list* of archived members is
// the admin Trash screen's (`GET /api/admin/trash?entityName=Member`) rather than a copy of it here;
// this router keeps the restore so the members panel has a door of its own.
memberRouter.post('/trash/:id/restore', requireRole('admin'), asyncHandler(memberController.restoreMember));

// The spreadsheet door, beside the one-member door and behind the same role. Declared before
// `/:id` for the usual reason: "import" is not a member id.
memberRouter.post(
  '/import',
  requireRole('super_admin', 'admin', 'staff'),
  asyncHandler(memberController.importMembers),
);

memberRouter.get('/', asyncHandler(memberController.listMembers));

// The congregations the register itself names, for the member and household forms. Declared before
// `/:id` for the usual reason: "locations" is not a member id.
memberRouter.get('/locations', asyncHandler(memberController.listLocations));
memberRouter.get('/:id', asyncHandler(memberController.getMember));

memberRouter.post('/', requireRole('super_admin', 'admin', 'staff'), asyncHandler(memberController.createMember));
memberRouter.patch('/:id', requireRole('super_admin', 'admin', 'staff'), asyncHandler(memberController.updateMember));

// One way to retire a member, as there is one way everywhere else: `DELETE /:id?reason=&reasonLabel=`.
memberRouter.delete('/:id', requireRole('admin'), asyncHandler(memberController.deleteMember));
