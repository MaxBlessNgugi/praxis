import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { InventoryItem, TitheTransaction } from '../types';
import { INITIAL_INVENTORY_ITEMS, INITIAL_TITHES } from './churchMockData';
import { CHURCH, DEMO_TODAY } from './churchDomain';
import { ROLES, type DemoRole } from '../lib/permissions';

/**
 * The demo data the console still runs on, in one place.
 *
 * Members, households and the archive queue are real now — they come from the API — so what
 * is left here is the small set of screens that have no backend yet: the tithe ledger's
 * offline-envelope entry, the stationery store, and the view-as-role switch.
 *
 * A count or a total that disagrees with these arrays is a bug, not a design choice: fix the
 * derivation, never the literal. It persists to `localStorage`, so a visitor's edits are still
 * there when they come back — and `resetDemo()` in the header puts the original data back.
 */

const STORAGE_KEY = 'praxis-demo-v1';

/** Standing orders and paybill gifts are the automated ones; the rest are one-time. */
const RECURRING_METHODS = ['Bank Standing Order', 'M-PESA Standing Order', 'M-PESA Paybill'];

const METHOD_ICONS: Record<string, string> = {
  Cheque: 'receipt_long',
  'Cash Envelope': 'payments',
  'Bank Transfer': 'account_balance',
};

export interface TitheInput {
  /** What the visitor typed — a member's name or member ID, or a walk-in giver. */
  donor: string;
  amount: number;
  method: string;
  /** The ledger's Designation column; the envelope dialog leaves it at the default. */
  category?: string;
  reference?: string;
}

interface DemoSnapshot {
  tithes: TitheTransaction[];
  inventory: InventoryItem[];
  /** The role the console is being viewed as — it decides what the permission gates allow. */
  role: DemoRole;
}

const freshSnapshot = (): DemoSnapshot => ({
  tithes: INITIAL_TITHES,
  inventory: INITIAL_INVENTORY_ITEMS,
  role: 'super_admin',
});

/** Anything unreadable in storage falls back to the seed rather than an empty console. */
function loadSnapshot(): DemoSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshSnapshot();
    const saved = JSON.parse(raw) as Partial<DemoSnapshot>;
    const seed = freshSnapshot();
    return {
      tithes: Array.isArray(saved.tithes) ? saved.tithes : seed.tithes,
      inventory: Array.isArray(saved.inventory) ? saved.inventory : seed.inventory,
      role: ROLES.includes(saved.role as DemoRole) ? (saved.role as DemoRole) : seed.role,
    };
  } catch {
    return freshSnapshot();
  }
}

/* ------------------------------------------------------------------ selectors */

/** Everything the ledger screens total, computed from the rows themselves. */
export function titheStats(tithes: TitheTransaction[]) {
  const recurring = tithes.filter((t) => RECURRING_METHODS.includes(t.method));
  const oneTime = tithes.filter((t) => !RECURRING_METHODS.includes(t.method));
  const sum = (rows: TitheTransaction[]) => rows.reduce((total, row) => total + row.amount, 0);
  const total = sum(tithes);
  const oneTimeTotal = sum(oneTime);
  return {
    total,
    count: tithes.length,
    recurringTotal: sum(recurring),
    recurringCount: recurring.length,
    recurringShare: total === 0 ? 0 : Math.round((sum(recurring) / total) * 100),
    oneTimeTotal,
    oneTimeCount: oneTime.length,
    averageGift: oneTime.length === 0 ? 0 : oneTimeTotal / oneTime.length,
    largestGift: tithes.reduce((largest, row) => Math.max(largest, row.amount), 0),
    designations: new Set(tithes.map((t) => t.category)).size,
    envelopes: new Set(tithes.map((t) => t.envelopeNo)).size,
    /** The month the ledger is reporting on, for labels like "Total Tithes MTD". */
    month: 'February 2025',
  };
}

/** Everything the inventory screen totals, computed from the items themselves. */
export function inventoryStats(items: InventoryItem[]) {
  const sum = (pick: (item: InventoryItem) => number) => items.reduce((total, item) => total + pick(item), 0);
  return {
    total: items.length,
    /** At or below its reorder level — the list a storekeeper works from. */
    lowStock: items.filter((item) => item.stock <= item.reorder).length,
    /** What the shelves cost, and what the for-sale lines would fetch. */
    costValue: sum((item) => item.stock * item.cost),
    retailValue: sum((item) => item.stock * item.price),
    categories: new Set(items.map((item) => item.category)).size,
  };
}

/* -------------------------------------------------------------------- store */

interface DemoData extends DemoSnapshot {
  titheStats: ReturnType<typeof titheStats>;
  recordTithe: (input: TitheInput) => TitheTransaction;
  voidTithe: (id: string) => void;
  inventoryStats: ReturnType<typeof inventoryStats>;
  countStock: (id: string, physical: number) => void;
  setRole: (role: DemoRole) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoData | null>(null);

/** The console's clock, as a timestamp for a record written right now. */
function stampNow(): string {
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${DEMO_TODAY.short} · ${time}`;
}

function nextTxCode(tithes: TitheTransaction[]): string {
  const highest = tithes.reduce((max, row) => Math.max(max, Number(row.txCode.replace(/\D/g, '')) || 0), 98415);
  return `#TX-${highest + 1}`;
}

export const DemoDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<DemoSnapshot>(loadSnapshot);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // A full or blocked store must not break the console — the session still works.
    }
  }, [snapshot]);

  const recordTithe = useCallback((input: TitheInput) => {
    const donor = input.donor.trim() || 'Anonymous Giver';
    let row!: TitheTransaction;
    setSnapshot((prev) => {
      row = {
        id: `tx-${Date.now()}`,
        txCode: nextTxCode(prev.tithes),
        donor,
        envelopeNo: input.reference || '—',
        method: input.method,
        methodIcon: METHOD_ICONS[input.method] ?? 'receipt_long',
        category: input.category || 'General Tithe',
        amount: input.amount,
        date: stampNow(),
        status: input.method === 'Cheque' ? 'Pending' : 'Completed',
      };
      return { ...prev, tithes: [row, ...prev.tithes] };
    });
    return row;
  }, []);

  const voidTithe = useCallback((id: string) => {
    setSnapshot((prev) => ({ ...prev, tithes: prev.tithes.filter((t) => t.id !== id) }));
  }, []);

  const setRole = useCallback((role: DemoRole) => {
    setSnapshot((prev) => ({ ...prev, role }));
  }, []);

  /**
   * A physical count replaces the book figure. That difference is the whole point of a stock take,
   * which is why the count is recorded against the item rather than adjusted quietly.
   */
  const countStock = useCallback((id: string, physical: number) => {
    setSnapshot((prev) => ({
      ...prev,
      inventory: prev.inventory.map((item) =>
        item.id === id ? { ...item, stock: physical, lastCounted: `${DEMO_TODAY.short} · ${CHURCH.visionaryLeader}` } : item,
      ),
    }));
  }, []);

  const resetDemo = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear; the state reset below is what matters.
    }
    setSnapshot(freshSnapshot());
  }, []);

  const value = useMemo<DemoData>(
    () => ({
      ...snapshot,
      titheStats: titheStats(snapshot.tithes),
      recordTithe,
      voidTithe,
      inventoryStats: inventoryStats(snapshot.inventory),
      countStock,
      setRole,
      resetDemo,
    }),
    [snapshot, recordTithe, voidTithe, countStock, setRole, resetDemo],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

export function useDemoData(): DemoData {
  const data = useContext(DemoContext);
  if (!data) throw new Error('useDemoData must be used inside <DemoDataProvider>');
  return data;
}
