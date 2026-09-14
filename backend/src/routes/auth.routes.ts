import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/authenticate';

/**
 * `/api/auth` — the three endpoints the console's sign-in gate needs.
 *
 * `/login` is the only unauthenticated route in the service, and deliberately so.
 */
export const authRouter = Router();

authRouter.post('/login', asyncHandler(authController.login));
authRouter.post('/logout', requireAuth, asyncHandler(authController.logout));
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
