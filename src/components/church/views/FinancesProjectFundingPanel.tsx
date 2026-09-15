import React, { useMemo, useState } from 'react';
import { useDialog } from '../dialog';
import { useMutation, useProjectContributions, useProjects } from '../../../hooks/useApi';
import { projectsApi, type ContributionDto, type ProjectDto } from '../../../lib/api';
import { usePermissions } from '../../../lib/permissions';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../DataState';
import { formatKes } from '../../../data/churchDomain';

/**
 * Project funding: capital campaigns and the gifts toward them.
 *
 * Progress is never stored — it is asked of the contributions every time — so this screen and the
 * ledger behind it can never disagree. The important distinction the design keeps is **cash against
 * pledges**: a total that adds them together overstates what the church actually holds, so the bar is
 * drawn as two segments and the money already banked is labelled as such.
 */

const STATUS_CHIP: Record<ProjectDto['status'], string> = {
  planned: 'bg-[#f4ece8] text-[#59413a]',
  active: 'bg-[#ffdcc3] text-[#2f1500]',
  completed: 'bg-[#85f8c4]/40 text-[#005137]',
  paused: 'bg-[#ffdad6] text-[#ba1a1a]',
};

const METHOD_OPTIONS: Array<{ value: ContributionDto['method']; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-PESA / Online' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
];

export const FinancesProjectFundingPanel: React.FC = () => {
  const { items, loading, error, refetch } = useProjects();
  const { canEdit } = usePermissions();
  const canRecord = canEdit('giving');

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const contributions = useProjectContributions(selectedProjectId);
  const recordContribution = useMutation(projectsApi.recordContribution);

  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false);
  const pledgeModalOpenDialog = useDialog(() => setIsPledgeModalOpen(false), 'Record a Gift Toward a Project');

  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<ContributionDto['kind']>('cash');
  const [method, setMethod] = useState<ContributionDto['method']>('cash');
  const [reference, setReference] = useState('');

  /** The flagship is the campaign with the largest target — the one the hero card is about. */
  const flagship = useMemo(() => {
    const ranked = [...items].sort((a, b) => (b.funding?.target ?? b.targetAmount) - (a.funding?.target ?? a.targetAmount));
    return ranked[0] ?? null;
  }, [items]);

  const activeProject = useMemo(
    () => items.find((project) => project.id === selectedProjectId) ?? flagship,
    [items, selectedProjectId, flagship],
  );

  const auxiliaries = items.filter((project) => project.id !== flagship?.id);
  const funded = activeProject?.funding;

  const cashShare = funded && funded.target > 0 ? (funded.cash / funded.target) * 100 : 0;
  const pledgeShare = funded && funded.target > 0 ? (funded.pledges / funded.target) * 100 : 0;

  const handleRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeProject) return;
    const parsed = Number(amount);
    if (!donorName.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
    try {
      await recordContribution.run(activeProject.id, {
        donorName: donorName.trim(),
        amount: parsed,
        method,
        kind,
        reference: reference.trim() || undefined,
      });
      await Promise.all([refetch(), contributions.refetch()]);
      setIsPledgeModalOpen(false);
      setDonorName('');
      setAmount('');
      setReference('');
    } catch {
      // recordContribution.error is rendered inside the modal.
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col w-full space-y-6">
        <LoadingBlock label="Loading capital projects…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col w-full space-y-6">
        <ErrorBlock message={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col w-full space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7]">
          <EmptyBlock
            icon="savings"
            title="No capital projects yet"
            hint="Record a project and its funding progress will be tracked here against the gifts it receives."
          />
        </div>
      </div>
    );
  }

  const activeFunded = activeProject.funding;

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Flagship campaign hero */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#EAE1D7] flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${STATUS_CHIP[activeProject.status]}`}>
                {activeProject.status}
              </span>
              <span className="text-xs font-mono text-[#59413a]">
                Target {formatKes(activeFunded?.target ?? activeProject.targetAmount)}
              </span>
            </div>
            <h2 className="font-headline text-2xl font-bold text-[#1e1b19]">{activeProject.name}</h2>
            <p className="text-xs text-[#59413a] max-w-2xl leading-relaxed">
              {activeProject.description ?? 'No description has been recorded for this project yet.'}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end shrink-0 bg-[#faf2ee] p-4 rounded-xl border border-[#EAE1D7]">
            <span className="text-xs font-semibold text-[#59413a]">Campaign Target</span>
            <span className="font-headline text-2xl font-extrabold text-[#1e1b19]">
              {formatKes(activeFunded?.target ?? activeProject.targetAmount)}
            </span>
            <span className="text-xs text-[#006243] font-bold mt-0.5">
              {formatKes(activeFunded?.receivedOrPledged ?? 0)} Raised &amp; Pledged ({activeFunded?.percentFunded ?? 0}%)
            </span>
          </div>
        </div>

        {/* Two-segment bar: money banked against money promised. */}
        <div className="space-y-2">
          <div className="w-full bg-[#EAE1D7] h-3.5 rounded-full overflow-hidden flex">
            <div
              className="bg-[#9b2f00] h-full"
              style={{ width: `${cashShare}%` }}
              title={`Cash banked: ${formatKes(activeFunded?.cash ?? 0)}`}
            ></div>
            <div
              className="bg-[#fe932c] h-full"
              style={{ width: `${pledgeShare}%` }}
              title={`Signed pledges: ${formatKes(activeFunded?.pledges ?? 0)}`}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-[#1e1b19]">
                <span className="w-3 h-3 rounded-full bg-[#9b2f00]"></span>
                <strong>{formatKes(activeFunded?.cash ?? 0)}</strong> Cash banked ({Math.round(cashShare * 10) / 10}%)
              </span>
              <span className="flex items-center gap-1.5 text-[#59413a]">
                <span className="w-3 h-3 rounded-full bg-[#fe932c]"></span>
                <strong>{formatKes(activeFunded?.pledges ?? 0)}</strong> Signed pledges ({Math.round(pledgeShare * 10) / 10}%)
              </span>
            </div>
            <span className="font-mono text-[#ba1a1a] font-bold">
              {formatKes(activeFunded?.outstanding ?? 0)} Outstanding
            </span>
          </div>
        </div>

        {/* Project selector — the hero above follows whichever project is chosen. */}
        {items.length > 1 && (
          <div className="pt-4 border-t border-[#f4ece8]">
            <label htmlFor="project-select" className="block text-xs font-bold text-[#1e1b19] uppercase tracking-wider mb-2">
              View Another Project
            </label>
            <select
              id="project-select"
              aria-label="View another project"
              value={activeProject.id}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="w-full sm:w-96 h-9 px-3 text-xs rounded-xl bg-[#faf2ee] border border-[#EAE1D7] focus:outline-none focus:border-[#c2410c]"
            >
              {items.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} — {project.funding?.percentFunded ?? 0}% funded
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Auxiliary funds and the pledge tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-base font-bold text-[#1e1b19]">Other Capital Projects</h3>
            <span className="text-xs text-[#59413a]">
              {auxiliaries.length} project{auxiliaries.length === 1 ? '' : 's'}
            </span>
          </div>

          {auxiliaries.length === 0 ? (
            <p className="text-xs text-[#59413a]">No other projects are on the books.</p>
          ) : (
            <div className="space-y-3">
              {auxiliaries.map((project) => {
                const projectFunded = project.funding;
                const share = projectFunded?.percentFunded ?? 0;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    className="w-full text-left p-3.5 bg-[#faf2ee] hover:bg-[#f4ece8] rounded-xl border border-[#EAE1D7] space-y-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-[#1e1b19] truncate">{project.name}</span>
                      <span className="font-headline font-bold text-xs text-[#1e1b19] shrink-0">
                        {formatKes(projectFunded?.cash ?? 0)} / {formatKes(projectFunded?.target ?? project.targetAmount)}
                      </span>
                    </div>
                    <div className="w-full bg-[#EAE1D7] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#9b2f00] h-full" style={{ width: `${Math.min(share, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-[#59413a]">
                      <span>{share}% funded (cash)</span>
                      <span>{formatKes(projectFunded?.outstanding ?? 0)} outstanding</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="font-headline text-base font-bold text-[#1e1b19]">Pledge Fulfillment Tracker</h3>
              {canRecord && (
                <button
                  type="button"
                  onClick={() => setIsPledgeModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold shadow-xs cursor-pointer shrink-0"
                >
                  + Record Gift
                </button>
              )}
            </div>

            {contributions.loading && contributions.items.length === 0 ? (
              <LoadingBlock label="Loading contributions…" />
            ) : contributions.error ? (
              <ErrorBlock message={contributions.error} onRetry={() => void contributions.refetch()} />
            ) : contributions.items.length === 0 ? (
              <EmptyBlock
                icon="volunteer_activism"
                title="No gifts toward this project yet"
                hint="Cash and pledges recorded here feed the progress bar above."
              />
            ) : (
              <div className="space-y-2 text-xs max-h-80 overflow-y-auto pr-1">
                {contributions.items.map((row) => (
                  <div key={row.id} className="p-2.5 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#1e1b19] truncate">{row.donorName}</div>
                      <div className="text-[11px] text-[#59413a]">
                        {formatKes(row.amount)} · {row.kind === 'cash' ? 'Cash received' : 'Pledged'}
                        {row.reference ? ` · ${row.reference}` : ''}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        row.kind === 'cash' ? 'bg-[#85f8c4]/40 text-[#005137]' : 'bg-[#ffdcc3] text-[#2f1500]'
                      }`}
                    >
                      {row.kind === 'cash' ? 'Banked' : 'Pledge'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-[#f4ece8] text-xs text-[#59413a] flex items-center justify-between">
            <span>
              {contributions.items.length} gift{contributions.items.length === 1 ? '' : 's'} toward {activeProject.name}
            </span>
            <span className="font-mono text-[#1e1b19] font-bold">{formatKes(activeFunded?.cash ?? 0)} banked</span>
          </div>
        </div>
      </div>

      {/* Record a gift */}
      {isPledgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" {...pledgeModalOpenDialog}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#EAE1D7] pb-3">
              <h3 className="font-headline text-base font-bold text-[#1e1b19]">Record a Gift Toward {activeProject.name}</h3>
              <button
                type="button"
                onClick={() => setIsPledgeModalOpen(false)}
                className="text-[#59413a] hover:text-[#1e1b19] cursor-pointer"
                aria-label="Close"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleRecord} className="space-y-3 text-xs">
              <div>
                <label htmlFor="gift-donor" className="block font-semibold mb-1">Donor Name / Family Trust *</label>
                <input
                  id="gift-donor"
                  aria-label="Donor Name / Family Trust"
                  type="text"
                  required
                  minLength={2}
                  value={donorName}
                  onChange={(event) => setDonorName(event.target.value)}
                  placeholder="e.g. Clara Wambui"
                  className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="gift-amount" className="block font-semibold mb-1">Amount (KSh) *</label>
                  <input
                    id="gift-amount"
                    aria-label="Amount (KSh)"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="10,000"
                    className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                  />
                </div>
                <div>
                  <label htmlFor="gift-kind" className="block font-semibold mb-1">Cash or Pledge</label>
                  <select
                    id="gift-kind"
                    aria-label="Cash or Pledge"
                    value={kind}
                    onChange={(event) => setKind(event.target.value as ContributionDto['kind'])}
                    className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                  >
                    <option value="cash">Cash received</option>
                    <option value="pledge">Pledge (promised)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="gift-method" className="block font-semibold mb-1">Method</label>
                  <select
                    id="gift-method"
                    aria-label="Method"
                    value={method}
                    onChange={(event) => setMethod(event.target.value as ContributionDto['method'])}
                    className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                  >
                    {METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="gift-reference" className="block font-semibold mb-1">Reference</label>
                  <input
                    id="gift-reference"
                    aria-label="Reference"
                    type="text"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Cheque / M-PESA code"
                    className="w-full h-9 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]"
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#59413a]">
                A pledge is money promised and cash is money banked; they are reported separately so the
                total never overstates what the church holds.
              </p>

              {recordContribution.error && (
                <div role="alert" className="rounded-xl border border-[#ffdad6] bg-[#ffdad6]/40 px-3 py-2 text-[11px] font-semibold text-[#ba1a1a]">
                  {recordContribution.error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE1D7]">
                <button
                  type="button"
                  onClick={() => setIsPledgeModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#59413a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordContribution.pending}
                  className="px-4 py-2 bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-70 cursor-pointer"
                >
                  {recordContribution.pending ? 'Recording…' : 'Record Gift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
