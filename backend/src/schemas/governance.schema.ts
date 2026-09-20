import { z } from 'zod';
import { booleanQuery, window } from './common';

export const meetingKindSchema = z.enum(['stated', 'executive', 'emergency']);
export const meetingStatusSchema = z.enum(['scheduled', 'held', 'cancelled']);
export const resolutionStageSchema = z.enum(['proposed', 'voted_approved', 'implementing', 'closed']);
export const documentKindSchema = z.enum(['bylaw', 'policy', 'constitution', 'minutes', 'certificate', 'other']);

// -------------------------------------------------------------------------------------------
// Meetings
// -------------------------------------------------------------------------------------------

/**
 * A sitting, as the clerk records it.
 *
 * There is no `quorumMet` here, and that is the point: whether a sitting was quorate is a count of the
 * people in the room against the number the Session needs, and a boolean a client sends is a claim
 * dressed as a fact. The server counts the council roll, stores what that sitting needed, and derives
 * the answer from the attendance — the rule is in `lib/quorum`, which the seed states as well.
 */
const meetingFields = z.object({
  title: z.string().trim().min(3, 'Name the meeting').max(160),
  kind: meetingKindSchema.default('stated'),
  status: meetingStatusSchema.default('scheduled'),
  heldAt: z.coerce.date(),
  venue: z.string().trim().min(2, 'Say where it is held').max(160),
  chairId: z.string().uuid().optional(),
  secretaryId: z.string().uuid().optional(),
  attendees: z.number().int().min(0).max(10_000).optional(),
  agenda: z.array(z.string().trim().min(2).max(300)).max(50).optional(),
  minutes: z.string().trim().max(20_000).optional(),
});

export const createMeetingSchema = meetingFields;

export const updateMeetingSchema = meetingFields
  .partial()
  .extend({ chairId: z.string().uuid().nullable().optional(), secretaryId: z.string().uuid().nullable().optional() })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

export const listMeetingsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  kind: meetingKindSchema.optional(),
  status: meetingStatusSchema.optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// -------------------------------------------------------------------------------------------
// Resolutions
// -------------------------------------------------------------------------------------------

const resolutionFields = z.object({
  title: z.string().trim().min(3, 'Give the resolution a title').max(200),
  summary: z.string().trim().min(3, 'Summarise what is being decided').max(4000),
  sponsor: z.string().trim().min(2, 'Name the sponsor').max(120),
  sponsorOfficer: z.string().trim().max(120).optional(),
  meetingId: z.string().uuid().optional(),
  councilDate: z.coerce.date(),
  stage: resolutionStageSchema.default('proposed'),
  voteSummary: z.string().trim().max(200).optional(),
  lead: z.string().trim().max(160).optional(),
  leadNote: z.string().trim().max(500).optional(),
});

/**
 * The code is issued by the server in the year's series, so it is not accepted from a client — and
 * neither is the stage. A resolution moves when the Session votes, when the work starts and when it is
 * closed, and each of those is an act with its own endpoint rather than a field somebody edits.
 */
export const createResolutionSchema = resolutionFields.omit({ stage: true });
export const updateResolutionSchema = resolutionFields
  .omit({ stage: true })
  .partial()
  .extend({ meetingId: z.string().uuid().nullable().optional() })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

/**
 * Each step of a resolution is its own act, with its own endpoint.
 *
 * A vote records how the council went and its counts, because that is what the minute quotes. Starting
 * the work and closing it each carry the lead's note — what the work is, and what it came to — and the
 * audit line keeps the earlier one, so a closure does not quietly erase the plan it closes.
 */
export const decideResolutionSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('voted_approved'),
    voteSummary: z.string().trim().min(2, 'Record how the vote went').max(200),
    votesFor: z.number().int().min(0).max(10_000).optional(),
    votesAgainst: z.number().int().min(0).max(10_000).optional(),
    votesAbstain: z.number().int().min(0).max(10_000).optional(),
    decidedAt: z.coerce.date().optional(),
  }),
  z.object({
    decision: z.literal('implementing'),
    note: z.string().trim().min(3, 'Say what the work is').max(500),
  }),
  z.object({
    decision: z.literal('closed'),
    note: z.string().trim().min(3, 'Say what it came to').max(500),
  }),
]);

export const listResolutionsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  stage: resolutionStageSchema.optional(),
  sponsor: z.string().trim().max(120).optional(),
  meetingId: z.string().uuid().optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// -------------------------------------------------------------------------------------------
// Documents
// -------------------------------------------------------------------------------------------

/**
 * A document is its metadata, its text, and — where the church holds a copy — the file itself.
 *
 * `fileId` points at a `StoredFile` uploaded through `/api/files`, which is what makes a scanned signed
 * minute the church can actually open rather than a line of metadata about one. `fileUrl` stays for a
 * by-law that lives on the church's own website.
 */
const documentFields = z.object({
  title: z.string().trim().min(3, 'Name the document').max(200),
  kind: documentKindSchema.default('bylaw'),
  reference: z.string().trim().min(2, 'Give it a reference').max(60),
  version: z.string().trim().min(1).max(20).default('1.0'),
  adoptedAt: z.coerce.date().optional(),
  body: z.string().trim().max(50_000).optional(),
  fileUrl: z.string().trim().url('Enter a link to the file').max(500).optional(),
  fileId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

export const createDocumentSchema = documentFields;
export const updateDocumentSchema = documentFields
  .partial()
  .extend({ fileId: z.string().uuid().nullable().optional() })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

export const listDocumentsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  kind: documentKindSchema.optional(),
  isActive: booleanQuery.optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type ListMeetingsQuery = z.infer<typeof listMeetingsQuerySchema>;
export type CreateResolutionInput = z.infer<typeof createResolutionSchema>;
export type UpdateResolutionInput = z.infer<typeof updateResolutionSchema>;
export type DecideResolutionInput = z.infer<typeof decideResolutionSchema>;
export type ListResolutionsQuery = z.infer<typeof listResolutionsQuerySchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
