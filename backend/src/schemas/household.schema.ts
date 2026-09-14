import { z } from 'zod';

export const createHouseholdSchema = z.object({
  name: z.string().trim().min(2, 'Enter the household name').max(120),
  unitNumber: z.string().trim().min(1, 'Enter the unit number').max(30),
  location: z.string().trim().min(2).max(120),
  address: z.string().trim().max(240).optional(),
});

export const updateHouseholdSchema = createHouseholdSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

export const listHouseholdsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const linkMemberSchema = z.object({
  memberId: z.string().uuid(),
  householdRole: z.string().trim().max(60).default('Member'),
  /** Setting this moves the headship to this member and clears it from whoever held it. */
  makeHead: z.boolean().default(false),
});

export const setHeadSchema = z.object({ memberId: z.string().uuid() });

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;
export type ListHouseholdsQuery = z.infer<typeof listHouseholdsQuerySchema>;
export type LinkMemberInput = z.infer<typeof linkMemberSchema>;
