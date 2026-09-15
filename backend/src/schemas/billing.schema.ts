import { z } from 'zod';

/**
 * The commercial layer's vocabulary.
 *
 * Two audiences share this file and the split is deliberate. A church may *ask* for something — a
 * bigger plan, a note with its request — and that is all it may do. A platform administrator records
 * what actually happened: which plan a church is on, how long its trial runs, and the money that came
 * in. Keeping the two request shapes apart is what stops a church from changing its own plan by
 * posting to the wrong endpoint.
 */

/** A plan's stable handle: `mustard-seed`. Never shown to a person. */
export const planKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Use lower-case letters, numbers and hyphens');

export const subscriptionStatusSchema = z.enum(['trial', 'active', 'past_due', 'cancelled', 'expired']);

export const paymentMethodSchema = z.enum(['cash', 'mpesa', 'cheque', 'bank_transfer', 'card']);

/** The limits a plan can carry. A missing key means no limit, never zero. */
export const planLimitsSchema = z.object({
  maxMembers: z.coerce.number().int().min(1).max(1_000_000).optional(),
  maxUsers: z.coerce.number().int().min(1).max(10_000).optional(),
});

export const planFeaturesSchema = z.array(z.string().trim().min(2).max(160)).max(24);

// ==================== the church's own side ====================

export const requestUpgradeSchema = z.object({
  planKey: planKeySchema,
  /** What the office wants Praxis to know: "we can pay after the harvest". */
  note: z.string().trim().max(500).optional(),
});

export type RequestUpgradeInput = z.infer<typeof requestUpgradeSchema>;

// ==================== the vendor's side ====================

export const listOrganizationsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: subscriptionStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const createPlanSchema = z.object({
  key: planKeySchema,
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(200).optional(),
  price: z.coerce.number().min(0).max(100_000_000),
  currency: z.string().trim().length(3).toUpperCase().default('KES'),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
  trialDays: z.coerce.number().int().min(0).max(365).default(14),
  limits: planLimitsSchema.default({}),
  features: planFeaturesSchema.default([]),
  isPublic: z.boolean().default(true),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const assignPlanSchema = z
  .object({
    planKey: planKeySchema,
    /** Set explicitly to override the clock — "paid up", "grace period", "they are leaving". */
    status: subscriptionStatusSchema.optional(),
    /** Days of free use to grant, which is how a trial is started or extended. */
    trialDays: z.coerce.number().int().min(0).max(365).optional(),
    /** Months a payment has already bought, when the money was recorded elsewhere. */
    periodMonths: z.coerce.number().int().min(1).max(36).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((value) => !(value.trialDays !== undefined && value.periodMonths !== undefined), {
    message: 'A trial and a paid period are different things — set one, not both',
  });

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive('Record the amount that came in').max(100_000_000),
  method: paymentMethodSchema.default('mpesa'),
  reference: z.string().trim().max(80).optional(),
  /** How many months this money buys. A church that pays a year gets twelve. */
  months: z.coerce.number().int().min(1).max(36).default(1),
  receivedAt: z.coerce.date().optional(),
  note: z.string().trim().max(500).optional(),
});

export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type AssignPlanInput = z.infer<typeof assignPlanSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
