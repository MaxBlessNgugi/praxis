import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { env } from '../config/env';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/authenticate';
import { rateLimit } from '../middleware/rateLimit';

/**
 * `/api/auth` — the three endpoints the console's sign-in gate needs.
 *
 * `/login` is the only unauthenticated route in the service, and deliberately so.
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
authRouter.post('/logout', requireAuth, asyncHandler(authController.logout));
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
