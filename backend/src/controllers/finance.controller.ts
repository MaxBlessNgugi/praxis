import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createCharityActivitySchema,
  createProjectSchema,
  decideWelfareSchema,
  disburseWelfareSchema,
  financeSummaryQuerySchema,
  listCharityQuerySchema,
  listContributionsQuerySchema,
  listFinanceAuditQuerySchema,
  listGivingQuerySchema,
  listProjectsQuerySchema,
  listTrashQuerySchema,
  listWelfareQuerySchema,
  openWelfareCaseSchema,
  recordContributionSchema,
  recordOfferingSchema,
  recordTitheSchema,
  updateCharityActivitySchema,
  updateProjectSchema,
  voidFinanceRecordSchema,
} from '../schemas/finance.schema';
import * as givingService from '../services/giving.service';
import * as projectService from '../services/project.service';
import * as welfareService from '../services/welfare.service';
import * as charityService from '../services/charity.service';
import * as financeService from '../services/finance.service';
import { verifyFinanceLedger } from '../lib/financeAudit';
import { created, ok } from '../lib/respond';
import { actor, id } from '../lib/request';

/** Which table a void or restore applies to, taken from the path rather than the body. */
const entitySchema = z.enum(['tithe', 'offering', 'project', 'contribution', 'welfare', 'charity']);

// ---------------------------------------------------------------------------------------------
// Giving
// ---------------------------------------------------------------------------------------------

export async function listTithes(req: Request, res: Response): Promise<void> {
  const result = await givingService.listTithes(listGivingQuerySchema.parse(req.query));
  res.json(result);
}

export async function getTithe(req: Request, res: Response): Promise<void> {
  ok(res, await givingService.getTithe(id(req)));
}

export async function recordTithe(req: Request, res: Response): Promise<void> {
  created(res, await givingService.recordTithe(recordTitheSchema.parse(req.body), actor(req)));
}

export async function listOfferings(req: Request, res: Response): Promise<void> {
  const result = await givingService.listOfferings(listGivingQuerySchema.parse(req.query));
  res.json(result);
}

export async function getOffering(req: Request, res: Response): Promise<void> {
  ok(res, await givingService.getOffering(id(req)));
}

export async function recordOffering(req: Request, res: Response): Promise<void> {
  created(res, await givingService.recordOffering(recordOfferingSchema.parse(req.body), actor(req)));
}

// ---------------------------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------------------------

export async function listProjects(req: Request, res: Response): Promise<void> {
  const { data, meta } = await projectService.listProjects(listProjectsQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function getProject(req: Request, res: Response): Promise<void> {
  ok(res, await projectService.getProject(id(req)));
}

export async function createProject(req: Request, res: Response): Promise<void> {
  created(res, await projectService.createProject(createProjectSchema.parse(req.body), actor(req)));
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  ok(res, await projectService.updateProject(id(req), updateProjectSchema.parse(req.body), actor(req)));
}

export async function listContributions(req: Request, res: Response): Promise<void> {
  const result = await projectService.listContributions(id(req), listContributionsQuerySchema.parse(req.query));
  res.json(result);
}

export async function recordContribution(req: Request, res: Response): Promise<void> {
  created(res, await projectService.recordContribution(id(req), recordContributionSchema.parse(req.body), actor(req)));
}

// ---------------------------------------------------------------------------------------------
// Welfare
// ---------------------------------------------------------------------------------------------

export async function listWelfare(req: Request, res: Response): Promise<void> {
  const result = await welfareService.listCases(listWelfareQuerySchema.parse(req.query));
  res.json(result);
}

export async function getWelfare(req: Request, res: Response): Promise<void> {
  ok(res, await welfareService.getCase(id(req)));
}

export async function openWelfare(req: Request, res: Response): Promise<void> {
  created(res, await welfareService.openCase(openWelfareCaseSchema.parse(req.body), actor(req)));
}

export async function decideWelfare(req: Request, res: Response): Promise<void> {
  ok(res, await welfareService.decideCase(id(req), decideWelfareSchema.parse(req.body), actor(req)));
}

export async function disburseWelfare(req: Request, res: Response): Promise<void> {
  ok(res, await welfareService.disburseCase(id(req), disburseWelfareSchema.parse(req.body), actor(req)));
}

// ---------------------------------------------------------------------------------------------
// Charity
// ---------------------------------------------------------------------------------------------

export async function listCharity(req: Request, res: Response): Promise<void> {
  const result = await charityService.listActivities(listCharityQuerySchema.parse(req.query));
  res.json(result);
}

export async function getCharity(req: Request, res: Response): Promise<void> {
  ok(res, await charityService.getActivity(id(req)));
}

export async function createCharity(req: Request, res: Response): Promise<void> {
  created(res, await charityService.createActivity(createCharityActivitySchema.parse(req.body), actor(req)));
}

export async function updateCharity(req: Request, res: Response): Promise<void> {
  ok(res, await charityService.updateActivity(id(req), updateCharityActivitySchema.parse(req.body), actor(req)));
}

// ---------------------------------------------------------------------------------------------
// Voiding, restoring, and the ledger
// ---------------------------------------------------------------------------------------------

export async function voidRecord(req: Request, res: Response): Promise<void> {
  const entity = entitySchema.parse(req.params.entity);
  ok(res, await financeService.voidRecord(entity, id(req), voidFinanceRecordSchema.parse(req.query), actor(req)));
}

export async function listTrash(req: Request, res: Response): Promise<void> {
  const { data, meta } = await financeService.listTrash(listTrashQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function restoreRecord(req: Request, res: Response): Promise<void> {
  ok(res, await financeService.restoreRecord(id(req), actor(req)));
}

export async function summary(req: Request, res: Response): Promise<void> {
  ok(res, await financeService.summary(financeSummaryQuerySchema.parse(req.query)));
}

export async function listAudit(req: Request, res: Response): Promise<void> {
  const result = await financeService.listAudit(listFinanceAuditQuerySchema.parse(req.query));
  res.json(result);
}

export async function verifyLedger(_req: Request, res: Response): Promise<void> {
  ok(res, await verifyFinanceLedger());
}

