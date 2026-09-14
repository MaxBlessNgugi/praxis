import { z } from 'zod';

/**
 * The password floor is deliberately low (8) and enforced only on *creation*.
 *
 * It is not enforced on login: refusing to check an old short password does not make the account
 * safer, it locks the person out of their own church records.
 */
export const passwordSchema = z.string().min(8, 'Use at least 8 characters').max(200);

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginInput = z.infer<typeof loginSchema>;
