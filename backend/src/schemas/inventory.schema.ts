import { z } from 'zod';
import { retireReasonSchema, window } from './common';

/**
 * The inventory domain's request shapes.
 *
 * Quantities are integers — nobody counts half a hymn book — and money follows the same rules the
 * giving ledger set: positive, finite, capped at figures a parish could plausibly reach.
 */

const quantity = z.number().int('Whole units only').min(0).max(1_000_000);
const positiveQuantity = z.number().int('Whole units only').min(1, 'At least one unit').max(1_000_000);

const money = z
  .number()
  .positive('Enter a cost greater than zero')
  .max(1_000_000_000, 'That figure looks like a typo')
  .refine(Number.isFinite, 'Enter a real number');

// -------------------------------------------------------------------------------------------
// Suppliers
// -------------------------------------------------------------------------------------------

export const supplierFields = z.object({
  name: z.string().trim().min(2, 'Name the supplier').max(160),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email('That email does not look right').max(160).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const createSupplierSchema = supplierFields;
export const updateSupplierSchema = supplierFields.partial();

export const listSuppliersQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// -------------------------------------------------------------------------------------------
// Items
// -------------------------------------------------------------------------------------------

export const inventoryKindSchema = z.enum(['consumable', 'asset']);
export const inventoryStatusSchema = z.enum(['active', 'in_service', 'maintenance', 'lost', 'damaged', 'disposed']);
export const assetConditionSchema = z.enum(['good', 'fair', 'poor']);

const itemFields = z.object({
  sku: z.string().trim().min(2, 'Give the item a SKU or asset number').max(40),
  name: z.string().trim().min(2, 'Name the item').max(160),
  kind: inventoryKindSchema.default('consumable'),
  category: z.string().trim().min(2, 'Name the category').max(80),
  unit: z.string().trim().min(1).max(20).default('pcs'),
  location: z.string().trim().min(2, 'Say where it is kept').max(160),
  reorderAt: quantity.nullable().optional(),
  cost: money.nullable().optional(),
  condition: assetConditionSchema.nullable().optional(),
  supplierId: z.string().uuid().nullable().optional(),
  purchasedAt: z.coerce.date().nullable().optional(),
  custodianId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
  /** The opening count. Becomes the register's first movement, so the ledger explains it. */
  openingQuantity: quantity.optional(),
});

export const createItemSchema = itemFields;
export const updateItemSchema = itemFields.partial().omit({ openingQuantity: true }).extend({
  status: inventoryStatusSchema.optional(),
});

export const listItemQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  kind: inventoryKindSchema.optional(),
  status: inventoryStatusSchema.optional(),
  location: z.string().trim().max(160).optional(),
  /** `lowStock=true` keeps only the lines at or below their reorder point. */
  lowStock: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// -------------------------------------------------------------------------------------------
// Movements
// -------------------------------------------------------------------------------------------

export const movementKindSchema = z.enum(['purchase', 'issue', 'return', 'transfer', 'adjustment', 'loss', 'damage']);

export const listMovementsQuerySchema = z.object({
  itemId: z.string().uuid().optional(),
  kind: movementKindSchema.optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// -------------------------------------------------------------------------------------------
// Stock takes
// -------------------------------------------------------------------------------------------

export const startStockTakeSchema = z.object({
  itemId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});

export const recordCountSchema = z.object({
  countedQuantity: quantity,
  note: z.string().trim().max(500).optional(),
});

export const listStockTakesQuerySchema = z.object({
  itemId: z.string().uuid().optional(),
  status: z.enum(['counting', 'review', 'approved', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// -------------------------------------------------------------------------------------------
// Purchases
// -------------------------------------------------------------------------------------------

export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid().optional(),
  reference: z.string().trim().max(60).optional(),
  purchasedAt: z.coerce.date().optional(),
  note: z.string().trim().max(500).optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        quantity: positiveQuantity,
        unitCost: money.nullable().optional(),
      }),
    )
    .min(1, 'A purchase needs at least one line'),
});

export const listPurchasesQuerySchema = z.object({
  supplierId: z.string().uuid().optional(),
  q: z.string().trim().max(120).optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// -------------------------------------------------------------------------------------------
// Issues and transfers
// -------------------------------------------------------------------------------------------

export const createIssueSchema = z.object({
  itemId: z.string().uuid(),
  quantity: positiveQuantity,
  issuedToName: z.string().trim().min(2, 'Name who received it').max(160),
  ministryId: z.string().uuid().optional(),
  reason: z.string().trim().max(500).optional(),
  authorizedById: z.string().uuid().optional(),
  issuedAt: z.coerce.date().optional(),
});

export const listIssuesQuerySchema = z.object({
  itemId: z.string().uuid().optional(),
  ministryId: z.string().uuid().optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(50),
});

export const createTransferSchema = z.object({
  itemId: z.string().uuid(),
  quantity: positiveQuantity,
  toLocation: z.string().trim().min(2, 'Say where it is going').max(160),
  note: z.string().trim().max(500).optional(),
  transferredAt: z.coerce.date().optional(),
});

export const listTransfersQuerySchema = z.object({
  itemId: z.string().uuid().optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// -------------------------------------------------------------------------------------------
// Retirement (query-string reasons, the convention everywhere else)
// -------------------------------------------------------------------------------------------

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ListItemQuery = z.infer<typeof listItemQuerySchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
export type StartStockTakeInput = z.infer<typeof startStockTakeSchema>;
export type RecordCountInput = z.infer<typeof recordCountSchema>;
export type ListStockTakesQuery = z.infer<typeof listStockTakesQuerySchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type ListPurchasesQuery = z.infer<typeof listPurchasesQuerySchema>;
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type ListTransfersQuery = z.infer<typeof listTransfersQuerySchema>;
export type RetireQuery = z.infer<typeof retireReasonSchema>;
