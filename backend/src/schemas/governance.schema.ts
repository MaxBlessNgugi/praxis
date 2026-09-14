import { z } from 'zod';
import { booleanQuery, window } from './common';

export const meetingKindSchema = z.enum(['stated', 'executive', 'emergency']);
export const meetingStatusSchema = z.enum(['scheduled', 'held', 'cancelled']);
export const resolutionStageSchema = z.enum(['proposed', 'voted_approved', 'implementing', 'closed']);
export const documentKindSchema = z.enum(['bylaw', 'policy', 'constitution', 'minutes', 'certificate', 'other']);

// -------------------------------------------------------------------------------------------
// Meetings
// -------------------------------------------------------------------------------------------

const meetingFields = z.object({
  title: z.string().trim().min(3, 'Name the meeting').max(160),
  kind: meetingKindSchema.default('stated'),
  status: meetingStatusSchema.default('scheduled'),
  heldAt: z.coerce.date(),
  venue: z.string().trim().min(2, 'Say where it is held').max(160),
  chairId: z.string().uuid().optional(),
  secretaryId: z.string().uuid().optional(),
  attendees: z.number().int().min(0).max(10_000).optional(),
  quorumMet: z.boolean().optional(),
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

/** The code is issued by the server in the year's series, so it is not accepted from a client. */
export const createResolutionSchema = resolutionFields.omit({ stage: true });
export const updateResolutionSchema = resolutionFields
  .partial()
  .extend({ meetingId: z.string().uuid().nullable().optional() })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

/**
 * A vote is its own act, with its own endpoint.
 *
 * Recording that a council voted changes the stage and stamps the date, and the three counts are the
 * minute's record of it — so this is not a field edit that a general PATCH should be able to perform
 * by accident.
 */
export const decideResolutionSchema = z.object({
  decision: z.enum(['voted_approved', 'closed']),
  voteSummary: z.string().trim().min(2, 'Record how the vote went').max(200),
  votesFor: z.number().int().min(0).max(10_000).optional(),
  votesAgainst: z.number().int().min(0).max(10_000).optional(),
  votesAbstain: z.number().int().min(0).max(10_000).optional(),
  decidedAt: z.coerce.date().optional(),
});

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

const documentFields = z.object({
  title: z.string().trim().min(3, 'Name the document').max(200),
  kind: documentKindSchema.default('bylaw'),
  reference: z.string().trim().min(2, 'Give it a reference').max(60),
  version: z.string().trim().min(1).max(20).default('1.0'),
  adoptedAt: z.coerce.date().optional(),
  body: z.string().trim().max(50_000).optional(),
  fileUrl: z.string().trim().url('Enter a link to the file').max(500).optional(),
  isActive: z.boolean().default(true),
});

export const createDocumentSchema = documentFields;
export const updateDocumentSchema = documentFields
  .partial()
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
