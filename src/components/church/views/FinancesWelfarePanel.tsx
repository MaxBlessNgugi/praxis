import React, { useMemo, useState } from 'react';
import { useDialog } from '../dialog';
import { useMutation, useWelfare } from '../../../hooks/useApi';
import { welfareApi, type WelfareCaseDto, type WelfareCategory } from '../../../lib/api';
import { usePermissions } from '../../../lib/permissions';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../DataState';
import { formatKes } from '../../../data/churchDomain';

/**
 * The welfare fund: relief the church gives a family in need.
 *
 * Approval and payment are separate acts here, deliberately — a committee deciding that a family
 * should receive relief and a treasurer handing over the money are two different people, often weeks
 * apart. The screen therefore shows "approved but not yet paid" as its own figure, because that is
 * the question a welfare fund actually lives by. Opening a case is desk work (`staff`); deciding and
 * paying one are `admin` acts, and the buttons follow the same rule the API enforces.
 */

type CategoryMeta = { label: string; chip: string; bar: string };

const CATEGORY: Record<WelfareCategory, CategoryMeta> = {
  rent: { label: 'Housing & Rent', chip: 'bg-[#ffdbd0] text-[#9b2f00]', bar: 'bg-[#9b2f00]' },
  utility: { label: 'Utilities & Fuel', chip: 'bg-[#ffdcc3] text-[#2f1500]', bar: 'bg-[#fe932c]' },
  medical: { label: 'Medical & Rx', chip: 'bg-[#85f8c4]/40 text-[#005137]', bar: 'bg-[#007d57]' },
  food: { label: 'Food & Grocery', chip: 'bg-[#ffdad6] text-[#ba1a1a]', bar: 'bg-[#904d00]' },
  education: { label: 'Education', chip: 'bg-[#e9e1dd] text-[#59413a]', bar: 'bg-[#59413a]' },
  funeral: { label: 'Funeral & Bereavement', chip: 'bg-[#e9e1dd] text-[#59413a]', bar: 'bg-[#3f3f46]' },
  other: { label: 'Other Relief', chip: 'bg-[#f4ece8] text-[#59413a]', bar: 'bg-[#a8a29e]' },
};

const CATEGORY_ORDER = Object.keys(CATEGORY) as WelfareCategory[];

const STATUS_CHIP: Record<WelfareCaseDto['status'], string> = {
  requested: 'bg-[#ffdcc3] text-[#2f1500]',
  approved: 'bg-[#fde68a] text-[#78350f]',
  disbursed: 'bg-[#85f8c4]/40 text-[#005137]',
  declined: 'bg-[#ffdad6] text-[#ba1a1a]',
};

/** The KES amount a case shows, always with the church's own money format. */
const money = (value: number) => formatKes(value);

export const FinancesWelfarePanel: React.FC = () => {
  const { items, totals, loading, error, refetch } = useWelfare();
  const { role, canEdit } = usePermissions();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const canOpenCase = canEdit('giving');

  const openCase = useMutation(welfareApi.open);
  const decideCase = useMutation(welfareApi.decide);
  const disburseCase = useMutation(welfareApi.disburse);

  const [selectedCase, setSelectedCase] = useState<WelfareCaseDto | null>(null);
  const selectedCaseDialog = useDialog(() => setSelectedCase(null), 'Welfare Case Detail');
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const caseModalDialog = useDialog(() => setIsCaseModalOpen(false), 'New Welfare Relief Case');
  const [decisionNote, setDecisionNote] = useState('');

  // Form state for opening a case.
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<WelfareCategory>('rent');
  const [purpose, setPurpose] = useState('');

  const byCategory = useMemo(() => {
    const sums = new Map<WelfareCategory, number>();
    for (const item of items) sums.set(item.category, (sums.get(item.category) ?? 0) + item.amount);
    const total = [...sums.values()].reduce((sum, value) => sum + value, 0);
    return CATEGORY_ORDER.filter((key) => sums.has(key)).map((key) => ({
      key,
      amount: sums.get(key) ?? 0,
      share: total > 0 ? Math.round(((sums.get(key) ?? 0) / total) * 1000) / 10 : 0,
    }));
  }, [items]);

  const openCases = items.filter((item) => item.status === 'requested').length;
  const decidedCases = items.filter((item) => item.status === 'approved').length;
  const averagePerCase = items.length === 0 ? 0 : totals.disbursed / items.length;

  const writeError = openCase.error ?? decideCase.error ?? disburseCase.error;

  const handleOpenCase = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(amount);
    if (!beneficiaryName.trim() || !purpose.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
    try {
      await openCase.run({
        beneficiaryName: beneficiaryName.trim(),
        amount: parsed,
        purpose: purpose.trim(),
        category,
      });
      await refetch();
      setIsCaseModalOpen(false);
      setBeneficiaryName('');
      setAmount('');
      setPurpose('');
      setCategory('rent');
    } catch {
      // openCase.error is rendered inside the modal.
    }
  };

  const handleDecision = async (decision: 'approved' | 'declined') => {
    if (!selectedCase) return;
    try {
      await decideCase.run(selectedCase.id, { decision, note: decisionNote.trim() || undefined });
      await refetch();
      setSelectedCase(null);
      setDecisionNote('');
    } catch {
      // decideCase.error is rendered in the drawer.
    }
  };

  const handleDisburse = async () => {
    if (!selectedCase) return;
    try {
      await disburseCase.run(selectedCase.id, { note: decisionNote.trim() || undefined });
      await refetch();
      setSelectedCase(null);
      setDecisionNote('');
    } catch {
      // disburseCase.error is rendered in the drawer.
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Welfare fund KPIs — money paid out, money promised, and what is still open. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Disbursed To Date
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#9b2f00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">outbox</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#9b2f00]">{money(totals.disbursed)}</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>Paid from the alms treasury</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Restricted for emergency charity
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Approved, Not Paid
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#c2410c] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">schedule</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#c2410c]">{money(totals.awaitingPayment)}</div>
            <div className="flex items-center gap-1 mt-1 text-[#59413a] text-xs">
              <span>{decidedCases} case{decidedCases === 1 ? '' : 's'} awaiting payment</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Committee approved, treasurer to remit
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Open Cases
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#904d00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">folder_open</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19]">{openCases}</div>
            <div className="flex items-center gap-1 mt-1 text-[#59413a] text-xs">
              <span>Awaiting a deacon&apos;s assessment</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            No cash is handed to individuals
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Average Assistance
            </span>
            <span className="p-2 rounded-xl bg-[#85f8c4]/40 text-[#002114] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">family_restroom</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#006243]">{money(averagePerCase)}</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">functions</span>
              <span>Across {items.length} logged case{items.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f4ece8] text-xs text-[#59413a]">
            Direct vendor remitted
          </div>
        </div>
      </div>

      {/* Need distribution — computed from the live cases rather than a stored figure. */}
      <div className="p-5 bg-white rounded-2xl shadow-sm border border-[#EAE1D7] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">
              Benevolence Disbursement by Need
            </h3>
            <p className="text-xs text-[#59413a]">
              How the relief fund has been spent across the categories the welfare screen groups by.
            </p>
          </div>
          {canOpenCase && (
            <button
              type="button"
              onClick={() => setIsCaseModalOpen(true)}
              className="px-4 py-2 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_moderator</span>
              <span>+ New Relief Case</span>
            </button>
          )}
        </div>

        {byCategory.length === 0 ? (
          <p className="text-xs text-[#59413a]">No relief has been logged yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="w-full bg-[#EAE1D7] h-3.5 rounded-full overflow-hidden flex">
              {byCategory.map((slice) => (
                <div
                  key={slice.key}
                  className={`${CATEGORY[slice.key].bar} h-full`}
                  style={{ width: `${slice.share}%` }}
                  title={`${CATEGORY[slice.key].label}: ${slice.share}%`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
              {byCategory.map((slice) => (
                <div key={slice.key} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${CATEGORY[slice.key].bar}`}></span>
                  <span className="text-[#1e1b19]">
                    {CATEGORY[slice.key].label}: <strong>{slice.share}% ({money(slice.amount)})</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {writeError && <ErrorBlock message={writeError} onRetry={() => void refetch()} />}

      {/* The case ledger. */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
        <div className="p-4 border-b border-[#EAE1D7] bg-[#faf2ee]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[20px]">folder_shared</span>
            <h3 className="font-headline text-sm font-bold text-[#1e1b19]">
              Confidential Welfare Casework Ledger
            </h3>
          </div>
          <span className="text-xs text-[#59413a]">Deacon &amp; clergy access</span>
        </div>

        {loading && items.length === 0 ? (
          <LoadingBlock label="Loading welfare cases…" />
        ) : error ? (
          <div className="p-4">
            <ErrorBlock message={error} onRetry={() => void refetch()} />
          </div>
        ) : items.length === 0 ? (
          <EmptyBlock
            icon="volunteer_activism"
            title="No welfare cases yet"
            hint="Open a case and it appears here for the deacons to assess and the treasurer to settle."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#faf2ee] text-[#59413a] font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">Intervention Summary</th>
                  <th className="py-3 px-4">Relief Category</th>
                  <th className="py-3 px-4">Assigned Deacon</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1D7] text-[#1e1b19]">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#faf2ee]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#9b2f00]">{item.caseCode}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#1e1b19]">{item.purpose}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY[item.category].chip}`}>
                        {CATEGORY[item.category].label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#59413a]">
                      {item.assignedTo ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">
                      {money(item.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_CHIP[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCase(item)}
                        className="px-2.5 py-1 rounded-lg bg-[#faf2ee] hover:bg-[#f4ece8] text-[#9b2f00] font-bold text-xs border border-[#EAE1D7] transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case drawer: the pastoral notes plus the decision and payment acts. */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" {...selectedCaseDialog}>
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE1D7]">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[22px]">lock</span>
                  <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                    Case Notes ({selectedCase.caseCode})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
                  className="text-[#59413a] hover:text-[#1e1b19] cursor-pointer"
                  aria-label="Close"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <span className="text-[#59413a] block mb-0.5">Beneficiary</span>
                  <p className="font-bold text-sm text-[#1e1b19]">{selectedCase.beneficiaryName}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-[#faf2ee] rounded-xl border border-[#EAE1D7]">
                  <div>
                    <span className="text-[#59413a] block">Amount</span>
                    <span className="font-headline font-bold text-base text-[#9b2f00]">
                      {money(selectedCase.amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#59413a] block">Category</span>
                    <span className="font-semibold text-[#1e1b19]">{CATEGORY[selectedCase.category].label}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[#59413a] block mb-0.5">What the relief is for</span>
                  <p className="text-[#1e1b19] p-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]">
                    {selectedCase.purpose}
                  </p>
                </div>

                {selectedCase.notes && (
                  <div>
                    <span className="text-[#59413a] block mb-0.5">Case notes</span>
                    <div className="p-3.5 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] leading-relaxed">
                      {selectedCase.notes}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#59413a] block">Approved by</span>
                    <span className="font-semibold text-[#1e1b19]">
                      {selectedCase.approvedBy?.name ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#59413a] block">Disbursed</span>
                    <span className="font-semibold text-[#1e1b19]">
                      {selectedCase.disbursedAt
                        ? new Date(selectedCase.disbursedAt).toLocaleDateString()
                        : 'Not yet paid'}
                    </span>
                  </div>
                </div>

                {isAdmin && selectedCase.status !== 'disbursed' && selectedCase.status !== 'declined' && (
                  <div>
                    <label htmlFor="welfare-decision-note" className="text-[#59413a] block mb-0.5">
                      Decision note
                    </label>
                    <input
                      id="welfare-decision-note"
                      aria-label="Decision note"
                      type="text"
                      value={decisionNote}
                      onChange={(event) => setDecisionNote(event.target.value)}
                      placeholder="Recorded against your name in the ledger"
                      className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                    />
                  </div>
                )}

                {decideCase.error && (
                  <div role="alert" className="rounded-xl border border-[#ffdad6] bg-[#ffdad6]/40 px-3 py-2 text-[11px] font-semibold text-[#ba1a1a]">
                    {decideCase.error}
                  </div>
                )}
                {disburseCase.error && (
                  <div role="alert" className="rounded-xl border border-[#ffdad6] bg-[#ffdad6]/40 px-3 py-2 text-[11px] font-semibold text-[#ba1a1a]">
                    {disburseCase.error}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAE1D7] flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#59413a] text-xs font-bold cursor-pointer"
              >
                Close File
              </button>

              {isAdmin && selectedCase.status === 'requested' && (
                <>
                  <button
                    type="button"
                    onClick={() => void handleDecision('declined')}
                    disabled={decideCase.pending}
                    className="px-4 py-2 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#ba1a1a] text-xs font-bold disabled:opacity-70 cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecision('approved')}
                    disabled={decideCase.pending}
                    className="px-4 py-2 rounded-xl bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold shadow-xs disabled:opacity-70 cursor-pointer"
                  >
                    {decideCase.pending ? 'Approving…' : 'Approve'}
                  </button>
                </>
              )}

              {isAdmin && selectedCase.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => void handleDisburse()}
                  disabled={disburseCase.pending}
                  className="px-4 py-2 rounded-xl bg-[#9b2f00] hover:bg-[#c2410c] text-white text-xs font-bold shadow-xs disabled:opacity-70 cursor-pointer"
                >
                  {disburseCase.pending ? 'Paying…' : 'Authorize Disbursement'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Open a new relief case. */}
      {isCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" {...caseModalDialog}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAE1D7] pb-3">
              <h3 className="font-headline text-base font-bold text-[#1e1b19]">New Welfare Relief Case</h3>
              <button
                type="button"
                onClick={() => setIsCaseModalOpen(false)}
                className="text-[#59413a] hover:text-[#1e1b19] cursor-pointer"
                aria-label="Close"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleOpenCase} className="space-y-3 text-xs">
              <div>
                <label htmlFor="welfare-beneficiary" className="block font-semibold mb-1">
                  Beneficiary Family / Case Subject *
                </label>
                <input
                  id="welfare-beneficiary"
                  aria-label="Beneficiary Family / Case Subject"
                  type="text"
                  required
                  value={beneficiaryName}
                  onChange={(event) => setBeneficiaryName(event.target.value)}
                  placeholder="e.g. Wanjala Family"
                  className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="welfare-amount" className="block font-semibold mb-1">Amount (KSh) *</label>
                  <input
                    id="welfare-amount"
                    aria-label="Amount (KSh)"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="600.00"
                    className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                  />
                </div>
                <div>
                  <label htmlFor="welfare-category" className="block font-semibold mb-1">Category</label>
                  <select
                    id="welfare-category"
                    aria-label="Category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as WelfareCategory)}
                    className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                  >
                    {CATEGORY_ORDER.map((key) => (
                      <option key={key} value={key}>{CATEGORY[key].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="welfare-purpose" className="block font-semibold mb-1">
                  What the relief is for *
                </label>
                <textarea
                  id="welfare-purpose"
                  aria-label="What the relief is for"
                  rows={3}
                  required
                  minLength={10}
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder="Describe the need the fund is meeting…"
                  className="w-full p-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                />
              </div>

              {openCase.error && (
                <div role="alert" className="rounded-xl border border-[#ffdad6] bg-[#ffdad6]/40 px-3 py-2 text-[11px] font-semibold text-[#ba1a1a]">
                  {openCase.error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setIsCaseModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#59413a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={openCase.pending}
                  className="px-4 py-2 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-70 cursor-pointer"
                >
                  {openCase.pending ? 'Opening…' : 'Open Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
