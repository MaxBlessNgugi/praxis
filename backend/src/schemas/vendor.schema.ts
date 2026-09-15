import { z } from 'zod';

/**
 * The vendor's operational vocabulary: the two things you do *to* a church rather than inside one.
 *
 * Both carry a mandatory reason. A suspension without one leaves a parish office looking at a locked
 * console with no way to find out why, and a support session without one puts an operator inside
 * somebody's register with nothing on file explaining the visit.
 */

const reason = z
  .string()
  .trim()
  .min(3, 'Say why — this is written into the church’s own audit log')
  .max(300);

export const setSuspensionSchema = z.object({
  suspended: z.boolean(),
  reason,
});

export const supportSessionSchema = z.object({ reason });

export type SetSuspensionInput = z.infer<typeof setSuspensionSchema>;
export type SupportSessionInput = z.infer<typeof supportSessionSchema>;
