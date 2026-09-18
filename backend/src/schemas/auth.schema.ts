import { z } from 'zod';

/**
 * The password floor is deliberately low (8) and enforced only on *creation*.
 *
 * It is not enforced on login: refusing to check an old short password does not make the account
 * safer, it locks the person out of their own church records.
 *
 * What actually matters for a parish login is length and not being guessable, so the floor is eight
 * characters rather than a symbol-and-capital rule — those rules produce `Church2025!` on every desk
 * in the building — plus a refusal of the handful of passwords that are tried first against any new
 * account. Longer is allowed and encouraged; nothing here caps ambition below 200 characters.
 */
/** Tried first against every login form on the internet, plus the obvious church ones. */
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'passw0rd',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyui',
  'qwertyuiop',
  'iloveyou',
  'letmein1',
  'welcome1',
  'admin123',
  'administrator',
  'changeme',
  'praxis123',
  'praxis2025',
  'church123',
  'destiny123',
  'sanctuary',
  'jesus123',
  'jesusloves',
]);

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(200)
  .refine(
    (value) => !COMMON_PASSWORDS.has(value.toLowerCase().replace(/[^a-z0-9]/g, '')),
    'That password is one of the first ones anybody tries. Use something only you would know.',
  );

/**
 * Changing a password.
 *
 * The current password is required even though the caller already holds a token: a token can be
 * copied off a shared parish machine, and without this the copy would be enough to lock the owner out
 * of their own account. The new one is held to the same policy as any other.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: passwordSchema,
});

/** An administrator setting somebody else's password, for the office's "I have forgotten mine" case. */
export const resetPasswordSchema = z.object({ password: passwordSchema });

/**
 * Asking for a reset link.
 *
 * The address is validated as an email because a typo here is a link sent to a stranger; nothing else
 * about the account is asked for, and the endpoint is deliberately unable to say whether the address
 * is known.
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(200),
});

/**
 * Spending one.
 *
 * The token is a 43-character base64url string; its length is checked here so an obviously malformed
 * link is refused by validation rather than by a database lookup.
 */
export const passwordResetConfirmSchema = z.object({
  token: z.string().trim().min(20, 'That reset link is incomplete').max(200),
  password: passwordSchema,
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Editing your own profile.
 *
 * Only the display name: the email address is the account's identity across every church it serves
 * and how password mail finds its owner, so it changes through the office — the same way every other
 * account fact about a person is changed by the people accountable for the record.
 */
export const updateOwnProfileSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(120),
});

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;

/** Choosing which church to act for. The id, not the slug: a slug can be renamed, an id cannot. */
export const switchOrganizationSchema = z.object({
  organizationId: z.string().uuid('Choose a church'),
});

export type SwitchOrganizationInput = z.infer<typeof switchOrganizationSchema>;

/**
 * A church signing itself up.
 *
 * The minimum a parish can answer in one sitting: who it is, who is signing in, and how to reach them.
 * Everything else the console asks for afterwards, in the welcome wizard — a signup form that demands
 * a vision statement before the account exists is a form nobody finishes.
 *
 * `phone` and `country` are plain strings rather than the register's Kenyan phone rule: Praxis is sold
 * beyond one country, and refusing a Ugandan number at the door would be a strange way to start.
 */
export const signupSchema = z.object({
  churchName: z.string().trim().min(2, 'Name the church').max(160),
  adminName: z.string().trim().min(2, 'Enter your name').max(120),
  email: z.string().trim().email('Enter a valid email address').max(200),
  password: passwordSchema,
  phone: z.string().trim().min(7, 'Enter a phone number').max(40),
  country: z.string().trim().min(2, 'Say which country the church is in').max(80),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
