import React, { useEffect, useState } from 'react';
import { servicesApi, type AttendanceSummaryDto } from '../../../../lib/api';
import { errorMessage, useServiceReport, useServices } from '../../../../hooks/useApi';
import { usePermissions } from '../../../../lib/permissions';
import { formatKes } from '../../../../data/churchDomain';
import { printDocument } from '../../../../lib/documents';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * The post-service report: what happened, in the church's own words.
 *
 * A report belongs to a service and there is exactly one of them — `putReport` upserts on the service
 * id, so "which of these three drafts is true" is a question nobody has to answer. The panel reads
 * that one report, shows it, and edits it in place.
 *
 * The numbers are the report's own. The census recorded against the service is shown beside them as a
 * cross-check, because it is what the ushers counted — adults and children together, since that is how
 * they count — while adults, children and visitors apart are the church's official figures, and the
 * person writing the report is the one who knows them.
 *
 * Signing off is the act that closes a service. It is an administrator's — the signature is what a
 * board minute refers to — and it makes the report read-only, which is why the form stops offering to
 * change it afterwards.
 */

const FIELD =
  'w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1.5';

const whenOf = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

interface Draft {
  summary: string;
  adultsCount: string;
  childrenCount: string;
  visitorsCount: string;
  offeringsTotal: string;
  highlights: string;
}

const EMPTY: Draft = { summary: '', adultsCount: '', childrenCount: '', visitorsCount: '', offeringsTotal: '', highlights: '' };

export const ServiceReportsPanel: React.FC = () => {
  const services = useServices({ pageSize: 100, sort: 'recent' });
  const { canEdit, role } = usePermissions();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<AttendanceSummaryDto | null>(null);

  const record = useServiceReport(selectedId);
  const report = record.report;
  const serviceRows = services.items.filter((service) => !service.isTemplate);
  const selected = serviceRows.find((service) => service.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && serviceRows.length > 0) setSelectedId(serviceRows[0].id);
  }, [selectedId, serviceRows]);

  // The census for this service, so the report can start from what was counted rather than from memory.
  useEffect(() => {
    if (!selectedId) {
      setSummary(null);
      return;
    }
    let live = true;
    servicesApi
      .attendanceSummary(selectedId)
      .then(({ data }) => {
        if (live) setSummary(data);
      })
      .catch(() => {
        if (live) setSummary(null);
      });
    return () => {
      live = false;
    };
  }, [selectedId]);

  useEffect(() => {
    setEditing(false);
    if (!report) {
      setDraft(EMPTY);
      return;
    }
    setDraft({
      summary: report.summary,
      adultsCount: report.adultsCount === null ? '' : String(report.adultsCount),
      childrenCount: report.childrenCount === null ? '' : String(report.childrenCount),
      visitorsCount: report.visitorsCount === null ? '' : String(report.visitorsCount),
      offeringsTotal: report.offeringsTotal === null ? '' : String(report.offeringsTotal),
      highlights: report.highlights ?? '',
    });
  }, [report, selectedId]);

  const number = (value: string): number | undefined => {
    const parsed = Number(value);
    return value.trim() !== '' && Number.isFinite(parsed) ? parsed : undefined;
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await servicesApi.putReport(selectedId, {
        summary: draft.summary.trim(),
        ...(number(draft.adultsCount) === undefined ? {} : { adultsCount: number(draft.adultsCount) }),
        ...(number(draft.childrenCount) === undefined ? {} : { childrenCount: number(draft.childrenCount) }),
        ...(number(draft.visitorsCount) === undefined ? {} : { visitorsCount: number(draft.visitorsCount) }),
        ...(number(draft.offeringsTotal) === undefined ? {} : { offeringsTotal: number(draft.offeringsTotal) }),
        ...(draft.highlights.trim() ? { highlights: draft.highlights.trim() } : {}),
      });
      await record.refetch();
      setEditing(false);
      setNotice('The report is filed against this service.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await servicesApi.finalizeReport(selectedId);
      await record.refetch();
      setNotice('The report is signed off, and the service is closed.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const printDossier = () => {
    if (!selected || !report) return;
    void printDocument(`<!doctype html><html><head><meta charset="utf-8"><title>${selected.title}</title>
      <style>
        body { font-family: Georgia, 'Times New Roman', serif; color: #1c1917; margin: 44px; }
        h1 { font-size: 21px; margin: 0 0 4px; }
        h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #c2410c; margin: 22px 0 6px; }
        .meta { color: #57534e; font-size: 12px; }
        p { font-size: 13px; line-height: 1.55; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        td { border-bottom: 1px solid #e7e5e4; padding: 6px 4px; font-size: 12px; }
        td.k { color: #57534e; width: 45%; }
        .sign { margin-top: 26px; font-size: 12px; color: #57534e; }
      </style></head><body>
      <h1>Service report — ${selected.title}</h1>
      <div class="meta">${whenOf(selected.heldAt)} · ${selected.venue}${
        selected.theme ? ` · ${selected.theme}` : ''
      }</div>
      <h2>The service</h2><p>${report.summary}</p>
      ${report.highlights ? `<h2>Highlights</h2><p>${report.highlights}</p>` : ''}
      <h2>Numbers</h2>
      <table>
        <tr><td class="k">Adults and youth</td><td>${report.adultsCount ?? '—'}</td></tr>
        <tr><td class="k">Children</td><td>${report.childrenCount ?? '—'}</td></tr>
        <tr><td class="k">First-time visitors</td><td>${report.visitorsCount ?? '—'}</td></tr>
        <tr><td class="k">Offerings recorded with the report</td><td>${
          report.offeringsTotal === null ? '—' : formatKes(report.offeringsTotal)
        }</td></tr>
      </table>
      <div class="sign">Prepared by ${report.preparedBy?.name ?? 'the church office'} · ${
        new Date(report.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      }</div>
      </body></html>`);
  };

  return (
    <div className="space-y-5">
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* The services a report can be filed against */}
        <div className="xl:col-span-4">
          <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
            <h3 className="flex items-center gap-1.5 font-headline text-sm font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#C2410C]">summarize</span>
              Services
            </h3>
            <p className="mt-0.5 text-[11px] text-[#57534E]">Most recent first. One report per service.</p>

            <div className="mt-3 space-y-2">
              {services.loading && <LoadingBlock label="Reading the services…" />}
              {services.error && <ErrorBlock message={services.error} onRetry={() => void services.refetch()} />}
              {!services.loading && !services.error && serviceRows.length === 0 && (
                <EmptyBlock
                  icon="event_busy"
                  title="No services yet"
                  hint="A report is written about a service, so schedule one in the Service Planner first."
                />
              )}
              {serviceRows.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedId(service.id)}
                  aria-current={service.id === selectedId ? 'true' : undefined}
                  className={`w-full rounded-[12px] border p-3 text-left transition-all cursor-pointer ${
                    service.id === selectedId
                      ? 'border-[#C2410C] bg-[#FDF8F3] shadow-[0_2px_8px_rgba(194,65,12,0.12)]'
                      : 'border-[#E7E5E4] bg-[#FFFFFF] hover:border-[#D6D3D1] hover:bg-[#FDF8F3]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#1C1917]">{service.title}</span>
                  <p className="mt-0.5 text-[11px] text-[#57534E]">
                    {new Date(service.heldAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ·{' '}
                    {service.venue}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-[#57534E]">
                    {service._count?.attendance ?? 0} census rows · {service._count?.roster ?? 0} on duty
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* The report itself */}
        <div className="space-y-5 xl:col-span-8">
          {!selected && !services.loading && (
            <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
              <EmptyBlock icon="article" title="Choose a service" hint="Pick one on the left to read or write its report." />
            </div>
          )}

          {selected && (
            <>
              <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#C2410C]">
                      {report ? 'Report filed' : 'No report yet'}
                    </p>
                    <h2 className="mt-0.5 font-headline text-xl font-extrabold text-[#1C1917]">{selected.title}</h2>
                    <p className="mt-1 text-xs text-[#57534E]">
                      {whenOf(selected.heldAt)} · {selected.venue}
                    </p>
                    {report && (
                      <p className="mt-1 text-xs text-[#57534E]">
                        Prepared by {report.preparedBy?.name ?? 'the church office'} ·{' '}
                        {new Date(report.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {report && (
                      <button
                        type="button"
                        onClick={printDossier}
                        className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#C2410C]">print</span>
                        Print
                      </button>
                    )}
                    {report && !report.finalizedAt && isAdmin && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void finalize()}
                        className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1.5 text-xs font-bold text-[#047857] transition-colors hover:bg-[#D1FAE5] disabled:opacity-60 cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">verified</span>
                        {busy ? 'Signing…' : 'Sign it off'}
                      </button>
                    )}
                    {canEdit('services') && !editing && (!report?.finalizedAt || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#C2410C] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">edit</span>
                        {report?.finalizedAt ? 'Revise it anyway' : report ? 'Revise the report' : 'Write the report'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Adults & youth', value: report?.adultsCount ?? '—' },
                    { label: 'Children', value: report?.childrenCount ?? '—' },
                    { label: 'First-time visitors', value: report?.visitorsCount ?? '—' },
                    {
                      label: 'Offerings recorded here',
                      value: report?.offeringsTotal === null || report?.offeringsTotal === undefined
                        ? '—'
                        : formatKes(report.offeringsTotal),
                    },
                  ].map((card) => (
                    <div key={card.label} className="rounded-[12px] border border-[#E7E5E4] bg-[#FDF8F3] px-3 py-2.5">
                      <div className="font-headline text-lg font-bold text-[#1C1917]">{card.value}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#57534E]">{card.label}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-[#57534E]">
                  {summary && summary.attendanceRows > 0 ? (
                    <>
                      The census recorded <strong className="text-[#1C1917]">{summary.totalCounted}</strong> in all across{' '}
                      {summary.attendanceRows} {summary.attendanceRows === 1 ? 'row' : 'rows'}, with{' '}
                      <strong className="text-[#1C1917]">{summary.namedVisitors}</strong>{' '}
                      {summary.namedVisitors === 1 ? 'visitor' : 'visitors'} named.
                    </>
                  ) : (
                    'No census was recorded against this service. The attendance tab is where it is taken.'
                  )}
                </p>
                {report?.finalizedAt && (
                  <p
                    role="status"
                    className="mt-3 rounded-[9px] border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[11px] font-semibold text-[#047857]"
                  >
                    Signed off on{' '}
                    {new Date(report.finalizedAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                    .{' '}
                    {isAdmin
                      ? 'The service is closed; an administrator can still revise it.'
                      : 'The service is closed, and the report is read-only.'}
                  </p>
                )}
              </div>

              {record.loading && (
                <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
                  <LoadingBlock label="Reading the report…" />
                </div>
              )}
              {record.error && <ErrorBlock message={record.error} onRetry={() => void record.refetch()} />}

              {editing ? (
                <form onSubmit={save} className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
                  <h3 className="font-headline text-base font-bold text-[#1C1917]">The report</h3>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className={LABEL} htmlFor="report-summary">What happened in the service</label>
                      <textarea
                        id="report-summary"
                        required
                        rows={5}
                        value={draft.summary}
                        onChange={(e) => setDraft((previous) => ({ ...previous, summary: e.target.value }))}
                        placeholder="The sermon text, how the service ran, anything the council should know…"
                        className={FIELD}
                      />
                      <p className="mt-1 text-[11px] text-[#57534E]">At least a sentence or two — this is the record, not a formality.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <label className={LABEL} htmlFor="report-adults">Adults &amp; youth</label>
                        <input id="report-adults" type="number" min={0} value={draft.adultsCount} onChange={(e) => setDraft((previous) => ({ ...previous, adultsCount: e.target.value }))} className={FIELD} />
                      </div>
                      <div>
                        <label className={LABEL} htmlFor="report-children">Children</label>
                        <input id="report-children" type="number" min={0} value={draft.childrenCount} onChange={(e) => setDraft((previous) => ({ ...previous, childrenCount: e.target.value }))} className={FIELD} />
                      </div>
                      <div>
                        <label className={LABEL} htmlFor="report-visitors">Visitors</label>
                        <input id="report-visitors" type="number" min={0} value={draft.visitorsCount} onChange={(e) => setDraft((previous) => ({ ...previous, visitorsCount: e.target.value }))} className={FIELD} />
                      </div>
                      <div>
                        <label className={LABEL} htmlFor="report-offerings">Offerings (KSh)</label>
                        <input id="report-offerings" type="number" min={0} value={draft.offeringsTotal} onChange={(e) => setDraft((previous) => ({ ...previous, offeringsTotal: e.target.value }))} className={FIELD} />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="report-highlights">Highlights worth remembering</label>
                      <textarea
                        id="report-highlights"
                        rows={3}
                        value={draft.highlights}
                        onChange={(e) => setDraft((previous) => ({ ...previous, highlights: e.target.value }))}
                        placeholder="Testimonies, decisions, a first-time visitor who asked about baptism…"
                        className={FIELD}
                      />
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                    <span className="mr-auto text-[11px] text-[#57534E]">
                      {summary && summary.attendanceRows > 0
                        ? `The census recorded ${summary.totalCounted} in all and ${summary.namedVisitors} named visitors.`
                        : 'No census was recorded against this service.'}
                    </span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditing(false)} className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] hover:bg-[#F5EDE4] cursor-pointer">
                        Cancel
                      </button>
                      <button type="submit" disabled={busy} className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer">
                        {busy ? 'Filing…' : 'File the report'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                report && (
                  <div className="space-y-5">
                    <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
                      <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
                        <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#C2410C]">article</span>
                        The service
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#44403C]">{report.summary}</p>
                    </div>
                    {report.highlights && (
                      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
                        <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
                          <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#C2410C]">auto_awesome</span>
                          Highlights
                        </h3>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#44403C]">{report.highlights}</p>
                      </div>
                    )}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
