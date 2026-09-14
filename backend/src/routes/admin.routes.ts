import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/authenticate';

/**
 * `/api/admin` — the Trash, the audit trail, and rights.
 *
 * The whole router needs `admin`, so an endpoint added below is protected by default. Two narrower
 * gates sit inside it:
 *
 *   • **Restoring** an archived record is `admin`, like retiring one was.
 *   • **Changing rights** is `super_admin` only. A role is what grants access in the first place, so
 *     letting an `admin` widen their own would make the rest of these gates decorative. Reading the
 *     roles stays at `admin`, so the Users & Rights screen can show what a person may do.
 *
 * `/audit` and `/trash` are one queried table with different filters rather than a per-entity list,
 * because the question an administrator actually asks is "what happened to this record?" — which is
 * `recordHistory`, the one endpoint that answers it from both logs.
 */
export const adminRouter = Router();

const SUPERS = requireRole('super_admin');

adminRouter.use(requireAuth, requireRole('admin'));

// The Trash
adminRouter.get('/trash', asyncHandler(adminController.listTrash));
adminRouter.post('/trash/:id/restore', asyncHandler(adminController.restoreRecord));

// The audit trail, and one record's whole history across both logs
adminRouter.get('/audit', asyncHandler(adminController.listAudit));
adminRouter.get('/audit/:entityName/:entityId', asyncHandler(adminController.recordHistory));

// Rights
adminRouter.get('/roles', asyncHandler(adminController.listRoles));
adminRouter.post('/roles', SUPERS, asyncHandler(adminController.createRole));
adminRouter.get('/roles/:key', asyncHandler(adminController.getRole));
adminRouter.patch('/roles/:key', SUPERS, asyncHandler(adminController.updateRole));
