import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';

/**
 * `/api/services` — Services & Worship.
 *
 * Writing needs staff; retiring a service, and deciding a swap, need admin. Deciding a swap is
 * gated because it moves a named person's obligation: that is a supervisory act, not a clerical one.
 */
export const serviceRouter = Router();

const WRITERS = requireRole('super_admin', 'admin', 'staff');

serviceRouter.use(requireAuth, moduleGate('services'), requireWritableSubscription);

serviceRouter.get('/', asyncHandler(serviceController.listServices));
serviceRouter.get('/roster', asyncHandler(serviceController.listRoster));
serviceRouter.get('/swaps', asyncHandler(serviceController.listSwaps));
serviceRouter.get('/attendance', asyncHandler(serviceController.listAttendance));
serviceRouter.post('/swaps/:id/decision', requireRole('admin'), asyncHandler(serviceController.decideSwap));

serviceRouter.get('/:id', asyncHandler(serviceController.getService));
serviceRouter.get('/:id/attendance', asyncHandler(serviceController.attendanceSummary));
serviceRouter.get('/:id/report', asyncHandler(serviceController.getReport));

serviceRouter.post('/', WRITERS, asyncHandler(serviceController.createService));
serviceRouter.patch('/:id', WRITERS, asyncHandler(serviceController.updateService));
serviceRouter.delete('/:id', requireRole('admin'), asyncHandler(serviceController.retireService));

serviceRouter.put('/:id/liturgy', WRITERS, asyncHandler(serviceController.putLiturgy));
serviceRouter.post('/:id/attendance', WRITERS, asyncHandler(serviceController.recordAttendance));
serviceRouter.put('/:id/report', WRITERS, asyncHandler(serviceController.putReport));
// Signing off is the supervising act that closes a service, and it is what makes the report
// read-only afterwards — so it belongs to an administrator rather than to whoever types it up.
serviceRouter.post('/:id/report/finalize', requireRole('admin'), asyncHandler(serviceController.finalizeReport));

// The roster is keyed by service: duties belong to a service, so they are addressed through it.
serviceRouter.post('/:id/roster', WRITERS, asyncHandler(serviceController.createDuty));
serviceRouter.patch('/roster/duty/:id', WRITERS, asyncHandler(serviceController.updateDuty));
serviceRouter.delete('/roster/duty/:id', WRITERS, asyncHandler(serviceController.removeDuty));

// Not `WRITERS`: asking for cover is the volunteer's own act, and the rule that matters — that only
// the person holding the duty may ask — is enforced in the service, where the duty's holder is known.
serviceRouter.post('/roster/duty/:id/swap', asyncHandler(serviceController.requestSwap));
