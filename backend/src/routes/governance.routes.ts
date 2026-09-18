import { Router } from 'express';
import * as governanceController from '../controllers/governance.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';

/**
 * `/api/governance` — the Session's meetings, the resolutions that come out of them, and the
 * documents held against both.
 *
 * Reading is open to any signed-in account with the council panel, because the minutes concern the
 * whole congregation and the office works from them. **Writing** a minute is the clerk's job, so it
 * needs `staff`. Two acts are narrower again, and both for the same reason — they are the Session's
 * rather than the office's: deciding a resolution, and sealing the minutes that close a sitting. Each
 * is recorded against its actor either way. Nothing here deletes — a minute that was wrong is retired
 * with a reason, which is the only way a sealed record should leave the library.
 */
export const governanceRouter = Router();

const WRITERS = requireRole('super_admin', 'admin', 'staff');
const ADMINS = requireRole('admin');

governanceRouter.use(requireAuth, moduleGate('council'), requireWritableSubscription);

// The Session
governanceRouter.get('/meetings', asyncHandler(governanceController.listMeetings));
governanceRouter.post('/meetings', WRITERS, asyncHandler(governanceController.createMeeting));
governanceRouter.get('/meetings/:id', asyncHandler(governanceController.getMeeting));
governanceRouter.patch('/meetings/:id', WRITERS, asyncHandler(governanceController.updateMeeting));
// Sealing the minutes is the act that closes a sitting, and afterwards the register is fixed — so it
// is the Session's own, not the clerk's, even though the clerk writes the words.
governanceRouter.post('/meetings/:id/minutes/seal', ADMINS, asyncHandler(governanceController.sealMinutes));
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
