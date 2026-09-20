import React, { useState } from 'react';
import { useDialog } from '../dialog';
import { errorMessage, useMutation, useOfferings, useServices } from '../../../hooks/useApi';
import { offeringsApi, reportsApi, type OfferingDto, type PaymentMethod } from '../../../lib/api';
import { usePermissions } from '../../../lib/permissions';
import { useGivingReceipt } from '../../../hooks/useGivingReceipt';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../DataState';
import { formatKes } from '../../../data/churchDomain';
import { downloadBlob, exportCsv } from '../../../lib/export';
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
 * Offerings — the plate, counted and filed against the gathering it was taken at.
 *
 * An offering is not a tithe: nobody's name is on it, so the record is the service, the designation
 * and how the money arrived. It carries the same integrity rules as every other payment in the
 * console — the total is the server's, a mistake is voided with a reason rather than edited, and a
 * receipt is printed from the transaction rather than from a counter kept on this screen.
 */

const TALLY_COLUMNS = [
  { label: 'Transaction', value: (row: OfferingDto) => row.txCode },
  { label: 'Date', value: (row: OfferingDto) => day(new Date(row.receivedAt)) },
  { label: 'Gathering', value: (row: OfferingDto) => row.service?.title ?? '' },
  { label: 'Designation', value: (row: OfferingDto) => row.category },
  { label: 'Method', value: (row: OfferingDto) => row.method },
  { label: 'Amount (KES)', value: (row: OfferingDto) => row.amount },
  { label: 'Reference', value: (row: OfferingDto) => row.reference ?? '' },
  { label: 'Notes', value: (row: OfferingDto) => row.notes ?? '' },
  { label: 'Recorded by', value: (row: OfferingDto) => row.recordedBy?.name ?? '' },
];

interface FormState {
  serviceId: string;
  amount: string;
  method: PaymentMethod;
  category: string;
  reference: string;
  notes: string;
  receivedAt: string;
}

const emptyForm = (category: string): FormState => ({
  serviceId: '',
  amount: '',
  method: 'cash',
  category,
  reference: '',
  notes: '',
  receivedAt: day(new Date()),
});

export const FinancesOfferingsPanel: React.FC<GivingLedgerProps> = ({ window, periodLabel, summary, onChanged }) => {
  const { canEdit, canDelete } = usePermissions();
  const { printOffering } = useGivingReceipt();
  const services = useServices({ sort: 'recent', pageSize: 50 });

  const [q, setQ] = useState('');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [serviceId, setServiceId] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sort, setSort] = useState<'recent' | 'oldest' | 'amount'>('recent');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const ledger = useOfferings({
    q: q.trim() || undefined,
    method: method || undefined,
    serviceId: serviceId || undefined,
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
        'praxis-offerings.csv',
        await reportsApi.offeringsCsv({
          q: q.trim() || undefined,
          method: method || undefined,
          serviceId: serviceId || undefined,
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
  const recordDialog = useDialog(() => setIsRecordOpen(false), 'Record an Offering');
  const [voidRow, setVoidRow] = useState<OfferingDto | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm('Sunday Offering'));

  const recordOffering = useMutation(offeringsApi.create);
  const offerings = summary?.giving.offerings;
  const methods = summary?.offeringsByMethod ?? [];
  const methodTotal = methods.reduce((sum, row) => sum + row.amount, 0);
  const givingTotal = summary?.giving.total ?? 0;
  const share = givingTotal > 0 && offerings ? (offerings.total / givingTotal) * 100 : 0;
  const filtered = [q, method, serviceId, minAmount, maxAmount].filter(Boolean).length > 0;

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
    if (!Number.isFinite(amount) || amount <= 0) return;
    try {
      await recordOffering.run({
        serviceId: form.serviceId || undefined,
        amount,
        method: form.method,
        category: form.category.trim() || undefined,
        reference: form.reference.trim() || undefined,
        notes: form.notes.trim() || undefined,
        receivedAt: form.receivedAt,
      });
      await ledger.refetch();
      onChanged();
      setIsRecordOpen(false);
      setNotice('Recorded. The collection is in the ledger and in the Finance Audit screen.');
      setForm(emptyForm(form.category));
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };

  const startCorrection = (voided: OfferingDto) => {
    setForm({
      serviceId: voided.serviceId ?? '',
      amount: String(voided.amount),
      method: voided.method,
      category: voided.category,
      reference: voided.reference ?? '',
      notes: voided.notes ?? '',
      receivedAt: day(new Date(voided.receivedAt)),
    });
    setVoidRow(null);
    setIsRecordOpen(true);
    setNotice(`${voided.txCode} was voided and stays in the ledger. Record the corrected collection now.`);
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {notice && (
        <div role="status" className="rounded-2xl border border-[#85f8c4]/60 bg-[#85f8c4]/20 px-4 py-3 text-xs font-semibold text-[#005137]">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Offerings · {periodLabel}</span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#9b2f00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">shopping_basket</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-[#1e1b19]">{formatKes(offerings?.total ?? 0)}</div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            {offerings?.count ?? 0} collection{offerings?.count === 1 ? '' : 's'} counted
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">All Giving · {periodLabel}</span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#904d00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">summarize</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-[#1e1b19]">{formatKes(givingTotal)}</div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Tithes {formatKes(summary?.giving.tithes.total ?? 0)} · Offerings {formatKes(offerings?.total ?? 0)}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Share of Giving</span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#c2410c] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">pie_chart</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#1e1b19]">{Math.round(share * 10) / 10}%</span>
            <span className="text-xs text-[#59413a]">of all giving</span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            The rest is tithes standing against a member
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Largest Channel</span>
            <span className="p-2 rounded-xl bg-[#85f8c4]/40 text-[#002114] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">payments</span>
            </span>
          </div>
          <div className="font-headline text-xl font-bold text-[#006243] leading-tight">
            {methods[0] ? methodLabel(methods[0].method) : '—'}
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            {methods[0] && methodTotal > 0
              ? `${formatKes(methods[0].amount)} across ${methods[0].count} collection${methods[0].count === 1 ? '' : 's'}`
              : 'Nothing counted in this window'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ShareBars
          title={`Offerings by payment method · ${periodLabel}`}
          rows={methods.map((row) => ({
            label: methodLabel(row.method),
            amount: row.amount,
            count: row.count,
            share: methodTotal > 0 ? (row.amount / methodTotal) * 100 : 0,
          }))}
        />
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7] space-y-2">
          <h3 className="font-headline text-sm font-bold text-[#1e1b19]">How the plate is recorded</h3>
          <p className="text-xs text-[#59413a] leading-relaxed">
            A collection is filed against the gathering it was taken at, with a designation and the way
            the money arrived. Counting it twice, or keying the wrong figure, is corrected by voiding
            the collection with a reason and recording the right one — the voided line stays in the
            ledger, so the Sunday totals can always be reconstructed.
          </p>
          <p className="text-xs text-[#59413a] leading-relaxed">
            Receipts print from the transaction itself: the number on the paper is the transaction code
            the ledger already issued, so a reprint cannot claim a collection the books do not hold.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#EAE1D7] flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-[#faf2ee]/40">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#8d7168] text-[18px]">search</span>
              <input
                aria-label="Search collections"
                value={q}
                onChange={(event) => onFilter(setQ)(event.target.value)}
                placeholder="Transaction, designation or reference"
                className={`${fieldClass} pl-9 w-64`}
              />
            </div>

            <select
              aria-label="Gathering"
              value={serviceId}
              onChange={(event) => onFilter(setServiceId)(event.target.value)}
              className={`${fieldClass} w-56 cursor-pointer`}
            >
              <option value="">Any gathering</option>
              {services.items.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title} · {new Date(service.heldAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </option>
              ))}
            </select>

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
              <option value="amount">Largest collection</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-end xl:self-auto">
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setMethod('');
                  setServiceId('');
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
              onClick={() => exportCsv('praxis-offerings', TALLY_COLUMNS, ledger.items)}
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
                <span>Record Offering</span>
              </button>
            )}
          </div>
        </div>

        {ledger.loading && ledger.items.length === 0 ? (
          <LoadingBlock label="Reading the collection ledger…" />
        ) : ledger.error ? (
          <div className="p-4">
            <ErrorBlock message={ledger.error} onRetry={() => void ledger.refetch()} />
          </div>
        ) : ledger.items.length === 0 ? (
          <EmptyBlock
            icon="shopping_basket"
            title={filtered ? 'No collections match these filters' : `No offerings in ${periodLabel.toLowerCase()}`}
            hint={
              filtered
                ? 'Widen the window or clear a filter to see more.'
                : 'Count a collection and it appears here, in the totals above, and in the Finance Audit ledger.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#faf2ee] text-[#59413a] font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                  <th className="py-3 px-4">Transaction</th>
                  <th className="py-3 px-4">Gathering</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Counted</th>
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
                        <span className="font-semibold text-[#1e1b19]">{row.service?.title ?? 'Not filed against a gathering'}</span>
                        {row.notes && <span className="text-[10px] text-[#59413a]">{row.notes}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#59413a]">{row.category}</td>
                    <td className="py-3.5 px-4 text-[#59413a]">{methodLabel(row.method)}</td>
                    <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">{formatKes(row.amount)}</td>
                    <td className="py-3.5 px-4 text-[#59413a] font-mono text-[11px]">
                      {new Date(row.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4 text-[#59413a]">{row.recordedBy?.name ?? '—'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void printOffering(row)}
                          aria-label={`Receipt for ${row.txCode}`}
                          title="Print the receipt"
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
          noun="collections"
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {isRecordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" {...recordDialog}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-[#EAE1D7] pb-3 gap-3">
              <div>
                <h3 className="font-headline text-base font-bold text-[#1e1b19]">Record an Offering</h3>
                <p className="text-xs text-[#59413a] mt-0.5">The collection's code is issued from the year's series.</p>
              </div>
              <button type="button" onClick={() => setIsRecordOpen(false)} className="text-[#59413a] hover:text-[#1e1b19] cursor-pointer" aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRecord} className="space-y-3 text-xs">
              <div>
                <label htmlFor="offering-service" className="block font-semibold mb-1">Gathering</label>
                <select
                  id="offering-service"
                  value={form.serviceId}
                  onChange={(event) => setForm((prev) => ({ ...prev, serviceId: event.target.value }))}
                  className={`${fieldClass} cursor-pointer`}
                >
                  <option value="">Not filed against a gathering</option>
                  {services.items.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.title} · {new Date(service.heldAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="offering-amount" className="block font-semibold mb-1">Amount (KSh) *</label>
                  <input
                    id="offering-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                    placeholder="18900.00"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="offering-method" className="block font-semibold mb-1">Method</label>
                  <select
                    id="offering-method"
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
                  <label htmlFor="offering-date" className="block font-semibold mb-1">Counted</label>
                  <input
                    id="offering-date"
                    type="date"
                    value={form.receivedAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, receivedAt: event.target.value }))}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="offering-category" className="block font-semibold mb-1">Designation</label>
                  <input
                    id="offering-category"
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="e.g. Sunday Offering"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="offering-reference" className="block font-semibold mb-1">Reference</label>
                  <input
                    id="offering-reference"
                    value={form.reference}
                    onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
                    placeholder="Paybill code, bag number"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="offering-notes" className="block font-semibold mb-1">Notes</label>
                <input
                  id="offering-notes"
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="e.g. Counted by two ushers; second offering for the mission fund"
                  className={fieldClass}
                />
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
                  disabled={recordOffering.pending}
                  className="px-4 py-2 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-70 cursor-pointer"
                >
                  {recordOffering.pending ? 'Recording…' : 'Record Offering'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <VoidFinanceDialog
        entity="offering"
        record={voidRow ? { id: voidRow.id, label: `${voidRow.txCode} · ${voidRow.category}`, amount: voidRow.amount } : null}
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
