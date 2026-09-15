import { z } from 'zod';

/**
 * The organization profile, which every screen reads.
 *
 * Every field is optional and the rule that at least one of them arrived is a refinement below: an
 * empty PATCH is a client bug, not a no-op. `location` is the one field a *complete* profile must
 * have — a church always knows where it meets — and the wizard is where that is insisted on.
 */
const profileFields = z.object({
  name: z.string().trim().min(2, 'Name the church').max(160).optional(),
  tagline: z.string().trim().max(200).optional(),
  location: z.string().trim().min(2).max(200).optional(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email('Enter a valid email address').max(200).optional(),
  website: z.string().trim().url('Enter a valid web address').max(200).optional(),
  vision: z.string().trim().max(2000).optional(),
  mission: z.string().trim().max(2000).optional(),
  coreValues: z.array(z.string().trim().min(2).max(200)).max(20).optional(),
  serviceTimes: z.record(z.string().trim().max(60)).optional(),
  socials: z.record(z.string().trim().max(300)).optional(),
  /** The id of an uploaded logo. `null` removes it; leaving it out leaves it alone. */
  logoFileId: z.string().uuid().nullable().optional(),
});

export const updateProfileSchema = profileFields.refine((value) => Object.keys(value).length > 0, {
  message: 'Send at least one field to change',
});

/** The three preference screens, each stored as one JSON document under its own key. */
export const settingKeySchema = z.enum(['notifications', 'integrations', 'customization']);

export const updateSettingSchema = z.object({
  value: z.record(z.unknown()),
});

/**
 * The welcome wizard's last step.
 *
 * The same fields the Settings screen writes — one shape, so a fact entered during setup and a fact
 * changed a year later travel the same path — with the one thing the wizard insists on: the church
 * has to say where it meets before it is finished with being new.
 */
export const onboardingSchema = profileFields.refine(
  (value) => typeof value.location === 'string' && value.location.trim().length >= 2,
  { path: ['location'], message: 'Say where the church meets' },
);

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SettingKey = z.infer<typeof settingKeySchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
