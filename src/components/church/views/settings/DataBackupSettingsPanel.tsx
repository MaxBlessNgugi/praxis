import React, { useState } from 'react';
import { settingsApi, type ChurchExportDto } from '../../../../lib/api';
import { errorMessage, useResource } from '../../../../hooks/useApi';
import { ErrorBlock, LoadingBlock } from '../../DataState';
import { usePermissions } from '../../../../lib/permissions';
import { LegalDialog } from '../../../legal/LegalDialog';

/**
 * Data & backup.
 *
 * This screen used to be six fabricated snapshots with a "Restore" button that changed nothing — the
 * most dangerous kind of mock, because it is the screen somebody opens the day something has gone
 * wrong. It now does the two things it can honestly do from a browser: report what this church holds,
 * and hand over a copy of it. The backup that actually protects the church is a `pg_dump` on the
 * machine that owns the database, which is a thing no web page can press; the panel says so, and
 * points at `docs/backups.md` rather than implying otherwise.
 */

/** A row of the counts, in the words of the office rather than of the schema. */
const COUNT_LABELS: Record<string, string> = {
  members: 'Members',
  households: 'Households',
  ministries: 'Departments',
  services: 'Services held',
  tithesAndOfferings: 'Giving records',
  projectContributions: 'Project contributions',
  welfareCases: 'Welfare cases',
  charityActivities: 'Charity activities',
  announcements: 'Announcements',
  broadcasts: 'Broadcasts',
  events: 'Events',
  prayerRequests: 'Prayer requests',
  meetings: 'Meetings',
  resolutions: 'Resolutions',
  documents: 'Documents',
  users: 'Accounts',
};

function downloadJson(bundle: ChurchExportDto): void {
  const name = bundle.church.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'church';
  const stamp = bundle.exportedAt.slice(0, 10);
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `praxis-${name}-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const DataBackupSettingsPanel: React.FC = () => {
  /** Which trust document is open, if any — the dialog is shared with the sign-in screen. */
  const [legal, setLegal] = useState<'privacy' | 'terms' | 'data' | null>(null);
  const { role } = usePermissions();
  // The envelope is unwrapped in the fetcher, so every read below is of the manifest itself.
  const manifest = useResource(async () => (await settingsApi.backup()).data, []);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exported, setExported] = useState<number | null>(null);

  // Admin-only on the server; a staff account is not shown a button that would be refused.
  const canExport = role === 'super_admin' || role === 'admin';

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    setExported(null);
    try {
      const { data } = await settingsApi.exportData();
      downloadJson(data);
      setExported(data.totalRecords);
    } catch (err) {
      setExportError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <div className="flex flex-col gap-3 border-b border-[#E7E5E4] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">backup</span>
              What this church holds
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              A count of the live records behind every screen, reported by the server rather than remembered here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void manifest.refetch()}
            className="inline-flex items-center gap-1.5 self-start rounded-[8px] border border-[#E7E5E4] bg-[#F8F1E9] px-3 py-1.5 font-headline text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4]"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">refresh</span>
            Recount
          </button>
        </div>

        <div className="pt-4">
          {manifest.loading && <LoadingBlock label="Counting this church's records…" />}
          {manifest.error && <ErrorBlock message={manifest.error} onRetry={() => void manifest.refetch()} />}
          {manifest.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(manifest.data.records).map(([key, count]) => (
                  <div key={key} className="rounded-[10px] border border-[#E7E5E4] bg-[#FDF8F3] px-3 py-2">
                    <div className="font-headline text-lg font-bold text-[#1C1917]">{count}</div>
                    <div className="text-[11px] font-semibold text-[#57534E]">{COUNT_LABELS[key] ?? key}</div>
                  </div>
                ))}
              </div>

              <dl className="grid gap-3 text-xs sm:grid-cols-3">
                <div className="rounded-[10px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-2.5">
                  <dt className="font-bold text-[#1C1917]">Last recorded change</dt>
                  <dd className="mt-0.5 text-[#57534E]">
                    {manifest.data.lastWrite
                      ? `${manifest.data.lastWrite.summary ?? 'A record changed'} — ${new Date(manifest.data.lastWrite.at).toLocaleString()}`
                      : 'Nothing recorded yet'}
                  </dd>
                </div>
                <div className="rounded-[10px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-2.5">
                  <dt className="font-bold text-[#1C1917]">Finance ledger</dt>
                  <dd className="mt-0.5 text-[#57534E]">
                    {manifest.data.ledger.entries} entries since the first one on Sunday morning
                  </dd>
                </div>
                <div className="rounded-[10px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-2.5">
                  <dt className="font-bold text-[#1C1917]">In the Trash</dt>
                  <dd className="mt-0.5 text-[#57534E]">
                    {manifest.data.archivedAwaitingRestore} retired records, restorable from Admin → Trash
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">download</span>
          Take a copy of your records
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[#57534E]">
          One file holding this church&rsquo;s registers, ledgers, minutes, notices and staff list — every row as it
          stands, including records you have retired. It is yours to keep, and it is what you would hand over if you ever
          moved off Praxis.
        </p>

        <ul className="mt-3 space-y-1 text-xs text-[#57534E]">
          <li className="flex items-start gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#059669]">check</span>
            Members, households, giving, welfare, charity, services, attendance, meetings, resolutions and documents.
          </li>
          <li className="flex items-start gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#059669]">check</span>
            Your audit log and the finance ledger, so the file can be checked against the trail.
          </li>
          <li className="flex items-start gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#B45309]">block</span>
            No passwords, no session tokens, and no file contents — uploads are listed by name and size, and their bytes
            stay in the database, where the database backup already covers them.
          </li>
          <li className="flex items-start gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#B45309]">block</span>
            The three running logs are capped at the 20,000 most recent rows each, so the file stays openable.
          </li>
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {canExport ? (
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#C2410C] px-4 py-2 font-headline text-xs font-bold text-white shadow-sm transition-all hover:bg-[#EA580C] disabled:cursor-wait disabled:opacity-70"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">download</span>
              {exporting ? 'Preparing the file…' : 'Download a copy'}
            </button>
          ) : (
            <span className="text-xs font-semibold text-[#57534E]">
              An administrator can download this church&rsquo;s records. Ask Bishop Sammy or Rev. Alice.
            </span>
          )}

          {exported !== null && (
            <span className="text-xs font-semibold text-[#047857]">The file was written — {exported} records.</span>
          )}
        </div>
        {exportError && <p role="alert" className="mt-3 text-xs font-semibold text-[#B91C1C]">{exportError}</p>}
      </div>

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">shield</span>
          How this church is actually backed up
        </h3>
        <div className="mt-2 space-y-3 text-xs leading-relaxed text-[#57534E]">
          <p>
            Everything above lives in one PostgreSQL database, and that database is the thing to protect. The provider
            keeps continuous automatic backups, and the office takes a <code className="rounded bg-[#F8F1E9] px-1">pg_dump</code>{' '}
            on a schedule — weekly is the cadence a single congregation needs. The dump is a file you can hold, which the
            provider&rsquo;s snapshots are not.
          </p>
          <p>
            The copy on this page is for <em>you</em>: a readable file, taken when you want one. It is not a substitute for
            a database backup, because it cannot be restored into the system — it is a copy, not a restore point.
          </p>
          <p className="rounded-[10px] border border-[#E7E5E4] bg-[#FDF8F3] px-3 py-2.5">
            <strong className="text-[#1C1917]">Before every schema upgrade</strong>, take a dump. It costs seconds and it
            is the only thing that makes the upgrade reversible. The command and the restore rehearsal are written down in{' '}
            <code className="rounded bg-[#F8F1E9] px-1">docs/backups.md</code>, and{' '}
            <code className="rounded bg-[#F8F1E9] px-1">npm run backup</code> runs it with the flags that matter.
          </p>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">restore</span>
          Recovering something
        </h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {[
            {
              title: 'A record was retired by mistake',
              body: 'Admin → Trash lists everything retired in the app with a reason and a date, and puts it back in one press. Nothing else is needed, and no backup is involved.',
              icon: 'delete_history',
            },
            {
              title: 'You need to know what changed',
              body: 'Admin → Audit Log records who changed what, with a before and after. Filter it by the record you are worried about.',
              icon: 'history',
            },
            {
              title: 'The ledger needs checking',
              body: 'Admin → Finance Audit recomputes the entry chain and names the first line that no longer adds up — the one check that catches a row edited outside the console.',
              icon: 'receipt_long',
            },
          ].map((card) => (
            <div key={card.title} className="rounded-[10px] border border-[#E7E5E4] bg-[#FDF8F3] px-3 py-3">
              <div className="flex items-center gap-1.5 font-bold text-[#1C1917]">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#C2410C]">{card.icon}</span>
                {card.title}
              </div>
              <p className="mt-1 text-[#57534E]">{card.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[#57534E]">
          None of these three is a backup. Trash and the audit log answer &ldquo;put it back&rdquo; and &ldquo;who did
          that&rdquo;; only the database dump answers &ldquo;the database is gone&rdquo;.
        </p>
      </div>

      {/* The documents a church gets asked about at a desk: what is held, who may see it, and what
          the church owes its members under the Data Protection Act. Same dialog the gate opens. */}
      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">verified_user</span>
          Privacy, terms and data protection
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-[#57534E]">
          What Praxis holds, who can see it, and what this church owes its members under Kenya&apos;s Data
          Protection Act. These are the drafts the office works from — hand them to your leadership, and
          to your lawyer before you rely on them.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {([
            { section: 'privacy', label: 'Privacy policy', icon: 'shield_lock' },
            { section: 'data', label: 'Data protection (Kenya)', icon: 'policy' },
            { section: 'terms', label: 'Terms of use', icon: 'gavel' },
          ] as const).map((doc) => (
            <button
              key={doc.section}
              type="button"
              onClick={() => setLegal(doc.section)}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#E7E5E4] bg-[#F8F1E9] px-3 py-2 font-headline text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#C2410C]">{doc.icon}</span>
              {doc.label}
            </button>
          ))}
        </div>
      </div>

      {legal && <LegalDialog initialSection={legal} onClose={() => setLegal(null)} />}
    </div>
  );
};
