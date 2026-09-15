import React, { useMemo, useState } from 'react';
import { useDialog } from '../dialog';
import { useCharity, useMutation } from '../../../hooks/useApi';
import { charityApi, type CharityActivityDto, type CharityStatus } from '../../../lib/api';
import { usePermissions } from '../../../lib/permissions';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../DataState';
import { formatKes } from '../../../data/churchDomain';

/**
 * Charity: money and goods the church gives away.
 *
 * Every row here is an expenditure somebody has to account for, so the screen reads like a ledger
 * rather than a brochure — the item bought, the initiative it belongs to, the vendor paid, and
 * whether it has been verified. Totals are computed from the live rows, never from a stored figure,
 * so this screen and the finance ledger can never quietly disagree.
 */

const STATUS: Record<CharityStatus, { label: string; chip: string }> = {
  recorded: { label: 'Recorded', chip: 'bg-[#ffdcc3] text-[#2f1500]' },
  verified: { label: 'Verified', chip: 'bg-[#85f8c4]/30 text-[#005137]' },
  flagged: { label: 'Flagged', chip: 'bg-[#ffdad6] text-[#ba1a1a]' },
};

const BAR_COLORS = ['bg-[#9b2f00]', 'bg-[#fe932c]', 'bg-[#007d57]', 'bg-[#c2410c]', 'bg-[#904d00]', 'bg-[#59413a]'];

/** The circumference of the donut's circle, so the arc can be drawn from a percentage. */
const DONUT_CIRCUMFERENCE = 251.2;

export const FinancesCharityPanel: React.FC = () => {
  const { items, totals, loading, error, refetch } = useCharity();
  const { canEdit } = usePermissions();
  const canRecord = canEdit('giving');

  const createActivity = useMutation(charityApi.create);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const expenseModalOpenDialog = useDialog(() => setIsExpenseModalOpen(false), 'Record Charity Disbursement');

  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [initiative, setInitiative] = useState('');
  const [vendor, setVendor] = useState('');

  const spend = totals.amount ?? 0;

  /** Initiatives ranked by what they have cost, which is the order a treasurer reads them in. */
  const initiatives = useMemo(
    () => totals.byInitiative.filter((row) => row.amount > 0),
    [totals.byInitiative],
  );

  const top = initiatives[0];
  const topShare = top && spend > 0 ? Math.round((top.amount / spend) * 1000) / 10 : 0;
  const verifiedCount = items.filter((row) => row.status === 'verified').length;
  const flaggedCount = items.filter((row) => row.status === 'flagged').length;

  const handleRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(amount);
    if (!item.trim() || !initiative.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
    try {
      await createActivity.run({
        item: item.trim(),
        initiative: initiative.trim(),
        amount: parsed,
        vendor: vendor.trim() || undefined,
      });
      await refetch();
      setIsExpenseModalOpen(false);
      setItem('');
      setAmount('');
      setInitiative('');
      setVendor('');
    } catch {
      // createActivity.error is rendered inside the modal.
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Bento Metrics Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Direct Aid Delivered
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#9b2f00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">diversity_1</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">{formatKes(spend)}</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>{items.length} recorded disbursement{items.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Read from the live expenditure ledger
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Active Missions &amp; Drives
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#904d00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">flag</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">{initiatives.length}</div>
            <div className="flex items-center gap-1 mt-1 text-[#59413a] text-xs">
              <span>Initiatives with recorded spend</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Council sanctioned ministries
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Verified Records
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#c2410c] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">fact_check</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">{verifiedCount}</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">verified</span>
              <span>{items.length - verifiedCount - flaggedCount} still to reconcile</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            {flaggedCount > 0 ? `${flaggedCount} flagged for review` : 'Nothing flagged'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Largest Initiative
            </span>
            <span className="p-2 rounded-xl bg-[#85f8c4]/40 text-[#002114] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">public</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-2xl font-bold text-[#006243] truncate" title={top?.initiative}>
              {top?.initiative ?? '—'}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[#59413a] text-xs">
              <span>{top ? `${formatKes(top.amount)} · ${topShare}% of spend` : 'No spend recorded yet'}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Ranked by actual expenditure
          </div>
        </div>
      </div>

      {createActivity.error && <ErrorBlock message={createActivity.error} onRetry={() => void refetch()} />}

      {/* Spend distribution and per-initiative meters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7] flex flex-col justify-between items-center text-center">
          <div className="w-full text-left">
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">
              Largest Initiative Share
            </h3>
            <p className="text-xs text-[#59413a]">Proportion of charity spend the biggest drive accounts for</p>
          </div>

          <div className="relative w-44 h-44 my-4 flex items-center justify-center">
            <svg
              role="img"
              aria-label={
                top
                  ? `${top.initiative} accounts for ${topShare}% of charity spend — ${formatKes(top.amount)} of ${formatKes(spend)}.`
                  : 'No charity spend has been recorded yet.'
              }
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="40" stroke="#f4ece8" strokeWidth="12" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#c2410c"
                strokeWidth="12"
                strokeDasharray={DONUT_CIRCUMFERENCE}
                strokeDashoffset={DONUT_CIRCUMFERENCE * (1 - topShare / 100)}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="font-headline text-2xl font-bold text-[#1e1b19]">{topShare}%</span>
              <span className="text-[10px] text-[#59413a] uppercase tracking-wider font-semibold">of spend</span>
            </div>
          </div>

          <div className="w-full p-3.5 bg-[#faf2ee] rounded-xl flex items-center justify-between text-xs border border-[#EAE1D7]">
            <div>
              <span className="text-[#59413a] block">Total Spend</span>
              <strong className="text-sm font-headline text-[#9b2f00]">{formatKes(spend)}</strong>
            </div>
            <div className="h-6 w-px bg-[#EAE1D7]"></div>
            <div>
              <span className="text-[#59413a] block">Initiatives</span>
              <strong className="text-sm font-headline text-[#1e1b19]">{initiatives.length}</strong>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">
              Spend by Initiative
            </h3>
            {canRecord && (
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                + Record Expense
              </button>
            )}
          </div>

          {loading && items.length === 0 ? (
            <LoadingBlock label="Loading charity records…" />
          ) : error ? (
            <ErrorBlock message={error} onRetry={() => void refetch()} />
          ) : initiatives.length === 0 ? (
            <EmptyBlock
              icon="diversity_1"
              title="No charity spend recorded yet"
              hint="Record an expense and this screen breaks it down by initiative."
            />
          ) : (
            <div className="space-y-3.5">
              {initiatives.slice(0, 6).map((row, index) => {
                const share = spend > 0 ? Math.round((row.amount / spend) * 1000) / 10 : 0;
                return (
                  <div key={row.initiative} className="space-y-1.5">
                    <div className="flex justify-between text-xs gap-2">
                      <span className="font-semibold text-[#1e1b19] truncate">{row.initiative}</span>
                      <span className="font-mono text-[#59413a] font-bold shrink-0">
                        {formatKes(row.amount)} ({share}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#EAE1D7] h-2 rounded-full overflow-hidden">
                      <div className={`${BAR_COLORS[index % BAR_COLORS.length]} h-full`} style={{ width: `${share}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-[#f4ece8] flex items-center justify-between text-xs text-[#59413a]">
            <span>Verified against the finance audit ledger</span>
            <span className="font-bold text-[#006243] flex items-center gap-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">verified</span>
              {flaggedCount === 0 ? 'Nothing flagged' : `${flaggedCount} flagged`}
            </span>
          </div>
        </div>
      </div>

      {/* Expenditure ledger */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
        <div className="p-4 border-b border-[#EAE1D7] bg-[#faf2ee]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[20px]">receipt</span>
            <h3 className="font-headline text-sm font-bold text-[#1e1b19]">
              Benevolence Expenditure Ledger &amp; Verification Audit
            </h3>
          </div>
          <span className="text-xs text-[#006243] font-bold flex items-center gap-1">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
            Every row also writes a finance-ledger entry
          </span>
        </div>

        {loading && items.length === 0 ? (
          <LoadingBlock label="Loading expenditure ledger…" />
        ) : error ? (
          <div className="p-4">
            <ErrorBlock message={error} onRetry={() => void refetch()} />
          </div>
        ) : items.length === 0 ? (
          <EmptyBlock
            icon="receipt"
            title="The ledger is empty"
            hint="Charity disbursements you record will appear here with their vendor and audit status."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#faf2ee] text-[#59413a] font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                  <th className="py-3 px-4">Disbursement Code</th>
                  <th className="py-3 px-4">Item &amp; Intervention</th>
                  <th className="py-3 px-4">Initiative</th>
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1D7] text-[#1e1b19]">
                {items.map((row: CharityActivityDto) => (
                  <tr key={row.id} className="hover:bg-[#faf2ee]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#9b2f00]">{row.code}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#1e1b19]">{row.item}</td>
                    <td className="py-3.5 px-4 text-[#59413a]">{row.initiative}</td>
                    <td className="py-3.5 px-4 text-[#59413a]">{row.vendor ?? '—'}</td>
                    <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">
                      {formatKes(row.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-[#59413a] font-mono text-[11px]">
                      {new Date(row.occurredAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS[row.status].chip}`}>
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                          {row.status === 'verified' ? 'verified' : row.status === 'flagged' ? 'flag' : 'schedule'}
                        </span>
                        {STATUS[row.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" {...expenseModalOpenDialog}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAE1D7] pb-3">
              <h3 className="font-headline text-base font-bold text-[#1e1b19]">Record Charity Disbursement</h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-[#59413a] hover:text-[#1e1b19] cursor-pointer"
                aria-label="Close"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleRecord} className="space-y-3 text-xs">
              <div>
                <label htmlFor="charity-item" className="block font-semibold mb-1">Item / Description *</label>
                <input
                  id="charity-item"
                  aria-label="Item / Description"
                  type="text"
                  required
                  minLength={3}
                  value={item}
                  onChange={(event) => setItem(event.target.value)}
                  placeholder="e.g. School Shoes for Youth Drive"
                  className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="charity-amount" className="block font-semibold mb-1">Amount (KSh) *</label>
                  <input
                    id="charity-amount"
                    aria-label="Amount (KSh)"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="850.00"
                    className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                  />
                </div>
                <div>
                  <label htmlFor="charity-initiative" className="block font-semibold mb-1">Initiative *</label>
                  <input
                    id="charity-initiative"
                    aria-label="Initiative"
                    type="text"
                    required
                    minLength={3}
                    list="charity-initiative-options"
                    value={initiative}
                    onChange={(event) => setInitiative(event.target.value)}
                    placeholder="e.g. Community Food Drive"
                    className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                  />
                  <datalist id="charity-initiative-options">
                    {initiatives.map((row) => (
                      <option key={row.initiative} value={row.initiative} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div>
                <label htmlFor="charity-vendor" className="block font-semibold mb-1">Vendor / Payee</label>
                <input
                  id="charity-vendor"
                  aria-label="Vendor / Payee"
                  type="text"
                  value={vendor}
                  onChange={(event) => setVendor(event.target.value)}
                  placeholder="e.g. Nyahururu Grocers Ltd"
                  className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                />
              </div>

              {createActivity.error && (
                <div role="alert" className="rounded-xl border border-[#ffdad6] bg-[#ffdad6]/40 px-3 py-2 text-[11px] font-semibold text-[#ba1a1a]">
                  {createActivity.error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#59413a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createActivity.pending}
                  className="px-4 py-2 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-70 cursor-pointer"
                >
                  {createActivity.pending ? 'Logging…' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
