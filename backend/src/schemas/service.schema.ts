import { z } from 'zod';
import { archiveReasonSchema, booleanQuery, retireReasonSchema, window } from './common';

export const liturgyItemKindSchema = z.enum([
  'call_to_worship',
  'praise_worship',
  'prayer',
  'scripture',
  'sermon',
  'offering',
  'announcements',
  'presentation',
  'dismissal',
  'other',
]);

export const dutyStatusSchema = z.enum(['scheduled', 'confirmed', 'completed', 'missed', 'replaced', 'cancelled']);

// ---------------------------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------------------------

export const createServiceSchema = z.object({
  title: z.string().trim().min(2, 'Name the service').max(160),
  heldAt: z.coerce.date(),
  startTime: z.string().trim().max(20).optional(),
  venue: z.string().trim().min(2, 'Say where it is held').max(160),
  theme: z.string().trim().max(200).optional(),
  officiantId: z.string().uuid().optional(),
  notes: z.string().trim().max(4000).optional(),
  isTemplate: z.boolean().default(false),
});

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

export const listServicesQuerySchema = z.object({
  ...window,
  venue: z.string().trim().max(160).optional(),
  isTemplate: booleanQuery.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['upcoming', 'recent']).default('upcoming'),
});

/** The shared vocabulary narrowed to the ways a service is taken off the calendar. */
export const retireServiceSchema = retireReasonSchema.extend({
  reason: archiveReasonSchema.extract(['cancelled', 'postponed', 'duplicate', 'wrong_entry', 'other']),
});

// ---------------------------------------------------------------------------------------------
// Liturgy (order of service)
// ---------------------------------------------------------------------------------------------

/**
 * The order is replaced whole, not patched item by item.
 *
 * A liturgy is dragged around as a list, and every per-item edit alternative has to answer "what
 * position does this become now?" — a question with several plausible answers and therefore the
 * wrong question. Sending the whole ordered list makes the client's arrangement the arrangement, and
 * the server's only job is to store it consistently inside one transaction.
 */
export const liturgyItemSchema = z.object({
  title: z.string().trim().min(2, 'Name this item').max(160),
  kind: liturgyItemKindSchema.default('other'),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  responsible: z.string().trim().max(160).optional(),
  ministryId: z.string().uuid().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const replaceLiturgySchema = z.object({
  items: z.array(liturgyItemSchema).max(60, 'An order of service with more than 60 items is not an order of service'),
});

// ---------------------------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------------------------

export const attendanceKindSchema = z.enum(['service', 'group', 'meeting']);

export const recordAttendanceSchema = z.object({
  kind: attendanceKindSchema.default('service'),
  /** A census row carries a count; a named row carries a member and counts one. */
  count: z.number().int().min(1).max(20_000).default(1),
  memberId: z.string().uuid().optional(),
  visitorName: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(500).optional(),
  recordedAt: z.coerce.date().optional(),
});

export const recordAttendanceBulkSchema = z.object({
  rows: z.array(recordAttendanceSchema).min(1).max(200),
});

export const listAttendanceQuerySchema = z.object({
  serviceId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
  kind: attendanceKindSchema.optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// ---------------------------------------------------------------------------------------------
// Roster and swaps
// ---------------------------------------------------------------------------------------------

export const createDutySchema = z.object({
  memberId: z.string().uuid(),
  roleTitle: z.string().trim().min(2, 'Name the role').max(120),
  ministryId: z.string().uuid().optional(),
  status: dutyStatusSchema.default('scheduled'),
  notes: z.string().trim().max(500).optional(),
});

export const updateDutySchema = z
  .object({
    roleTitle: z.string().trim().min(2).max(120).optional(),
    status: dutyStatusSchema.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

export const listRosterQuerySchema = z.object({
  serviceId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
  ministryId: z.string().uuid().optional(),
  status: dutyStatusSchema.optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const requestSwapSchema = z.object({
  replacementId: z.string().uuid().optional(),
  reason: z.string().trim().min(3, 'Say why the duty needs covering').max(500),
});

/**
 * The decision is its own endpoint rather than an update to the swap.
 *
 * Approving changes two rows — the duty's holder and the request's status — so it has to be a
 * transaction, and a transaction is not something a general-purpose PATCH should be hiding.
 */
export const decideSwapSchema = z.object({
  decision: z.enum(['approved', 'declined']),
  note: z.string().trim().max(500).optional(),
});

// ---------------------------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------------------------

export const upsertServiceReportSchema = z.object({
  summary: z.string().trim().min(10, 'Write a summary of the service').max(4000),
  adultsCount: z.number().int().min(0).max(100_000).optional(),
  childrenCount: z.number().int().min(0).max(100_000).optional(),
  visitorsCount: z.number().int().min(0).max(100_000).optional(),
  offeringsTotal: z.number().min(0).max(1_000_000_000).optional(),
  highlights: z.string().trim().max(2000).optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type RetireServiceInput = z.infer<typeof retireServiceSchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
export type LiturgyItemInput = z.infer<typeof liturgyItemSchema>;
export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;
export type CreateDutyInput = z.infer<typeof createDutySchema>;
export type UpdateDutyInput = z.infer<typeof updateDutySchema>;
export type ListRosterQuery = z.infer<typeof listRosterQuerySchema>;
export type RequestSwapInput = z.infer<typeof requestSwapSchema>;
export type UpsertServiceReportInput = z.infer<typeof upsertServiceReportSchema>;
