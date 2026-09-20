import { Router } from 'express';
import * as communications from '../controllers/communications.controller';
import { env } from '../config/env';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { rateLimit } from '../middleware/rateLimit';
import { requireWritableSubscription } from '../middleware/subscription';

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

communicationsRouter.use(requireAuth, moduleGate('communications'), requireWritableSubscription);

// Named paths first, or "celebrations" parses as an announcement id.
communicationsRouter.get('/celebrations', asyncHandler(communications.listCelebrations));
// Whether outbound email and SMS are actually configured, read before the console offers to send.
communicationsRouter.get('/channels', asyncHandler(communications.channels));

communicationsRouter.get('/announcements', asyncHandler(communications.listAnnouncements));
communicationsRouter.post('/announcements', WRITERS, asyncHandler(communications.createAnnouncement));
communicationsRouter.get('/announcements/:id', asyncHandler(communications.getAnnouncement));
communicationsRouter.patch('/announcements/:id', WRITERS, asyncHandler(communications.updateAnnouncement));
communicationsRouter.delete('/announcements/:id', ADMINS, asyncHandler(communications.retireAnnouncement));

communicationsRouter.get('/broadcasts', asyncHandler(communications.listBroadcasts));
communicationsRouter.post('/broadcasts', WRITERS, asyncHandler(communications.createBroadcast));
communicationsRouter.get('/broadcasts/:id', asyncHandler(communications.getBroadcast));
communicationsRouter.patch('/broadcasts/:id', WRITERS, asyncHandler(communications.updateBroadcast));
// The one endpoint in this service with a bill attached: a send reaches the whole congregation at the
// provider's per-message rate. The general ceiling is sized for a console loading a dozen resources,
// which is no protection at all against a stuck retry loop posting an SMS to four hundred people.
communicationsRouter.post(
  '/broadcasts/:id/send',
  WRITERS,
  rateLimit({
    name: 'broadcast-send',
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.COSTLY_RATE_LIMIT_MAX,
    keyOf: (req) => String(req.params.id ?? ''),
  }),
  asyncHandler(communications.sendBroadcast),
);
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
