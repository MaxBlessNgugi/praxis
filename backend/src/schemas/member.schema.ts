import { z } from 'zod';
import { archiveReasonSchema, booleanQuery, retireReasonSchema } from './common';

/**
 * The stored form of a Kenyan mobile number, whichever way it was typed.
 *
 * One function rather than a transformation buried in a schema, because two things need it: the
 * schema, and the import's duplicate check — which compares a row against numbers that were stored
 * long before it, and would otherwise fail to recognise `0712 999 001` and `+254712999001` as the
 * same person. Numbers that are not Kenyan are left as typed and refused by the schema above them.
 */
export function normalisePhone(value: string): string {
  const stripped = value.replace(/[\s-]/g, '');
  return stripped.startsWith('0') ? `+254${stripped.slice(1)}` : stripped;
}

/**
 * Kenyan mobile numbers, in the two forms a parish clerk actually types: `+254 7xx xxx xxx` and
 * `07xx xxx xxx`. Stored normalised to `+254XXXXXXXXX`, so a search for either finds the same person.
 */
const phoneSchema = z
  .string()
  .trim()
  .transform(normalisePhone)
  .refine((value) => /^\+254(7|1)\d{8}$/.test(value), 'Enter a Kenyan mobile number, e.g. 0712 345 678');

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
  /** The id of an uploaded photograph. Optional, because a register that refuses to save a person
   *  until it has a picture of them is a register nobody fills in. */
  photoFileId: z.string().uuid().optional(),
});

/** Every field optional, but at least one required — an empty PATCH is a client bug, not a no-op. */
export const updateMemberSchema = createMemberSchema
  .partial()
  // `null` clears the photograph; leaving it out leaves the current one alone. The ".partial()" above
  // cannot express that distinction, which is why the field is restated here.
  .extend({ photoFileId: z.string().uuid().nullable().optional() })
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

/**
 * A register arriving as a spreadsheet.
 *
 * The console does not try to guess which column is which. It shows the clerk the file's own header
 * row and asks, because the guess is wrong often enough — `Name` holding "Wanjiku, Mary", `Phone`
 * holding an envelope number — that a batch of four hundred rows landing in the wrong fields is worse
 * than one more screen.
 *
 * So the mapping travels with the file: which zero-based column holds which field. An empty mapping is
 * a legitimate request — it asks the server what the columns *are*, which is what the mapping screen
 * needs before it can draw itself, and it keeps the CSV parser in one place instead of duplicating it
 * in the browser.
 */
export const memberImportFieldSchema = z.enum([
  'firstName',
  'lastName',
  'location',
  'email',
  'phone',
  'nationalId',
  'dateOfBirth',
  'status',
  'baptismType',
  'baptismDate',
  'baptismOfficiant',
  'envelopeNumber',
  'tags',
  'pastoralNotes',
]);

export const memberImportSchema = z.object({
  csv: z.string().min(1, 'Choose a CSV file, or paste its contents').max(8_000_000, 'That file is too large to import in one go'),
  columns: z
    .array(z.object({ index: z.coerce.number().int().min(0).max(300), field: memberImportFieldSchema }))
    .max(60)
    .default([]),
  /**
   * For the common case: a church whose whole register meets in one place, and whose spreadsheet
   * therefore has no column for it. Rows that carry their own location are left alone.
   */
  defaultLocation: z.string().trim().min(2, 'Say which congregation these members belong to').max(120).optional(),
  /** The default, and the only safe one: nothing is written until somebody has seen the report. */
  dryRun: z.boolean().default(true),
});

export type MemberImportField = z.infer<typeof memberImportFieldSchema>;
export type MemberImportInput = z.infer<typeof memberImportSchema>;

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;
export type RetireMemberInput = z.infer<typeof retireMemberSchema>;
