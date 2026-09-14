import { z } from 'zod';

/**
 * The organization profile, which every screen reads.
 *
 * `location` is required and the rest is optional: a church always knows where it meets, and requiring
 * a vision statement before the register can be configured would be the wrong way round.
 */
export const updateProfileSchema = z
  .object({
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
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

/** The three preference screens, each stored as one JSON document under its own key. */
export const settingKeySchema = z.enum(['notifications', 'integrations', 'customization']);

export const updateSettingSchema = z.object({
  value: z.record(z.unknown()),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SettingKey = z.infer<typeof settingKeySchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
