import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
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

reportRouter.use(requireAuth, moduleGate('reports'));

reportRouter.get('/overview', asyncHandler(reportController.overview));
reportRouter.get('/members', asyncHandler(reportController.members));
reportRouter.get('/giving', asyncHandler(reportController.giving));
reportRouter.get('/attendance', asyncHandler(reportController.attendance));
reportRouter.get('/ministries', asyncHandler(reportController.ministries));
reportRouter.get('/governance', asyncHandler(reportController.governance));
reportRouter.get('/inventory', asyncHandler(reportController.inventory));

// The ledgers, as files. Each export takes the same filters as the list endpoint it mirrors — the
// screen hands its own query over — so a filter means one thing on the screen and in the download.
reportRouter.get('/exports/tithes.csv', asyncHandler(reportController.tithesExport));
reportRouter.get('/exports/offerings.csv', asyncHandler(reportController.offeringsExport));
reportRouter.get('/exports/attendance.csv', asyncHandler(reportController.attendanceExport));
reportRouter.get('/exports/households.csv', asyncHandler(reportController.householdsExport));
