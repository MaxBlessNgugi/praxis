import React, { useState } from 'react';
import { errorMessage, useFinanceAudit, useLedgerVerification } from '../../../hooks/useApi';
import { financeApi, type FinanceAuditAction, type FinanceEntity } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useChurchIdentity } from '../../../hooks/useChurchIdentity';
import { formatKes } from '../../../data/churchDomain';
import { buildFinanceSummary, printDocument } from '../../../lib/documents';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../DataState';

/**
 * The finance ledger: an append-only, chained record of what happened to the money.
 *
 * This is not the console's audit trail. `AuditLog` records what the console did; this records what
 * happened to the money, and each entry carries a hash over its own fields plus the previous entry's,
 * so altering or removing any row breaks every hash after it. That is why the screen offers a
 * **Verify** button: it recomputes the whole chain server-side and names the first entry that no
 * longer adds up, which is the thing an auditor actually asks for.
 *
 * Read-only throughout, and `admin`-gated at the API, because voiding and restoring money is a
 * decision rather than an edit.
 */

const ACTIONS: FinanceAuditAction[] = ['recorded', 'voided', 'restored', 'approved', 'declined', 'disbursed', 'updated'];

const ENTITIES: FinanceEntity[] = ['tithe', 'offering', 'project', 'contribution', 'welfare', 'charity'];

const ACTION_CHIP: Record<FinanceAuditAction, string> = {
  recorded: 'bg-[#ffdcc3] text-[#2f1500]',
  updated: 'bg-[#f4ece8] text-[#59413a]',
  voided: 'bg-[#ffdad6] text-[#ba1a1a]',
  restored: 'bg-[#85f8c4]/40 text-[#005137]',
  approved: 'bg-[#fde68a] text-[#78350f]',
  declined: 'bg-[#ffdad6] text-[#ba1a1a]',
  disbursed: 'bg-[#85f8c4]/40 text-[#005137]',
};

const shortHash = (hash: string) => (hash.length > 14 ? `${hash.slice(0, 7)}…${hash.slice(-6)}` : hash);

export const AdminFinanceAuditPanel: React.FC = () => {
  const [action, setAction] = useState<FinanceAuditAction | ''>('');
  const [entityName, setEntityName] = useState<FinanceEntity | ''>('');

  const { items, totals, loading, error, refetch } = useFinanceAudit({
    action: action || undefined,
    entityName: entityName || undefined,
  });
  const ledger = useLedgerVerification();
  const { church } = useChurchIdentity();
  const { user } = useAuth();

  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  const verification = ledger.data?.data;
  const filtered = action !== '' || entityName !== '';

  /**
   * The one-page treasury summary a treasurer is asked for in a meeting.
   *
   * The logo is fetched and inlined as a data URL first: the printed document must carry the church's
   * own letterhead, and a document that fetched its artwork over the network could print without it.
   * A missing logo is not allowed to stop the numbers — it is caught and the summary prints anyway.
   */
  const handlePrintSummary = async () => {
    setPrinting(true);
    setPrintError(null);
    try {
      const summary = await financeApi.summary();
      await printDocument(
        buildFinanceSummary({
          church,
          generatedBy: user?.name ?? 'the church office',
          summary: summary.data,
        }),
      );
    } catch (cause) {
      setPrintError(errorMessage(cause));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* A statement of what the ledger is, and what verifying it proves. */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#1e1b19] via-[#332e2a] to-[#25201d] text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#59413a]/40">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#c2410c]/20 border border-[#c2410c]/50 flex items-center justify-center text-[#ff8c42] shrink-0">
            <span aria-hidden="true" className="material-symbols-outlined text-[30px]">lock</span>
          </div>
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-headline text-lg sm:text-xl font-bold">Read-Only &amp; Chained Ledger</h3>
              {verification && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    verification.valid
                      ? 'bg-[#007d57]/30 text-[#85f8c4] border-[#85f8c4]/30'
                      : 'bg-[#ba1a1a]/30 text-[#ffdad6] border-[#ffdad6]/30'
                  }`}
                >
                  {verification.valid ? 'Chain intact' : 'Chain broken'}
                </span>
              )}
            </div>
            <p className="text-xs text-[#c9bfb8] max-w-2xl mt-1 leading-relaxed">
              Each entry hashes its own fields together with the previous entry&apos;s hash, so altering
              or removing a row breaks every hash that follows it. Verifying recomputes the chain and
              reports the first entry that no longer adds up.
            </p>
            <span className="text-[11px] text-[#a89c94] font-mono mt-1">
              {verification
                ? verification.valid
                  ? `${verification.entries} entries verified`
                  : `Broken at entry ${verification.brokenAt ?? '?'}: ${verification.detail ?? ''}`
                : ledger.loading
                  ? 'Verifying the chain…'
                  : ledger.error ?? 'Verification unavailable'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handlePrintSummary()}
            disabled={printing}
            className="px-4 py-2 rounded-lg border border-white/25 text-white text-xs font-bold cursor-pointer whitespace-nowrap disabled:opacity-70 hover:bg-white/10 transition-colors"
          >
            {printing ? 'Preparing…' : 'Print Summary'}
          </button>
          <button
            type="button"
            onClick={() => void ledger.refetch()}
            disabled={ledger.loading}
            className="px-4 py-2 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold shadow-xs cursor-pointer whitespace-nowrap disabled:opacity-70"
          >
            {ledger.loading ? 'Verifying…' : 'Verify Ledger'}
          </button>
        </div>
      </div>

      {printError && <ErrorBlock message={printError} />}

      {/* Ledger totals and filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]">
          <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Entries</span>
          <div className="font-headline text-3xl font-bold text-[#1e1b19] mt-1">{items.length}</div>
          <div className="text-xs text-[#59413a] mt-1">{filtered ? 'Matching the current filters' : 'In this ledger'}</div>
        </div>
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]">
          <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">Value Moved</span>
          <div className="font-headline text-3xl font-bold text-[#9b2f00] mt-1">
            {totals.amount !== null ? formatKes(totals.amount) : '—'}
          </div>
          <div className="text-xs text-[#59413a] mt-1">Across the filtered entries</div>
        </div>
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label htmlFor="audit-action-filter" className="block text-xs font-semibold text-[#59413a] mb-1">Action</label>
              <select
                id="audit-action-filter"
                aria-label="Filter by action"
                value={action}
                onChange={(event) => setAction(event.target.value as FinanceAuditAction | '')}
                className="w-full h-9 px-2 text-xs rounded-xl bg-[#faf2ee] border border-[#EAE1D7] focus:outline-none focus:border-[#c2410c]"
              >
                <option value="">All actions</option>
                {ACTIONS.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="audit-entity-filter" className="block text-xs font-semibold text-[#59413a] mb-1">Entity</label>
              <select
                id="audit-entity-filter"
                aria-label="Filter by entity"
                value={entityName}
                onChange={(event) => setEntityName(event.target.value as FinanceEntity | '')}
                className="w-full h-9 px-2 text-xs rounded-xl bg-[#faf2ee] border border-[#EAE1D7] focus:outline-none focus:border-[#c2410c]"
              >
                <option value="">All entities</option>
                {ENTITIES.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* The entries themselves */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
        <div className="p-4 border-b border-[#EAE1D7] bg-[#faf2ee]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[20px]">receipt_long</span>
            <h3 className="font-headline text-sm font-bold text-[#1e1b19]">Financial Event Chain</h3>
          </div>
          <span className="text-xs text-[#59413a]">Newest first · append-only</span>
        </div>

        {loading && items.length === 0 ? (
          <LoadingBlock label="Loading the ledger…" />
        ) : error ? (
          <div className="p-4">
            <ErrorBlock message={error} onRetry={() => void refetch()} />
          </div>
        ) : items.length === 0 ? (
          <EmptyBlock
            icon="shield_lock"
            title={filtered ? 'No entries match those filters' : 'The ledger is empty'}
            hint={
              filtered
                ? 'Clear the filters to see the whole chain.'
                : 'The first financial record — a tithe, an offering or a disbursement — will open the chain.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#faf2ee] text-[#59413a] font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Record</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">By</th>
                  <th className="py-3 px-4">When</th>
                  <th className="py-3 px-4 text-right">Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1D7] text-[#1e1b19]">
                {items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#faf2ee]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[#59413a]">{entry.sequence}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${ACTION_CHIP[entry.action]}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#59413a]">{entry.entityName}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#1e1b19]">{entry.summary}</td>
                    <td className="py-3.5 px-4 text-right font-headline font-bold text-sm text-[#1e1b19]">
                      {entry.amount !== null ? formatKes(entry.amount) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#59413a]">{entry.actor?.name ?? 'System'}</td>
                    <td className="py-3.5 px-4 text-[#59413a] font-mono text-[11px]">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono text-[11px] text-[#006243]" title={`previous: ${entry.previousHash}`}>
                        {shortHash(entry.hash)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#59413a]">
        Financial records are never deleted, only voided: the row stays, the reason is kept, and the
        ledger gets a line. An entry that could be edited would not be an audit trail.
      </p>
    </div>
  );
};
