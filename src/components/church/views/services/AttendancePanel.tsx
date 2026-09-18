import React, { useEffect, useMemo, useState } from 'react';
import { memberRefName, servicesApi, type AttendanceSummaryDto } from '../../../../lib/api';
import { errorMessage, useAttendance, useMemberOptions, useServices } from '../../../../hooks/useApi';
import { reportsApi } from '../../../../lib/api';
import { downloadBlob } from '../../../../lib/export';
import { usePermissions } from '../../../../lib/permissions';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * The census: how many came, and who came for the first time.
 *
 * Two things about this screen are shaped by what the API actually is. Attendance rows are
 * **append-only** — there is no endpoint that edits or deletes one, because a census is a record of
 * what was counted on the day rather than a field somebody keeps tidy. So the panel records; it does
 * not offer an edit that would fail. A number that was typed wrong is corrected by recording the
 * correction with a note saying so, which is the same thing an usher's tally sheet does.
 *
 * And first-time visitors are counted by **naming** them, not by typing a total. "23 visitors" in a
 * note is a number nothing can act on; a visitor row with a name is somebody the church can follow up
 * with, and it is what the church's own summary counts.
 */

const FIELD =
  'w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1.5';

const whenOf = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const AttendancePanel: React.FC = () => {
  // Recent first: a census is almost always taken for the service that has just finished.
  const services = useServices({ pageSize: 100, sort: 'recent' });
  const members = useMemberOptions();
  const { canEdit } = usePermissions();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [census, setCensus] = useState({ adults: '', children: '', notes: '' });
  const [visitor, setVisitor] = useState({ name: '', memberId: '', notes: '' });
  const [summary, setSummary] = useState<AttendanceSummaryDto | null>(null);

  const rows = useAttendance(selectedId ? { serviceId: selectedId } : {});
  // Every row in the church, so the trend can be built from one request rather than one per service.
  const allRows = useAttendance();

  const serviceRows = services.items;
  const selected = serviceRows.find((service) => service.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && serviceRows.length > 0) setSelectedId(serviceRows[0].id);
  }, [selectedId, serviceRows]);

  const reloadSummary = async (serviceId: string) => {
    try {
      const { data } = await servicesApi.attendanceSummary(serviceId);
      setSummary(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  useEffect(() => {
    if (selectedId) void reloadSummary(selectedId);
    else setSummary(null);
  }, [selectedId]);

  const recordedHere = rows.items.filter((row) => row.serviceId === selectedId);
  const namesHere = recordedHere.filter((row) => row.visitorName !== null);

  /** The last eight services, with what was counted at each — real figures, one request. */
  const trend = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of allRows.items) {
      if (!row.serviceId) continue;
      totals.set(row.serviceId, (totals.get(row.serviceId) ?? 0) + row.count);
    }
    return serviceRows
      .filter((service) => !service.isTemplate && totals.has(service.id))
      .slice(0, 8)
      .reverse()
      .map((service) => ({ service, total: totals.get(service.id) ?? 0 }));
  }, [allRows.items, serviceRows]);

  const trendPeak = Math.max(1, ...trend.map((point) => point.total));

  const record = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    const counts = [
      { count: Number(census.adults), label: 'Adults and youth' },
      { count: Number(census.children), label: 'Children' },
    ].filter((entry) => entry.count > 0);

    if (counts.length === 0) {
      setError('Enter at least one number — adults or children.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await servicesApi.recordAttendance(selectedId, [
        ...counts.map((entry) => ({ kind: 'service' as const, count: entry.count, notes: entry.label })),
        ...(census.notes.trim() ? [{ kind: 'service' as const, count: 0, notes: census.notes.trim() }] : []),
      ]);
      setCensus({ adults: '', children: '', notes: '' });
      setNotice('The census is recorded against this service.');
      await Promise.all([rows.refetch(), allRows.refetch(), reloadSummary(selectedId)]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const recordVisitor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !visitor.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await servicesApi.recordAttendance(selectedId, [
        {
          kind: 'service',
          count: 1,
          visitorName: visitor.name.trim(),
          ...(visitor.memberId ? { memberId: visitor.memberId } : {}),
          ...(visitor.notes.trim() ? { notes: visitor.notes.trim() } : {}),
        },
      ]);
      setVisitor({ name: '', memberId: '', notes: '' });
      setNotice(`${visitor.name.trim()} is on the visitors list for this service.`);
      await Promise.all([rows.refetch(), allRows.refetch(), reloadSummary(selectedId)]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const [exporting, setExporting] = useState(false);
  /** The whole attendance ledger, as the server has it — the register, not the page on screen. */
  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      downloadBlob('praxis-attendance.csv', await reportsApi.attendanceCsv());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
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

      {/* Which service, and what has been counted at it */}
      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <label className={LABEL} htmlFor="attendance-service">Which service</label>
            <select
              id="attendance-service"
              value={selectedId ?? ''}
              onChange={(event) => setSelectedId(event.target.value)}
              className={`${FIELD} max-w-md`}
            >
              {serviceRows.length === 0 && <option value="">Nothing on the calendar yet</option>}
              {serviceRows.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title} · {whenOf(service.heldAt)} · {service.venue}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
              className="h-9 px-3 rounded-lg bg-white border border-[#E7E5E4] text-xs font-semibold text-[#1C1917] hover:bg-[#faf2ee] disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">download</span>
              {exporting ? 'Preparing…' : 'Export CSV'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Counted', value: summary?.totalCounted ?? 0 },
              { label: 'Rows', value: summary?.attendanceRows ?? 0 },
              { label: 'First-time visitors', value: summary?.namedVisitors ?? 0 },
            ].map((card) => (
              <div key={card.label} className="rounded-[12px] border border-[#E7E5E4] bg-[#FDF8F3] px-3 py-2 text-center">
                <div className="font-headline text-xl font-bold text-[#1C1917]">{card.value}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[#57534E]">{card.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Census entry */}
        <div className="space-y-5 xl:col-span-5">
          <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
            <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#C2410C]">how_to_reg</span>
              Record the census
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              Two numbers, as the ushers count them, each stored as its own row and labelled the way it was
              counted.
            </p>

            {!selected && (
              <p className="mt-3 text-xs text-[#57534E]">
                Schedule a service in the Service Planner first — a census is always counted against one.
              </p>
            )}

            {selected && (
              <form onSubmit={record} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL} htmlFor="census-adults">Adults and youth</label>
                    <input
                      id="census-adults"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={census.adults}
                      onChange={(e) => setCensus((previous) => ({ ...previous, adults: e.target.value }))}
                      placeholder="0"
                      className={FIELD}
                      disabled={!canEdit('services')}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="census-children">Children</label>
                    <input
                      id="census-children"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={census.children}
                      onChange={(e) => setCensus((previous) => ({ ...previous, children: e.target.value }))}
                      placeholder="0"
                      className={FIELD}
                      disabled={!canEdit('services')}
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL} htmlFor="census-notes">Anything worth recording</label>
                  <textarea
                    id="census-notes"
                    rows={2}
                    value={census.notes}
                    onChange={(e) => setCensus((previous) => ({ ...previous, notes: e.target.value }))}
                    placeholder="Overflow seating used; a correction to last week's figure."
                    className={FIELD}
                    disabled={!canEdit('services')}
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || !canEdit('services')}
                  className="w-full rounded-[9px] bg-[#C2410C] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer"
                >
                  {busy ? 'Recording…' : 'Record the census'}
                </button>
                <p className="text-[11px] leading-relaxed text-[#57534E]">
                  A census row is recorded rather than edited — the count of what was seen on the day stays as it was
                  taken. A figure typed wrong is fixed by recording the correction with a note.
                </p>
              </form>
            )}
          </div>

          <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
            <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#C2410C]">person_add</span>
              A first-time visitor
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              Named, not counted. A name is somebody the church can follow up with this week.
            </p>
            {selected && (
              <form onSubmit={recordVisitor} className="mt-4 space-y-3">
                <div>
                  <label className={LABEL} htmlFor="visitor-name">Their name</label>
                  <input
                    id="visitor-name"
                    required
                    value={visitor.name}
                    onChange={(e) => setVisitor((previous) => ({ ...previous, name: e.target.value }))}
                    placeholder="Jonathan Wanjala"
                    className={FIELD}
                    disabled={!canEdit('services')}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="visitor-member">Already on the register?</label>
                  <select
                    id="visitor-member"
                    value={visitor.memberId}
                    onChange={(e) => setVisitor((previous) => ({ ...previous, memberId: e.target.value }))}
                    className={FIELD}
                    disabled={!canEdit('services')}
                  >
                    <option value="">Not on the register</option>
                    {members.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberRefName(member)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="visitor-notes">How they came / who brought them</label>
                  <input
                    id="visitor-notes"
                    value={visitor.notes}
                    onChange={(e) => setVisitor((previous) => ({ ...previous, notes: e.target.value }))}
                    placeholder="Invited by the Njeri household"
                    className={FIELD}
                    disabled={!canEdit('services')}
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || !canEdit('services')}
                  className="w-full rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] disabled:opacity-60 cursor-pointer"
                >
                  {busy ? 'Saving…' : 'Add to the visitors list'}
                </button>
              </form>
            )}
            {!selected && <p className="mt-3 text-xs text-[#57534E]">Choose a service first.</p>}
          </div>
        </div>

        {/* History, rows and visitors */}
        <div className="space-y-5 xl:col-span-7">
          <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
            <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#C2410C]">insights</span>
              Attendance at recent services
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              Every service this church has counted, most recent on the right.
            </p>
            <div className="mt-4">
              {allRows.loading && <LoadingBlock label="Adding up the census…" />}
              {allRows.error && <ErrorBlock message={allRows.error} onRetry={() => void allRows.refetch()} />}
              {!allRows.loading && !allRows.error && trend.length === 0 && (
                <EmptyBlock
                  icon="bar_chart"
                  title="Nothing counted yet"
                  hint="Record a census against a service and it appears here — one bar per service, and a trend after a month of Sundays."
                />
              )}
              {trend.length > 0 && (
                <div className="flex items-end gap-3">
                  {trend.map((point) => (
                    <div key={point.service.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#1C1917]">{point.total}</span>
                      <div
                        className="w-full rounded-t-[7px] bg-[#C2410C]/85"
                        style={{ height: `${Math.max(6, Math.round((point.total / trendPeak) * 130))}px` }}
                        title={`${point.service.title} · ${point.total} counted`}
                      />
                      <span className="truncate text-[10px] text-[#57534E]">
                        {new Date(point.service.heldAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
            <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#C2410C]">checklist</span>
              What was recorded
            </h3>
            <div className="mt-3">
              {rows.loading && <LoadingBlock label="Reading this service's census…" />}
              {rows.error && <ErrorBlock message={rows.error} onRetry={() => void rows.refetch()} />}
              {!rows.loading && !rows.error && recordedHere.length === 0 && (
                <EmptyBlock
                  icon="fact_check"
                  title="Nothing recorded for this service"
                  hint="The census is entered above. Rows appear here as they are recorded."
                />
              )}
              {recordedHere.length > 0 && (
                <ul className="divide-y divide-[#E7E5E4]">
                  {recordedHere.map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1C1917]">
                          {row.visitorName ?? (memberRefName(row.member) || row.notes || 'Census row')}
                        </p>
                        <p className="text-[11px] text-[#57534E]">
                          {row.visitorName
                            ? 'Visitor'
                            : row.count === 0
                              ? 'Note'
                              : `${row.count} counted`}
                          {row.visitorName && row.member ? ` · linked to ${memberRefName(row.member)}` : ''}
                          {row.notes && !row.visitorName ? ` · ${row.notes}` : ''}
                          {row.notes && row.visitorName ? ` · ${row.notes}` : ''}
                          {' · '}
                          {new Date(row.recordedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      {row.visitorName && (
                        <span className="shrink-0 rounded-[6px] bg-[#F8F1E9] px-2 py-0.5 text-[10px] font-bold uppercase text-[#57534E]">
                          First time
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
            <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#C2410C]">diversity_1</span>
              Visitors at this service
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              {namesHere.length === 0
                ? 'Nobody has been recorded as a first-time visitor.'
                : `${namesHere.length} ${namesHere.length === 1 ? 'person came' : 'people came'} for the first time.`}
            </p>
            {namesHere.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#E7E5E4] text-[10px] font-bold uppercase tracking-wide text-[#57534E]">
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Came with</th>
                      <th className="py-2">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {namesHere.map((row) => (
                      <tr key={row.id} className="border-b border-[#F5EDE4] last:border-0">
                        <td className="py-2 pr-3 text-xs font-semibold text-[#1C1917]">{row.visitorName}</td>
                        <td className="py-2 pr-3 text-xs text-[#57534E]">{row.notes ?? '—'}</td>
                        <td className="py-2 text-xs text-[#57534E]">
                          {row.member ? 'Already on the register' : 'Enrol them on the Members screen'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
