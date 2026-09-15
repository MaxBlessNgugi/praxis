import React, { useState } from 'react';
import { adminApi, type AuditLogDto } from '../../../../lib/api';
import { errorMessage, useAuditLog } from '../../../../hooks/useApi';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * Who changed what, oldest concerns first.
 *
 * The church's own audit trail: every create, edit, retirement and restore in this church, with the
 * account that did it and a sentence saying what it was. It is the answer to the question that
 * arrives months later — "who changed this, and when" — and it is the reason the console asks people
 * to sign in as themselves rather than share a login.
 *
 * Two things it deliberately does not do. It does not offer a way to edit or remove a line, because a
 * log anybody can tidy is not evidence. And it shows the *summary* rather than the full before/after
 * snapshot: a member's record carries pastoral detail, and a screen that prints every field of it to
 * whoever is browsing the log is a small privacy leak with a friendly name. The snapshot is available
 * per record from the API when it is genuinely needed.
 */

const ACTION_LABEL: Record<AuditLogDto['action'], string> = {
  create: 'Created',
  update: 'Changed',
  delete: 'Retired',
  restore: 'Restored',
  login: 'Signed in',
};

const ACTION_STYLE: Record<AuditLogDto['action'], string> = {
  create: 'bg-[#ECFDF5] text-[#047857]',
  update: 'bg-[#F8F1E9] text-[#57534E]',
  delete: 'bg-[#FEF2F2] text-[#B91C1C]',
  restore: 'bg-[#ECFDF5] text-[#047857]',
  login: 'bg-[#FDF8F3] text-[#57534E]',
};

/** The console's words for the entities the API writes lines about. */
const ENTITY_LABELS: Record<string, string> = {
  Member: 'Member',
  Household: 'Household',
  User: 'Account',
  Organization: 'Church',
  Tithe: 'Tithe',
  Offering: 'Offering',
  Project: 'Project',
  WelfareCase: 'Welfare case',
  CharityActivity: 'Charity activity',
  Resolution: 'Resolution',
  Meeting: 'Meeting',
  Document: 'Document',
  Announcement: 'Announcement',
  Event: 'Event',
  PrayerRequest: 'Prayer request',
  Service: 'Service',
  Ministry: 'Ministry',
  OrganizationProfile: 'Church profile',
};

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const AuditLogPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState<AuditLogDto['action'] | ''>('');
  const [entityName, setEntityName] = useState('');
  const log = useAuditLog({ q: query || undefined, action: action || undefined, entityName: entityName || undefined });

  const [selected, setSelected] = useState<AuditLogDto | null>(null);
  const [history, setHistory] = useState<AuditLogDto[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const actions = Object.keys(log.totals.byAction) as Array<AuditLogDto['action']>;
  const entities = Object.keys(log.totals.byEntity).sort((a, b) => a.localeCompare(b));

  /** Everything that ever happened to one record, read back from the other log as well. */
  const openHistory = async (row: AuditLogDto) => {
    setSelected(row);
    setHistory(null);
    setHistoryError(null);
    try {
      const { data } = await adminApi.recordHistory(row.entityName, row.entityId);
      setHistory(data.audit);
    } catch (err) {
      setHistoryError(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <div className="flex flex-col gap-3 border-b border-[#E7E5E4] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">history</span>
              Audit log
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              {log.loading
                ? 'Reading the log…'
                : `${log.items.length} ${log.items.length === 1 ? 'entry' : 'entries'}, newest first. Filter by who, what or which record.`}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="audit-q">Search the audit log</label>
            <input
              id="audit-q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a name or a record"
              className="w-full rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] px-3 py-2 text-xs text-[#1C1917] placeholder-[#A8A29E] focus:border-[#C2410C] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/15 sm:w-56"
            />
            <label className="sr-only" htmlFor="audit-action">Filter by action</label>
            <select
              id="audit-action"
              value={action}
              onChange={(event) => setAction(event.target.value as AuditLogDto['action'] | '')}
              className="rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] px-2.5 py-2 text-xs font-semibold text-[#1C1917] cursor-pointer"
            >
              <option value="">Every action</option>
              {actions.map((key) => (
                <option key={key} value={key}>
                  {ACTION_LABEL[key] ?? key}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="audit-entity">Filter by record type</label>
            <select
              id="audit-entity"
              value={entityName}
              onChange={(event) => setEntityName(event.target.value)}
              className="rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] px-2.5 py-2 text-xs font-semibold text-[#1C1917] cursor-pointer"
            >
              <option value="">Every record type</option>
              {entities.map((key) => (
                <option key={key} value={key}>
                  {ENTITY_LABELS[key] ?? key}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2">
          {log.loading && <LoadingBlock label="Reading the audit log…" />}
          {log.error && <ErrorBlock message={log.error} onRetry={() => void log.refetch()} />}
          {!log.loading && !log.error && log.items.length === 0 && (
            <EmptyBlock
              icon="history"
              title="Nothing matches that"
              hint="Every change to a record lands here — who made it, and what it was. Try a wider search."
            />
          )}

          {log.items.length > 0 && (
            <ul className="divide-y divide-[#E7E5E4]">
              {log.items.map((row) => (
                <li key={row.id} className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ACTION_STYLE[row.action] ?? ACTION_STYLE.update}`}>
                        {ACTION_LABEL[row.action] ?? row.action}
                      </span>
                      <span className="text-xs font-bold text-[#1C1917]">{row.actor?.name ?? 'Someone no longer here'}</span>
                      <span className="rounded-[6px] bg-[#F8F1E9] px-1.5 py-0.5 text-[10px] font-semibold text-[#57534E]">
                        {ENTITY_LABELS[row.entityName] ?? row.entityName}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#57534E]">{row.summary ?? 'No description was recorded'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-[11px] text-[#57534E]">{formatWhen(row.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => void openHistory(row)}
                      className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
                    >
                      This record
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">info</span>
          Reading the log
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-[#57534E]">
          Nothing here can be edited or deleted, by anybody, including the operator — a log somebody can tidy is not
          evidence. The sign-in lines are kept as well as the changes, so &ldquo;nobody has touched it&rdquo; and
          &ldquo;nobody has been in the system&rdquo; are different answers and both are available.
        </p>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4">
          <div className="flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-headline text-base font-bold text-[#1C1917]">
                  Everything that happened to this {ENTITY_LABELS[selected.entityName] ?? selected.entityName.toLowerCase()}
                </h3>
                <p className="mt-0.5 text-[11px] text-[#57534E]">Newest first, read straight from the log.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917] cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[19px]">close</span>
              </button>
            </div>

            <div className="mt-4 overflow-y-auto">
              {historyError && <ErrorBlock message={historyError} />}
              {!history && !historyError && <LoadingBlock label="Reading this record's history…" />}
              {history && history.length === 0 && <EmptyBlock icon="history" title="No history recorded" />}
              {history && history.length > 0 && (
                <ol className="space-y-3">
                  {[...history].reverse().map((entry) => (
                    <li key={entry.id} className="rounded-[10px] border border-[#E7E5E4] bg-[#FDF8F3] px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold uppercase ${ACTION_STYLE[entry.action] ?? ACTION_STYLE.update}`}>
                          {ACTION_LABEL[entry.action] ?? entry.action}
                        </span>
                        <span className="text-xs font-bold text-[#1C1917]">{entry.actor?.name ?? 'Unknown'}</span>
                        <span className="text-[11px] text-[#57534E]">{formatWhen(entry.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#57534E]">{entry.summary ?? '—'}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
