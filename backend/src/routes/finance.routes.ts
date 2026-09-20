import { Router } from 'express';
import * as financeController from '../controllers/finance.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';

/**
 * `/api/finance` — tithes, offerings, project funding, welfare, charity, and the ledger.
 *
 * The gates follow the church's own separation of duties rather than a single "finance" role:
 *
 *   • reading the books needs a signed-in account;
 *   • recording money needs `staff` — the person at the desk who took the envelope;
 *   • **voiding** a record, deciding a welfare case, paying one out, and reading the audit ledger
 *     need `admin`, because each of those is a decision about money that has already been booked.
 *
 * `super_admin` is always allowed, so an owner cannot be locked out of their own books by a rights
 * edit. Nothing here deletes a financial row: the two destructive verbs void and restore.
 */
export const financeRouter = Router();

const WRITERS = requireRole('super_admin', 'admin', 'staff');
const ADMINS = requireRole('admin');

financeRouter.use(requireAuth, moduleGate('giving'), requireWritableSubscription);

// Named paths are declared before `/:entity/:id`, or "summary" parses as an entity and "audit" as
// one. This is the same ordering rule the services router documents for `/roster`.
financeRouter.get('/summary', asyncHandler(financeController.summary));
financeRouter.get('/trash', ADMINS, asyncHandler(financeController.listTrash));
financeRouter.post('/trash/:id/restore', ADMINS, asyncHandler(financeController.restoreRecord));
financeRouter.get('/audit', ADMINS, asyncHandler(financeController.listAudit));
financeRouter.get('/audit/verify', ADMINS, asyncHandler(financeController.verifyLedger));

// Tithes
financeRouter.get('/tithes', asyncHandler(financeController.listTithes));
financeRouter.post('/tithes', WRITERS, asyncHandler(financeController.recordTithe));
financeRouter.get('/tithes/:id', asyncHandler(financeController.getTithe));

// Offerings
financeRouter.get('/offerings', asyncHandler(financeController.listOfferings));
financeRouter.post('/offerings', WRITERS, asyncHandler(financeController.recordOffering));
financeRouter.get('/offerings/:id', asyncHandler(financeController.getOffering));

// Projects and the gifts toward them
financeRouter.get('/projects', asyncHandler(financeController.listProjects));
financeRouter.post('/projects', WRITERS, asyncHandler(financeController.createProject));
financeRouter.get('/projects/:id', asyncHandler(financeController.getProject));
financeRouter.patch('/projects/:id', WRITERS, asyncHandler(financeController.updateProject));
financeRouter.get('/projects/:id/contributions', asyncHandler(financeController.listContributions));
financeRouter.post('/projects/:id/contributions', WRITERS, asyncHandler(financeController.recordContribution));

// Welfare
financeRouter.get('/welfare', asyncHandler(financeController.listWelfare));
financeRouter.post('/welfare', WRITERS, asyncHandler(financeController.openWelfare));
financeRouter.get('/welfare/:id', asyncHandler(financeController.getWelfare));
financeRouter.post('/welfare/:id/decision', ADMINS, asyncHandler(financeController.decideWelfare));
financeRouter.post('/welfare/:id/disburse', ADMINS, asyncHandler(financeController.disburseWelfare));

// Charity
financeRouter.get('/charity', asyncHandler(financeController.listCharity));
financeRouter.post('/charity', WRITERS, asyncHandler(financeController.createCharity));
financeRouter.get('/charity/:id', asyncHandler(financeController.getCharity));
financeRouter.patch('/charity/:id', WRITERS, asyncHandler(financeController.updateCharity));

// Voiding: one rule, six kinds of record. `?reason=duplicate&reasonLabel=...` as query parameters,
// for the same reason as the members and services modules — a DELETE with a required JSON body is a
// request many clients and proxies will not send.
financeRouter.delete('/:entity/:id', ADMINS, asyncHandler(financeController.voidRecord));
