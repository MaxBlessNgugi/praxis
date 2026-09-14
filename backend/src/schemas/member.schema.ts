import { z } from 'zod';
import { archiveReasonSchema, booleanQuery, retireReasonSchema } from './common';

/**
 * Kenyan mobile numbers, in the two forms a parish clerk actually types: `+254 7xx xxx xxx` and
 * `07xx xxx xxx`. Stored normalised to `+254XXXXXXXXX`, so a search for either finds the same person.
 */
const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .refine((value) => /^(\+254|0)7\d{8}$|^(\+254|0)1\d{8}$/.test(value), 'Enter a Kenyan mobile number, e.g. 0712 345 678')
  .transform((value) => (value.startsWith('0') ? `+254${value.slice(1)}` : value));

export const memberStatusSchema = z.enum(['active', 'transferred', 'deceased', 'inactive']);
export const baptismTypeSchema = z.enum(['baptized', 'dedicated', 'none']);

export const createMemberSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter a first name').max(80),
  lastName: z.string().trim().min(1, 'Enter a last name').max(80),
  email: z.string().trim().email('Enter a valid email address').optional(),
  phone: phoneSchema.optional(),
  nationalId: z.string().trim().min(5).max(20).optional(),
  dateOfBirth: z.coerce.date().optional(),
  location: z.string().trim().min(2, 'Say which congregation this member belongs to').max(120),
  householdId: z.string().uuid().optional(),
  householdRole: z.string().trim().max(60).optional(),
  isHouseholdHead: z.boolean().default(false),
  status: memberStatusSchema.default('active'),
  baptismType: baptismTypeSchema.default('baptized'),
  baptismDate: z.coerce.date().optional(),
  baptismOfficiant: z.string().trim().max(120).optional(),
  envelopeNumber: z.string().trim().max(30).optional(),
  pastoralNotes: z.string().trim().max(4000).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
});

/** Every field optional, but at least one required — an empty PATCH is a client bug, not a no-op. */
export const updateMemberSchema = createMemberSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

export const listMembersQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: memberStatusSchema.optional(),
  baptismType: baptismTypeSchema.optional(),
  location: z.string().trim().max(120).optional(),
  householdId: z.string().uuid().optional(),
  /** `true` returns only the heads of households, `false` only the dependants. */
  headsOnly: booleanQuery.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['name', 'recent', 'oldest']).default('name'),
});

/**
 * Retiring a member: a reason from the list plus free text, and the parish a transfer went to.
 *
 * The shared vocabulary narrowed to the ways a person leaves a register — a member is not "cancelled"
 * or "postponed", so those reasons are not offered against one.
 */
export const retireMemberSchema = retireReasonSchema.extend({
  reason: archiveReasonSchema.extract(['transferred', 'relocated', 'deceased', 'request', 'disciplinary', 'duplicate', 'other']),
  destinationParish: z.string().trim().max(160).optional(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;
export type RetireMemberInput = z.infer<typeof retireMemberSchema>;
