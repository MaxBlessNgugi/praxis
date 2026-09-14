import React, { useMemo, useState } from 'react';
import { InventoryItem } from '../../../types';
import { formatKes } from '../../../data/churchDomain';
import { useDemoData } from '../../../data/demoStore';
import { usePermissions } from '../../../lib/permissions';
import { exportCsv } from '../../../lib/export';
import { useDialog } from '../dialog';

/** The columns the register leaves the app as. */
const ITEM_COLUMNS = [
  { label: 'SKU', value: (i: InventoryItem) => i.sku },
  { label: 'Item', value: (i: InventoryItem) => i.name },
  { label: 'Category', value: (i: InventoryItem) => i.category },
  { label: 'Location', value: (i: InventoryItem) => i.location },
  { label: 'On hand', value: (i: InventoryItem) => i.stock },
  { label: 'Reorder at', value: (i: InventoryItem) => i.reorder },
  { label: 'Unit cost (KES)', value: (i: InventoryItem) => i.cost },
  { label: 'Unit price (KES)', value: (i: InventoryItem) => i.price },
  { label: 'Value at cost (KES)', value: (i: InventoryItem) => i.stock * i.cost },
  { label: 'Last counted', value: (i: InventoryItem) => i.lastCounted },
];

/**
 * Inventory & assets — the register of everything the church owns and sells, and the physical
 * count that keeps the numbers honest.
 *
 * This is the section ECCLESIA has and the mockup did not (its `InventoryItem`, `StockTake`,
 * `Delivery` and `StockIssue` models). Every figure here derives from the rows, and a count
 * rewrites the row it counted, so the shelf figure and the low-stock list cannot drift apart.
 */
export const InventoryAssetsView: React.FC = () => {
  const { inventory, inventoryStats, countStock } = useDemoData();
  const { canEdit } = usePermissions();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [countTarget, setCountTarget] = useState<InventoryItem | null>(null);
  const [physical, setPhysical] = useState('');
  const countDialog = useDialog(() => setCountTarget(null), 'Record stock take');

  const categories = useMemo(() => Array.from(new Set(inventory.map((item) => item.category))).sort(), [inventory]);

  const items = useMemo(
    () =>
      inventory.filter(
        (item) => (categoryFilter === '' || item.category === categoryFilter) && (!onlyLowStock || item.stock <= item.reorder),
      ),
    [inventory, categoryFilter, onlyLowStock],
  );

  const openCount = (item: InventoryItem) => {
    setCountTarget(item);
    setPhysical(String(item.stock));
  };

  const saveCount = (event: React.FormEvent) => {
    event.preventDefault();
    if (!countTarget) return;
    const counted = Number(physical);
    if (!Number.isFinite(counted) || counted < 0) return;
    countStock(countTarget.id, Math.floor(counted));
    setCountTarget(null);
  };

  const kpis = [
    { label: 'Items tracked', value: String(inventoryStats.total), icon: 'inventory_2', note: `${inventoryStats.categories} categories` },
    {
      label: 'Needs restocking',
      value: String(inventoryStats.lowStock),
      icon: 'production_quantity_limits',
      note: 'at or below reorder level',
      alert: inventoryStats.lowStock > 0,
    },
    { label: 'Value at cost', value: formatKes(inventoryStats.costValue), icon: 'payments', note: 'what the shelves cost' },
    { label: 'Value at retail', value: formatKes(inventoryStats.retailValue), icon: 'storefront', note: 'bookshop lines only' },
  ];

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-6 shadow-warm-card border border-[#E7E5E4] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-[9px] bg-[#F8F1E9] text-[#C2410C] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                inventory_2
              </span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C]">Asset & Stock Register</span>
          </div>
          <h1 className="font-headline text-2xl font-extrabold text-[#1C1917] tracking-tight">Inventory & Assets</h1>
          <p className="text-xs text-[#57534E] mt-0.5">
            Sound and media gear, bookshop stock, kitchen supplies and grounds equipment — with the last physical count on every line.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportCsv('destiny-sanctuary-inventory', ITEM_COLUMNS, items)}
          className="self-start md:self-auto h-9 px-3 rounded-xl bg-white border border-[#EAE1D7] text-xs font-semibold text-[#1e1b19] hover:bg-[#f4ece8] flex items-center gap-1.5 cursor-pointer"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
            file_download
          </span>
          <span>Export CSV</span>
        </button>
      </div>

      {/* KPI band, derived from the rows below it */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-[14px] border border-[#E7E5E4] p-4 shadow-warm-card">
            <div className="flex items-center justify-between">
              <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">{kpi.label}</span>
              <span
                aria-hidden="true"
                className={`material-symbols-outlined text-[20px] ${kpi.alert ? 'text-[#ba1a1a]' : 'text-[#C2410C]'}`}
              >
                {kpi.icon}
              </span>
            </div>
            <div
              className={`font-headline text-2xl font-extrabold mt-1.5 tracking-tight ${
                kpi.alert ? 'text-[#ba1a1a]' : 'text-[#1C1917]'
              }`}
            >
              {kpi.value}
            </div>
            <div className="text-[11px] text-[#57534E] mt-0.5">{kpi.note}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[14px] border border-[#E7E5E4] p-4 shadow-warm-card flex flex-wrap items-center gap-3">
        <label htmlFor="inventory-category" className="flex items-center gap-2 text-xs font-semibold text-[#57534E]">
          <span>Category</span>
          <select
            id="inventory-category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="h-9 px-2.5 rounded-[9px] bg-[#FDF8F3] border border-[#E7E5E4] font-headline text-xs font-semibold text-[#1C1917] cursor-pointer focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold text-[#57534E] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(event) => setOnlyLowStock(event.target.checked)}
            className="w-4 h-4 rounded border-[#D6D3D1] accent-[#C2410C] cursor-pointer"
          />
          Needs restocking only
        </label>

        <span className="text-xs text-[#57534E]">
          Showing <span className="font-bold text-[#1C1917]">{items.length}</span> of {inventory.length} lines
        </span>
      </div>

      {/* Register */}
      <div className="rounded-[14px] bg-white shadow-warm-card border border-[#E7E5E4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8F1E9] text-[#57534E] font-headline text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Item</th>
                <th className="px-4 py-3 font-bold">Location</th>
                <th className="px-4 py-3 font-bold text-right">On hand</th>
                <th className="px-4 py-3 font-bold text-right">Reorder at</th>
                <th className="px-4 py-3 font-bold text-right">Unit cost</th>
                <th className="px-4 py-3 font-bold text-right">Value</th>
                <th className="px-4 py-3 font-bold">Last counted</th>
                <th className="px-4 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const low = item.stock <= item.reorder;
                return (
                  <tr key={item.id} className="border-t border-[#E7E5E4] hover:bg-[#FDF8F3]">
                    <td className="px-4 py-3">
                      <div className="font-headline font-bold text-[#1C1917]">{item.name}</div>
                      <div className="font-mono text-[11px] text-[#57534E]">
                        {item.sku} · {item.category}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#57534E]">{item.location}</td>
                    <td className={`px-4 py-3 text-right font-headline font-bold ${low ? 'text-[#ba1a1a]' : 'text-[#1C1917]'}`}>
                      {item.stock}
                      {low && (
                        <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold uppercase">
                          reorder
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[#57534E]">{item.reorder}</td>
                    <td className="px-4 py-3 text-right text-[#57534E]">{formatKes(item.cost)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1C1917]">{formatKes(item.stock * item.cost)}</td>
                    <td className="px-4 py-3 text-[#57534E]">{item.lastCounted}</td>
                    <td className="px-4 py-3 text-right">
                      {canEdit('inventory') && (
                        <button
                          type="button"
                          onClick={() => openCount(item)}
                          aria-label={`Record stock take for ${item.name}`}
                          title="Record stock take"
                          className="px-2.5 py-1 rounded-[9px] bg-[#F8F1E9] hover:bg-[#F5EDE4] font-headline text-[11px] font-bold text-[#C2410C] cursor-pointer"
                        >
                          Count
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr className="border-t border-[#E7E5E4]">
                  <td colSpan={8} className="px-4 py-8 text-center text-[#57534E]">
                    No stock lines match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock take */}
      {countTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/45" {...countDialog}>
          <form onSubmit={saveCount} className="w-full max-w-[420px] bg-white rounded-[14px] shadow-warm-card border border-[#E7E5E4] p-6">
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">Record stock take</h3>
            <p className="text-xs text-[#57534E] mt-1">
              {countTarget.name} · <span className="font-mono">{countTarget.sku}</span>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[9px] bg-[#F8F1E9] p-3">
                <div className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">On the books</div>
                <div className="font-headline text-xl font-extrabold text-[#1C1917]">{countTarget.stock}</div>
              </div>
              <div className="rounded-[9px] bg-[#F8F1E9] p-3">
                <div className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">Reorder at</div>
                <div className="font-headline text-xl font-extrabold text-[#1C1917]">{countTarget.reorder}</div>
              </div>
            </div>

            <label htmlFor="stock-take-count" className="block mt-4 font-headline text-xs font-bold text-[#1e1b19] mb-1.5">
              Counted on the shelf
            </label>
            <input
              id="stock-take-count"
              aria-label="Counted on the shelf"
              type="number"
              min="0"
              required
              value={physical}
              onChange={(event) => setPhysical(event.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15"
            />

            <p className="text-[11px] text-[#57534E] mt-2">
              The count replaces the book figure and is stamped with today's date and your name.
            </p>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setCountTarget(null)}
                className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold cursor-pointer"
              >
                Save count
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
