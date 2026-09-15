import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/authenticate';

/**
 * `/api/admin/users` — account administration.
 *
 * The whole router sits behind `requireAuth` and `requireRole('admin')`, so a new endpoint added
 * below is protected by default rather than by remembering to guard it.
 */
export const userRouter = Router();

userRouter.use(requireAuth, requireRole('admin'));

userRouter.get('/', asyncHandler(userController.listUsers));
userRouter.post('/', asyncHandler(userController.createUser));
userRouter.patch('/:id', asyncHandler(userController.updateUser));
userRouter.post('/:id/role', asyncHandler(userController.assignRole));
// Setting somebody else's password. `admin` may do this for anyone below them; the service refuses
// one administrator taking over another's account.
userRouter.post('/:id/password', asyncHandler(userController.resetPassword));
userRouter.delete('/:id', asyncHandler(userController.removeUser));
