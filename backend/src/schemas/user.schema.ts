import { z } from 'zod';
import { passwordSchema, resetPasswordSchema } from './auth.schema';
import { archiveReasonSchema, booleanQuery, retireReasonSchema } from './common';

/** The four role keys the console and the seeded Role rows both use. */
export const roleKeySchema = z.enum(['super_admin', 'admin', 'staff', 'viewer']);

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  password: passwordSchema,
  roleKey: roleKeySchema,
  /** Links the login to a person on the register, so a volunteer can act as themselves. */
  memberId: z.string().uuid().optional(),
});

/**
 * An invitation is the same payload without the password: the whole point is that nobody invents
 * one for the person being invited — they choose their own through the activation link.
 */
export const inviteUserSchema = createUserSchema.omit({ password: true });

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().optional(),
    isActive: z.boolean().optional(),
    /** `null` unlinks the account from the register, for a login that no longer needs it. */
    memberId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

/** The policy is the one every account's password is held to, wherever it is set. */
export { resetPasswordSchema };

export const assignRoleSchema = z.object({ roleKey: roleKeySchema });

export const listUsersQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  roleKey: roleKeySchema.optional(),
  isActive: booleanQuery.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * Retiring an account has exactly one category in practice, so it defaults to `account` — but the
 * label is still required, because "why" is the part nobody can reconstruct later.
 */
export const removeUserSchema = retireReasonSchema.extend({
  reason: archiveReasonSchema.default('account'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type RoleKey = z.infer<typeof roleKeySchema>;
