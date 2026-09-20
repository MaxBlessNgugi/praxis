import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { env } from '../config/env';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/authenticate';
import { rateLimit } from '../middleware/rateLimit';

/**
 * `/api/auth` — the endpoints the console's gate needs.
 *
 * `/login` and `/signup` are the only unauthenticated routes in the service, and deliberately so: they
 * are the two ways in, one for a church that exists and one for a church that does not yet.
 */
export const authRouter = Router();

// The one door an unauthenticated caller may knock on, so it carries the tightest ceiling in the
// service. It is keyed on the client address rather than the submitted email on purpose: keying on
// the email would hand an attacker a fresh allowance for every address they tried, which is exactly
// the password-spraying run this is here to stop. Per-account lockout covers the other axis.
authRouter.post(
  '/login',
  rateLimit({ name: 'login', windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX }),
  asyncHandler(authController.login),
);
// Public, like `/login`, and limited the same way and for the same reason: it is the other door an
// anonymous caller may knock on, and it writes four rows when it is let in.
authRouter.post(
  '/signup',
  rateLimit({ name: 'signup', windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX }),
  asyncHandler(authController.signup),
);

// The reset pair, public for the same reason `/login` is — the whole point is that the caller cannot
// sign in. Both are keyed on the client address, like `/login`, because the address is what an
// attacker hammers; the token itself is single-use, expiring and stored only as a hash.
authRouter.post(
  '/password-reset/request',
  rateLimit({ name: 'password-reset', windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX }),
  asyncHandler(authController.requestPasswordReset),
);
// Milder than the request: this endpoint cannot be used to mail anybody, it only checks a token that
// was emailed already. Ten a minute is still far under a guess at a 256-bit value.
authRouter.post(
  '/password-reset/confirm',
  rateLimit({ name: 'password-reset-confirm', windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX }),
  asyncHandler(authController.confirmPasswordReset),
);

authRouter.post('/logout', requireAuth, asyncHandler(authController.logout));
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
// The account renaming itself. A PATCH on the same path the session reads, so "my profile" is one
// idea in two verbs rather than a second endpoint to keep in step.
authRouter.patch('/me', requireAuth, asyncHandler(authController.updateOwnProfile));

// The church a session acts for is a claim in the token, so changing it is a token exchange rather
// than a setting. The service refuses any church the account does not actually serve.
authRouter.post('/switch-organization', requireAuth, asyncHandler(authController.switchOrganization));

// Changing your own password. Behind the auth gate, and behind the tight ceiling as well: each call
// runs a bcrypt comparison, so this is the one authenticated endpoint where a client could burn real
// CPU in a loop. Ten a minute is far more than anybody changing a password needs. It answers with a
// fresh token — see the controller for why.
authRouter.post(
  '/password',
  requireAuth,
  rateLimit({ name: 'password', windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.COSTLY_RATE_LIMIT_MAX }),
  asyncHandler(authController.changePassword),
);
