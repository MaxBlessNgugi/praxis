import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/authenticate';

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

settingsRouter.use(requireAuth);

settingsRouter.get('/profile', asyncHandler(settingsController.getProfile));
settingsRouter.patch('/profile', ADMINS, asyncHandler(settingsController.updateProfile));

settingsRouter.get('/preferences', asyncHandler(settingsController.listSettings));
settingsRouter.get('/preferences/backup', ADMINS, asyncHandler(settingsController.backup));
settingsRouter.get('/preferences/:key', asyncHandler(settingsController.getSetting));
settingsRouter.put('/preferences/:key', ADMINS, asyncHandler(settingsController.updateSetting));
