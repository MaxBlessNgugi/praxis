import { Router } from 'express';
import * as certificateController from '../controllers/certificate.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';

/**
 * `/api/certificates` — the register of what the church has issued.
 *
 * Reading the register is open to any signed-in account with the reports panel, because a certificate
 * is printed from a member's own record by whoever keeps that record; **issuing** one is `staff` and
 * **reissuing or retiring** one is `admin`, because both change what the church has officially
 * declared. Issuance is written while the subscription can still be written to, like every other
 * register.
 */
export const certificateRouter = Router();

const WRITERS = requireRole('super_admin', 'admin', 'staff');
const ADMINS = requireRole('admin');

certificateRouter.use(requireAuth, moduleGate('reports'), requireWritableSubscription);

certificateRouter.get('/', asyncHandler(certificateController.listCertificates));
certificateRouter.get('/:id', asyncHandler(certificateController.getCertificate));
certificateRouter.post('/', WRITERS, asyncHandler(certificateController.issueCertificate));
certificateRouter.post('/:id/reissue', ADMINS, asyncHandler(certificateController.reissueCertificate));
certificateRouter.delete('/:id', ADMINS, asyncHandler(certificateController.retireCertificate));
