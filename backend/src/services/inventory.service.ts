import { Prisma } from '@prisma/client';
import { money, prisma, type Db } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { page } from '../lib/respond';
import { findLive, live } from '../lib/live';
import type {
  CreateIssueInput,
  CreateItemInput,
  CreatePurchaseInput,
  CreateSupplierInput,
  CreateTransferInput,
  ListIssuesQuery,
  ListItemQuery,
  ListMovementsQuery,
  ListPurchasesQuery,
  ListStockTakesQuery,
  ListSuppliersQuery,
  ListTransfersQuery,
  RecordCountInput,
  StartStockTakeInput,
  UpdateItemInput,
  UpdateSupplierInput,
} from '../schemas/inventory.schema';

/**
 * Inventory and assets: what the church owns, where it is, and how the quantities changed.
 *
 * The invariant that shapes everything here: **the movement ledger is the truth, and the item's
 * `quantity` is its cached sum.** Every path that changes a quantity calls `applyMovement`, which
 * reads the shelf, refuses to go negative, writes the movement with the balance it produced, and
 * updates the item — all inside the caller's transaction and under a row lock, so two clerks
 * recording purchases at once cannot both read the same shelf and both believe they saw it whole.
 *
 * Nothing edits or deletes a movement. A wrong entry is corrected by a later movement, which is the
 * same rule the giving ledger follows: the evidence that the first figure existed is never erased.
 */

const itemInclude = {
  supplier: { select: { id: true, name: true } },
  custodian: { select: { id: true, firstName: true, lastName: true, initials: true } },
} satisfies Prisma.InventoryItemInclude;

type ItemRow = Prisma.InventoryItemGetPayload<{ include: typeof itemInclude }>;

/** Money leaves as a number; see lib/prisma.money. */
const toPublicItem = (row: ItemRow) => ({ ...row, cost: money(row.cost) });

/** The transaction handle, typed the way the rest of the codebase types it. */
type Tx = Db;

/** Locks the item's row so concurrent movements serialise instead of racing. */
async function lockItem(tx: Tx, itemId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "InventoryItem" WHERE id = ${itemId} FOR UPDATE`;
}

/**
 * Every caller that writes a row *pointing at* an item locks that item first — the row insert's
 * foreign-key lock followed by this one is an upgrade, and lock upgrades from opposite sides are
 * how two buys of the same stock deadlock. See createPurchase, which also locks several items in
 * one order so a multi-line receipt cannot queue behind itself.
 */

/**
 * Applies one movement to one item, and is the only quantity writer in the domain.
 *
 * `delta` is signed. A transfer is recorded with delta 0 — the item moved, nothing was created or
 * destroyed — so the shelf total is untouched while the movement history still says where it went.
 */
async function applyMovement(
  tx: Tx,
  input: {
    itemId: string;
    kind: 'purchase' | 'issue' | 'return' | 'transfer' | 'adjustment' | 'loss' | 'damage';
    delta: number;
    reference?: string | null;
    note?: string | null;
    actorId?: string | null;
  },
): Promise<{ quantity: number }> {
  await lockItem(tx, input.itemId);
  const item = await tx.inventoryItem.findFirst({ where: { id: input.itemId, ...live }, select: { quantity: true, name: true } });
  if (!item) throw new AppError(404, 'That item is not in the register', 'not_found');

  const balanceAfter = item.quantity + input.delta;
  if (balanceAfter < 0) {
    throw new AppError(
      400,
      `${item.name} has only ${item.quantity} on the shelf — this movement would take it to ${balanceAfter}`,
      'insufficient_stock',
    );
  }

  await tx.stockMovement.create({
    data: {
      itemId: input.itemId,
      kind: input.kind,
      delta: input.delta,
      balanceAfter,
      reference: input.reference ?? null,
      note: input.note ?? null,
      actorId: input.actorId ?? null,
    },
  });
  await tx.inventoryItem.update({ where: { id: input.itemId }, data: { quantity: balanceAfter } });

  return { quantity: balanceAfter };
}

// -------------------------------------------------------------------------------------------
// Suppliers
// -------------------------------------------------------------------------------------------

export async function createSupplier(input: CreateSupplierInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({ data: input });
    await tx.auditLog.create({
      data: { actorId, action: 'create', entityName: 'Supplier', entityId: supplier.id, summary: `Added supplier ${supplier.name}` },
    });
    return supplier;
  });
}

export async function listSuppliers(query: ListSuppliersQuery) {
  const where: Prisma.SupplierWhereInput = {
    ...live,
    ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}),
  };
  const [total, data] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
  ]);
  return { data, meta: page(total, query) };
}

export async function updateSupplier(id: string, input: UpdateSupplierInput, actorId: string) {
  const supplier = await findLive(prisma.supplier, id, 'That supplier is not on file');
  return prisma.$transaction(async (tx) => {
    const updated = await tx.supplier.update({ where: { id }, data: input });
    await tx.auditLog.create({
      data: { actorId, action: 'update', entityName: 'Supplier', entityId: id, summary: `Updated supplier ${updated.name}` },
    });
    return updated;
  }).then((updated) => {
    void supplier;
    return updated;
  });
}

// -------------------------------------------------------------------------------------------
// Items
// -------------------------------------------------------------------------------------------

export async function createItem(input: CreateItemInput, actorId: string) {
  const { openingQuantity, ...fields } = input;

  return prisma.$transaction(async (tx) => {
    // Assets and stock live in the same register, so a duplicate SKU on either kind is the same
    // mistake: two rows for one thing, and a shelf that can never be trusted again.
    const duplicate = await tx.inventoryItem.findFirst({ where: { sku: fields.sku, ...live } });
    if (duplicate) throw new AppError(409, `SKU ${fields.sku} is already in the register`, 'duplicate_sku');

    let item = await tx.inventoryItem.create({ data: fields, include: itemInclude });

    if (openingQuantity) {
      const { quantity } = await applyMovement(tx, {
        itemId: item.id,
        kind: 'adjustment',
        delta: openingQuantity,
        note: 'Opening count when the item was added to the register',
        actorId,
      });
      // The row as created carries quantity 0 — the movement above is what put stock on the shelf,
      // so the answer names the shelf as it now stands, not as it stood before its first line.
      item = { ...item, quantity };
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'InventoryItem',
        entityId: item.id,
        summary: `Added ${item.name} (${item.sku})${openingQuantity ? ` with ${openingQuantity} on the shelf` : ''}`,
      },
    });

    return toPublicItem(item);
  });
}

export async function listItems(query: ListItemQuery) {
  const where: Prisma.InventoryItemWhereInput = {
    ...live,
    ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' as const } }, { sku: { contains: query.q, mode: 'insensitive' as const } }] } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.location ? { location: { contains: query.location, mode: 'insensitive' as const } } : {}),
  };

  // The low-stock filter compares quantity against reorderAt *in SQL* — a field-to-field comparison
  // Prisma only expresses through the raw `fields` reference. The item-level AND keeps it composable
  // with the other conditions above.
  const lowStockOnly = query.lowStock === 'true';
  // Applied rather than merged into `where` above, because a spread of a conditional AND is how a
  // filter that reads fine silently stops compiling.
  const effectiveWhere: Prisma.InventoryItemWhereInput = lowStockOnly
    ? { ...where, AND: [{ quantity: { lte: prisma.inventoryItem.fields.reorderAt } }] }
    : where;

  const [total, data] = await Promise.all([
    prisma.inventoryItem.count({ where: effectiveWhere }),
    prisma.inventoryItem.findMany({
      where: effectiveWhere,
      include: itemInclude,
      orderBy: [{ name: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { data: data.map(toPublicItem), meta: page(total, query) };
}

export async function getItem(id: string) {
  const item = await findLive(prisma.inventoryItem, id, 'That item is not in the register', { include: itemInclude });
  const movements = await prisma.stockMovement.findMany({
    where: { itemId: id },
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { occurredAt: 'desc' },
    take: 50,
  });
  return { ...toPublicItem(item), movements };
}

export async function updateItem(id: string, input: UpdateItemInput, actorId: string) {
  await findLive(prisma.inventoryItem, id, 'That item is not in the register');

  return prisma.$transaction(async (tx) => {
    // `quantity` is deliberately not in the update path: it changes through movements, or through an
    // approved stock take, and nowhere else — that is what makes the ledger the truth.
    const { status, ...fields } = input;
    const item = await tx.inventoryItem.update({
      where: { id },
      data: { ...fields, ...(status ? { status } : {}) },
      include: itemInclude,
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'InventoryItem',
        entityId: id,
        summary: `Updated ${item.name} (${item.sku})`,
        after: { status: item.status, location: item.location, condition: item.condition },
      },
    });
    return toPublicItem(item);
  });
}

/**
 * Retires an item and, with it, the thing the register says about the shelf.
 *
 * Retiring records a final movement rather than leaving the quantity stranded: a disposed asset's
 * remaining count leaves the register by an explicit line, so the ledger sums to zero for it and the
 * shelf agrees with the world.
 */
export async function retireItem(id: string, input: { reason: string; reasonLabel: string }, actorId: string) {
  // One transaction: the balancing movement, the archive entry and the retirement all commit
  // together or not at all — a retired item whose ledger did not balance would be worse than either
  // half failing alone.
  return prisma.$transaction(async (tx) => {
    const item = await findLive(tx.inventoryItem, id, 'That item is not in the register');
    if (item.quantity > 0) {
      await applyMovement(tx, {
        itemId: id,
        kind: item.kind === 'asset' ? 'damage' : 'adjustment',
        delta: -item.quantity,
        note: `Removed from the register: ${input.reasonLabel}`,
        actorId,
      });
    }
    await tx.inventoryItem.update({ where: { id }, data: { status: 'disposed' } });

    const row = await tx.inventoryItem.findFirstOrThrow({ where: { id } });
    const archive = await tx.softDeletedRecord.create({
      data: {
        entityName: 'InventoryItem',
        entityId: id,
        entityLabel: `${item.sku} (${item.name})`,
        reason: input.reason as never,
        reasonLabel: input.reasonLabel,
        snapshot: row as never,
        deletedById: actorId,
        restoreDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'delete',
        entityName: 'InventoryItem',
        entityId: id,
        summary: `Retired ${item.sku} (${item.name}): ${input.reasonLabel}`,
      },
    });
    await tx.inventoryItem.update({ where: { id }, data: { deletedAt: new Date() } });

    // The archive entry's id, not the item's: the Trash restores by the archived record it lists,
    // and every other retiring route answers the same way.
    return archive;
  });
}

// -------------------------------------------------------------------------------------------
// Movements
// -------------------------------------------------------------------------------------------

export async function listMovements(query: ListMovementsQuery) {
  const where: Prisma.StockMovementWhereInput = {
    ...(query.itemId ? { itemId: query.itemId } : {}),
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.from || query.to
      ? { occurredAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: { item: { select: { id: true, name: true, sku: true, unit: true } }, actor: { select: { id: true, name: true } } },
      orderBy: { occurredAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { data, meta: page(total, query) };
}

// -------------------------------------------------------------------------------------------
// Stock takes
// -------------------------------------------------------------------------------------------

/** Opens a count. The book figure is snapshotted so a sale mid-count cannot bend the variance. */
export async function startStockTake(input: StartStockTakeInput, actorId: string) {
  const item = await findLive(prisma.inventoryItem, input.itemId, 'That item is not in the register');

  // One open count per item: two concurrent takes on the same shelf would each believe they spoke
  // for it, and the second approval would silently undo the first.
  const open = await prisma.stockTake.findFirst({ where: { itemId: input.itemId, status: { in: ['counting', 'review'] } } });
  if (open) throw new AppError(409, 'There is already a count in progress for this item', 'stock_take_open');

  return prisma.$transaction(async (tx) => {
    const take = await tx.stockTake.create({
      data: { itemId: input.itemId, bookQuantity: item.quantity, countedById: actorId, note: input.note ?? null },
      include: { item: { select: { id: true, name: true, sku: true, unit: true } } },
    });
    await tx.auditLog.create({
      data: { actorId, action: 'create', entityName: 'StockTake', entityId: take.id, summary: `Started a count of ${item.name} (${item.sku})` },
    });
    return take;
  });
}

/** Records the physical figure. Only changes the take — approval is the path that changes stock. */
export async function recordCount(takeId: string, input: RecordCountInput, actorId: string) {
  const take = await prisma.stockTake.findFirst({ where: { id: takeId, status: { in: ['counting', 'review'] } }, include: { item: true } });
  if (!take) throw new AppError(404, 'That count is not open — start one, or it has already been approved', 'not_found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.stockTake.update({
      where: { id: takeId },
      data: { countedQuantity: input.countedQuantity, variance: input.countedQuantity - take.bookQuantity, status: 'review', countedById: actorId, note: input.note ?? take.note },
      include: { item: { select: { id: true, name: true, sku: true, unit: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'StockTake',
        entityId: takeId,
        summary: `Counted ${take.item.name}: ${input.countedQuantity} on the shelf against ${take.bookQuantity} on the books`,
      },
    });
    return updated;
  });
}

/**
 * Approves a count. This is the only path by which a stock take changes the shelf, and the
 * adjustment it writes is a movement like any other — signed, balanced, and in the ledger forever.
 */
export async function approveStockTake(takeId: string, actorId: string) {
  const take = await prisma.stockTake.findFirst({
    where: { id: takeId, status: 'review' },
    include: { item: { select: { id: true, name: true, sku: true } } },
  });
  if (!take) throw new AppError(404, 'That count is not waiting for approval', 'not_found');
  if (take.countedQuantity === null) throw new AppError(400, 'Record the counted figure before approving', 'count_missing');

  const variance = take.countedQuantity - take.bookQuantity;

  return prisma.$transaction(async (tx) => {
    if (variance !== 0) {
      await applyMovement(tx, {
        itemId: take.itemId,
        kind: 'adjustment',
        delta: variance,
        reference: `stock-take:${takeId}`,
        note: `Stock take approved: counted ${take.countedQuantity} against ${take.bookQuantity} on the books`,
        actorId,
      });
    }

    const approved = await tx.stockTake.update({
      where: { id: takeId },
      data: { status: 'approved', approvedById: actorId, approvedAt: new Date() },
      include: { item: { select: { id: true, name: true, sku: true, unit: true } }, approvedBy: { select: { id: true, name: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entityName: 'StockTake',
        entityId: takeId,
        summary:
          variance === 0
            ? `Approved the count of ${take.item.name} — the shelf agreed with the books`
            : `Approved a variance of ${variance > 0 ? '+' : ''}${variance} on ${take.item.name} (${take.item.sku})`,
      },
    });
    return approved;
  });
}

export async function cancelStockTake(takeId: string, actorId: string) {
  const take = await prisma.stockTake.findFirst({ where: { id: takeId, status: { in: ['counting', 'review'] } } });
  if (!take) throw new AppError(404, 'That count is not open', 'not_found');

  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.stockTake.update({ where: { id: takeId }, data: { status: 'cancelled' } });
    await tx.auditLog.create({
      data: { actorId, action: 'update', entityName: 'StockTake', entityId: takeId, summary: `Cancelled the count of item ${take.itemId}` },
    });
    return cancelled;
  });
}

export async function listStockTakes(query: ListStockTakesQuery) {
  const where: Prisma.StockTakeWhereInput = {
    ...(query.itemId ? { itemId: query.itemId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const [total, data] = await Promise.all([
    prisma.stockTake.count({ where }),
    prisma.stockTake.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, sku: true, unit: true } },
        countedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { data, meta: page(total, query) };
}

// -------------------------------------------------------------------------------------------
// Purchases
// -------------------------------------------------------------------------------------------

export async function createPurchase(input: CreatePurchaseInput, actorId: string) {
  // Two lines for one item would write two movements from one receipt and double the shelf.
  const seen = new Set<string>();
  for (const line of input.lines) {
    if (seen.has(line.itemId)) throw new AppError(400, 'One purchase has one line per item — combine the quantities', 'duplicate_line');
    seen.add(line.itemId);
  }

  return prisma.$transaction(async (tx) => {
    // Every item row is locked before anything is written, cheapest id first. The line insert takes
    // its own shared lock on the item through the foreign key, and a FOR UPDATE taken after that is
    // an upgrade two concurrent receipts can attempt from opposite sides — the deadlock Postgres
    // reports as 40P01. Locking every item up front gives them one queue to stand in.
    for (const itemId of [...seen].sort()) {
      await lockItem(tx, itemId);
    }

    const total = input.lines.reduce((sum, line) => sum + (line.unitCost ?? 0) * line.quantity, 0);

    const purchase = await tx.purchase.create({
      data: {
        supplierId: input.supplierId ?? null,
        reference: input.reference ?? null,
        purchasedAt: input.purchasedAt ?? new Date(),
        note: input.note ?? null,
        recordedById: actorId,
        total: new Prisma.Decimal(total.toFixed(2)),
      },
    });

    for (const line of input.lines) {
      await tx.purchaseLine.create({
        data: { purchaseId: purchase.id, itemId: line.itemId, quantity: line.quantity, unitCost: line.unitCost === null || line.unitCost === undefined ? null : new Prisma.Decimal(line.unitCost.toFixed(2)) },
      });
      await applyMovement(tx, {
        itemId: line.itemId,
        kind: 'purchase',
        delta: line.quantity,
        reference: input.reference ?? `purchase:${purchase.id.slice(0, 8)}`,
        note: input.note ?? null,
        actorId,
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'Purchase',
        entityId: purchase.id,
        summary: `Recorded a purchase of ${input.lines.length} ${input.lines.length === 1 ? 'line' : 'lines'} totalling KSh ${total.toFixed(2)}`,
        after: { total: total.toFixed(2), reference: input.reference ?? null },
      },
    });

    return { ...purchase, total: money(purchase.total), lines: input.lines.length };
  });
}

export async function listPurchases(query: ListPurchasesQuery) {
  const where: Prisma.PurchaseWhereInput = {
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(query.q ? { reference: { contains: query.q, mode: 'insensitive' as const } } : {}),
    ...(query.from || query.to
      ? { purchasedAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } }, recordedBy: { select: { id: true, name: true } }, lines: { include: { item: { select: { id: true, name: true, sku: true, unit: true } } } } },
      orderBy: { purchasedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { data: data.map((row) => ({ ...row, total: money(row.total) })), meta: page(total, query) };
}

// -------------------------------------------------------------------------------------------
// Issues and transfers
// -------------------------------------------------------------------------------------------

export async function createIssue(input: CreateIssueInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await applyMovement(tx, {
      itemId: input.itemId,
      kind: 'issue',
      delta: -input.quantity,
      note: input.reason ?? null,
      actorId,
    });

    const issue = await tx.issue.create({
      data: {
        itemId: input.itemId,
        quantity: input.quantity,
        issuedToName: input.issuedToName,
        ministryId: input.ministryId ?? null,
        reason: input.reason ?? null,
        issuedAt: input.issuedAt ?? new Date(),
        issuedById: actorId,
        authorizedById: input.authorizedById ?? null,
      },
      include: {
        item: { select: { id: true, name: true, sku: true, unit: true } },
        ministry: { select: { id: true, name: true } },
        issuedBy: { select: { id: true, name: true } },
        authorizedBy: { select: { id: true, name: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'Issue',
        entityId: issue.id,
        summary: `Issued ${input.quantity} × ${issue.item.name} to ${input.issuedToName}`,
        after: { authorizedBy: issue.authorizedBy?.name ?? null, ministry: issue.ministry?.name ?? null },
      },
    });

    return issue;
  });
}

export async function listIssues(query: ListIssuesQuery) {
  const where: Prisma.IssueWhereInput = {
    ...(query.itemId ? { itemId: query.itemId } : {}),
    ...(query.ministryId ? { ministryId: query.ministryId } : {}),
    ...(query.from || query.to ? { issuedAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}),
  };
  const [total, data] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, sku: true, unit: true } },
        ministry: { select: { id: true, name: true } },
        issuedBy: { select: { id: true, name: true } },
        authorizedBy: { select: { id: true, name: true } },
      },
      orderBy: { issuedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { data, meta: page(total, query) };
}

export async function createTransfer(input: CreateTransferInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const item = await findLive(tx.inventoryItem, input.itemId, 'That item is not in the register');
    // Locked before the transfer row is written, for the same reason createPurchase locks before
    // its lines: the insert's foreign-key lock followed by applyMovement's FOR UPDATE is an upgrade
    // two concurrent transfers can attempt from opposite sides, and Postgres answers with 40P01.
    await lockItem(tx, input.itemId);
    if (item.quantity < input.quantity) {
      throw new AppError(400, `${item.name} has only ${item.quantity} at ${item.location}`, 'insufficient_stock');
    }

    const transfer = await tx.transfer.create({
      data: {
        itemId: input.itemId,
        quantity: input.quantity,
        fromLocation: item.location,
        toLocation: input.toLocation,
        note: input.note ?? null,
        transferredAt: input.transferredAt ?? new Date(),
        transferredById: actorId,
      },
    });

    // The whole quantity moving is the common case, and it relocates the item; a partial move only
    // writes the ledger line. Splitting an item into two rows is a decision for the office, not an
    // accident of a transfer form.
    if (input.quantity === item.quantity && item.kind === 'asset') {
      await tx.inventoryItem.update({ where: { id: input.itemId }, data: { location: input.toLocation } });
      await applyMovement(tx, { itemId: input.itemId, kind: 'transfer', delta: 0, reference: `transfer:${transfer.id.slice(0, 8)}`, note: `Moved to ${input.toLocation}`, actorId });
    } else {
      await applyMovement(tx, { itemId: input.itemId, kind: 'transfer', delta: 0, reference: `transfer:${transfer.id.slice(0, 8)}`, note: `${input.quantity} moved from ${item.location} to ${input.toLocation}`, actorId });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'create',
        entityName: 'Transfer',
        entityId: transfer.id,
        summary: `Moved ${input.quantity} × ${item.name} from ${item.location} to ${input.toLocation}`,
      },
    });

    return transfer;
  });
}

export async function listTransfers(query: ListTransfersQuery) {
  const where: Prisma.TransferWhereInput = {
    ...(query.itemId ? { itemId: query.itemId } : {}),
    ...(query.from || query.to ? { transferredAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}),
  };
  const [total, data] = await Promise.all([
    prisma.transfer.count({ where }),
    prisma.transfer.findMany({
      where,
      include: { item: { select: { id: true, name: true, sku: true, unit: true } }, transferredBy: { select: { id: true, name: true } } },
      orderBy: { transferredAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { data, meta: page(total, query) };
}
