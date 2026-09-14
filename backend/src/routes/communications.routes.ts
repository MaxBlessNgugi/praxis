import { Router } from 'express';
import * as communications from '../controllers/communications.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/authenticate';

/**
 * `/api/communications` — announcements, broadcasts, the calendar and prayer.
 *
 * Reading is open to anyone signed in: the notice sheet and the prayer list are things the whole
 * office works from. Publishing, editing and retiring need `staff` or above, and retiring needs
 * `admin`, since it takes a notice out of circulation.
 */
export const communicationsRouter = Router();

const WRITERS = requireRole('super_admin', 'admin', 'staff');
const ADMINS = requireRole('admin');

communicationsRouter.use(requireAuth);

// Named paths first, or "celebrations" parses as an announcement id.
communicationsRouter.get('/celebrations', asyncHandler(communications.listCelebrations));

communicationsRouter.get('/announcements', asyncHandler(communications.listAnnouncements));
communicationsRouter.post('/announcements', WRITERS, asyncHandler(communications.createAnnouncement));
communicationsRouter.get('/announcements/:id', asyncHandler(communications.getAnnouncement));
communicationsRouter.patch('/announcements/:id', WRITERS, asyncHandler(communications.updateAnnouncement));
communicationsRouter.delete('/announcements/:id', ADMINS, asyncHandler(communications.retireAnnouncement));

communicationsRouter.get('/broadcasts', asyncHandler(communications.listBroadcasts));
communicationsRouter.post('/broadcasts', WRITERS, asyncHandler(communications.createBroadcast));
communicationsRouter.get('/broadcasts/:id', asyncHandler(communications.getBroadcast));
communicationsRouter.patch('/broadcasts/:id', WRITERS, asyncHandler(communications.updateBroadcast));
communicationsRouter.post('/broadcasts/:id/send', WRITERS, asyncHandler(communications.sendBroadcast));
communicationsRouter.delete('/broadcasts/:id', ADMINS, asyncHandler(communications.retireBroadcast));

communicationsRouter.get('/events', asyncHandler(communications.listEvents));
communicationsRouter.post('/events', WRITERS, asyncHandler(communications.createEvent));
communicationsRouter.get('/events/:id', asyncHandler(communications.getEvent));
communicationsRouter.patch('/events/:id', WRITERS, asyncHandler(communications.updateEvent));
communicationsRouter.delete('/events/:id', ADMINS, asyncHandler(communications.retireEvent));

communicationsRouter.get('/prayer-requests', asyncHandler(communications.listPrayerRequests));
communicationsRouter.post('/prayer-requests', WRITERS, asyncHandler(communications.createPrayerRequest));
communicationsRouter.get('/prayer-requests/:id', asyncHandler(communications.getPrayerRequest));
communicationsRouter.patch('/prayer-requests/:id', WRITERS, asyncHandler(communications.updatePrayerRequest));
communicationsRouter.post('/prayer-requests/:id/answer', WRITERS, asyncHandler(communications.answerPrayerRequest));
communicationsRouter.delete('/prayer-requests/:id', ADMINS, asyncHandler(communications.retirePrayerRequest));
