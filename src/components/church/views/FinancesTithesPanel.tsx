import React, { useState } from 'react';
import { useDialog } from '../dialog';
import { errorMessage, useMemberOptions, useMutation, useTithes } from '../../../hooks/useApi';
import { memberRefName, reportsApi, tithesApi, type PaymentMethod, type TitheDto } from '../../../lib/api';
import { usePermissions } from '../../../lib/permissions';
import { useGivingReceipt } from '../../../hooks/useGivingReceipt';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../DataState';
import { downloadBlob, exportCsv, type ExportColumn } from '../../../lib/export';
import { formatKes } from '../../../data/churchDomain';
import { day } from '../../../lib/period';
import {
  fieldClass,
  LedgerPager,
  methodLabel,
  PAYMENT_METHODS,
  ShareBars,
  VoidFinanceDialog,
  type GivingLedgerProps,
} from './GivingLedgerParts';

/**
 * Giving & Stewardship — the tithe ledger.
 *
 * Every figure on this screen is the server's. The band reads `/api/finance/summary` for the window
 * the tabbed view above owns, and the table reads `/api/finance/tithes` with the clerk's filters, so
 * the total at the top is the total *for the filter* rather than a sum of the fifty rows that happen
 * to be on the page. The screen this replaced carried a hand-written KPI band beside a chart drawn
 * from fixed coordinates, so a gift logged below moved nothing.
 *
 * Two things it deliberately does not offer: an in-place edit of a payment, and a delete. A wrongly
 * keyed gift is voided with a reason — the row stays and the chained ledger keeps the line — and the
 * corrected figure is recorded as a new transaction.
 */

const LEDGER_COLUMNS: ExportColumn<TitheDto>[] = [
  { label: 'Transaction', value: (t) => t.txCode },
  { label: 'Date', value: (t) => day(new Date(t.receivedAt)) },
  { label: 'Giver', value: (t) => t.donorName },
  { label: 'Member', value: (t) => memberRefName(t.member) || '' },
  { label: 'Envelope', value: (t) => t.envelopeNo ?? '' },
  { label: 'Designation', value: (t) => t.category },
  { label: 'Method', value: (t) => t.method },
  { label: 'Amount (KES)', value: (t) => t.amount },
  { label: 'Reference', value: (t) => t.reference ?? '' },
  { label: 'Recorded by', value: (t) => t.recordedBy?.name ?? '' },
];

interface FormState {
  memberId: string;
  donorName: string;
  envelopeNo: string;
  amount: string;
  method: PaymentMethod;
  category: string;
  reference: string;
  receivedAt: string;
}

const emptyForm = (category: string): FormState => ({
  memberId: '',
  donorName: '',
  envelopeNo: '',
  amount: '',
  method: 'cash',
  category,
  reference: '',
  receivedAt: day(new Date()),
});

export const FinancesTithesPanel: React.FC<GivingLedgerProps> = ({ window, periodLabel, summary, onChanged }) => {
  const { canEdit, canDelete } = usePermissions();
  const { printTithe } = useGivingReceipt();
  const memberOptions = useMemberOptions();

  const [q, setQ] = useState('');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [category, setCategory] = useState('');
  const [memberId, setMemberId] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sort, setSort] = useState<'recent' | 'oldest' | 'amount'>('recent');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const ledger = useTithes({
    q: q.trim() || undefined,
    method: method || undefined,
    category: category.trim() || undefined,
    memberId: memberId || undefined,
    minAmount: minAmount ? Number(minAmount) : undefined,
    maxAmount: maxAmount ? Number(maxAmount) : undefined,
    from: window.from,
    to: window.to,
    sort,
    page,
    pageSize,
  });

  const [exporting, setExporting] = useState(false);
  /** The whole filtered ledger, as the server composes it — not just the fifty rows on this page. */
  const handleExportAll = async () => {
    setExporting(true);
    setFailure(null);
    try {
      downloadBlob(
        'praxis-tithes.csv',
        await reportsApi.tithesCsv({
          q: q.trim() || undefined,
          method: method || undefined,
          category: category.trim() || undefined,
          memberId: memberId || undefined,
          minAmount: minAmount || undefined,
          maxAmount: maxAmount || undefined,
          from: window.from,
          to: window.to,
        }),
      );
    } catch (cause) {
      setFailure(errorMessage(cause));
    } finally {
      setExporting(false);
    }
  };

  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const recordDialog = useDialog(() => setIsRecordOpen(false), 'Record a Tithe');
  const [voidRow, setVoidRow] = useState<TitheDto | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm('Tithe'));

  const recordTithe = useMutation(tithesApi.create);
  const tithes = summary?.giving.tithes;
  const methods = summary?.tithesByMethod ?? [];
  const designations = summary?.tithesByCategory ?? [];
  const methodTotal = methods.reduce((sum, row) => sum + row.amount, 0);
  const average = tithes && tithes.count > 0 ? tithes.total / tithes.count : 0;
  const filtered = [q, method, category, memberId, minAmount, maxAmount].filter(Boolean).length > 0;

  /** Changing a filter restarts at page one: page seven of the old filter is a page of new results. */
  const onFilter =
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const handleRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const amount = Number(form.amount);
    if (!form.donorName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    try {
      await recordTithe.run({
        memberId: form.memberId || undefined,
        donorName: form.donorName.trim(),
        envelopeNo: form.envelopeNo.trim() || undefined,
        amount,
        method: form.method,
        category: form.category.trim() || undefined,
        reference: form.reference.trim() || undefined,
        receivedAt: form.receivedAt,
      });
      await ledger.refetch();
      onChanged();
      setIsRecordOpen(false);
      setNotice('Recorded. The transaction is in the ledger and in the Finance Audit screen.');
      setForm(emptyForm(form.category));
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };

  /**
   * The half of a correction that makes it a correction: the original has been voided, and the clerk is
   * handed the same figures to key in again rather than retyping them from memory.
   */
  const startCorrection = (voided: TitheDto) => {
    setForm({
      memberId: voided.memberId ?? '',
      donorName: voided.donorName,
      envelopeNo: voided.envelopeNo ?? '',
      amount: String(voided.amount),
      method: voided.method,
      category: voided.category,
      reference: voided.reference ?? '',
      receivedAt: day(new Date(voided.receivedAt)),
    });
    setVoidRow(null);
    setIsRecordOpen(true);
    setNotice(`${voided.txCode} was voided and stays in the ledger. Record the corrected figure now.`);
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {notice && (
        <div role="status" className="rounded-2xl border border-[#85f8c4]/60 bg-[#85f8c4]/20 px-4 py-3 text-xs font-semibold text-[#005137]">
          {notice}
        </div>
      )}

      {/* The church's tithe figures for the window the tabbed view above owns. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Tithes · {periodLabel}</span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#9b2f00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">volunteer_activism</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-[#1e1b19]">{formatKes(tithes?.total ?? 0)}</div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            {tithes?.count ?? 0} contribution{tithes?.count === 1 ? '' : 's'} recorded
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Average Gift</span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#904d00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">calculate</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-[#1e1b19]">
            {/* Rounded to the shilling: an average of 8,283.784 is arithmetic, not money. */}
            {tithes && tithes.count > 0 ? formatKes(Math.round(average)) : '—'}
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            The window's total divided by its gifts
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Largest Designation</span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#c2410c] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">sell</span>
            </span>
          </div>
          <div className="font-headline text-2xl font-bold text-[#1e1b19] truncate" title={designations[0]?.category}>
            {designations[0]?.category ?? '—'}
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            {designations[0]
              ? `${formatKes(designations[0].amount)} across ${designations[0].count} gift${designations[0].count === 1 ? '' : 's'}`
              : 'Nothing recorded in this window'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">How It Arrived</span>
            <span className="p-2 rounded-xl bg-[#85f8c4]/40 text-[#002114] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">payments</span>
            </span>
          </div>
          <div className="font-headline text-xl font-bold text-[#006243] leading-tight">
            {methods[0] ? methodLabel(methods[0].method) : '—'}
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            {methods[0] && methodTotal > 0
              ? `${Math.round((methods[0].amount / methodTotal) * 1000) / 10}% of the window's tithes`
              : 'Nothing recorded in this window'}
          </div>
        </div>
      </div>

      {/* Both breakdowns come from the ledger's own grouping, not from the rows on this page. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ShareBars
          title={`Tithes by payment method · ${periodLabel}`}
          rows={methods.map((row) => ({
            label: methodLabel(row.method),
            amount: row.amount,
            count: row.count,
            share: methodTotal > 0 ? (row.amount / methodTotal) * 100 : 0,
          }))}
        />
        <ShareBars
          title={`Tithes by designation · ${periodLabel}`}
          rows={designations.map((row) => ({
            label: row.category,
            amount: row.amount,
            count: row.count,
            share: tithes && tithes.total > 0 ? (row.amount / tithes.total) * 100 : 0,
          }))}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#EAE1D7] flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#faf2ee]/40">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#8d7168] text-[18px]">search</span>
              <input
                aria-label="Search tithes"
                value={q}
                onChange={(event) => onFilter(setQ)(event.target.value)}
                placeholder="Transaction, giver, envelope or reference"
                className={`${fieldClass} pl-9 w-64`}
              />
            </div>

            <select
              aria-label="Payment method"
              value={method}
              onChange={(event) => onFilter(setMethod)(event.target.value as PaymentMethod | '')}
              className={`${fieldClass} w-40 cursor-pointer`}
            >
              <option value="">Any method</option>
              {PAYMENT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              aria-label="Giver on the register"
              value={memberId}
              onChange={(event) => onFilter(setMemberId)(event.target.value)}
              className={`${fieldClass} w-48 cursor-pointer`}
            >
              <option value="">Any giver</option>
              {memberOptions.members.map((member) => (
                <option key={member.id} value={member.id}>{memberRefName(member)}</option>
              ))}
            </select>

            <input
              aria-label="Designation"
              list="tithe-designations"
              value={category}
              onChange={(event) => onFilter(setCategory)(event.target.value)}
              placeholder="Designation"
              className={`${fieldClass} w-40`}
            />
            <input
              aria-label="Minimum amount"
              type="number"
              min="0"
              value={minAmount}
              onChange={(event) => onFilter(setMinAmount)(event.target.value)}
              placeholder="Min KSh"
              className={`${fieldClass} w-24`}
            />
            <input
              aria-label="Maximum amount"
              type="number"
              min="0"
              value={maxAmount}
              onChange={(event) => onFilter(setMaxAmount)(event.target.value)}
              placeholder="Max KSh"
              className={`${fieldClass} w-24`}
            />

            <select
              aria-label="Order"
              value={sort}
              onChange={(event) => onFilter(setSort)(event.target.value as typeof sort)}
              className={`${fieldClass} w-36 cursor-pointer`}
            >
              <option value="recent">Most recent</option>
              <option value="oldest">Oldest first</option>
              <option value="amount">Largest gift</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-end xl:self-auto">
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setMethod('');
                  setCategory('');
                  setMemberId('');
                  setMinAmount('');
                  setMaxAmount('');
                  setPage(1);
                }}
                className="h-9 px-3 rounded-xl text-xs font-semibold text-[#59413a] hover:text-[#9b2f00] cursor-pointer"
              >
                Clear filters
              </button>
            )}
            <button
              type="button"
              onClick={() => exportCsv('praxis-tithes', LEDGER_COLUMNS, ledger.items)}
              className="h-9 px-3 rounded-xl bg-white border border-[#EAE1D7] text-xs font-semibold text-[#1e1b19] hover:bg-[#f4ece8] flex items-center gap-1.5 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Export this page</span>
            </button>
            <button
              type="button"
              onClick={() => void handleExportAll()}
              disabled={exporting}
              className="h-9 px-3 rounded-xl bg-white border border-[#EAE1D7] text-xs font-semibold text-[#1e1b19] hover:bg-[#f4ece8] disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">download</span>
              <span>{exporting ? 'Preparing…' : 'Export all (filtered)'}</span>
            </button>
            {canEdit('giving') && (
              <button
                type="button"
                onClick={() => {
                  setFailure(null);
                  setNotice(null);
                  setIsRecordOpen(true);
                }}
                className="h-9 px-3.5 rounded-xl bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_card</span>
                <span>Record Tithe</span>
              </button>
            )}
          </div>
        </div>

        {ledger.loading && ledger.items.length === 0 ? (
          <LoadingBlock label="Reading the tithe ledger…" />
        ) : ledger.error ? (
          <div className="p-4">
            <ErrorBlock message={ledger.error} onRetry={() => void ledger.refetch()} />
          </div>
        ) : ledger.items.length === 0 ? (
          <EmptyBlock
            icon="volunteer_activism"
            title={filtered ? 'No tithes match these filters' : `No tithes in ${periodLabel.toLowerCase()}`}
            hint={
              filtered
                ? 'Widen the window or clear a filter to see more.'
                : 'Record a gift and it appears here, in the totals above, and in the Finance Audit ledger.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#faf2ee] text-[#59413a] font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                  <th className="py-3 px-4">Transaction</th>
                  <th className="py-3 px-4">Giver</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Received</th>
                  <th className="py-3 px-4">Recorded by</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1D7] text-[#1e1b19]">
                {ledger.items.map((row) => (
                  <tr key={row.id} className="hover:bg-[#faf2ee]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#9b2f00]">{row.txCode}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#1e1b19]">{row.donorName}</span>
                        <span className="text-[10px] text-[#59413a]">
                          {[memberRefName(row.member) || 'Not on the register', row.envelopeNo].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#59413a]">{methodLabel(row.method)}</td>
                    <td className="py-3.5 px-4 text-[#59413a]">{row.category}</td>
                    <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">{formatKes(row.amount)}</td>
                    <td className="py-3.5 px-4 text-[#59413a] font-mono text-[11px]">
                      {new Date(row.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 text-[#59413a]">{row.recordedBy?.name ?? '—'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void printTithe(row)}
                          aria-label={`Receipt for ${row.txCode}`}
                          title="Print the giver's receipt"
                          className="p-1 rounded text-[#59413a] hover:text-[#9b2f00] hover:bg-[#f4ece8] transition-colors cursor-pointer"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">receipt_long</span>
                        </button>
                        {canDelete('giving') && (
                          <button
                            type="button"
                            onClick={() => {
                              setNotice(null);
                              setVoidRow(row);
                            }}
                            aria-label={`Void ${row.txCode}`}
                            title="Void and record a correction"
                            className="p-1 rounded text-[#59413a] hover:text-[#ba1a1a] hover:bg-[#f4ece8] transition-colors cursor-pointer"
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">block</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <LedgerPager
          page={ledger.meta?.page ?? page}
          pages={ledger.meta?.pages ?? 1}
          total={ledger.meta?.total ?? ledger.total}
          pageSize={pageSize}
          noun="tithes"
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      <datalist id="tithe-designations">
        {designations.map((row) => (
          <option key={row.category} value={row.category} />
        ))}
      </datalist>

      {isRecordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" {...recordDialog}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-[#EAE1D7] pb-3 gap-3">
              <div>
                <h3 className="font-headline text-base font-bold text-[#1e1b19]">Record a Tithe</h3>
                <p className="text-xs text-[#59413a] mt-0.5">
                  A transaction code is issued from the year's series; nothing here can overwrite an earlier gift.
                </p>
              </div>
              <button type="button" onClick={() => setIsRecordOpen(false)} className="text-[#59413a] hover:text-[#1e1b19] cursor-pointer" aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRecord} className="space-y-3 text-xs">
              <div>
                <label htmlFor="tithe-member" className="block font-semibold mb-1">Member on the register</label>
                <select
                  id="tithe-member"
                  value={form.memberId}
                  onChange={(event) => {
                    const member = memberOptions.members.find((row) => row.id === event.target.value);
                    setForm((prev) => ({
                      ...prev,
                      memberId: event.target.value,
                      // Picking a member files the gift against them and fills in what the register already
                      // knows, so the clerk does not retype a name the church can spell reliably.
                      donorName: member ? memberRefName(member) : prev.donorName,
                      envelopeNo: member?.envelopeNumber ?? prev.envelopeNo,
                    }));
                  }}
                  className={`${fieldClass} cursor-pointer`}
                >
                  <option value="">Not a member — a visitor or an unnamed gift</option>
                  {memberOptions.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {memberRefName(member)}
                      {member.envelopeNumber ? ` · ${member.envelopeNumber}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tithe-donor" className="block font-semibold mb-1">Giver *</label>
                  <input
                    id="tithe-donor"
                    required
                    minLength={2}
                    value={form.donorName}
                    onChange={(event) => setForm((prev) => ({ ...prev, donorName: event.target.value }))}
                    placeholder="e.g. Arthur Wanjala"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="tithe-envelope" className="block font-semibold mb-1">Envelope</label>
                  <input
                    id="tithe-envelope"
                    value={form.envelopeNo}
                    onChange={(event) => setForm((prev) => ({ ...prev, envelopeNo: event.target.value }))}
                    placeholder="e.g. ENV-1042"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="tithe-amount" className="block font-semibold mb-1">Amount (KSh) *</label>
                  <input
                    id="tithe-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                    placeholder="500.00"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="tithe-method" className="block font-semibold mb-1">Method</label>
                  <select
                    id="tithe-method"
                    value={form.method}
                    onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value as PaymentMethod }))}
                    className={`${fieldClass} cursor-pointer`}
                  >
                    {PAYMENT_METHODS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="tithe-date" className="block font-semibold mb-1">Received</label>
                  <input
                    id="tithe-date"
                    type="date"
                    value={form.receivedAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, receivedAt: event.target.value }))}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tithe-category" className="block font-semibold mb-1">Designation</label>
                  <input
                    id="tithe-category"
                    list="tithe-designations"
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="tithe-reference" className="block font-semibold mb-1">Reference</label>
                  <input
                    id="tithe-reference"
                    value={form.reference}
                    onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
                    placeholder="M-PESA code, cheque number"
                    className={fieldClass}
                  />
                </div>
              </div>

              {failure && (
                <div role="alert" className="rounded-xl border border-[#ffdad6] bg-[#ffdad6]/40 px-3 py-2 text-[11px] font-semibold text-[#ba1a1a]">
                  {failure}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE1D7]">
                <button type="button" onClick={() => setIsRecordOpen(false)} className="px-3.5 py-1.5 text-xs text-[#59413a] cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordTithe.pending}
                  className="px-4 py-2 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-70 cursor-pointer"
                >
                  {recordTithe.pending ? 'Recording…' : 'Record Tithe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <VoidFinanceDialog
        entity="tithe"
        record={voidRow ? { id: voidRow.id, label: `${voidRow.txCode} · ${voidRow.donorName}`, amount: voidRow.amount } : null}
        onClose={() => setVoidRow(null)}
        onVoided={() => {
          const voided = voidRow;
          void ledger.refetch();
          onChanged();
          if (voided) startCorrection(voided);
        }}
      />
    </div>
  );
};
