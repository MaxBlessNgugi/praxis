import { z } from 'zod';
import { archiveReasonSchema, retireReasonSchema, window } from './common';

export const paymentMethodSchema = z.enum(['cash', 'mpesa', 'cheque', 'bank_transfer', 'card']);
export const projectStatusSchema = z.enum(['planned', 'active', 'completed', 'paused']);
export const contributionKindSchema = z.enum(['cash', 'pledge']);
export const welfareStatusSchema = z.enum(['requested', 'approved', 'disbursed', 'declined']);
export const welfareCategorySchema = z.enum(['medical', 'education', 'food', 'funeral', 'rent', 'utility', 'other']);
export const charityStatusSchema = z.enum(['recorded', 'verified', 'flagged']);
export const financeAuditActionSchema = z.enum([
  'recorded',
  'voided',
  'restored',
  'approved',
  'declined',
  'disbursed',
  'updated',
]);

/**
 * Money in. Positive and finite, and capped at a billion shillings — a figure larger than that in a
 * parish ledger is a typo, not a gift, and catching it here is cheaper than catching it in an audit.
 *
 * At most two decimal places: the shilling is the smallest unit this ledger counts, and `toFixed(2)`
 * at the storage boundary would otherwise *round* a third decimal rather than refuse it — recording
 * 0.005 as 0.01 books a cent nobody gave. What was keyed is what must be stored, or not stored.
 */
const amountSchema = z
  .number()
  .positive('Enter an amount greater than zero')
  .max(1_000_000_000, 'That amount looks like a typo')
  .refine(Number.isFinite, 'Enter a real number')
  .refine((value) => Math.round(value * 100) === value * 100, 'Enter the amount in shillings and cents — at most two decimal places');

const dateRange = window;

// ---------------------------------------------------------------------------------------------
// Giving: tithes and offerings
// ---------------------------------------------------------------------------------------------

export const recordTitheSchema = z.object({
  memberId: z.string().uuid().optional(),
  donorName: z.string().trim().min(2, 'Name the giver').max(160),
  envelopeNo: z.string().trim().max(30).optional(),
  amount: amountSchema,
  method: paymentMethodSchema,
  category: z.string().trim().min(2).max(80).default('General Tithe'),
  reference: z.string().trim().max(60).optional(),
  receivedAt: z.coerce.date().optional(),
});

export const recordOfferingSchema = z.object({
  serviceId: z.string().uuid().optional(),
  amount: amountSchema,
  method: paymentMethodSchema,
  category: z.string().trim().min(2).max(80).default('Sunday Offering'),
  reference: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(500).optional(),
  receivedAt: z.coerce.date().optional(),
});

export const listGivingQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  memberId: z.string().uuid().optional(),
  method: paymentMethodSchema.optional(),
  category: z.string().trim().max(80).optional(),
  /** The service an offering was collected at. Tithes ignore it — they name a giver, not a service. */
  serviceId: z.string().uuid().optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  ...dateRange,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.enum(['recent', 'oldest', 'amount']).default('recent'),
});

// ---------------------------------------------------------------------------------------------
// Project funding
// ---------------------------------------------------------------------------------------------

const projectFields = z.object({
  name: z.string().trim().min(3, 'Name the project').max(160),
  description: z.string().trim().max(2000).optional(),
  targetAmount: amountSchema,
  status: projectStatusSchema.default('planned'),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

const endsAfterItStarts = { message: 'A project cannot end before it starts', path: ['endsAt'] };

export const createProjectSchema = projectFields.refine((value) => !value.startsAt || !value.endsAt || value.endsAt >= value.startsAt, endsAfterItStarts);

export const updateProjectSchema = projectFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' })
  .refine((value) => !value.startsAt || !value.endsAt || value.endsAt >= value.startsAt, endsAfterItStarts);

export const listProjectsQuerySchema = z.object({
  status: projectStatusSchema.optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * A gift toward a project.
 *
 * `kind` separates money banked from money promised, which the funding screen reports separately:
 * a total that adds pledges to cash overstates what the church actually holds. A pledge still names
 * a `method`, because that is how the giver says they intend to pay it.
 */
export const recordContributionSchema = z.object({
  memberId: z.string().uuid().optional(),
  donorName: z.string().trim().min(2, 'Name the giver').max(160),
  amount: amountSchema,
  method: paymentMethodSchema,
  kind: contributionKindSchema.default('cash'),
  reference: z.string().trim().max(60).optional(),
  contributedAt: z.coerce.date().optional(),
});

export const listContributionsQuerySchema = z.object({
  kind: contributionKindSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// ---------------------------------------------------------------------------------------------
// Welfare
// ---------------------------------------------------------------------------------------------

export const openWelfareCaseSchema = z.object({
  memberId: z.string().uuid().optional(),
  beneficiaryName: z.string().trim().min(2, 'Name the beneficiary or family').max(160),
  amount: amountSchema,
  purpose: z.string().trim().min(10, 'Describe what the relief is for').max(500),
  category: welfareCategorySchema.default('other'),
  assignedToId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Approval and disbursement are separate acts, deliberately.
 *
 * A committee deciding that a family should receive relief and the treasurer handing over the money
 * are two different people, often weeks apart, and a case that collapses both into one step cannot
 * answer "what has been approved but not yet paid?" — the question a welfare fund actually lives by.
 */
export const decideWelfareSchema = z.object({
  decision: z.enum(['approved', 'declined']),
  note: z.string().trim().max(500).optional(),
});

export const disburseWelfareSchema = z.object({
  disbursedAt: z.coerce.date().optional(),
  note: z.string().trim().max(500).optional(),
});

export const listWelfareQuerySchema = z.object({
  status: welfareStatusSchema.optional(),
  category: welfareCategorySchema.optional(),
  memberId: z.string().uuid().optional(),
  q: z.string().trim().max(120).optional(),
  ...dateRange,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// ---------------------------------------------------------------------------------------------
// Charity
// ---------------------------------------------------------------------------------------------

const charityFields = z.object({
  item: z.string().trim().min(3, 'Say what was bought or given').max(160),
  initiative: z.string().trim().min(3, 'Name the initiative it belongs to').max(160),
  vendor: z.string().trim().max(160).optional(),
  amount: amountSchema,
  occurredAt: z.coerce.date().optional(),
  status: charityStatusSchema.default('recorded'),
  notes: z.string().trim().max(2000).optional(),
});

export const createCharityActivitySchema = charityFields;

export const updateCharityActivitySchema = charityFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

export const listCharityQuerySchema = z.object({
  initiative: z.string().trim().max(160).optional(),
  status: charityStatusSchema.optional(),
  q: z.string().trim().max(120).optional(),
  ...dateRange,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// ---------------------------------------------------------------------------------------------
// Voiding, restoring and reading the ledger
// ---------------------------------------------------------------------------------------------

/**
 * A financial record is never deleted, only voided: the row stays, the reason is kept, and the ledger
 * gets a line. A voided payment that vanished would leave the bank statement unexplained.
 */
export const voidFinanceRecordSchema = retireReasonSchema.extend({
  reason: archiveReasonSchema.extract(['duplicate', 'wrong_amount', 'wrong_member', 'wrong_date', 'bounced', 'fraud_suspected', 'other']),
  reasonLabel: z.string().trim().min(3, 'Describe why this record is being voided').max(500),
});

export const financeSummaryQuerySchema = z.object({ ...dateRange });

export const listFinanceAuditQuerySchema = z.object({
  entityName: z.string().trim().max(60).optional(),
  action: financeAuditActionSchema.optional(),
  actorId: z.string().uuid().optional(),
  ...dateRange,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const listTrashQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type RecordTitheInput = z.infer<typeof recordTitheSchema>;
export type RecordOfferingInput = z.infer<typeof recordOfferingSchema>;
export type ListGivingQuery = z.infer<typeof listGivingQuerySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type RecordContributionInput = z.infer<typeof recordContributionSchema>;
export type ListContributionsQuery = z.infer<typeof listContributionsQuerySchema>;
export type OpenWelfareCaseInput = z.infer<typeof openWelfareCaseSchema>;
export type DecideWelfareInput = z.infer<typeof decideWelfareSchema>;
export type DisburseWelfareInput = z.infer<typeof disburseWelfareSchema>;
export type ListWelfareQuery = z.infer<typeof listWelfareQuerySchema>;
export type CreateCharityActivityInput = z.infer<typeof createCharityActivitySchema>;
export type UpdateCharityActivityInput = z.infer<typeof updateCharityActivitySchema>;
export type ListCharityQuery = z.infer<typeof listCharityQuerySchema>;
export type VoidFinanceRecordInput = z.infer<typeof voidFinanceRecordSchema>;
export type FinanceSummaryQuery = z.infer<typeof financeSummaryQuerySchema>;
export type ListFinanceAuditQuery = z.infer<typeof listFinanceAuditQuerySchema>;
export type ListTrashQuery = z.infer<typeof listTrashQuerySchema>;
