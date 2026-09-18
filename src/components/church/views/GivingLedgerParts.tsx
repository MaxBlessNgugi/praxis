import React, { useState } from 'react';
import { useDialog } from '../dialog';
import { errorMessage, useMutation } from '../../../hooks/useApi';
import {
  financeApi,
  VOID_REASONS,
  type FinanceEntity,
  type FinanceSummaryDto,
  type PaymentMethod,
  type VoidReason,
} from '../../../lib/api';
import { usePermissions } from '../../../lib/permissions';
import { formatKes } from '../../../data/churchDomain';
import type { DateWindow } from '../../../lib/period';

/**
 * What the tithe ledger and the offering ledger share.
 *
 * The two screens are the same screen twice — one filtered by giver, one by gathering — so the
 * controls they would otherwise write out twice live here. What is *not* here is the window itself:
 * the period picker sits on the tabbed view above them, so both ledgers and the tab badges read the
 * same days.
 */

export interface GivingLedgerProps {
  window: DateWindow;
  /** The window in words — "This month" — for the captions above the figures. */
  periodLabel: string;
  /** The church's giving totals for that window, or null while they are still being read. */
  summary: FinanceSummaryDto | null;
  /** Re-read those totals after money has moved, so the band and the tab badge follow. */
  onChanged: () => void;
}

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-PESA / Online' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
];

export const methodLabel = (method: PaymentMethod): string =>
  PAYMENT_METHODS.find((option) => option.value === method)?.label ?? method;

/** The one input style both ledgers' toolbars and forms use. */
export const fieldClass =
  'w-full h-9 px-3 rounded-xl bg-white border border-[#EAE1D7] text-xs text-[#1e1b19] focus:outline-none focus:border-[#c2410c]';

interface LedgerPagerProps {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  /** What is being counted, so the sentence reads "137 tithes" rather than "137 records". */
  noun: string;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}

export const LedgerPager: React.FC<LedgerPagerProps> = ({ page, pages, total, pageSize, noun, onPage, onPageSize }) => (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#EAE1D7] text-xs text-[#59413a]">
    <div className="flex items-center gap-3">
      <span>
        Showing{' '}
        <strong className="text-[#1e1b19]">
          {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
        </strong>{' '}
        of <strong className="text-[#1e1b19]">{total}</strong> {noun}
      </span>
      <span className="text-[#8d7168]/40">•</span>
      <div className="flex items-center gap-1.5">
        {/* Named by the words beside it rather than by an aria-label: a label wrapping a select would
            take the options into its own accessible name, which WCAG 2.5.3 then reads as a mismatch. */}
        <span id={`ledger-page-size-${noun}`}>Per page</span>
        <select
          aria-labelledby={`ledger-page-size-${noun}`}
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value))}
          className="h-7 px-1.5 rounded-lg bg-white border border-[#EAE1D7] font-bold text-[#1e1b19] cursor-pointer"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>

    <div className="inline-flex items-center gap-1 font-headline">
      <button
        type="button"
        disabled={page <= 1}
        aria-label="Previous page"
        onClick={() => onPage(page - 1)}
        className="w-8 h-8 rounded-lg bg-white border border-[#EAE1D7] text-[#59413a] flex items-center justify-center shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_left</span>
      </button>
      <span className="px-2 text-[#59413a] font-bold">
        Page {page} of {Math.max(pages, 1)}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        aria-label="Next page"
        onClick={() => onPage(page + 1)}
        className="w-8 h-8 rounded-lg bg-white border border-[#EAE1D7] text-[#1e1b19] flex items-center justify-center shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>
    </div>
  </div>
);

export interface ShareRow {
  label: string;
  amount: number;
  count: number;
  /** This row's share of the section's own total, already worked out by the caller. */
  share: number;
}

/** Where a window's money came from, broken down and ranked — drawn from the server's own grouping. */
export const ShareBars: React.FC<{ title: string; rows: ShareRow[]; empty?: string }> = ({ title, rows, empty }) => (
  <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7] space-y-3">
    <h3 className="font-headline text-sm font-bold text-[#1e1b19]">{title}</h3>
    {rows.length === 0 ? (
      <p className="text-xs text-[#59413a]">{empty ?? 'Nothing falls in this window.'}</p>
    ) : (
      rows.slice(0, 5).map((row) => (
        <div key={row.label} className="space-y-1.5">
          <div className="flex justify-between text-xs gap-2">
            <span className="font-semibold text-[#1e1b19] truncate">{row.label}</span>
            <span className="font-mono text-[#59413a] font-bold shrink-0">
              {formatKes(row.amount)} ({Math.round(row.share * 10) / 10}%)
            </span>
          </div>
          <div className="w-full bg-[#EAE1D7] h-2 rounded-full overflow-hidden">
            <div className="bg-[#9b2f00] h-full" style={{ width: `${Math.min(row.share, 100)}%` }} />
          </div>
        </div>
      ))
    )}
  </div>
);

export interface VoidableRecord {
  id: string;
  /** How the dialog names what is about to come off: the transaction code and the giver. */
  label: string;
  amount: number;
}

interface VoidFinanceDialogProps {
  entity: FinanceEntity;
  /** Null closes the dialog. */
  record: VoidableRecord | null;
  onClose: () => void;
  /** Called after the API confirms the void, so the caller can refetch and offer the correction. */
  onVoided: () => void;
}

/**
 * Taking money off the books, with a reason that is kept.
 *
 * There is no "edit" on a payment anywhere in this console, and this is why: the API has none either,
 * because overwriting one erases the only evidence that the first figure ever existed. A wrongly
 * keyed gift is voided here — the row stays, the reason stays with a name against it, and the chained
 * ledger gets a line — and the corrected figure is recorded as a new transaction. Original,
 * correction, audit entry.
 */
export const VoidFinanceDialog: React.FC<VoidFinanceDialogProps> = ({ entity, record, onClose, onVoided }) => {
  const { canDelete } = usePermissions();
  const [reason, setReason] = useState<VoidReason>('wrong_amount');
  const [reasonLabel, setReasonLabel] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const voidRecord = useMutation(financeApi.void);
  const dialog = useDialog(onClose, `Void ${record?.label ?? 'a transaction'}`);

  if (!record) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    try {
      await voidRecord.run(entity, record.id, { reason, reasonLabel: reasonLabel.trim() });
      setReasonLabel('');
      onVoided();
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" {...dialog}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
        <div className="flex items-start justify-between border-b border-[#EAE1D7] pb-3 gap-3">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">Void {record.label}</h3>
            <p className="text-xs text-[#59413a] mt-0.5">
              {formatKes(record.amount)} comes off the live ledger. Nothing is deleted.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[#59413a] hover:text-[#1e1b19] cursor-pointer" aria-label="Close">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 text-xs">
          <div>
            <label htmlFor="void-reason" className="block font-semibold mb-1">Why it is coming off</label>
            <select
              id="void-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value as VoidReason)}
              className={`${fieldClass} bg-[#faf2ee] cursor-pointer`}
            >
              {VOID_REASONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="void-note" className="block font-semibold mb-1">What happened *</label>
            <textarea
              id="void-note"
              required
              minLength={3}
              rows={2}
              value={reasonLabel}
              onChange={(event) => setReasonLabel(event.target.value)}
              placeholder="e.g. Keyed twice from the same M-PESA confirmation"
              className="w-full px-3 py-2 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-xs"
            />
          </div>

          <p className="text-[11px] text-[#59413a] leading-relaxed">
            The original stays in the ledger with this reason against your name, and the Finance Audit
            screen keeps the line. The corrected figure is recorded as a new transaction — the pair is
            what makes the correction auditable. A void can be reversed from the Trash.
          </p>

          {failure && (
            <div role="alert" className="rounded-xl border border-[#ffdad6] bg-[#ffdad6]/40 px-3 py-2 text-[11px] font-semibold text-[#ba1a1a]">
              {failure}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE1D7]">
            <button type="button" onClick={onClose} className="px-3.5 py-1.5 text-xs text-[#59413a] cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={voidRecord.pending || reasonLabel.trim().length < 3 || !canDelete('giving')}
              className="px-4 py-2 bg-[#ba1a1a] hover:bg-[#8f1414] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {voidRecord.pending ? 'Voiding…' : 'Void & record a correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
