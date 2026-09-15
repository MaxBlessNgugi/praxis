import React, { useEffect, useState } from 'react';
import {
  memberRefName,
  servicesApi,
  type LiturgyItemDto,
  type LiturgyKind,
  type ServiceDto,
} from '../../../../lib/api';
import { errorMessage, useMemberOptions, useRoster, useService, useServices } from '../../../../hooks/useApi';
import { usePermissions } from '../../../../lib/permissions';
import { printDocument } from '../../../../lib/documents';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';
import { useDialog } from '../../dialog';

/**
 * Planning a service: what it is, who leads it, and the order it runs in.
 *
 * This screen used to hold ten invented services with statuses, expected attendances and a roster of
 * officers, all of it assembled in the browser. It now reads the church's own services from the API,
 * and the order of service it edits is the row set the planner actually stores — `putLiturgy` replaces
 * the whole order, so the arrangement on screen *is* the arrangement, saved.
 *
 * Two things follow from the API's shape rather than from taste. A service has no "status": whether it
 * is upcoming or past is a fact about its date, so the filter computes it instead of asking anybody to
 * keep a field in step. And the officers shown beside the order are the same duty rows the Volunteer
 * Roster tab edits — one record, two views, rather than a second list that drifts.
 */

const KIND_LABELS: Record<LiturgyKind, string> = {
  call_to_worship: 'Call to worship',
  praise_worship: 'Praise & worship',
  prayer: 'Prayer',
  scripture: 'Scripture',
  sermon: 'Sermon',
  offering: 'Offering',
  announcements: 'Announcements',
  presentation: 'Presentation',
  dismissal: 'Dismissal',
  other: 'Other',
};

const KIND_ORDER = Object.keys(KIND_LABELS) as LiturgyKind[];

const FIELD =
  'w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1.5';

const whenOf = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

const timeOf = (service: ServiceDto): string => service.startTime ?? 'Time not set';

/** A service's own minutes, from the items that carry a duration. */
const totalMinutes = (liturgy: LiturgyItemDto[] | undefined): number =>
  (liturgy ?? []).reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0);

const isPast = (service: ServiceDto): boolean => new Date(service.heldAt).getTime() + 3 * 3_600_000 < Date.now();

export const ServicePlannerPanel: React.FC = () => {
  const services = useServices({ pageSize: 100, sort: 'upcoming' });
  const members = useMemberOptions();
  const { canEdit, canDelete } = usePermissions();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'templates' | 'all'>('upcoming');
  /** Set once somebody picks a filter themselves, so the opening view is never corrected under them. */
  const [filterChosen, setFilterChosen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const detail = useService(selectedId);
  const current = detail.data?.data ?? null;
  const duties = useRoster({ serviceId: selectedId ?? undefined });

  const [isCreating, setIsCreating] = useState(false);
  const creatingDialog = useDialog(() => setIsCreating(false), 'Schedule a service');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const addingItemDialog = useDialog(() => setIsAddingItem(false), 'Add an element to the order');
  const [isPrinting, setIsPrinting] = useState(false);
  const printingDialog = useDialog(() => setIsPrinting(false), 'Order of service');
  const [isRetiring, setIsRetiring] = useState(false);
  const retiringDialog = useDialog(() => setIsRetiring(false), 'Retire this service');

  const [draft, setDraft] = useState({
    title: '',
    heldAt: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    venue: '',
    theme: '',
    officiantId: '',
  });
  const [item, setItem] = useState({
    title: '',
    kind: 'praise_worship' as LiturgyKind,
    durationMinutes: 10,
    responsible: '',
    notes: '',
  });

  const rows = services.items
    .filter((service) => {
      if (filter === 'all') return true;
      if (filter === 'templates') return service.isTemplate;
      if (filter === 'upcoming') return !service.isTemplate && !isPast(service);
      return !service.isTemplate && isPast(service);
    })
    .sort((a, b) => (filter === 'past' ? b.heldAt.localeCompare(a.heldAt) : a.heldAt.localeCompare(b.heldAt)));

  /**
   * Open on the services there are, not on the ones there ought to be.
   *
   * "Upcoming" is the right first view for a church planning ahead, and an empty one for a church
   * whose calendar has not been caught up since the last quarter — which reads as a broken screen. So
   * if nothing is scheduled ahead, the planner opens on what has been held instead.
   */
  useEffect(() => {
    if (filterChosen || services.loading || services.items.length === 0) return;
    if (!services.items.some((service) => !service.isTemplate && !isPast(service))) setFilter('past');
  }, [filterChosen, services.loading, services.items]);

  // Land on something to look at rather than on an empty right-hand column.
  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !services.items.some((service) => service.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId, services.items]);

  const announce = (message: string) => {
    setNotice(message);
    setError(null);
  };

  const saveLiturgy = async (items: LiturgyItemDto[], done: string) => {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      await servicesApi.putLiturgy(current.id, items.map((entry) => ({
        title: entry.title,
        kind: entry.kind,
        durationMinutes: entry.durationMinutes ?? undefined,
        responsible: entry.responsible ?? undefined,
        // Carried back unchanged: this screen does not set a ministry, but a save that dropped the
        // link a minister was chosen for would be an edit nobody asked for.
        ...(entry.ministryId ? { ministryId: entry.ministryId } : {}),
        notes: entry.notes ?? undefined,
      })));
      await detail.refetch();
      announce(done);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await servicesApi.create({
        title: draft.title.trim(),
        heldAt: draft.heldAt,
        startTime: draft.startTime || undefined,
        venue: draft.venue.trim() || 'Main Sanctuary',
        theme: draft.theme.trim() || undefined,
        officiantId: draft.officiantId || undefined,
      });
      setIsCreating(false);
      setFilter('upcoming');
      setSelectedId(data.id);
      setDraft((previous) => ({ ...previous, title: '', theme: '' }));
      await services.refetch();
      announce(`${data.title} is on the calendar. Add its order of service next.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!current) return;
    const existing = current.liturgy ?? [];
    await saveLiturgy(
      [
        ...existing,
        {
          id: `new-${Date.now()}`,
          serviceId: current.id,
          position: existing.length + 1,
          title: item.title.trim(),
          kind: item.kind,
          durationMinutes: Number(item.durationMinutes) || null,
          responsible: item.responsible.trim() || null,
          ministryId: null,
          notes: item.notes.trim() || null,
        },
      ],
      `Added "${item.title.trim()}" to the order.`,
    );
    setIsAddingItem(false);
    setItem((previous) => ({ ...previous, title: '', notes: '', responsible: '' }));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!current) return;
    const items = [...(current.liturgy ?? [])];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    void saveLiturgy(items, 'The order of service is saved.');
  };

  const removeItem = (id: string) => {
    if (!current) return;
    void saveLiturgy(
      (current.liturgy ?? []).filter((entry) => entry.id !== id),
      'That element was taken out of the order.',
    );
  };

  const retire = async () => {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      await servicesApi.retire(current.id, { reason: 'other', reasonLabel: 'Removed from the planner' });
      setIsRetiring(false);
      setSelectedId(null);
      await services.refetch();
      announce('The service was retired. It is in the Trash if that was a mistake.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const printBulletin = () => {
    if (!current) return;
    const items = current.liturgy ?? [];
    const rowsHtml = items
      .map(
        (entry, index) => `<tr>
          <td class="num">${index + 1}</td>
          <td><strong>${entry.title}</strong><div class="kind">${KIND_LABELS[entry.kind]}</div>${
            entry.notes ? `<div class="notes">${entry.notes}</div>` : ''
          }</td>
          <td class="leader">${entry.responsible ?? ''}</td>
          <td class="mins">${entry.durationMinutes ? `${entry.durationMinutes} min` : ''}</td>
        </tr>`,
      )
      .join('');

    void printDocument(`<!doctype html><html><head><meta charset="utf-8"><title>${current.title}</title>
      <style>
        body { font-family: Georgia, 'Times New Roman', serif; color: #1c1917; margin: 40px; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .meta { color: #57534e; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        td { border-bottom: 1px solid #e7e5e4; padding: 8px 6px; vertical-align: top; font-size: 13px; }
        .num { width: 26px; color: #c2410c; font-weight: bold; }
        .kind { font-size: 11px; color: #57534e; text-transform: uppercase; letter-spacing: .06em; }
        .notes { font-size: 11px; color: #57534e; font-style: italic; margin-top: 2px; }
        .leader { width: 28%; font-size: 12px; }
        .mins { width: 70px; text-align: right; font-size: 12px; color: #57534e; }
        .total { margin-top: 14px; font-size: 12px; color: #57534e; }
      </style></head><body>
      <h1>Order of service</h1>
      <div class="meta">${current.title} · ${whenOf(current.heldAt)} · ${timeOf(current)} · ${current.venue}${
        current.theme ? ` · ${current.theme}` : ''
      }</div>
      <table>${rowsHtml || '<tr><td>No order recorded for this service yet.</td></tr>'}</table>
      <div class="total">${totalMinutes(items)} minutes in all.</div>
      </body></html>`);
  };

  const liturgy = current?.liturgy ?? [];

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
        {/* LEFT: the services themselves */}
        <div className="xl:col-span-4">
          <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-1.5 font-headline text-sm font-bold text-[#1C1917]">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#C2410C]">calendar_month</span>
                Services
              </h3>
              {canEdit('services') && (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#C2410C] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#EA580C] cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px]">add</span>
                  Schedule
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(['upcoming', 'past', 'templates', 'all'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setFilter(option);
                    setFilterChosen(true);
                  }}
                  className={`rounded-[8px] px-2.5 py-1 text-[11px] font-bold capitalize transition-colors cursor-pointer ${
                    filter === option ? 'bg-[#C2410C] text-white' : 'bg-[#F8F1E9] text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {services.loading && <LoadingBlock label="Reading the calendar…" />}
              {services.error && <ErrorBlock message={services.error} onRetry={() => void services.refetch()} />}
              {!services.loading && !services.error && rows.length === 0 && (
                <EmptyBlock
                  icon="event_busy"
                  title={filter === 'upcoming' ? 'Nothing scheduled yet' : 'Nothing in this view'}
                  hint={
                    filter === 'upcoming'
                      ? 'Schedule this Sunday — the order of service, the roster and attendance all hang off it.'
                      : 'Try another filter.'
                  }
                />
              )}

              {rows.map((service) => {
                const selected = service.id === selectedId;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedId(service.id)}
                    aria-current={selected ? 'true' : undefined}
                    className={`w-full rounded-[12px] border p-3 text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-[#C2410C] bg-[#FDF8F3] shadow-[0_2px_8px_rgba(194,65,12,0.12)]'
                        : 'border-[#E7E5E4] bg-[#FFFFFF] hover:border-[#D6D3D1] hover:bg-[#FDF8F3]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-[#1C1917]">{service.title}</span>
                      <span className="shrink-0 text-[10px] font-semibold text-[#57534E]">
                        {new Date(service.heldAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#57534E]">
                      {timeOf(service)} · {service.venue}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-semibold text-[#57534E]">
                      <span>{service._count?.liturgy ?? 0} elements</span>
                      <span>·</span>
                      <span>{service._count?.roster ?? 0} on duty</span>
                      {service.isTemplate && (
                        <span className="rounded-[5px] bg-[#F8F1E9] px-1.5 py-0.5 uppercase tracking-wide">Template</span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: the selected service */}
        <div className="space-y-5 xl:col-span-8">
          {!current && !detail.loading && (
            <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
              <EmptyBlock
                icon="auto_stories"
                title="Choose a service"
                hint="Pick one on the left to read its order of service, or schedule a new one."
              />
            </div>
          )}

          {detail.loading && (
            <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
              <LoadingBlock label="Opening the service…" />
            </div>
          )}
          {detail.error && <ErrorBlock message={detail.error} />}

          {current && (
            <>
              <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#C2410C]">
                      {isPast(current) ? 'Past service' : 'Upcoming service'}
                      {current.isTemplate ? ' · Template' : ''}
                    </p>
                    <h2 className="mt-0.5 font-headline text-lg font-extrabold text-[#1C1917] sm:text-xl">
                      {current.title}
                    </h2>
                    <p className="mt-1 text-xs text-[#57534E]">
                      {whenOf(current.heldAt)} · {timeOf(current)} · {current.venue}
                    </p>
                    {current.theme && <p className="mt-1 text-xs text-[#57534E]">Theme: {current.theme}</p>}
                    <p className="mt-1 text-xs text-[#57534E]">
                      Officiant: {memberRefName(current.officiant) || 'not recorded'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPrinting(true)}
                      className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#C2410C]">print</span>
                      Bulletin
                    </button>
                    {canDelete('services') && (
                      <button
                        type="button"
                        onClick={() => setIsRetiring(true)}
                        className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#FECACA] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#B91C1C] transition-colors hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        Retire
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Officers — the same duty rows the roster tab edits */}
              <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
                <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
                  <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#C2410C]">badge</span>
                  On duty
                </h3>
                <div className="mt-3">
                  {duties.loading && <LoadingBlock label="Reading the roster…" />}
                  {duties.error && <ErrorBlock message={duties.error} onRetry={() => void duties.refetch()} />}
                  {!duties.loading && !duties.error && duties.items.length === 0 && (
                    <p className="text-xs text-[#57534E]">
                      Nobody is on the roster for this service yet. Assign volunteers in the{' '}
                      <strong className="text-[#1C1917]">Volunteer Roster</strong> tab.
                    </p>
                  )}
                  {duties.items.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {duties.items.map((duty) => (
                        <li
                          key={duty.id}
                          className="rounded-[10px] border border-[#E7E5E4] bg-[#FDF8F3] px-3 py-2"
                        >
                          <p className="text-xs font-bold text-[#1C1917]">{memberRefName(duty.holder) || 'Unassigned'}</p>
                          <p className="text-[11px] text-[#57534E]">
                            {duty.roleTitle} · <span className="capitalize">{duty.status}</span>
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* The order of service */}
              <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
                      <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#C2410C]">list_alt</span>
                      Order of service
                    </h3>
                    <p className="mt-0.5 text-xs text-[#57534E]">
                      {liturgy.length} {liturgy.length === 1 ? 'element' : 'elements'}
                      {totalMinutes(liturgy) > 0 ? ` · ${totalMinutes(liturgy)} minutes in all` : ''}
                    </p>
                  </div>
                  {canEdit('services') && (
                    <button
                      type="button"
                      onClick={() => setIsAddingItem(true)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 self-start rounded-[9px] bg-[#C2410C] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add</span>
                      Add element
                    </button>
                  )}
                </div>

                <div className="mt-4">
                  {liturgy.length === 0 && (
                    <EmptyBlock
                      icon="format_list_numbered"
                      title="No order yet"
                      hint="Add the elements of the service in the order they run — call to worship, praise, scripture, sermon, and so on."
                    />
                  )}

                  {liturgy.length > 0 && (
                    <ol className="space-y-2">
                      {liturgy.map((entry, index) => (
                        <li
                          key={entry.id}
                          className="flex flex-col gap-3 rounded-[12px] border border-[#E7E5E4] bg-[#FDF8F3] p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C2410C]/10 text-[12px] font-bold text-[#C2410C]">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#1C1917]">{entry.title}</p>
                              <p className="text-[11px] uppercase tracking-wide text-[#57534E]">
                                {KIND_LABELS[entry.kind]}
                                {entry.responsible ? ` · ${entry.responsible}` : ''}
                              </p>
                              {entry.notes && <p className="mt-0.5 text-[11px] italic text-[#57534E]">{entry.notes}</p>}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {entry.durationMinutes ? (
                              <span className="rounded-[7px] bg-[#F8F1E9] px-2 py-1 text-[11px] font-semibold text-[#57534E]">
                                {entry.durationMinutes} min
                              </span>
                            ) : null}
                            {canEdit('services') && (
                              <>
                                <button
                                  type="button"
                                  aria-label={`Move ${entry.title} earlier`}
                                  disabled={index === 0 || busy}
                                  onClick={() => moveItem(index, 'up')}
                                  className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#E7E5E4] bg-[#FFFFFF] text-[#57534E] transition-colors hover:text-[#1C1917] disabled:opacity-40 cursor-pointer"
                                >
                                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_upward</span>
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Move ${entry.title} later`}
                                  disabled={index === liturgy.length - 1 || busy}
                                  onClick={() => moveItem(index, 'down')}
                                  className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#E7E5E4] bg-[#FFFFFF] text-[#57534E] transition-colors hover:text-[#1C1917] disabled:opacity-40 cursor-pointer"
                                >
                                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_downward</span>
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Remove ${entry.title}`}
                                  disabled={busy}
                                  onClick={() => removeItem(entry.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#E7E5E4] bg-[#FFFFFF] text-[#B91C1C] transition-colors hover:bg-[#FEF2F2] disabled:opacity-40 cursor-pointer"
                                >
                                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...creatingDialog}>
          <form onSubmit={handleCreate} className="w-full max-w-[520px] rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">Schedule a service</h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              Four fields, and the rest can follow. The order of service is added beside the service once it exists.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="svc-title">What is it called?</label>
                <input id="svc-title" required value={draft.title} onChange={(e) => setDraft((previous) => ({ ...previous, title: e.target.value }))} placeholder="Lord's Day Morning Worship" className={FIELD} />
              </div>
              <div>
                <label className={LABEL} htmlFor="svc-date">Date</label>
                <input id="svc-date" type="date" required value={draft.heldAt} onChange={(e) => setDraft((previous) => ({ ...previous, heldAt: e.target.value }))} className={FIELD} />
              </div>
              <div>
                <label className={LABEL} htmlFor="svc-time">Start time</label>
                <input id="svc-time" type="time" value={draft.startTime} onChange={(e) => setDraft((previous) => ({ ...previous, startTime: e.target.value }))} className={FIELD} />
              </div>
              <div>
                <label className={LABEL} htmlFor="svc-venue">Where</label>
                <input id="svc-venue" value={draft.venue} onChange={(e) => setDraft((previous) => ({ ...previous, venue: e.target.value }))} placeholder="Main Sanctuary" className={FIELD} />
              </div>
              <div>
                <label className={LABEL} htmlFor="svc-officiant">Officiant</label>
                <select id="svc-officiant" value={draft.officiantId} onChange={(e) => setDraft((previous) => ({ ...previous, officiantId: e.target.value }))} className={FIELD}>
                  <option value="">Not recorded</option>
                  {members.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {memberRefName(member)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="svc-theme">Theme</label>
                <input id="svc-theme" value={draft.theme} onChange={(e) => setDraft((previous) => ({ ...previous, theme: e.target.value }))} placeholder="The Righteous Shall Live by Faith" className={FIELD} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreating(false)} className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] hover:bg-[#F5EDE4] cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer">
                {busy ? 'Scheduling…' : 'Schedule it'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isAddingItem && current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...addingItemDialog}>
          <form onSubmit={handleAddItem} className="w-full max-w-[480px] rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">Add an element</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className={LABEL} htmlFor="item-title">What happens</label>
                <input id="item-title" required value={item.title} onChange={(e) => setItem((previous) => ({ ...previous, title: e.target.value }))} placeholder="Hymn of Dedication: Be Thou My Vision" className={FIELD} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor="item-kind">Kind</label>
                  <select id="item-kind" value={item.kind} onChange={(e) => setItem((previous) => ({ ...previous, kind: e.target.value as LiturgyKind }))} className={FIELD}>
                    {KIND_ORDER.map((kind) => (
                      <option key={kind} value={kind}>
                        {KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="item-minutes">Minutes</label>
                  <input id="item-minutes" type="number" min={1} max={240} value={item.durationMinutes} onChange={(e) => setItem((previous) => ({ ...previous, durationMinutes: Number(e.target.value) }))} className={FIELD} />
                </div>
              </div>
              <div>
                <label className={LABEL} htmlFor="item-leader">Who leads it</label>
                <input id="item-leader" value={item.responsible} onChange={(e) => setItem((previous) => ({ ...previous, responsible: e.target.value }))} placeholder="Caleb Mwangi" className={FIELD} />
              </div>
              <div>
                <label className={LABEL} htmlFor="item-notes">Notes for the platform party</label>
                <textarea id="item-notes" rows={2} value={item.notes} onChange={(e) => setItem((previous) => ({ ...previous, notes: e.target.value }))} placeholder="Congregation stands; band moves to acoustic." className={FIELD} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsAddingItem(false)} className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] hover:bg-[#F5EDE4] cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer">
                {busy ? 'Saving…' : 'Add to the order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isRetiring && current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...retiringDialog}>
          <div className="w-full max-w-[440px] rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">Retire this service?</h3>
            <p className="mt-1.5 text-xs text-[#57534E]">
              {current.title} · {whenOf(current.heldAt)}. Its order, its roster and its census go to the Trash
              with it, where an administrator can put it back.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRetiring(false)}
                className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void retire()}
                className="rounded-[9px] bg-[#B91C1C] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#991B1B] disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Retiring…' : 'Retire it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPrinting && current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...printingDialog}>
          <div className="flex max-h-[85vh] w-full max-w-[600px] flex-col rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-headline text-base font-bold text-[#1C1917]">{current.title}</h3>
                <p className="mt-0.5 text-xs text-[#57534E]">
                  {whenOf(current.heldAt)} · {timeOf(current)} · {current.venue}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsPrinting(false)}
                className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917] cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[19px]">close</span>
              </button>
            </div>
            <ol className="mt-4 flex-1 overflow-y-auto space-y-2">
              {liturgy.map((entry, index) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 border-b border-[#E7E5E4] pb-2">
                  <span className="text-xs text-[#1C1917]">
                    <strong className="mr-2 text-[#C2410C]">{index + 1}</strong>
                    {entry.title}
                    {entry.responsible && <span className="ml-2 text-[11px] text-[#57534E]">{entry.responsible}</span>}
                  </span>
                  <span className="shrink-0 text-[11px] text-[#57534E]">{entry.durationMinutes ? `${entry.durationMinutes} min` : ''}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E7E5E4] pt-3">
              <span className="text-[11px] text-[#57534E]">{totalMinutes(liturgy)} minutes in all.</span>
              <button
                type="button"
                onClick={printBulletin}
                className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">print</span>
                Print the bulletin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
