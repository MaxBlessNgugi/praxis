import { z } from 'zod';
import { booleanQuery, window } from './common';

export const broadcastChannelSchema = z.enum(['sms', 'email', 'notice_sheet']);
export const broadcastStatusSchema = z.enum(['draft', 'scheduled', 'sent', 'cancelled']);
export const eventKindSchema = z.enum(['service', 'conference', 'meeting', 'outreach']);
export const prayerStatusSchema = z.enum(['open', 'praying', 'answered', 'archived']);

// -------------------------------------------------------------------------------------------
// Announcements
// -------------------------------------------------------------------------------------------

const announcementFields = z.object({
  title: z.string().trim().min(3, 'Give the announcement a title').max(160),
  body: z.string().trim().min(3, 'Write the announcement').max(8000),
  audience: z.string().trim().min(2).max(60).default('Everyone'),
  isPinned: z.boolean().default(false),
  publishedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
});

export const createAnnouncementSchema = announcementFields;
/** `null` clears an expiry; leaving the field out leaves it alone. */
export const updateAnnouncementSchema = announcementFields
  .partial()
  .extend({ expiresAt: z.coerce.date().nullable().optional() })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

export const listAnnouncementsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  audience: z.string().trim().max(60).optional(),
  isPinned: booleanQuery.optional(),
  /** Only announcements still in force: not expired, and published. */
  live: booleanQuery.optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// -------------------------------------------------------------------------------------------
// Broadcasts
// -------------------------------------------------------------------------------------------

const broadcastFields = z.object({
  channel: broadcastChannelSchema,
  subject: z.string().trim().max(160).optional(),
  body: z.string().trim().min(3, 'Write the message').max(4000),
  audience: z.string().trim().min(2, 'Say who this goes to').max(120),
  scheduledFor: z.coerce.date().optional(),
});

export const createBroadcastSchema = broadcastFields;
export const updateBroadcastSchema = broadcastFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

/**
 * Marking a campaign delivered.
 *
 * Sending is not performed here — this service stores campaigns; the SMS and email gateways are a
 * separate concern. So the endpoint records that a send happened and how many devices it reached,
 * and refuses to invent a recipient count.
 */
export const sendBroadcastSchema = z.object({
  recipients: z.number().int().min(0).max(1_000_000),
  sentAt: z.coerce.date().optional(),
});

export const listBroadcastsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  channel: broadcastChannelSchema.optional(),
  status: broadcastStatusSchema.optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// -------------------------------------------------------------------------------------------
// Events
// -------------------------------------------------------------------------------------------

const eventFields = z.object({
  title: z.string().trim().min(3, 'Name the event').max(160),
  description: z.string().trim().max(4000).optional(),
  kind: eventKindSchema.default('service'),
  venue: z.string().trim().min(2, 'Say where it is held').max(160),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isRecurring: z.boolean().default(false),
});

const endsAfterItStarts = { message: 'An event cannot end before it starts', path: ['endsAt'] };

export const createEventSchema = eventFields.refine((value) => value.endsAt >= value.startsAt, endsAfterItStarts);
export const updateEventSchema = eventFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' })
  .refine((value) => !value.startsAt || !value.endsAt || value.endsAt >= value.startsAt, endsAfterItStarts);

export const listEventsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  kind: eventKindSchema.optional(),
  /** `upcoming` answers the calendar's default view: everything from now on, soonest first. */
  upcoming: booleanQuery.optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// -------------------------------------------------------------------------------------------
// Prayer requests
// -------------------------------------------------------------------------------------------

export const createPrayerRequestSchema = z.object({
  memberId: z.string().uuid().optional(),
  requesterName: z.string().trim().max(160).optional(),
  request: z.string().trim().min(3, 'Write the request').max(2000),
  isPrivate: z.boolean().default(false),
  status: prayerStatusSchema.default('open'),
});

export const updatePrayerRequestSchema = z
  .object({
    request: z.string().trim().min(3).max(2000).optional(),
    status: prayerStatusSchema.optional(),
    isPrivate: z.boolean().optional(),
    requesterName: z.string().trim().max(160).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

export const listPrayerRequestsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: prayerStatusSchema.optional(),
  memberId: z.string().uuid().optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * Declaring a request answered stamps `answeredAt` once.
 *
 * Kept here rather than in the update schema so the timestamp cannot be set by hand: "how long did
 * this church pray for that?" is only answerable if the moment is recorded for us.
 */
export const answerPrayerRequestSchema = z.object({
  answeredAt: z.coerce.date().optional(),
  note: z.string().trim().max(500).optional(),
});

// -------------------------------------------------------------------------------------------
// Birthdays and anniversaries
// -------------------------------------------------------------------------------------------

export const celebrationsQuerySchema = z.object({
  /** How many days ahead to look. A month covers the calendar the console shows. */
  days: z.coerce.number().int().min(1).max(366).default(30),
  kind: z.enum(['all', 'birthday', 'anniversary']).default('all'),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsQuerySchema>;
export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;
export type UpdateBroadcastInput = z.infer<typeof updateBroadcastSchema>;
export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;
export type ListBroadcastsQuery = z.infer<typeof listBroadcastsQuerySchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type CreatePrayerRequestInput = z.infer<typeof createPrayerRequestSchema>;
export type UpdatePrayerRequestInput = z.infer<typeof updatePrayerRequestSchema>;
export type ListPrayerRequestsQuery = z.infer<typeof listPrayerRequestsQuerySchema>;
export type AnswerPrayerRequestInput = z.infer<typeof answerPrayerRequestSchema>;
export type CelebrationsQuery = z.infer<typeof celebrationsQuerySchema>;
