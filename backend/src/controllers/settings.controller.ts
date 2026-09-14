import type { Request, Response } from 'express';
import { settingKeySchema, updateProfileSchema, updateSettingSchema } from '../schemas/settings.schema';
import * as settingsService from '../services/settings.service';
import { ok } from '../lib/respond';
import { actor } from '../lib/request';

export async function getProfile(_req: Request, res: Response): Promise<void> {
  ok(res, await settingsService.getProfile());
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  ok(res, await settingsService.updateProfile(updateProfileSchema.parse(req.body), actor(req)));
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
