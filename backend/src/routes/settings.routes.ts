import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';

/**
 * `/api/settings` — the organization profile and the three preference documents.
 *
 * Every screen reads the profile, so reading it is open to any signed-in account; changing the
 * church's address or its ten core values is an `admin` act, since those words appear on the notice
 * sheet and the certificates. The preference keys (`notifications`, `integrations`,
 * `customization`) govern the whole installation for the same reason.
 *
 * `sync` is the console's "Cloud synced" indicator: it reports what has been written and when, and
 * changes nothing.
 */
export const settingsRouter = Router();

const ADMINS = requireRole('admin');

settingsRouter.use(requireAuth, moduleGate('settings'));

// The welcome wizard, which a church that signed itself up runs once. It is the one settings write
// declared **before** the subscription gate below — for the same reason `/api/billing` sits outside
// the gate entirely: a church that lapsed mid-wizard must still be able to finish saying where it
// meets. Express applies middleware in declaration order, so a route listed after the gate is behind
// it and this one is not.
settingsRouter.post('/onboarding', ADMINS, asyncHandler(settingsController.completeOnboarding));

settingsRouter.use(requireWritableSubscription);

settingsRouter.get('/profile', asyncHandler(settingsController.getProfile));
settingsRouter.patch('/profile', ADMINS, asyncHandler(settingsController.updateProfile));

/**
 * The church's own data, as a file.
 *
 * `admin`, not `staff`: a copy of every member's record — pastoral notes included — is the same class
 * of act as retiring one, and it is written into the church's audit log so the copy leaves a trace.
 */
settingsRouter.get('/export', ADMINS, asyncHandler(settingsController.exportData));

settingsRouter.get('/preferences', asyncHandler(settingsController.listSettings));
settingsRouter.get('/preferences/backup', ADMINS, asyncHandler(settingsController.backup));
settingsRouter.get('/preferences/:key', asyncHandler(settingsController.getSetting));
settingsRouter.put('/preferences/:key', ADMINS, asyncHandler(settingsController.updateSetting));
