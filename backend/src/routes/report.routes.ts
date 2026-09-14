import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/authenticate';

/**
 * `/api/reports` — aggregation only, so every route is a GET and none of them is destructive.
 *
 * Reports expose the same figures the panels behind them already expose, which is why they carry the
 * same gate: any signed-in account. Narrowing a report to `admin` here while the Finance panel itself
 * is readable by an usher would be a gate that only inconveniences honest people, and the console's
 * own Reports screen is visible to staff.
 *
 * `/overview` is the Home screen's four metric cards plus its activity feed, so a dashboard is one
 * request rather than six.
 */
export const reportRouter = Router();

reportRouter.use(requireAuth);

reportRouter.get('/overview', asyncHandler(reportController.overview));
reportRouter.get('/members', asyncHandler(reportController.members));
reportRouter.get('/giving', asyncHandler(reportController.giving));
reportRouter.get('/attendance', asyncHandler(reportController.attendance));
reportRouter.get('/ministries', asyncHandler(reportController.ministries));
reportRouter.get('/governance', asyncHandler(reportController.governance));
