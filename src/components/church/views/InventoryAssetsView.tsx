import React, { useMemo, useState } from 'react';
import {
  useInventoryIssues,
  useInventoryItems,
  useInventoryPurchases,
  useInventoryReport,
  useInventoryTransfers,
  useMinistries,
  useMutation,
  useStockMovements,
  useStockTakes,
  useSuppliers,
  useUsers,
} from '../../../hooks/useApi';
import { formatKes } from '../../../data/churchDomain';
import {
  inventoryApi,
  type InventoryItemDto,
  type InventoryKind,
  type IssueDto,
  type PurchaseDto,
  type StockMovementDto,
  type StockTakeDto,
  type TransferDto,
} from '../../../lib/api';
import { usePermissions } from '../../../lib/permissions';
import { day } from '../../../lib/period';
import { exportCsv, type ExportColumn } from '../../../lib/export';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../DataState';
import { useDialog } from '../dialog';

/**
 * Inventory & Assets — the register of everything the church owns, and every act that changes it.
 *
 * Everything on these screens is the server's. The register reads `/api/inventory/items`, the
 * ledger reads `/api/inventory/movements`, and every act — a purchase, an issue, a transfer, a
 * stock-take approval — is a POST the server turns into StockMovement rows inside one transaction,
 * so the quantity on a line and the history beneath it cannot disagree. Nothing here writes a
 * quantity by hand: a physical count is recorded as a stock take, and stock moves only when an
 * administrator approves the variance.
 */

type SubTab = 'register' | 'ledger' | 'stock-takes' | 'purchases' | 'issues' | 'transfers';

const SUB_TABS: Array<{ id: SubTab; label: string; icon: string }> = [
  { id: 'register', label: 'Register', icon: 'inventory_2' },
  { id: 'ledger', label: 'Movements', icon: 'swap_vert' },
  { id: 'stock-takes', label: 'Stock takes', icon: 'fact_check' },
  { id: 'purchases', label: 'Purchases', icon: 'shopping_cart' },
  { id: 'issues', label: 'Issues', icon: 'assignment_turned_in' },
  { id: 'transfers', label: 'Transfers', icon: 'move_up' },
];

/** The columns the register leaves the app as. */
const ITEM_COLUMNS: ExportColumn<InventoryItemDto>[] = [
  { label: 'SKU', value: (i) => i.sku },
  { label: 'Item', value: (i) => i.name },
  { label: 'Kind', value: (i) => i.kind },
  { label: 'Category', value: (i) => i.category },
  { label: 'Location', value: (i) => i.location },
  { label: 'On hand', value: (i) => i.quantity },
  { label: 'Reorder at', value: (i) => i.reorderAt ?? '' },
  { label: 'Unit cost (KES)', value: (i) => i.cost ?? '' },
  { label: 'Value at cost (KES)', value: (i) => (i.cost != null ? i.quantity * i.cost : '') },
  { label: 'Last counted', value: (i) => (i.lastCountedAt ? day(new Date(i.lastCountedAt)) : 'never') },
];

export const InventoryAssetsView: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('register');
  // The KPI band is the report's, the panels are the ledgers'. A bump after any act makes the
  // headline numbers re-read rather than lag one action behind what the shelves just did.
  const [reportTick, setReportTick] = useState(0);
  const refresh = () => setReportTick((tick) => tick + 1);

  return (
    <div className="flex flex-col w-full space-y-6">
      <ViewHeader key={reportTick} />

      <div
        role="tablist"
        aria-label="Inventory sections"
        className="flex flex-wrap gap-1.5 bg-white rounded-[14px] border border-[#E7E5E4] p-2 shadow-warm-card"
      >
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            aria-selected={subTab === tab.id}
            role="tab"
            className={`px-3.5 py-2 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              subTab === tab.id ? 'bg-[#C2410C] text-white shadow-sm' : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'register' && <RegisterPanel onChanged={refresh} />}
      {subTab === 'ledger' && <LedgerPanel />}
      {subTab === 'stock-takes' && <StockTakesPanel onChanged={refresh} />}
      {subTab === 'purchases' && <PurchasesPanel onChanged={refresh} />}
      {subTab === 'issues' && <IssuesPanel onChanged={refresh} />}
      {subTab === 'transfers' && <TransfersPanel />}
    </div>
  );
};

// -------------------------------------------------------------------------------------------
// Header + report figures
// -------------------------------------------------------------------------------------------

/** The header band with the report figures — read from `/api/reports/inventory`, not summed locally. */
const ViewHeader: React.FC = () => {
  const { report, loading, error, refetch } = useInventoryReport();

  if (error) return <ErrorBlock message={error} onRetry={refetch} />;
  if (loading || !report) return <LoadingBlock label="Reading the register…" />;

  const kpis = [
    {
      label: 'Lines tracked',
      value: String(report.totals.consumableLines + report.totals.assetLines),
      note: `${report.totals.consumableLines} consumable · ${report.totals.assetLines} assets`,
    },
    { label: 'Value at cost', value: formatKes(report.totals.totalValue), note: 'stock and assets, what they cost' },
    {
      label: 'Needs restocking',
      value: String(report.lowStock.length),
      note: 'at or below reorder level',
      alert: report.lowStock.length > 0,
    },
    { label: 'Assets', value: String(report.totals.assetLines), note: `${formatKes(report.totals.assetValue)} at cost` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#FFFFFF] rounded-[14px] p-6 shadow-warm-card border border-[#E7E5E4] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-[9px] bg-[#F8F1E9] text-[#C2410C] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">inventory_2</span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C]">Asset &amp; Stock Register</span>
          </div>
          <h1 className="font-headline text-2xl font-extrabold text-[#1C1917] tracking-tight">Inventory &amp; Assets</h1>
          <p className="text-xs text-[#57534E] mt-0.5">
            Sound and media gear, bookshop stock, kitchen supplies and grounds equipment — every quantity change is a movement on the ledger.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-[14px] border border-[#E7E5E4] p-4 shadow-warm-card">
            <div className="flex items-center justify-between">
              <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">{kpi.label}</span>
              <span
                aria-hidden="true"
                className={`material-symbols-outlined text-[20px] ${kpi.alert ? 'text-[#ba1a1a]' : 'text-[#C2410C]'}`}
              >
                {kpi.alert ? 'production_quantity_limits' : 'payments'}
              </span>
            </div>
            <div className={`font-headline text-2xl font-extrabold mt-1.5 tracking-tight ${kpi.alert ? 'text-[#ba1a1a]' : 'text-[#1C1917]'}`}>
              {kpi.value}
            </div>
            <div className="text-[11px] text-[#57534E] mt-0.5">{kpi.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------------------------
// Register
// -------------------------------------------------------------------------------------------

const RegisterPanel: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const { canEdit } = usePermissions();
  const [detailTarget, setDetailTarget] = useState<InventoryItemDto | null>(null);
  const closeDetail = () => setDetailTarget(null);
  const detailDialog = useDialog(closeDetail, 'Item record');
  const [addOpen, setAddOpen] = useState(false);
  const closeAdd = () => setAddOpen(false);
  const addDialog = useDialog(closeAdd, 'Add item');

  const list = useInventoryItems({
    q: search || undefined,
    category: category || undefined,
    lowStock: onlyLow || undefined,
  });

  const categories = useMemo(() => Array.from(new Set(list.items.map((i) => i.category))).sort(), [list.items]);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-[14px] border border-[#E7E5E4] p-4 shadow-warm-card flex flex-wrap items-center gap-3">
        <label htmlFor="inventory-search" className="flex items-center gap-2 text-xs font-semibold text-[#57534E]">
          <span>Search</span>
          <input
            id="inventory-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 px-2.5 rounded-[9px] bg-[#FDF8F3] border border-[#E7E5E4] text-xs text-[#1C1917] focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20"
          />
        </label>
        <label htmlFor="inventory-category" className="flex items-center gap-2 text-xs font-semibold text-[#57534E]">
          <span>Category</span>
          <select
            id="inventory-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 px-2.5 rounded-[9px] bg-[#FDF8F3] border border-[#E7E5E4] font-headline text-xs font-semibold text-[#1C1917] cursor-pointer focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-[#57534E] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyLow}
            onChange={(e) => setOnlyLow(e.target.checked)}
            className="w-4 h-4 rounded border-[#D6D3D1] accent-[#C2410C] cursor-pointer"
          />
          Needs restocking only
        </label>
        {canEdit('inventory') && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="ml-auto h-9 px-3.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold cursor-pointer"
          >
            + Add item
          </button>
        )}
        <button
          type="button"
          onClick={() => exportCsv('destiny-sanctuary-inventory', ITEM_COLUMNS, list.items)}
          className="h-9 px-3 rounded-xl bg-white border border-[#EAE1D7] text-xs font-semibold text-[#1e1b19] hover:bg-[#f4ece8] flex items-center gap-1.5 cursor-pointer"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">file_download</span>
          <span>Export CSV</span>
        </button>
      </div>

      {list.loading ? (
        <LoadingBlock label="Reading the register…" />
      ) : list.error ? (
        <ErrorBlock message={list.error} onRetry={list.refetch} />
      ) : list.items.length === 0 ? (
        <EmptyBlock
          title="No stock lines match this filter."
          hint="Add an item to start the register, or loosen the filters above."
          icon="inventory_2"
        />
      ) : (
        <div className="rounded-[14px] bg-white shadow-warm-card border border-[#E7E5E4] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F1E9] text-[#57534E] font-headline text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">Item</th>
                  <th className="px-4 py-3 font-bold">Location</th>
                  <th className="px-4 py-3 font-bold text-right">On hand</th>
                  <th className="px-4 py-3 font-bold text-right">Reorder at</th>
                  <th className="px-4 py-3 font-bold text-right">Value</th>
                  <th className="px-4 py-3 font-bold">Last counted</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((item) => {
                  const low = item.reorderAt != null && item.quantity <= item.reorderAt;
                  return (
                    <tr key={item.id} className="border-t border-[#E7E5E4] hover:bg-[#FDF8F3]">
                      <td className="px-4 py-3">
                        <div className="font-headline font-bold text-[#1C1917]">
                          {item.name}
                          {item.kind === 'asset' && (
                            <span className="ml-2 inline-flex px-1.5 py-0.5 rounded bg-[#E7E5E4] text-[#57534E] text-[10px] font-bold uppercase">asset</span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-[#57534E]">{item.sku} · {item.category}</div>
                      </td>
                      <td className="px-4 py-3 text-[#57534E]">{item.location}</td>
                      <td className={`px-4 py-3 text-right font-headline font-bold ${low ? 'text-[#ba1a1a]' : 'text-[#1C1917]'}`}>
                        {item.quantity}
                        {low && (
                          <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold uppercase">reorder</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[#57534E]">{item.reorderAt ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1C1917]">
                        {item.cost != null ? formatKes(item.quantity * item.cost) : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#57534E]">{item.lastCountedAt ? day(new Date(item.lastCountedAt)) : 'never'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailTarget(item)}
                          aria-label={`Open ${item.name}`}
                          className="px-2.5 py-1 rounded-[9px] bg-[#F8F1E9] hover:bg-[#F5EDE4] font-headline text-[11px] font-bold text-[#C2410C] cursor-pointer"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailTarget && <ItemDialog item={detailTarget} onClose={closeDetail} dialog={detailDialog} />}
      {addOpen && <AddItemDialog onClose={closeAdd} dialog={addDialog} onSaved={() => { list.refetch(); onChanged(); }} />}
    </div>
  );
};

// -------------------------------------------------------------------------------------------
// Movements ledger
// -------------------------------------------------------------------------------------------

const LedgerPanel: React.FC = () => {
  const [kind, setKind] = useState('');
  const list = useStockMovements({ kind: (kind || undefined) as StockMovementDto['kind'] });

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-[14px] border border-[#E7E5E4] p-4 shadow-warm-card flex flex-wrap items-center gap-3">
        <label htmlFor="movements-kind" className="flex items-center gap-2 text-xs font-semibold text-[#57534E]">
          <span>Kind</span>
          <select
            id="movements-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-9 px-2.5 rounded-[9px] bg-[#FDF8F3] border border-[#E7E5E4] font-headline text-xs font-semibold text-[#1C1917] cursor-pointer focus:outline-none focus:border-[#C2410C]"
          >
            <option value="">All kinds</option>
            <option value="purchase">Purchases</option>
            <option value="issue">Issues</option>
            <option value="return">Returns</option>
            <option value="transfer">Transfers</option>
            <option value="adjustment">Adjustments</option>
            <option value="loss">Losses</option>
            <option value="damage">Damage</option>
          </select>
        </label>
        <span className="text-xs text-[#57534E]">
          The register's quantities are what this ledger says they are — every change lands here first.
        </span>
      </div>

      {list.loading ? (
        <LoadingBlock />
      ) : list.error ? (
        <ErrorBlock message={list.error} onRetry={list.refetch} />
      ) : list.items.length === 0 ? (
        <EmptyBlock title="No movements match this filter." icon="swap_vert" />
      ) : (
        <div className="rounded-[14px] bg-white shadow-warm-card border border-[#E7E5E4] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F1E9] text-[#57534E] font-headline text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">When</th>
                  <th className="px-4 py-3 font-bold">Item</th>
                  <th className="px-4 py-3 font-bold">Change</th>
                  <th className="px-4 py-3 font-bold text-right">Balance after</th>
                  <th className="px-4 py-3 font-bold">By</th>
                  <th className="px-4 py-3 font-bold">Note</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((m) => (
                  <tr key={m.id} className="border-t border-[#E7E5E4] hover:bg-[#FDF8F3]">
                    <td className="px-4 py-3 text-[#57534E] whitespace-nowrap">{day(new Date(m.occurredAt))}</td>
                    <td className="px-4 py-3">
                      <div className="font-headline font-bold text-[#1C1917]">{m.item?.name ?? m.itemId}</div>
                      <div className="font-mono text-[11px] text-[#57534E]">{m.item?.sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.delta >= 0 ? 'bg-[#DCE9DA] text-[#3A6B35]' : 'bg-[#ffdad6] text-[#ba1a1a]'
                        }`}
                      >
                        {m.kind} {m.delta >= 0 ? '+' : ''}{m.delta}
                      </span>
                      {m.reference && <div className="font-mono text-[10px] text-[#57534E] mt-1">{m.reference}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-headline font-bold text-[#1C1917]">{m.balanceAfter}</td>
                    <td className="px-4 py-3 text-[#57534E]">{m.actor?.name ?? 'system'}</td>
                    <td className="px-4 py-3 text-[#57534E]">{m.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------------------------------------
// Stock takes
// -------------------------------------------------------------------------------------------

const StockTakesPanel: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [status, setStatus] = useState('');
  const list = useStockTakes({ status: (status || undefined) as StockTakeDto['status'] });
  const { canEdit, canDelete } = usePermissions();
  const [startOpen, setStartOpen] = useState(false);
  const closeStart = () => setStartOpen(false);
  const startDialog = useDialog(closeStart, 'Start a stock take');
  const [countTarget, setCountTarget] = useState<StockTakeDto | null>(null);
  const closeCount = () => setCountTarget(null);
  const countDialog = useDialog(closeCount, 'Record a count');
  const approve = useMutation((id: string) => inventoryApi.approveStockTake(id));
  const cancel = useMutation((id: string) => inventoryApi.cancelStockTake(id));

  const act = async (mutation: typeof approve, id: string) => {
    try {
      await mutation.run(id);
      list.refetch();
      onChanged();
    } catch {
      // The error block above the table already reports it.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {approve.error && <ErrorBlock message={approve.error} />}
      {cancel.error && <ErrorBlock message={cancel.error} />}

      <div className="bg-white rounded-[14px] border border-[#E7E5E4] p-4 shadow-warm-card flex flex-wrap items-center gap-3">
        <label htmlFor="takes-status" className="flex items-center gap-2 text-xs font-semibold text-[#57534E]">
          <span>Status</span>
          <select
            id="takes-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 px-2.5 rounded-[9px] bg-[#FDF8F3] border border-[#E7E5E4] font-headline text-xs font-semibold text-[#1C1917] cursor-pointer focus:outline-none focus:border-[#C2410C]"
          >
            <option value="">All statuses</option>
            <option value="counting">Counting</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        {canEdit('inventory') && (
          <button
            type="button"
            onClick={() => setStartOpen(true)}
            className="ml-auto h-9 px-3.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold cursor-pointer"
          >
            + Start a stock take
          </button>
        )}
      </div>

      {list.loading ? (
        <LoadingBlock />
      ) : list.error ? (
        <ErrorBlock message={list.error} onRetry={list.refetch} />
      ) : list.items.length === 0 ? (
        <EmptyBlock
          title="No stock takes yet."
          hint="Open an item on the Register tab and press Count to begin one."
          icon="fact_check"
        />
      ) : (
        <div className="rounded-[14px] bg-white shadow-warm-card border border-[#E7E5E4] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F1E9] text-[#57534E] font-headline text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">Item</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold text-right">Book</th>
                  <th className="px-4 py-3 font-bold text-right">Counted</th>
                  <th className="px-4 py-3 font-bold text-right">Variance</th>
                  <th className="px-4 py-3 font-bold">Counted by</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((take) => (
                  <tr key={take.id} className="border-t border-[#E7E5E4] hover:bg-[#FDF8F3]">
                    <td className="px-4 py-3">
                      <div className="font-headline font-bold text-[#1C1917]">{take.item?.name ?? take.itemId}</div>
                      <div className="font-mono text-[11px] text-[#57534E]">{take.item?.sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          take.status === 'approved'
                            ? 'bg-[#DCE9DA] text-[#3A6B35]'
                            : take.status === 'cancelled'
                              ? 'bg-[#E7E5E4] text-[#57534E]'
                              : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}
                      >
                        {take.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#57534E]">{take.bookQuantity}</td>
                    <td className="px-4 py-3 text-right text-[#57534E]">{take.countedQuantity ?? '—'}</td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        (take.variance ?? 0) < 0 ? 'text-[#ba1a1a]' : (take.variance ?? 0) > 0 ? 'text-[#3A6B35]' : 'text-[#57534E]'
                      }`}
                    >
                      {take.variance ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[#57534E]">{take.countedBy?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {(take.status === 'counting' || take.status === 'review') && canEdit('inventory') && (
                        <button
                          type="button"
                          onClick={() => setCountTarget(take)}
                          className="px-2.5 py-1 rounded-[9px] bg-[#F8F1E9] hover:bg-[#F5EDE4] font-headline text-[11px] font-bold text-[#C2410C] cursor-pointer"
                        >
                          Count
                        </button>
                      )}
                      {take.status === 'review' && canDelete('inventory') && (
                        <button
                          type="button"
                          disabled={approve.pending}
                          onClick={() => act(approve, take.id)}
                          className="px-2.5 py-1 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 font-headline text-[11px] font-bold text-white cursor-pointer"
                        >
                          {approve.pending ? '…' : 'Approve'}
                        </button>
                      )}
                      {(take.status === 'counting' || take.status === 'review') && canEdit('inventory') && (
                        <button
                          type="button"
                          disabled={cancel.pending}
                          onClick={() => act(cancel, take.id)}
                          className="ml-1 px-2.5 py-1 rounded-[9px] text-[11px] font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {startOpen && <StartTakeDialog onClose={closeStart} dialog={startDialog} onSaved={() => { list.refetch(); onChanged(); }} />}
      {countTarget && <CountDialog take={countTarget} onClose={closeCount} dialog={countDialog} onSaved={() => { list.refetch(); onChanged(); }} />}
    </div>
  );
};

// -------------------------------------------------------------------------------------------
// Purchases
// -------------------------------------------------------------------------------------------

const PurchasesPanel: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const list = useInventoryPurchases();
  const { canEdit } = usePermissions();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const dialog = useDialog(close, 'Record a purchase');

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-[14px] border border-[#E7E5E4] p-4 shadow-warm-card flex flex-wrap items-center gap-3">
        {canEdit('inventory') && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto h-9 px-3.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold cursor-pointer"
          >
            + Record purchase
          </button>
        )}
      </div>

      {list.loading ? (
        <LoadingBlock />
      ) : list.error ? (
        <ErrorBlock message={list.error} onRetry={list.refetch} />
      ) : list.items.length === 0 ? (
        <EmptyBlock title="No purchases recorded yet." hint="Record one to add stock through the ledger." icon="shopping_cart" />
      ) : (
        <div className="rounded-[14px] bg-white shadow-warm-card border border-[#E7E5E4] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F1E9] text-[#57534E] font-headline text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">When</th>
                  <th className="px-4 py-3 font-bold">Reference</th>
                  <th className="px-4 py-3 font-bold">Supplier</th>
                  <th className="px-4 py-3 font-bold">Items</th>
                  <th className="px-4 py-3 font-bold text-right">Total</th>
                  <th className="px-4 py-3 font-bold">Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((p: PurchaseDto) => (
                  <tr key={p.id} className="border-t border-[#E7E5E4] hover:bg-[#FDF8F3]">
                    <td className="px-4 py-3 text-[#57534E] whitespace-nowrap">{day(new Date(p.purchasedAt))}</td>
                    <td className="px-4 py-3 font-mono text-[#1C1917]">{p.reference ?? '—'}</td>
                    <td className="px-4 py-3 text-[#57534E]">{p.supplier?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#57534E]">{p.lines.map((l) => `${l.quantity} × ${l.item.name}`).join(', ')}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#1C1917]">{formatKes(p.total)}</td>
                    <td className="px-4 py-3 text-[#57534E]">{p.recordedBy?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <PurchaseDialog onClose={close} dialog={dialog} onSaved={() => { list.refetch(); onChanged(); }} />}
    </div>
  );
};

// -------------------------------------------------------------------------------------------
// Issues
// -------------------------------------------------------------------------------------------

const IssuesPanel: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const list = useInventoryIssues();
  const { canEdit } = usePermissions();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const dialog = useDialog(close, 'Issue stock');

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-[14px] border border-[#E7E5E4] p-4 shadow-warm-card flex flex-wrap items-center gap-3">
        {canEdit('inventory') && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto h-9 px-3.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold cursor-pointer"
          >
            + Issue stock
          </button>
        )}
      </div>

      {list.loading ? (
        <LoadingBlock />
      ) : list.error ? (
        <ErrorBlock message={list.error} onRetry={list.refetch} />
      ) : list.items.length === 0 ? (
        <EmptyBlock
          title="Nothing issued yet."
          hint="Issue consumables or equipment to a person and a ministry — the ledger records the outflow."
          icon="assignment_turned_in"
        />
      ) : (
        <div className="rounded-[14px] bg-white shadow-warm-card border border-[#E7E5E4] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F1E9] text-[#57534E] font-headline text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">When</th>
                  <th className="px-4 py-3 font-bold">Item · qty</th>
                  <th className="px-4 py-3 font-bold">To</th>
                  <th className="px-4 py-3 font-bold">Ministry</th>
                  <th className="px-4 py-3 font-bold">Reason</th>
                  <th className="px-4 py-3 font-bold">Authorized by</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((issue: IssueDto) => (
                  <tr key={issue.id} className="border-t border-[#E7E5E4] hover:bg-[#FDF8F3]">
                    <td className="px-4 py-3 text-[#57534E] whitespace-nowrap">{day(new Date(issue.issuedAt))}</td>
                    <td className="px-4 py-3">
                      <div className="font-headline font-bold text-[#1C1917]">{issue.item?.name ?? ''} · {issue.quantity}</div>
                      <div className="font-mono text-[11px] text-[#57534E]">{issue.item?.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-[#1C1917] font-semibold">{issue.issuedToName}</td>
                    <td className="px-4 py-3 text-[#57534E]">{issue.ministry?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[#57534E]">{issue.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-[#57534E]">{issue.authorizedBy?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <IssueDialog onClose={close} dialog={dialog} onSaved={() => { list.refetch(); onChanged(); }} />}
    </div>
  );
};

// -------------------------------------------------------------------------------------------
// Transfers
// -------------------------------------------------------------------------------------------

const TransfersPanel: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const list = useInventoryTransfers();
  const { canEdit } = usePermissions();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const dialog = useDialog(close, 'Transfer stock');

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-[14px] border border-[#E7E5E4] p-4 shadow-warm-card flex flex-wrap items-center gap-3">
        {canEdit('inventory') && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto h-9 px-3.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold cursor-pointer"
          >
            + Transfer stock
          </button>
        )}
      </div>

      {list.loading ? (
        <LoadingBlock />
      ) : list.error ? (
        <ErrorBlock message={list.error} onRetry={list.refetch} />
      ) : list.items.length === 0 ? (
        <EmptyBlock title="No transfers yet." hint="Move stock between rooms, departments or sites — the ledger keeps both sides." icon="move_up" />
      ) : (
        <div className="rounded-[14px] bg-white shadow-warm-card border border-[#E7E5E4] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F1E9] text-[#57534E] font-headline text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">When</th>
                  <th className="px-4 py-3 font-bold">Item · qty</th>
                  <th className="px-4 py-3 font-bold">From → To</th>
                  <th className="px-4 py-3 font-bold">Note</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((t: TransferDto) => (
                  <tr key={t.id} className="border-t border-[#E7E5E4] hover:bg-[#FDF8F3]">
                    <td className="px-4 py-3 text-[#57534E] whitespace-nowrap">{day(new Date(t.transferredAt))}</td>
                    <td className="px-4 py-3">
                      <div className="font-headline font-bold text-[#1C1917]">{t.item?.name ?? ''} · {t.quantity}</div>
                      <div className="font-mono text-[11px] text-[#57534E]">{t.item?.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-[#57534E]">{t.fromLocation} → {t.toLocation}</td>
                    <td className="px-4 py-3 text-[#57534E]">{t.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <TransferDialog onClose={close} dialog={dialog} onSaved={() => { list.refetch(); onChanged(); }} />}
    </div>
  );
};

// -------------------------------------------------------------------------------------------
// Dialogs
// -------------------------------------------------------------------------------------------

const fieldClass =
  'w-full px-3 py-2 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15';
const labelClass = 'block font-headline text-xs font-bold text-[#1e1b19] mb-1.5';

interface ActDialogProps {
  onClose: () => void;
  dialog: ReturnType<typeof useDialog>;
  onSaved: () => void;
}

const PurchaseDialog: React.FC<ActDialogProps> = ({ onClose, dialog, onSaved }) => {
  const list = useInventoryItems({ pageSize: 200 });
  const suppliers = useSuppliers();
  const save = useMutation((body: Parameters<typeof inventoryApi.recordPurchase>[0]) => inventoryApi.recordPurchase(body));
  const [supplierId, setSupplierId] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<Array<{ itemId: string; quantity: string; unitCost: string }>>([
    { itemId: '', quantity: '1', unitCost: '' },
  ]);

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      ...(supplierId ? { supplierId } : {}),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
      lines: lines
        .filter((l) => l.itemId && Number(l.quantity) > 0)
        .map((l) => ({ itemId: l.itemId, quantity: Math.floor(Number(l.quantity)), ...(l.unitCost ? { unitCost: Number(l.unitCost) } : {}) })),
    };
    try {
      await save.run(payload);
    } catch {
      return; // the error block inside the dialog already reports it
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/45" {...dialog}>
      <form onSubmit={submit} className="w-full max-w-[560px] bg-white rounded-[14px] shadow-warm-card border border-[#E7E5E4] p-6 space-y-4">
        <h3 className="font-headline text-base font-bold text-[#1e1b19]">Record a purchase</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="p-supplier" className={labelClass}>Supplier</label>
            <select id="p-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={fieldClass}>
              <option value="">— none —</option>
              {suppliers.items.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="p-ref" className={labelClass}>Reference</label>
            <input id="p-ref" value={reference} onChange={(e) => setReference(e.target.value)} className={fieldClass} />
          </div>
        </div>

        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_80px_110px] gap-2">
              <select
                aria-label={`Item ${idx + 1}`}
                value={line.itemId}
                onChange={(e) => setLines(lines.map((l, i) => (i === idx ? { ...l, itemId: e.target.value } : l)))}
                className={fieldClass}
              >
                <option value="">Choose item…</option>
                {list.items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                ))}
              </select>
              <input
                aria-label={`Quantity ${idx + 1}`}
                type="number"
                min="1"
                value={line.quantity}
                onChange={(e) => setLines(lines.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)))}
                className={fieldClass}
              />
              <input
                aria-label={`Unit cost ${idx + 1}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="Unit cost"
                value={line.unitCost}
                onChange={(e) => setLines(lines.map((l, i) => (i === idx ? { ...l, unitCost: e.target.value } : l)))}
                className={fieldClass}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLines([...lines, { itemId: '', quantity: '1', unitCost: '' }])}
            className="text-xs font-bold text-[#C2410C] cursor-pointer"
          >
            + another line
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#E7E5E4]">
          <span className="font-headline text-sm font-bold text-[#1C1917]">Total: {formatKes(total)}</span>
        </div>

        {save.error && <ErrorBlock message={save.error} />}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Cancel</button>
          <button
            type="submit"
            disabled={save.pending || lines.every((l) => !l.itemId)}
            className="px-3.5 py-1.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {save.pending ? 'Saving…' : 'Record purchase'}
          </button>
        </div>
      </form>
    </div>
  );
};

const IssueDialog: React.FC<ActDialogProps> = ({ onClose, dialog, onSaved }) => {
  const items = useInventoryItems({ pageSize: 200 });
  const ministries = useMinistries();
  const users = useUsers();
  const save = useMutation((body: Parameters<typeof inventoryApi.recordIssue>[0]) => inventoryApi.recordIssue(body));
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [issuedToName, setIssuedToName] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [reason, setReason] = useState('');
  const [authorizedById, setAuthorizedById] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save.run({
        itemId,
        quantity: Math.floor(Number(quantity)),
        issuedToName: issuedToName.trim(),
        ...(ministryId ? { ministryId } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...(authorizedById ? { authorizedById } : {}),
      });
    } catch {
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/45" {...dialog}>
      <form onSubmit={submit} className="w-full max-w-[480px] bg-white rounded-[14px] shadow-warm-card border border-[#E7E5E4] p-6 space-y-4">
        <h3 className="font-headline text-base font-bold text-[#1e1b19]">Issue stock</h3>
        <div>
          <label htmlFor="i-item" className={labelClass}>Item *</label>
          <select id="i-item" required value={itemId} onChange={(e) => setItemId(e.target.value)} className={fieldClass}>
            <option value="">Choose item…</option>
            {items.items.map((i) => (
              <option key={i.id} value={i.id}>{i.name} (on hand {i.quantity} {i.unit})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="i-qty" className={labelClass}>Quantity *</label>
            <input id="i-qty" type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="i-who" className={labelClass}>Issued to *</label>
            <input id="i-who" required value={issuedToName} onChange={(e) => setIssuedToName(e.target.value)} className={fieldClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="i-ministry" className={labelClass}>Ministry</label>
            <select id="i-ministry" value={ministryId} onChange={(e) => setMinistryId(e.target.value)} className={fieldClass}>
              <option value="">— none —</option>
              {ministries.items.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="i-auth" className={labelClass}>Authorized by</label>
            <select id="i-auth" value={authorizedById} onChange={(e) => setAuthorizedById(e.target.value)} className={fieldClass}>
              <option value="">— none —</option>
              {users.items.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="i-reason" className={labelClass}>Reason</label>
          <input id="i-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={fieldClass} />
        </div>

        {save.error && <ErrorBlock message={save.error} />}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Cancel</button>
          <button
            type="submit"
            disabled={save.pending || !itemId || !issuedToName.trim()}
            className="px-3.5 py-1.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {save.pending ? 'Saving…' : 'Issue stock'}
          </button>
        </div>
      </form>
    </div>
  );
};

const TransferDialog: React.FC<ActDialogProps> = ({ onClose, dialog, onSaved }) => {
  const items = useInventoryItems({ pageSize: 200 });
  const save = useMutation((body: Parameters<typeof inventoryApi.recordTransfer>[0]) => inventoryApi.recordTransfer(body));
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [toLocation, setToLocation] = useState('');
  const [note, setNote] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save.run({
        itemId,
        quantity: Math.floor(Number(quantity)),
        toLocation: toLocation.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
    } catch {
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/45" {...dialog}>
      <form onSubmit={submit} className="w-full max-w-[480px] bg-white rounded-[14px] shadow-warm-card border border-[#E7E5E4] p-6 space-y-4">
        <h3 className="font-headline text-base font-bold text-[#1e1b19]">Transfer stock</h3>
        <div>
          <label htmlFor="t-item" className={labelClass}>Item *</label>
          <select id="t-item" required value={itemId} onChange={(e) => setItemId(e.target.value)} className={fieldClass}>
            <option value="">Choose item…</option>
            {items.items.map((i) => (
              <option key={i.id} value={i.id}>{i.name} (on hand {i.quantity} · at {i.location})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="t-qty" className={labelClass}>Quantity *</label>
            <input id="t-qty" type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="t-loc" className={labelClass}>To location *</label>
            <input id="t-loc" required value={toLocation} onChange={(e) => setToLocation(e.target.value)} className={fieldClass} />
          </div>
        </div>
        <div>
          <label htmlFor="t-note" className={labelClass}>Note</label>
          <input id="t-note" value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
          <p className="text-[11px] text-[#57534E] mt-1">The ledger records the move out of the item's current location and into the new one.</p>
        </div>

        {save.error && <ErrorBlock message={save.error} />}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Cancel</button>
          <button
            type="submit"
            disabled={save.pending || !itemId || !toLocation.trim()}
            className="px-3.5 py-1.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {save.pending ? 'Saving…' : 'Record transfer'}
          </button>
        </div>
      </form>
    </div>
  );
};

const ItemDialog: React.FC<ActDialogProps & { item: InventoryItemDto }> = ({ item, onClose, dialog }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/45" {...dialog}>
    <div className="w-full max-w-[520px] bg-white rounded-[14px] shadow-warm-card border border-[#E7E5E4] p-6 space-y-3">
      <h3 className="font-headline text-base font-bold text-[#1e1b19]">{item.name}</h3>
      <p className="font-mono text-xs text-[#57534E]">{item.sku} · {item.category} · {item.kind}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-[9px] bg-[#F8F1E9] p-3">
          <div className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">On hand</div>
          <div className="font-headline text-xl font-extrabold text-[#1C1917]">{item.quantity} {item.unit}</div>
        </div>
        <div className="rounded-[9px] bg-[#F8F1E9] p-3">
          <div className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">Location</div>
          <div className="font-headline text-sm font-bold text-[#1C1917]">{item.location}</div>
        </div>
      </div>
      <p className="text-xs text-[#57534E]">{item.notes ?? 'No notes.'}</p>
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Close</button>
      </div>
    </div>
  </div>
);

const StartTakeDialog: React.FC<ActDialogProps> = ({ onClose, dialog, onSaved }) => {
  const items = useInventoryItems({ pageSize: 200 });
  const save = useMutation((body: { itemId: string; note?: string }) => inventoryApi.startStockTake(body));
  const [itemId, setItemId] = useState('');
  const [note, setNote] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save.run({ itemId, ...(note.trim() ? { note: note.trim() } : {}) });
    } catch {
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/45" {...dialog}>
      <form onSubmit={submit} className="w-full max-w-[440px] bg-white rounded-[14px] shadow-warm-card border border-[#E7E5E4] p-6 space-y-4">
        <h3 className="font-headline text-base font-bold text-[#1e1b19]">Start a stock take</h3>
        <div>
          <label htmlFor="s-item" className={labelClass}>Item *</label>
          <select id="s-item" required value={itemId} onChange={(e) => setItemId(e.target.value)} className={fieldClass}>
            <option value="">Choose item…</option>
            {items.items.map((i) => (
              <option key={i.id} value={i.id}>{i.name} (book {i.quantity} {i.unit})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="s-note" className={labelClass}>Note</label>
          <input id="s-note" value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
        </div>
        <p className="text-[11px] text-[#57534E]">
          Starting a take freezes nothing — it opens a count against the current book figure. Stock moves only when an administrator approves the variance.
        </p>

        {save.error && <ErrorBlock message={save.error} />}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Cancel</button>
          <button
            type="submit"
            disabled={save.pending || !itemId}
            className="px-3.5 py-1.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {save.pending ? 'Saving…' : 'Start take'}
          </button>
        </div>
      </form>
    </div>
  );
};

const AddItemDialog: React.FC<ActDialogProps> = ({ onClose, dialog, onSaved }) => {
  const suppliers = useSuppliers();
  const save = useMutation((body: Parameters<typeof inventoryApi.addItem>[0]) => inventoryApi.addItem(body));
  const [form, setForm] = useState({
    sku: '',
    name: '',
    kind: 'consumable' as InventoryKind,
    category: '',
    unit: 'pcs',
    location: '',
    reorderAt: '',
    cost: '',
    openingQuantity: '0',
    supplierId: '',
    notes: '',
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save.run({
        sku: form.sku.trim(),
        name: form.name.trim(),
        kind: form.kind,
        category: form.category.trim(),
        unit: form.unit.trim() || 'pcs',
        location: form.location.trim(),
        ...(form.reorderAt ? { reorderAt: Number(form.reorderAt) } : {}),
        ...(form.cost ? { cost: Number(form.cost) } : {}),
        openingQuantity: Math.max(0, Math.floor(Number(form.openingQuantity) || 0)),
        ...(form.supplierId ? { supplierId: form.supplierId } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      });
    } catch {
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/45" {...dialog}>
      <form onSubmit={submit} className="w-full max-w-[560px] bg-white rounded-[14px] shadow-warm-card border border-[#E7E5E4] p-6 space-y-4">
        <h3 className="font-headline text-base font-bold text-[#1e1b19]">Add an item</h3>
        <p className="text-[11px] text-[#57534E]">
          Opening stock is recorded as a PURCHASE movement on the ledger, so the count starts out explained.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="a-sku" className={labelClass}>SKU / asset no. *</label>
            <input id="a-sku" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="a-kind" className={labelClass}>Kind *</label>
            <select id="a-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as InventoryKind })} className={fieldClass}>
              <option value="consumable">Consumable</option>
              <option value="asset">Asset</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="a-name" className={labelClass}>Name *</label>
            <input id="a-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="a-category" className={labelClass}>Category *</label>
            <input id="a-category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={fieldClass} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="a-unit" className={labelClass}>Unit</label>
            <input id="a-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="a-qty" className={labelClass}>Opening qty</label>
            <input id="a-qty" type="number" min="0" value={form.openingQuantity} onChange={(e) => setForm({ ...form, openingQuantity: e.target.value })} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="a-reorder" className={labelClass}>Reorder at</label>
            <input id="a-reorder" type="number" min="0" value={form.reorderAt} onChange={(e) => setForm({ ...form, reorderAt: e.target.value })} className={fieldClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="a-location" className={labelClass}>Location *</label>
            <input id="a-location" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="a-cost" className={labelClass}>Unit cost (KES)</label>
            <input id="a-cost" type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className={fieldClass} />
          </div>
        </div>
        <div>
          <label htmlFor="a-supplier" className={labelClass}>Supplier</label>
          <select id="a-supplier" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className={fieldClass}>
            <option value="">— none —</option>
            {suppliers.items.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="a-notes" className={labelClass}>Notes</label>
          <input id="a-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={fieldClass} />
        </div>

        {save.error && <ErrorBlock message={save.error} />}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Cancel</button>
          <button
            type="submit"
            disabled={save.pending}
            className="px-3.5 py-1.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {save.pending ? 'Saving…' : 'Add item'}
          </button>
        </div>
      </form>
    </div>
  );
};

const CountDialog: React.FC<{ take: StockTakeDto; onClose: () => void; dialog: ReturnType<typeof useDialog>; onSaved: () => void }> = ({ take, onClose, dialog, onSaved }) => {
  const save = useMutation((body: { countedQuantity: number; note?: string }) => inventoryApi.recordCount(take.id, body));
  const [counted, setCounted] = useState(String(take.countedQuantity ?? ''));
  const [note, setNote] = useState('');
  const countedNumber = Number(counted);
  const variance = take.bookQuantity - countedNumber;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save.run({ countedQuantity: Math.max(0, Math.floor(countedNumber)), ...(note.trim() ? { note: note.trim() } : {}) });
    } catch {
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/45" {...dialog}>
      <form onSubmit={submit} className="w-full max-w-[440px] bg-white rounded-[14px] shadow-warm-card border border-[#E7E5E4] p-6 space-y-4">
        <h3 className="font-headline text-base font-bold text-[#1e1b19]">Record a count</h3>
        <p className="text-xs text-[#57534E]">
          {take.item ? `${take.item.name} (${take.item.sku})` : 'Item'} — book quantity {take.bookQuantity} {take.item?.unit ?? ''}.
        </p>
        <div>
          <label htmlFor="c-counted" className={labelClass}>Counted quantity *</label>
          <input
            id="c-counted"
            required
            type="number"
            min={0}
            step={1}
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            className={fieldClass}
          />
        </div>
        {counted !== '' && Number.isFinite(countedNumber) && (
          <p className={`text-xs font-semibold ${variance === 0 ? 'text-[#15803D]' : 'text-[#C2410C]'}`}>
            {variance === 0 ? 'Matches the book figure.' : `Variance: ${variance > 0 ? `−${variance}` : `+${Math.abs(variance)}`} vs book (an ${variance > 0 ? 'overage' : 'shortage'} needs approval to adjust).`}
          </p>
        )}
        <div>
          <label htmlFor="c-note" className={labelClass}>Note</label>
          <input id="c-note" value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
        </div>
        {save.error && <ErrorBlock message={save.error} />}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Cancel</button>
          <button
            type="submit"
            disabled={save.pending || counted === '' || !Number.isFinite(countedNumber) || countedNumber < 0}
            className="px-3.5 py-1.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
          >
            {save.pending ? 'Saving…' : 'Save count'}
          </button>
        </div>
      </form>
    </div>
  );
};
