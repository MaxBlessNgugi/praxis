import React, { useMemo, useState } from 'react';
import {
  useInventoryIssues,
  useInventoryItems,
  useInventoryPurchases,
  useInventoryReport,
  useInventoryTransfers,
  useMaintenance,
  useMinistries,
  useMemberOptions,
  useMutation,
  errorMessage,
  useStockMovements,
  useStockTakes,
  useSuppliers,
  useUsers,
} from '../../../hooks/useApi';
import { formatKes } from '../../../data/churchDomain';
import {
  inventoryApi,
  type AssetCondition,
  type InventoryItemDto,
  type InventoryKind,
  type InventoryReportDto,
  type InventoryStatus,
  type IssueDto,
  type PurchaseDto,
  type StockMovementDto,
  type StockTakeDto,
  type TransferDto,
} from '../../../lib/api';
import { usePermissions } from '../../../lib/permissions';
import { day } from '../../../lib/period';
import { exportCsv, type ExportColumn } from '../../../lib/export';
import { Pager } from './council/CouncilControls';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../DataState';
import { FileUpload } from '../FileUpload';
import { useDialog } from '../dialog';
import { useFileUrl } from '../../../hooks/useFileUrl';

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

type SubTab = 'register' | 'ledger' | 'stock-takes' | 'purchases' | 'issues' | 'transfers' | 'maintenance';

const SUB_TABS: Array<{ id: SubTab; label: string; icon: string }> = [
  { id: 'register', label: 'Register', icon: 'inventory_2' },
  { id: 'ledger', label: 'Movements', icon: 'swap_vert' },
  { id: 'stock-takes', label: 'Stock takes', icon: 'fact_check' },
  { id: 'purchases', label: 'Purchases', icon: 'shopping_cart' },
  { id: 'issues', label: 'Issues', icon: 'assignment_turned_in' },
  { id: 'transfers', label: 'Transfers', icon: 'move_up' },
  { id: 'maintenance', label: 'Maintenance', icon: 'build' },
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
  { label: 'Serial number', value: (i) => i.serialNumber ?? '' },
  { label: 'Custodian', value: (i) => (i.custodian ? `${i.custodian.firstName} ${i.custodian.lastName}` : '') },
  { label: 'Purchased', value: (i) => (i.purchasedAt ? day(new Date(i.purchasedAt)) : '') },
  { label: 'Warranty until', value: (i) => (i.warrantyUntil ? day(new Date(i.warrantyUntil)) : '') },
  { label: 'Condition', value: (i) => i.condition ?? '' },
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
      {subTab === 'maintenance' && <MaintenancePanel onChanged={refresh} />}
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
    {
      label: 'Maintenance due',
      value: String(report.maintenanceDue.length),
      note: report.maintenanceDue.length > 0 ? `next: ${report.maintenanceDue[0].item.name}` : 'nothing on the bench',
      alert: report.maintenanceDue.length > 0,
    },
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

      <Breakdowns report={report} />
    </div>
  );
};

/** The register cut three ways — category, location, custodian — straight from the same report. */
const Breakdowns: React.FC<{ report: InventoryReportDto }> = ({ report }) => {
  const sections: Array<{ title: string; icon: string; rows: Array<{ label: string; value: string }> }> = [
    {
      title: 'By category',
      icon: 'category',
      rows: report.byCategory.slice(0, 6).map((row) => ({ label: row.category, value: `${row.lines} · ${formatKes(row.value)}` })),
    },
    {
      title: 'By location',
      icon: 'place',
      rows: report.byLocation.slice(0, 6).map((row) => ({ label: row.location, value: `${row.lines} · ${row.quantity} units` })),
    },
    {
      title: 'By custodian',
      icon: 'badge',
      rows: report.byCustodian.slice(0, 6).map((row) => ({ label: row.custodian, value: `${row.lines} held` })),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {sections.map((section) => (
        <div key={section.title} className="bg-white rounded-[14px] border border-[#E7E5E4] p-4 shadow-warm-card">
          <div className="flex items-center gap-2 mb-2.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#C2410C]">{section.icon}</span>
            <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">{section.title}</span>
          </div>
          {section.rows.length === 0 ? (
            <p className="text-[11px] text-[#57534E]">Nothing to break down yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {section.rows.map((row) => (
                <li key={row.label} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-semibold text-[#1C1917] truncate">{row.label}</span>
                  <span className="text-[#57534E] whitespace-nowrap">{row.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
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

      {detailTarget && (
        <ItemDialog
          key={detailTarget.id + String(list.items.find((i) => i.id === detailTarget.id)?.serialNumber ?? '') + String(list.items.find((i) => i.id === detailTarget.id)?.warrantyUntil ?? '')}
          item={list.items.find((i) => i.id === detailTarget.id) ?? detailTarget}
          onClose={closeDetail}
          dialog={detailDialog}
          onChanged={() => { list.refetch(); onChanged(); }}
        />
      )}
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
// Maintenance — the repair-bench history, one visit per row.
// -------------------------------------------------------------------------------------------

const MaintenancePanel: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const { canEdit } = usePermissions();
  const [dueOnly, setDueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const dialog = useDialog(close, 'Log maintenance');
  const list = useMaintenance({ due: dueOnly ? 'true' : undefined, page, pageSize: 25 });

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-[14px] border border-[#E7E5E4] p-4 shadow-warm-card flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-[#57534E] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(e) => { setDueOnly(e.target.checked); setPage(1); }}
            className="w-4 h-4 rounded border-[#D6D3D1] accent-[#C2410C] cursor-pointer"
          />
          Due for service only
        </label>
        {canEdit('inventory') && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto h-9 px-3.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold cursor-pointer"
          >
            + Log maintenance
          </button>
        )}
      </div>

      {list.loading ? (
        <LoadingBlock />
      ) : list.error ? (
        <ErrorBlock message={list.error} onRetry={list.refetch} />
      ) : list.items.length === 0 ? (
        <EmptyBlock
          title={dueOnly ? 'Nothing is due for service.' : 'No maintenance recorded yet.'}
          hint={dueOnly ? 'Every next-service date is still ahead.' : 'Log a repair visit against an asset to start its service history.'}
          icon="build"
        />
      ) : (
        <>
          <div className="rounded-[14px] bg-white shadow-warm-card border border-[#E7E5E4] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F1E9] text-[#57534E] font-headline text-[11px] uppercase tracking-wider">
                    <th className="px-4 py-3 font-bold">Serviced</th>
                    <th className="px-4 py-3 font-bold">Item</th>
                    <th className="px-4 py-3 font-bold">Provider</th>
                    <th className="px-4 py-3 font-bold text-right">Cost</th>
                    <th className="px-4 py-3 font-bold">Next due</th>
                    <th className="px-4 py-3 font-bold">Paperwork</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((record) => {
                    const overdue = record.nextDueAt != null && new Date(record.nextDueAt) < new Date();
                    return (
                      <tr key={record.id} className="border-t border-[#E7E5E4] hover:bg-[#FDF8F3]">
                        <td className="px-4 py-3 text-[#57534E] whitespace-nowrap">{day(new Date(record.servicedAt))}</td>
                        <td className="px-4 py-3">
                          <div className="font-headline font-bold text-[#1C1917]">{record.item.name}</div>
                          <div className="font-mono text-[11px] text-[#57534E]">{record.item.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-[#57534E]">{record.provider ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1C1917]">{record.cost != null ? formatKes(record.cost) : '—'}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${overdue ? 'font-bold text-[#ba1a1a]' : 'text-[#57534E]'}`}>
                          {record.nextDueAt ? day(new Date(record.nextDueAt)) : '—'}
                          {overdue && <span className="ml-1.5 text-[10px] font-bold uppercase">due</span>}
                        </td>
                        <td className="px-4 py-3 text-[#57534E]">
                          {record.file ? (
                            <MaintenanceFileLink fileId={record.file.id} fileName={record.file.fileName} />
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {list.meta && <Pager page={list.meta.page} pageSize={list.meta.pageSize} total={list.meta.total} noun="visits" onPage={setPage} />}
        </>
      )}

      {open && <MaintenanceDialog onClose={close} dialog={dialog} onSaved={() => { list.refetch(); onChanged(); }} />}
    </div>
  );
};

/** The visit's paperwork, fetched through the API client because a link cannot carry the bearer token. */
const MaintenanceFileLink: React.FC<{ fileId: string; fileName: string }> = ({ fileId, fileName }) => {
  const { url, loading, error } = useFileUrl(fileId);
  if (loading) return <span className="text-[11px] text-[#57534E]">Opening…</span>;
  if (error || !url) return <span className="text-[11px] text-[#B91C1C]">Could not open.</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#C2410C] underline underline-offset-2 hover:text-[#EA580C]">
      {fileName}
    </a>
  );
};

const MaintenanceDialog: React.FC<ActDialogProps> = ({ onClose, dialog, onSaved }) => {
  const items = useInventoryItems({ kind: 'asset', pageSize: 200 });
  const save = useMutation((body: Parameters<typeof inventoryApi.addMaintenance>[0]) => inventoryApi.addMaintenance(body));
  const [itemId, setItemId] = useState('');
  const [servicedAt, setServicedAt] = useState(new Date().toISOString().slice(0, 10));
  const [provider, setProvider] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');
  const [nextDueAt, setNextDueAt] = useState('');
  const [fileId, setFileId] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save.run({
        itemId,
        servicedAt: new Date(`${servicedAt}T09:00:00`).toISOString(),
        ...(provider.trim() ? { provider: provider.trim() } : {}),
        ...(cost ? { cost: Number(cost) } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(nextDueAt ? { nextDueAt: new Date(`${nextDueAt}T09:00:00`).toISOString() } : {}),
        ...(fileId ? { fileId } : {}),
      });
    } catch {
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/45" {...dialog}>
      <form onSubmit={submit} className="w-full max-w-[520px] bg-white rounded-[14px] shadow-warm-card border border-[#E7E5E4] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-headline text-base font-bold text-[#1e1b19]">Log maintenance</h3>
        <p className="text-[11px] text-[#57534E]">
          A visit is history, not stock: nothing on the shelf moves, and the record cannot be edited afterwards — a further visit supersedes it.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label htmlFor="m-item" className={labelClass}>Asset *</label>
            <select id="m-item" required value={itemId} onChange={(e) => setItemId(e.target.value)} className={fieldClass}>
              <option value="">Choose an asset…</option>
              {items.items.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="m-serviced" className={labelClass}>Serviced on *</label>
            <input id="m-serviced" type="date" required value={servicedAt} onChange={(e) => setServicedAt(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="m-next" className={labelClass}>Next service due</label>
            <input id="m-next" type="date" value={nextDueAt} onChange={(e) => setNextDueAt(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="m-provider" className={labelClass}>Provider</label>
            <input id="m-provider" value={provider} onChange={(e) => setProvider(e.target.value)} className={fieldClass} placeholder="Who did the work" />
          </div>
          <div>
            <label htmlFor="m-cost" className={labelClass}>Cost (KES)</label>
            <input id="m-cost" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={fieldClass} />
          </div>
        </div>
        <div>
          <label htmlFor="m-desc" className={labelClass}>What was done</label>
          <textarea id="m-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${fieldClass} h-auto`} />
        </div>
        <FileUpload
          purpose="document"
          label="Invoice or service report"
          hint="A scan or PDF of the paperwork for this visit."
          accept="application/pdf,image/png,image/jpeg"
          currentFileId={fileId}
          preview={false}
          onUploaded={(file) => setFileId(file.id)}
        />

        {save.error && <ErrorBlock message={save.error} />}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Cancel</button>
          <button type="submit" disabled={save.pending || !itemId} className="px-3.5 py-1.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white text-xs font-bold cursor-pointer">
            {save.pending ? 'Saving…' : 'Log visit'}
          </button>
        </div>
      </form>
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

/** The condition/status vocabularies, named once for the edit form. */
const CONDITION_OPTIONS: Array<{ value: AssetCondition; label: string }> = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const STATUS_OPTIONS: Array<{ value: Exclude<InventoryStatus, 'disposed'>; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'in_service', label: 'In service' },
  { value: 'maintenance', label: 'In maintenance' },
  { value: 'lost', label: 'Lost' },
  { value: 'damaged', label: 'Damaged' },
];

const ItemDialog: React.FC<ActDialogProps & { item: InventoryItemDto; onChanged: () => void }> = ({ item, onClose, dialog, onChanged }) => {
  const canEdit = usePermissions().canEdit('inventory');
  const canDelete = usePermissions().canDelete('inventory');
  const [editing, setEditing] = useState(false);

  // After a save the dialog closes along with the refetch: the parent re-renders it from the row it
  // just read, and the row's id stays the dialog's key, so the next Open is fresh data.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/45" {...dialog}>
      {editing ? (
        <EditItemForm item={item} onClose={onClose} onDone={() => { setEditing(false); onClose(); onChanged(); }} />
      ) : (
        <ItemDetail item={item} onClose={onClose} canEdit={canEdit} canDelete={canDelete} onEdit={() => setEditing(true)} onChanged={onChanged} />
      )}
    </div>
  );
};

const ItemDetail: React.FC<{
  item: InventoryItemDto;
  onClose: () => void;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onChanged: () => void;
}> = ({ item, onClose, canEdit, canDelete, onEdit, onChanged }) => {
  const [retiring, setRetiring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useDialog(onClose, 'Retire this item');

  const retire = async (reason: string, reasonLabel: string) => {
    setBusy(true);
    setError(null);
    try {
      await inventoryApi.retireItem(item.id, { reason, reasonLabel });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
      return;
    }
    setBusy(false);
    setRetiring(false);
    onClose();
    onChanged();
  };

  const isAsset = item.kind === 'asset';
  const custodianName = item.custodian ? `${item.custodian.firstName} ${item.custodian.lastName}` : null;
  const warrantyLive = item.warrantyUntil != null && new Date(item.warrantyUntil) >= new Date();

  return (
    <div className="w-full max-w-[560px] bg-white rounded-[14px] shadow-warm-card border border-[#E7E5E4] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-headline text-base font-bold text-[#1e1b19]">{item.name}</h3>
          <p className="font-mono text-xs text-[#57534E]">{item.sku} · {item.category} · {item.kind}</p>
        </div>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
          item.status === 'disposed' ? 'bg-[#E7E5E4] text-[#57534E]' : item.status === 'lost' || item.status === 'damaged' ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#F8F1E9] text-[#C2410C]'
        }`}>
          {item.status.replace('_', ' ')}
        </span>
      </div>

      {error && <ErrorBlock message={error} />}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-[9px] bg-[#F8F1E9] p-3">
          <div className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">{isAsset ? 'Held' : 'On hand'}</div>
          <div className="font-headline text-xl font-extrabold text-[#1C1917]">{item.quantity} {item.unit}</div>
        </div>
        <div className="rounded-[9px] bg-[#F8F1E9] p-3">
          <div className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">Location</div>
          <div className="font-headline text-sm font-bold text-[#1C1917]">{item.location}</div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {[
          ['Custodian', custodianName],
          ['Serial number', item.serialNumber],
          ['Purchased', item.purchasedAt ? day(new Date(item.purchasedAt)) : null],
          ['Cost', item.cost != null ? formatKes(item.cost) : null],
          ['Warranty', item.warrantyUntil ? `${day(new Date(item.warrantyUntil))}${warrantyLive ? ' (in warranty)' : ' (expired)'}` : null],
          ['Condition', item.condition],
          ['Last counted', item.lastCountedAt ? day(new Date(item.lastCountedAt)) : 'never'],
        ].map(([label, value]) =>
          value ? (
            <div key={label as string}>
              <dt className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">{label}</dt>
              <dd className="text-[#1C1917] font-semibold">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>

      <p className="text-xs text-[#57534E]">{item.notes ?? 'No notes.'}</p>

      {(canEdit || canDelete) && (
        <div className="flex justify-between gap-2 border-t border-[#E7E5E4] pt-3">
          {canDelete ? (
            <button
              type="button"
              onClick={() => setRetiring(true)}
              className="px-3 py-1.5 rounded-[9px] text-xs font-semibold text-[#B91C1C] hover:bg-[#ffdad6]/40 cursor-pointer"
            >
              Dispose of…
            </button>
          ) : (
            <span />
          )}
          {canEdit && (
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Close</button>
              <button type="button" onClick={onEdit} className="px-3.5 py-1.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold cursor-pointer">Edit</button>
            </div>
          )}
        </div>
      )}
      {(!canEdit && !canDelete) && (
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Close</button>
        </div>
      )}

      {retiring && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...dialog}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void retire(String(data.get('reason') ?? 'other'), String(data.get('reasonLabel') ?? ''));
            }}
            className="w-full max-w-[460px] rounded-[14px] border border-[#E7E5E4] bg-white p-6 shadow-warm-card"
          >
            <h4 className="font-headline text-base font-bold text-[#1C1917]">Dispose of {item.name}?</h4>
            <p className="mt-1.5 text-xs text-[#57534E]">
              Its remaining {item.quantity > 0 ? `${item.quantity} ${item.unit} leave` : 'ledger closes out'} by an explicit movement, and it goes to the Trash, where an administrator can put it back.
            </p>
            <label htmlFor="disp-reason" className="mt-4 block font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">Why is it leaving?</label>
            <select id="disp-reason" name="reason" className="mt-1 w-full h-9 px-2.5 rounded-[9px] bg-[#FDF8F3] border border-[#E7E5E4] text-xs font-semibold text-[#1C1917] cursor-pointer">
              <option value="wrong_entry">No longer serviceable</option>
              <option value="transferred">Given away / transferred out</option>
              <option value="duplicate">Sold or exchanged</option>
              <option value="other">Other</option>
            </select>
            <label htmlFor="disp-label" className="mt-3 block font-headline text-[11px] font-bold uppercase tracking-wider text-[#57534E]">Say more (required)</label>
            <input
              id="disp-label"
              name="reasonLabel"
              required
              minLength={3}
              maxLength={500}
              placeholder="e.g. Projector bulb blown beyond repair — approved by council"
              className="mt-1 w-full h-9 px-2.5 rounded-[9px] bg-[#FDF8F3] border border-[#E7E5E4] text-xs text-[#1C1917] focus:outline-none focus:border-[#C2410C]"
            />
            {error && <ErrorBlock message={error} />}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRetiring(false)} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Cancel</button>
              <button type="submit" disabled={busy} className="px-3.5 py-1.5 rounded-[9px] bg-[#B91C1C] hover:bg-[#dc2626] disabled:opacity-50 text-white text-xs font-bold cursor-pointer">
                {busy ? 'Disposing…' : 'Dispose of it'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const EditItemForm: React.FC<{ item: InventoryItemDto; onClose: () => void; onDone: () => void }> = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState({
    location: item.location,
    condition: (item.condition ?? '') as AssetCondition | '',
    status: (item.status === 'disposed' ? 'active' : item.status) as Exclude<InventoryStatus, 'disposed'>,
    serialNumber: item.serialNumber ?? '',
    warrantyUntil: item.warrantyUntil ? item.warrantyUntil.slice(0, 10) : '',
    purchasedAt: item.purchasedAt ? item.purchasedAt.slice(0, 10) : '',
    notes: item.notes ?? '',
  });
  const [fileId, setFileId] = useState<string | null>(item.fileId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await inventoryApi.updateItem(item.id, {
        ...(form.location !== item.location ? { location: form.location } : {}),
        ...(form.condition !== (item.condition ?? '') ? { condition: form.condition || null } : {}),
        ...(form.status !== item.status ? { status: form.status } : {}),
        ...(form.serialNumber !== (item.serialNumber ?? '') ? { serialNumber: form.serialNumber || null } : {}),
        ...(form.warrantyUntil !== (item.warrantyUntil?.slice(0, 10) ?? '') ? { warrantyUntil: form.warrantyUntil || null } : {}),
        ...(fileId !== (item.fileId ?? null) ? { fileId } : {}),
        ...(form.notes !== (item.notes ?? '') ? { notes: form.notes || null } : {}),
      });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
      return;
    }
    setBusy(false);
    onDone();
  };

  return (
    <form onSubmit={submit} className="w-full max-w-[520px] bg-white rounded-[14px] shadow-warm-card border border-[#E7E5E4] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
      <h3 className="font-headline text-base font-bold text-[#1e1b19]">Edit {item.name}</h3>
      <p className="text-[11px] text-[#57534E]">
        The name, SKU and shelf count are fixed here — the count moves through purchases, issues and counts, not by typing over it.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="e-location" className={labelClass}>Location</label>
          <input id="e-location" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="e-status" className={labelClass}>Status</label>
          <select id="e-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Exclude<InventoryStatus, 'disposed'> })} className={fieldClass}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {item.kind === 'asset' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="e-condition" className={labelClass}>Condition</label>
            <select id="e-condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as AssetCondition | '' })} className={fieldClass}>
              <option value="">— not set —</option>
              {CONDITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="e-serial" className={labelClass}>Serial number</label>
            <input id="e-serial" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className={fieldClass} />
          </div>
        </div>
      )}

      {item.kind === 'asset' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="e-purchased" className={labelClass}>Purchased on</label>
            <input id="e-purchased" type="date" value={form.purchasedAt} onChange={(e) => setForm({ ...form, purchasedAt: e.target.value })} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="e-warranty" className={labelClass}>Warranty until</label>
            <input id="e-warranty" type="date" value={form.warrantyUntil} onChange={(e) => setForm({ ...form, warrantyUntil: e.target.value })} className={fieldClass} />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="e-notes" className={labelClass}>Notes</label>
        <textarea id="e-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${fieldClass} h-auto`} />
      </div>

      <FileUpload
        purpose="document"
        label="Receipt, warranty or photo"
        hint="A scan, a PDF or a photograph of the casing. Replaces any file already attached."
        accept="application/pdf,image/png,image/jpeg"
        currentFileId={fileId}
        preview={false}
        onUploaded={(file) => setFileId(file.id)}
      />

      {error && <ErrorBlock message={error} />}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-[9px] text-xs font-semibold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer">Cancel</button>
        <button type="submit" disabled={busy} className="px-3.5 py-1.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-50 text-white text-xs font-bold cursor-pointer">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

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
  const members = useMemberOptions();
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
    condition: '',
    purchasedAt: '',
    custodianId: '',
    serialNumber: '',
    warrantyUntil: '',
    notes: '',
  });
  const [fileId, setFileId] = useState<string | null>(null);

  const isAsset = form.kind === 'asset';

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
        ...(isAsset && form.condition ? { condition: form.condition as AssetCondition } : {}),
        ...(isAsset && form.purchasedAt ? { purchasedAt: form.purchasedAt } : {}),
        ...(isAsset && form.custodianId ? { custodianId: form.custodianId } : {}),
        ...(isAsset && form.serialNumber.trim() ? { serialNumber: form.serialNumber.trim() } : {}),
        ...(isAsset && form.warrantyUntil ? { warrantyUntil: form.warrantyUntil } : {}),
        ...(fileId ? { fileId } : {}),
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
        {isAsset && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="a-condition" className={labelClass}>Condition</label>
                <select id="a-condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className={fieldClass}>
                  <option value="">— not set —</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <div>
                <label htmlFor="a-purchased" className={labelClass}>Purchased on</label>
                <input id="a-purchased" type="date" value={form.purchasedAt} onChange={(e) => setForm({ ...form, purchasedAt: e.target.value })} className={fieldClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="a-serial" className={labelClass}>Serial number</label>
                <input id="a-serial" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="a-warranty" className={labelClass}>Warranty until</label>
                <input id="a-warranty" type="date" value={form.warrantyUntil} onChange={(e) => setForm({ ...form, warrantyUntil: e.target.value })} className={fieldClass} />
              </div>
            </div>
            <div>
              <label htmlFor="a-custodian" className={labelClass}>Custodian</label>
              <select id="a-custodian" value={form.custodianId} onChange={(e) => setForm({ ...form, custodianId: e.target.value })} className={fieldClass}>
                <option value="">— nobody holds this —</option>
                {members.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <FileUpload
          purpose="document"
          label="Receipt or photograph"
          hint="A scan of the receipt or a photo of the casing. Attached to the register line."
          accept="application/pdf,image/png,image/jpeg"
          currentFileId={fileId}
          preview={false}
          onUploaded={(file) => setFileId(file.id)}
        />
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
