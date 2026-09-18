import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth, requireRole } from '../middleware/authenticate';

/**
 * `/api/admin/users` — account administration.
 *
 * The whole router sits behind `requireAuth` and `requireRole('admin')`, so a new endpoint added
 * below is protected by default rather than by remembering to guard it.
 */
export const userRouter = Router();

userRouter.use(requireAuth, requireRole('admin'), moduleGate('admin'));

userRouter.get('/', asyncHandler(userController.listUsers));
userRouter.post('/', asyncHandler(userController.createUser));
// Invited, not created: the account row exists, but only its owner's activation link can make it
// sign-in-able. Declared before `/:id` so "invite" cannot parse as an account id.
userRouter.post('/invite', asyncHandler(userController.inviteUser));
// Re-issue the activation link for an account that never finished signing up. Same scoping rules
// as the invite; declared before `/:id` for the same reason.
userRouter.post('/:id/reinvite', asyncHandler(userController.resendInvitation));
userRouter.patch('/:id', asyncHandler(userController.updateUser));
userRouter.post('/:id/role', asyncHandler(userController.assignRole));
// Setting somebody else's password. `admin` may do this for anyone below them; the service refuses
// one administrator taking over another's account.
userRouter.post('/:id/password', asyncHandler(userController.resetPassword));
userRouter.delete('/:id', asyncHandler(userController.removeUser));
