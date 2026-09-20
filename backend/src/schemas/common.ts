import { z } from 'zod';
import { ARCHIVE_REASONS } from '../lib/archive';

/**
 * The query vocabulary every module shares.
 *
 * These are rules rather than fields: a boolean that must not be coerced, a date window that also has
 * to filter, and the two-part reason a retirement carries. Copies of a rule are copies that can
 * disagree, and two of these had already disagreed.
 */

/**
 * The storage vocabulary of reasons. A module whose truth is narrower takes a subset with `extract`
 * rather than writing its own list — a service is never transferred to another parish, so that module
 * offers the five reasons a service can have.
 */
export const archiveReasonSchema = z.enum(ARCHIVE_REASONS);

/**
 * Why a record is being retired: the category the Trash counts, plus what the person wrote.
 *
 * Both are required, and taken from the query string rather than a body, since these travel on a
 * DELETE.
 */
export const retireReasonSchema = z.object({
  reason: archiveReasonSchema,
  reasonLabel: z.string().trim().min(3, 'Say why this record is being retired').max(500),
});

export type RetireReason = z.infer<typeof retireReasonSchema>;

/**
 * A `?flag=true|false` query field.
 *
 * Deliberately not `z.coerce.boolean()`: `Boolean('false')` is `true`, so the one string that means
 * "no" would mean yes, and a filter written to narrow a list would widen it. The trap is invisible at
 * the call site, so the rule is named once.
 */
export const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

/**
 * The end of a date window.
 *
 * A bare `?to=2026-09-16` means the whole of the 16th, so it becomes the last instant of that day
 * rather than the instant it begins. Otherwise "this month" silently drops everything received after
 * midnight on the last day — including every gift banked that very morning, which is precisely the
 * day a treasurer is looking at the figure.
 */
const windowEnd = z.preprocess(
  (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999Z`) : value),
  z.coerce.date().optional(),
);

/** The date window a report, ledger or calendar is asked for. */
export const window = {
  from: z.coerce.date().optional(),
  to: windowEnd,
};

/** …and the where-fragment it becomes. Paired with the schema above, or a window would validate and
 * then filter nothing. */
export const between = (field: string, query: { from?: Date; to?: Date }) =>
  !query.from && !query.to
    ? {}
    : { [field]: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } };
