import { Router } from 'express';
import * as inventoryController from '../controllers/inventory.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { moduleGate } from '../middleware/authorize';
import { requireAuth, requireRole } from '../middleware/authenticate';
import { requireWritableSubscription } from '../middleware/subscription';

/**
 * `/api/inventory` — the register of what the church owns, and every act that changes it.
 *
 * The read/write split is the same one members and households use: reading is any panel holder,
 * writing is staff and above, retiring is an administrator. Retiring an item is the delete, so it
 * sits behind the role gate even though the module's `delete` action also covers it — an
 * administrator is who answers for an asset leaving the register.
 */
export const inventoryRouter = Router();

inventoryRouter.use(requireAuth, moduleGate('inventory'), requireWritableSubscription);

// Suppliers
inventoryRouter.get('/suppliers', asyncHandler(inventoryController.listSuppliers));
inventoryRouter.post('/suppliers', requireRole('super_admin', 'admin', 'staff'), asyncHandler(inventoryController.createSupplier));
inventoryRouter.patch('/suppliers/:id', requireRole('super_admin', 'admin', 'staff'), asyncHandler(inventoryController.updateSupplier));

// The register
inventoryRouter.get('/items', asyncHandler(inventoryController.listItems));
inventoryRouter.get('/items/:id', asyncHandler(inventoryController.getItem));
inventoryRouter.post('/items', requireRole('super_admin', 'admin', 'staff'), asyncHandler(inventoryController.createItem));
inventoryRouter.patch('/items/:id', requireRole('super_admin', 'admin', 'staff'), asyncHandler(inventoryController.updateItem));
inventoryRouter.delete('/items/:id', requireRole('super_admin', 'admin'), asyncHandler(inventoryController.retireItem));

// The ledger
inventoryRouter.get('/movements', asyncHandler(inventoryController.listMovements));

// Stock takes
inventoryRouter.get('/stock-takes', asyncHandler(inventoryController.listStockTakes));
inventoryRouter.post('/stock-takes', requireRole('super_admin', 'admin', 'staff'), asyncHandler(inventoryController.startStockTake));
inventoryRouter.post('/stock-takes/:id/count', requireRole('super_admin', 'admin', 'staff'), asyncHandler(inventoryController.recordCount));
inventoryRouter.post('/stock-takes/:id/approve', requireRole('super_admin', 'admin'), asyncHandler(inventoryController.approveStockTake));
inventoryRouter.post('/stock-takes/:id/cancel', requireRole('super_admin', 'admin', 'staff'), asyncHandler(inventoryController.cancelStockTake));

// Purchases
inventoryRouter.get('/purchases', asyncHandler(inventoryController.listPurchases));
inventoryRouter.post('/purchases', requireRole('super_admin', 'admin', 'staff'), asyncHandler(inventoryController.createPurchase));

// Issues and transfers
inventoryRouter.get('/issues', asyncHandler(inventoryController.listIssues));
inventoryRouter.post('/issues', requireRole('super_admin', 'admin', 'staff'), asyncHandler(inventoryController.createIssue));
inventoryRouter.get('/transfers', asyncHandler(inventoryController.listTransfers));
inventoryRouter.post('/transfers', requireRole('super_admin', 'admin', 'staff'), asyncHandler(inventoryController.createTransfer));

// Maintenance — reading is any panel holder; logging a visit is staff and above. Maintenance itself
// never mutates stock, so it does not need the administrator gate that approval and disposal carry.
inventoryRouter.get('/maintenance', asyncHandler(inventoryController.listMaintenance));
inventoryRouter.post('/maintenance', requireRole('super_admin', 'admin', 'staff'), asyncHandler(inventoryController.createMaintenance));
