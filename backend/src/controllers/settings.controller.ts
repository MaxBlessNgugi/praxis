import type { Request, Response } from 'express';
import { onboardingSchema, settingKeySchema, updateProfileSchema, updateSettingSchema } from '../schemas/settings.schema';
import * as settingsService from '../services/settings.service';
import { ok } from '../lib/respond';
import { actor } from '../lib/request';

export async function getProfile(_req: Request, res: Response): Promise<void> {
  ok(res, await settingsService.getProfile());
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  ok(res, await settingsService.updateProfile(updateProfileSchema.parse(req.body), actor(req)));
}

/** The welcome wizard's last step: the profile, plus the fact that this church has been shown it. */
export async function completeOnboarding(req: Request, res: Response): Promise<void> {
  ok(res, await settingsService.completeOnboarding(onboardingSchema.parse(req.body), actor(req)));
}

export async function listSettings(_req: Request, res: Response): Promise<void> {
  ok(res, await settingsService.listSettings());
}

export async function getSetting(req: Request, res: Response): Promise<void> {
  ok(res, await settingsService.getSetting(settingKeySchema.parse(req.params.key)));
}

export async function updateSetting(req: Request, res: Response): Promise<void> {
  const key = settingKeySchema.parse(req.params.key);
  ok(res, await settingsService.updateSetting(key, updateSettingSchema.parse(req.body), actor(req)));
}

export async function backup(_req: Request, res: Response): Promise<void> {
  ok(res, await settingsService.backupManifest());
}

/**
 * The church's records as one file.
 *
 * Served like every other read — `{ data: … }` — and written to disk by the console. A route that
 * glued `Content-Disposition` onto its own response would be the one endpoint a client could not call
 * with the ordinary helper, for no gain: the console is the only caller, and it has to hold the bytes
 * in memory either way to offer them as a download.
 */
export async function exportData(req: Request, res: Response): Promise<void> {
  ok(res, await settingsService.exportOrganization(actor(req)));
}
