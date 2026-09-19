import type { Request, Response } from 'express';
import {
  createIssueSchema,
  createItemSchema,
  createMaintenanceSchema,
  createPurchaseSchema,
  createSupplierSchema,
  createTransferSchema,
  listIssuesQuerySchema,
  listItemQuerySchema,
  listMaintenanceQuerySchema,
  listMovementsQuerySchema,
  listPurchasesQuerySchema,
  listStockTakesQuerySchema,
  listSuppliersQuerySchema,
  listTransfersQuerySchema,
  recordCountSchema,
  startStockTakeSchema,
  updateItemSchema,
  updateSupplierSchema,
} from '../schemas/inventory.schema';
import { retireReasonSchema } from '../schemas/common';
import * as inventoryService from '../services/inventory.service';
import { created, ok } from '../lib/respond';
import { actor, id } from '../lib/request';

export async function listSuppliers(req: Request, res: Response): Promise<void> {
  const { data, meta } = await inventoryService.listSuppliers(listSuppliersQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function createSupplier(req: Request, res: Response): Promise<void> {
  created(res, await inventoryService.createSupplier(createSupplierSchema.parse(req.body), actor(req)));
}

export async function updateSupplier(req: Request, res: Response): Promise<void> {
  ok(res, await inventoryService.updateSupplier(id(req), updateSupplierSchema.parse(req.body), actor(req)));
}

export async function listItems(req: Request, res: Response): Promise<void> {
  const { data, meta } = await inventoryService.listItems(listItemQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function createItem(req: Request, res: Response): Promise<void> {
  created(res, await inventoryService.createItem(createItemSchema.parse(req.body), actor(req)));
}

export async function getItem(req: Request, res: Response): Promise<void> {
  ok(res, await inventoryService.getItem(id(req)));
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  ok(res, await inventoryService.updateItem(id(req), updateItemSchema.parse(req.body), actor(req)));
}

export async function retireItem(req: Request, res: Response): Promise<void> {
  ok(res, await inventoryService.retireItem(id(req), retireReasonSchema.parse(req.query), actor(req)));
}

export async function listMovements(req: Request, res: Response): Promise<void> {
  const { data, meta } = await inventoryService.listMovements(listMovementsQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function startStockTake(req: Request, res: Response): Promise<void> {
  created(res, await inventoryService.startStockTake(startStockTakeSchema.parse(req.body), actor(req)));
}

export async function recordCount(req: Request, res: Response): Promise<void> {
  ok(res, await inventoryService.recordCount(id(req), recordCountSchema.parse(req.body), actor(req)));
}

export async function approveStockTake(req: Request, res: Response): Promise<void> {
  ok(res, await inventoryService.approveStockTake(id(req), actor(req)));
}

export async function cancelStockTake(req: Request, res: Response): Promise<void> {
  ok(res, await inventoryService.cancelStockTake(id(req), actor(req)));
}

export async function listStockTakes(req: Request, res: Response): Promise<void> {
  const { data, meta } = await inventoryService.listStockTakes(listStockTakesQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function createPurchase(req: Request, res: Response): Promise<void> {
  created(res, await inventoryService.createPurchase(createPurchaseSchema.parse(req.body), actor(req)));
}

export async function listPurchases(req: Request, res: Response): Promise<void> {
  const { data, meta } = await inventoryService.listPurchases(listPurchasesQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function createIssue(req: Request, res: Response): Promise<void> {
  created(res, await inventoryService.createIssue(createIssueSchema.parse(req.body), actor(req)));
}

export async function listIssues(req: Request, res: Response): Promise<void> {
  const { data, meta } = await inventoryService.listIssues(listIssuesQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function createTransfer(req: Request, res: Response): Promise<void> {
  created(res, await inventoryService.createTransfer(createTransferSchema.parse(req.body), actor(req)));
}

export async function listTransfers(req: Request, res: Response): Promise<void> {
  const { data, meta } = await inventoryService.listTransfers(listTransfersQuerySchema.parse(req.query));
  ok(res, data, meta);
}

export async function createMaintenance(req: Request, res: Response): Promise<void> {
  created(res, await inventoryService.createMaintenance(createMaintenanceSchema.parse(req.body), actor(req)));
}

export async function listMaintenance(req: Request, res: Response): Promise<void> {
  const { data, meta } = await inventoryService.listMaintenance(listMaintenanceQuerySchema.parse(req.query));
  ok(res, data, meta);
}
