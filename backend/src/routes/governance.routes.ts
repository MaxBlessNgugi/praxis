import { Router } from 'express';
import * as governanceController from '../controllers/governance.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';

/**
 * `/api/governance` — the Session's meetings, the resolutions that come out of them, and the
 * documents held against both.
 *
 * Reading is open to any signed-in account, because the minutes concern the whole congregation and
 * the office works from them. **Writing** a minute is the clerk's job, so it needs `staff`. Deciding
 * a resolution is narrower again: the Session resolves, so that is `admin` and above, and the
 * decision is recorded against its actor either way. Nothing here deletes — a minute that was wrong
 * is retired with a reason.
 */
export const governanceRouter = Router();

const WRITERS = requireRole('super_admin', 'admin', 'staff');
const ADMINS = requireRole('admin');

governanceRouter.use(requireAuth, requireWritableSubscription);

// The Session
governanceRouter.get('/meetings', asyncHandler(governanceController.listMeetings));
governanceRouter.post('/meetings', WRITERS, asyncHandler(governanceController.createMeeting));
governanceRouter.get('/meetings/:id', asyncHandler(governanceController.getMeeting));
governanceRouter.patch('/meetings/:id', WRITERS, asyncHandler(governanceController.updateMeeting));
governanceRouter.delete('/meetings/:id', ADMINS, asyncHandler(governanceController.retireMeeting));

// Dockets and resolutions
governanceRouter.get('/resolutions', asyncHandler(governanceController.listResolutions));
governanceRouter.post('/resolutions', WRITERS, asyncHandler(governanceController.createResolution));
governanceRouter.get('/resolutions/:id', asyncHandler(governanceController.getResolution));
governanceRouter.patch('/resolutions/:id', WRITERS, asyncHandler(governanceController.updateResolution));
governanceRouter.post('/resolutions/:id/decision', ADMINS, asyncHandler(governanceController.decideResolution));
governanceRouter.delete('/resolutions/:id', ADMINS, asyncHandler(governanceController.retireResolution));

// The library
governanceRouter.get('/documents', asyncHandler(governanceController.listDocuments));
governanceRouter.post('/documents', WRITERS, asyncHandler(governanceController.createDocument));
governanceRouter.get('/documents/:id', asyncHandler(governanceController.getDocument));
governanceRouter.patch('/documents/:id', WRITERS, asyncHandler(governanceController.updateDocument));
governanceRouter.delete('/documents/:id', ADMINS, asyncHandler(governanceController.retireDocument));
