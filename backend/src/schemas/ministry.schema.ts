import { z } from 'zod';
import { booleanQuery } from './common';

const ministryFields = z.object({
  name: z.string().trim().min(2, 'Name the ministry').max(120),
  description: z.string().trim().max(2000).optional(),
  leaderId: z.string().uuid().optional(),
  meetingDay: z.string().trim().max(20).optional(),
  location: z.string().trim().max(160).optional(),
  isActive: z.boolean().default(true),
});

export const createMinistrySchema = ministryFields;

export const updateMinistrySchema = ministryFields
  .partial()
  .extend({ leaderId: z.string().uuid().nullable().optional() })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

export const listMinistriesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  isActive: booleanQuery.optional(),
  leaderId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/** Putting somebody on a ministry's roll, with the role they hold on it. */
export const addMinistryMemberSchema = z.object({
  memberId: z.string().uuid(),
  roleTitle: z.string().trim().min(2, 'Name the role').max(80).default('Member'),
});

export const updateMinistryMemberSchema = z
  .object({ roleTitle: z.string().trim().min(2).max(80) })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

/**
 * The two roster views the console shows.
 *
 * `leadership` is the roll filtered to people who hold a title, and `volunteers` is everyone serving
 * on a ministry. They are the same rows read two ways, so they are one query with a flag rather than
 * two endpoints that can disagree.
 */
export const rosterQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  ministryId: z.string().uuid().optional(),
  leadershipOnly: booleanQuery.default('false'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateMinistryInput = z.infer<typeof createMinistrySchema>;
export type UpdateMinistryInput = z.infer<typeof updateMinistrySchema>;
export type ListMinistriesQuery = z.infer<typeof listMinistriesQuerySchema>;
export type AddMinistryMemberInput = z.infer<typeof addMinistryMemberSchema>;
export type UpdateMinistryMemberInput = z.infer<typeof updateMinistryMemberSchema>;
export type RosterQuery = z.infer<typeof rosterQuerySchema>;
