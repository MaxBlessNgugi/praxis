import React, { useState } from 'react';
import { adminApi, type SoftDeletedRecordDto } from '../../../../lib/api';
import { errorMessage, useTrash } from '../../../../hooks/useApi';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * The Trash: what was retired, who retired it and why, and the way back.
 *
 * The screen this replaced listed five invented people with invented reasons and offered a "purge"
 * that required a passcode — a ritual with nothing behind it. This one is the real retirement log:
 * every soft-deleted record in this church, the label somebody gave when they retired it, and a
 * Restore that puts it back.
 *
 * Two truths it states rather than hides. Restoring is an administrator's action, because the API
 * says so. And there is no permanent-delete button here: the API has none either, so a screen that
 * offered one would be theatre. Whether a record leaves the database for good is a retention decision
 * made with the operator, not a button pressed in a hurry.
 */

/** The console's words for each entity the API can retire. */
const ENTITY_LABELS: Record<string, string> = {
  Member: 'Members',
  Household: 'Households',
  User: 'Accounts',
  Tithe: 'Tithes',
  Offering: 'Offerings',
  Project: 'Project funding',
  Contribution: 'Contributions',
  WelfareCase: 'Welfare',
  CharityActivity: 'Charity',
  Resolution: 'Resolutions',
  Meeting: 'Meetings',
  Document: 'Documents',
  Announcement: 'Announcements',
  Event: 'Events',
  PrayerRequest: 'Prayer requests',
  Service: 'Services',
  Ministry: 'Ministries',
};

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** How long is left before the retention window closes, in the words the office uses. */
function timeLeft(deadline: string | null): string {
  if (!deadline) return 'No deadline set';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'Window closed';
  return days === 1 ? '1 day left' : `${days} days left`;
}

export const TrashPanel: React.FC = () => {
  const [entityName, setEntityName] = useState<string>('');
  const [query, setQuery] = useState('');
  const [includeRestored, setIncludeRestored] = useState(false);
  const trash = useTrash({ entityName: entityName || undefined, q: query || undefined, includeRestored });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const entities = Object.keys(trash.totals.byEntity).sort((a, b) => a.localeCompare(b));

  const restore = async (row: SoftDeletedRecordDto) => {
    setBusyId(row.id);
    setError(null);
    try {
      await adminApi.restore(row.id);
      setNotice(`${row.entityLabel ?? 'The record'} is back where it was.`);
      await trash.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-[9px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#B91C1C]">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-[9px] border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-xs font-semibold text-[#047857]">
          {notice}
        </div>
      )}

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <div className="flex flex-col gap-3 border-b border-[#E7E5E4] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">delete</span>
              Retired records
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              {trash.loading
                ? 'Reading what has been retired…'
                : `${trash.totals.awaitingRestore} ${trash.totals.awaitingRestore === 1 ? 'record is' : 'records are'} waiting to be restored.`}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="trash-q">Search retired records</label>
            <input
              id="trash-q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or reason"
              className="w-full rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] px-3 py-2 text-xs text-[#1C1917] placeholder-[#A8A29E] focus:border-[#C2410C] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/15 sm:w-56"
            />
            <label className="sr-only" htmlFor="trash-entity">Filter by record type</label>
            <select
              id="trash-entity"
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
            <label className="flex items-center gap-2 text-[11px] font-semibold text-[#57534E] select-none cursor-pointer">
              <input
                type="checkbox"
                checked={includeRestored}
                onChange={(event) => setIncludeRestored(event.target.checked)}
                className="h-4 w-4 rounded border-[#D6D3D1] accent-[#C2410C] cursor-pointer"
              />
              Include restored
            </label>
          </div>
        </div>

        <div className="pt-2">
          {trash.loading && <LoadingBlock label="Reading the retirement log…" />}
          {trash.error && <ErrorBlock message={trash.error} onRetry={() => void trash.refetch()} />}
          {!trash.loading && !trash.error && trash.items.length === 0 && (
            <EmptyBlock
              icon="delete_sweep"
              title="Nothing has been retired"
              hint="When somebody retires a member, a household or an account, it lands here with their name against it — and can be put back."
            />
          )}

          {trash.items.length > 0 && (
            <ul className="divide-y divide-[#E7E5E4]">
              {trash.items.map((row) => {
                const restored = Boolean(row.restoredAt);
                return (
                  <li key={row.id} className="flex flex-col gap-3 py-3.5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#1C1917]">{row.entityLabel ?? row.entityId}</span>
                        <span className="rounded-[6px] bg-[#F8F1E9] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#57534E]">
                          {ENTITY_LABELS[row.entityName] ?? row.entityName}
                        </span>
                        {restored && (
                          <span className="rounded-[6px] bg-[#ECFDF5] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#047857]">
                            Restored
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#57534E]">
                        {row.reasonLabel}
                        {' · retired '}
                        {formatWhen(row.deletedAt)}
                        {row.deletedBy ? ` by ${row.deletedBy.name}` : ''}
                      </p>
                      {restored && row.restoredBy && (
                        <p className="mt-0.5 text-[11px] text-[#57534E]">
                          Put back {formatWhen(row.restoredAt as string)} by {row.restoredBy.name}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[11px] font-semibold text-[#57534E]">{restored ? '' : timeLeft(row.restoreDeadline)}</span>
                      <button
                        type="button"
                        disabled={restored || busyId === row.id}
                        onClick={() => void restore(row)}
                        className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#C2410C]">settings_backup_restore</span>
                        {busyId === row.id ? 'Restoring…' : 'Restore'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">shield</span>
          What the Trash is, and is not
        </h3>
        <div className="mt-2 space-y-2 text-xs leading-relaxed text-[#57534E]">
          <p>
            Retiring a record takes it out of the live lists and puts it here, with the reason somebody gave and their
            name against it. Nothing is overwritten, so restoring gives back exactly what was there.
          </p>
          <p>
            The Trash is <strong className="text-[#1C1917]">not a backup</strong>. It answers &ldquo;that was a
            mistake, put it back&rdquo;. Only the scheduled database dump answers &ldquo;the database is gone&rdquo; —
            see <code className="rounded bg-[#F8F1E9] px-1">docs/backups.md</code>.
          </p>
          <p>
            There is deliberately no permanent-delete button on this screen. Deciding that a record should leave the
            database for good is a retention decision — made with the operator, in writing, with the church&apos;s
            obligations in mind — not a click at a busy desk.
          </p>
        </div>
      </div>
    </div>
  );
};
