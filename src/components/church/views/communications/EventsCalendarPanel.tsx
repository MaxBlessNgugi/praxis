import React, { useMemo, useState } from 'react';
import { useDialog } from '../../dialog';
import {
  eventsApi,
  type EventBody,
  type EventDto,
  type EventKind,
  type EventStatus,
} from '../../../../lib/api';
import { useEvents, useMemberOptions, useMutation } from '../../../../hooks/useApi';
import { memberRefName } from '../../../../lib/api';
import { usePermissions } from '../../../../lib/permissions';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * The church calendar, as the church keeps it.
 *
 * Two things about the old screen were invented and are gone. It filed events under a finer set of
 * categories than the table holds, so scheduling a "youth fellowship" quietly stored a *service*; the
 * panel now offers the four kinds the record stores. And it had no way to change or call off a
 * gathering once it was on the calendar, which is how a church ends up with a date nobody can move.
 *
 * Whether an event is still to come is read off its date rather than asked of the server, because a
 * parish whose register is behind the machine clock would otherwise open an empty calendar.
 */

const KINDS: Array<{ value: EventKind; label: string; color: string }> = [
  { value: 'service', label: 'Service', color: '#C2410C' },
  { value: 'conference', label: 'Conference', color: '#0891B2' },
  { value: 'meeting', label: 'Meeting', color: '#059669' },
  { value: 'outreach', label: 'Outreach', color: '#2563EB' },
];

const kindOf = (kind: EventKind) => KINDS.find((entry) => entry.value === kind) ?? KINDS[0];

const FIELD =
  'w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1';

/** The published dates, e.g. "April 16 – 19, 2026"; a single-day event reads "November 24, 2026". */
const formatEventDate = (startsAt: string, endsAt: string) => {
  const part = (iso: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', options).format(new Date(iso));
  const first = part(startsAt, { month: 'long', day: 'numeric' });
  const year = part(endsAt, { year: 'numeric' });
  const sameDay = new Date(startsAt).toDateString() === new Date(endsAt).toDateString();
  if (sameDay) return `${first}, ${year}`;
  const sameMonth = new Date(startsAt).toDateString().slice(4, 7) === new Date(endsAt).toDateString().slice(4, 7);
  return `${first} – ${part(endsAt, sameMonth ? { day: 'numeric' } : { month: 'long', day: 'numeric' })}, ${year}`;
};

const dayInput = (iso: string) => new Date(iso).toLocaleDateString('en-CA');
const timeInput = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** A day and a time field are one instant, in the reader's own zone. */
const instantOf = (day: string, time: string) => new Date(`${day}T${time || '00:00'}:00`).toISOString();

interface Draft {
  id: string | null;
  title: string;
  kind: EventKind;
  organizerId: string;
  status: EventStatus;
  venue: string;
  day: string;
  startTime: string;
  endTime: string;
  description: string;
}

function emptyDraft(): Draft {
  const today = new Date().toLocaleDateString('en-CA');
  return {
    id: null,
    title: '',
    kind: 'service',
    organizerId: '',
    status: 'scheduled',
    venue: '',
    day: today,
    startTime: '09:00',
    endTime: '11:00',
    description: '',
  };
}

const draftOf = (event: EventDto): Draft => ({
  id: event.id,
  title: event.title,
  kind: event.kind,
  organizerId: event.organizerId ?? '',
  status: event.status,
  venue: event.venue,
  day: dayInput(event.startsAt),
  startTime: timeInput(event.startsAt),
  endTime: timeInput(event.endsAt),
  description: event.description ?? '',
});

export const EventsCalendarPanel: React.FC = () => {
  const { items, loading, error, refetch } = useEvents({ pageSize: 100 });
  const { members } = useMemberOptions();
  const createEvent = useMutation(eventsApi.create);
  const updateEvent = useMutation(eventsApi.update);
  const retireEvent = useMutation(eventsApi.retire);
  const { canEdit, canDelete } = usePermissions();

  const [kindFilter, setKindFilter] = useState<'all' | EventKind>('all');
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [isEditing, setIsEditing] = useState(false);
  const editingDialog = useDialog(() => setIsEditing(false), 'Church Event');
  const [problem, setProblem] = useState<string | null>(null);

  const shown = kindFilter === 'all' ? items : items.filter((event) => event.kind === kindFilter);
  const now = Date.now();
  const { ahead, held } = useMemo(() => {
    const ahead = shown
      .filter((event) => new Date(event.endsAt).getTime() >= now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const held = shown
      .filter((event) => new Date(event.endsAt).getTime() < now)
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    return { ahead, held };
  }, [shown, now]);

  const openComposer = (event?: EventDto) => {
    setProblem(null);
    setDraft(event ? draftOf(event) : emptyDraft());
    setIsEditing(true);
  };

  const save = async (submitted: React.FormEvent) => {
    submitted.preventDefault();
    if (!draft.title.trim() || !draft.venue.trim()) return;

    const startsAt = instantOf(draft.day, draft.startTime);
    const endsAt = instantOf(draft.day, draft.endTime);
    if (new Date(endsAt) < new Date(startsAt)) {
      setProblem('A gathering cannot end before it starts.');
      return;
    }

    const body: EventBody = {
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      kind: draft.kind,
      organizerId: draft.organizerId || null,
      status: draft.status,
      venue: draft.venue.trim(),
      startsAt,
      endsAt,
    };

    try {
      if (draft.id) await updateEvent.run(draft.id, body);
      else await createEvent.run(body);
      await refetch();
      setIsEditing(false);
    } catch {
      // The write's own error stays in the dialog, beside the fields it complains about.
    }
  };

  const retire = async (event: EventDto) => {
    await retireEvent.run(event.id, {
      reason: 'other',
      reasonLabel: 'Taken off the calendar by the church office',
    });
    await refetch();
  };

  const writeError = retireEvent.error ?? createEvent.error;

  const row = (event: EventDto) => {
    const kind = kindOf(event.kind);
    const calledOff = event.status === 'cancelled';
    return (
      <div
        key={event.id}
        className={`p-4 rounded-[12px] border flex flex-col justify-between ${
          calledOff ? 'bg-[#FEF2F2]/60 border-[#FECACA]' : 'bg-[#FDF8F3] border-[#E7E5E4] hover:border-[#C2410C]/40'
        }`}
      >
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: kind.color }}
              >
                {kind.label}
              </span>
              {calledOff && (
                <span className="px-2 py-0.5 rounded-full bg-[#DC2626]/10 text-[#DC2626] text-[10px] font-bold uppercase tracking-wider">
                  Called off
                </span>
              )}
            </div>

            <span className="text-xs font-bold text-[#1C1917] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E7E5E4]">
              {formatEventDate(event.startsAt, event.endsAt)}
            </span>
          </div>

          <h4 className="font-headline text-sm font-bold text-[#1C1917] mb-1">{event.title}</h4>

          <div className="text-xs text-[#57534E] flex flex-wrap items-center gap-1.5 mb-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#A8A29E]">
              schedule
            </span>
            {timeInput(event.startsAt)} – {timeInput(event.endsAt)}
            <span className="text-[#A8A29E]">·</span>
            <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#A8A29E]">
              pin_drop
            </span>
            {event.venue}
          </div>

          <div className="text-[11px] text-[#57534E] mb-2">
            Organised by{' '}
            <strong className="text-[#1C1917]">
              {event.organizer ? memberRefName(event.organizer) : 'nobody named yet'}
            </strong>
          </div>

          {event.description && (
            <p className="text-xs text-[#57534E] leading-relaxed line-clamp-2 mb-3">{event.description}</p>
          )}
        </div>

        {canEdit && (
          <div className="pt-3 border-t border-[#E7E5E4]/80 flex flex-wrap items-center justify-end gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => openComposer(event)}
              className="px-2 py-1 rounded-[6px] font-bold text-[#1C1917] hover:bg-[#F5EDE4] cursor-pointer"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void updateEvent.run(event.id, { status: calledOff ? 'scheduled' : 'cancelled' }).then(refetch)}
              className={`px-2 py-1 rounded-[6px] font-bold cursor-pointer ${
                calledOff ? 'text-[#059669] hover:bg-[#059669]/10' : 'text-[#B45309] hover:bg-[#FDE68A]/40'
              }`}
            >
              {calledOff ? 'Reinstate' : 'Call off'}
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => void retire(event)}
                title="Move to the Trash"
                className="p-1 rounded text-[#DC2626] hover:text-[#B91C1C] cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Still to come', value: `${ahead.length} Ahead`, hint: 'From today onward' },
          {
            label: 'Already held',
            value: `${held.length} Past`,
            hint: 'Kept for the record, not deleted',
          },
          {
            label: 'Conferences',
            value: `${items.filter((event) => event.kind === 'conference').length} Conventions`,
            hint: 'Multi-day national gatherings',
          },
          {
            label: 'Called off',
            value: `${items.filter((event) => event.status === 'cancelled').length} Cancelled`,
            hint: 'Left on the calendar so nobody turns up',
          },
        ].map((card) => (
          <div key={card.label} className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">{card.label}</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">{card.value}</div>
            <span className="text-xs text-[#57534E]">{card.hint}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4] mb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">
                calendar_month
              </span>
              Church Calendar
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Everything the church has scheduled, soonest first, with who is running it.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by kind of gathering"
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as 'all' | EventKind)}
              className="px-3 py-1.5 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
            >
              <option value="all">Every kind</option>
              {KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>

            {canEdit && (
              <button
                type="button"
                onClick={() => openComposer()}
                className="px-3 py-1.5 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_circle</span>
                Schedule event
              </button>
            )}
          </div>
        </div>

        {writeError && <ErrorBlock message={writeError} onRetry={() => void refetch()} className="mb-4" />}

        {loading && items.length === 0 ? (
          <LoadingBlock label="Reading the church calendar…" />
        ) : error ? (
          <ErrorBlock message={error} onRetry={() => void refetch()} />
        ) : shown.length === 0 ? (
          <EmptyBlock
            icon="event"
            title={items.length === 0 ? 'Nothing on the calendar' : 'Nothing of that kind'}
            hint={
              items.length === 0
                ? 'Schedule the next gathering and it appears here for the whole church.'
                : 'Choose another kind of gathering, or add one.'
            }
          />
        ) : (
          <div className="space-y-6">
            <section>
              <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-[#A8A29E] mb-3">
                Coming up
              </h4>
              {ahead.length === 0 ? (
                <EmptyBlock
                  icon="event_upcoming"
                  title="Nothing scheduled from today onward"
                  hint="The next date the church sets will appear here."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{ahead.map(row)}</div>
              )}
            </section>

            {held.length > 0 && (
              <section>
                <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-[#A8A29E] mb-3">
                  Already held
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{held.map(row)}</div>
              </section>
            )}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...editingDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-lg w-full p-6 shadow-2xl border border-[#E7E5E4] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">
                {draft.id ? 'Edit event' : 'Schedule an event'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                aria-label="Close"
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={save} className="mt-4 space-y-4">
              <div>
                <label htmlFor="event-title" className={LABEL}>
                  Event title *
                </label>
                <input
                  id="event-title"
                  type="text"
                  required
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Harvest praise feast"
                  className={FIELD}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="event-kind" className={LABEL}>
                    Kind of gathering
                  </label>
                  <select
                    id="event-kind"
                    value={draft.kind}
                    onChange={(event) => setDraft({ ...draft, kind: event.target.value as EventKind })}
                    className={`${FIELD} cursor-pointer`}
                  >
                    {KINDS.map((kind) => (
                      <option key={kind.value} value={kind.value}>
                        {kind.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="event-organizer" className={LABEL}>
                    Organised by
                  </label>
                  <select
                    id="event-organizer"
                    value={draft.organizerId}
                    onChange={(event) => setDraft({ ...draft, organizerId: event.target.value })}
                    className={`${FIELD} cursor-pointer`}
                  >
                    <option value="">Nobody named yet</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberRefName(member)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="event-day" className={LABEL}>
                    Day
                  </label>
                  <input
                    id="event-day"
                    type="date"
                    value={draft.day}
                    onChange={(event) => setDraft({ ...draft, day: event.target.value })}
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="event-start" className={LABEL}>
                    Starts
                  </label>
                  <input
                    id="event-start"
                    type="time"
                    value={draft.startTime}
                    onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="event-end" className={LABEL}>
                    Ends
                  </label>
                  <input
                    id="event-end"
                    type="time"
                    value={draft.endTime}
                    onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
                    className={FIELD}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="event-venue" className={LABEL}>
                  Where it is held *
                </label>
                <input
                  id="event-venue"
                  type="text"
                  required
                  value={draft.venue}
                  onChange={(event) => setDraft({ ...draft, venue: event.target.value })}
                  placeholder="Fellowship Hall · Nyahururu"
                  className={FIELD}
                />
              </div>

              <div>
                <label htmlFor="event-description" className={LABEL}>
                  Description
                </label>
                <textarea
                  id="event-description"
                  rows={3}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  placeholder="What members and guests should know."
                  className={FIELD}
                />
              </div>

              {draft.id && (
                <div>
                  <label htmlFor="event-status" className={LABEL}>
                    Still going ahead?
                  </label>
                  <select
                    id="event-status"
                    value={draft.status}
                    onChange={(event) => setDraft({ ...draft, status: event.target.value as EventStatus })}
                    className={`${FIELD} cursor-pointer`}
                  >
                    <option value="scheduled">Going ahead</option>
                    <option value="cancelled">Called off</option>
                  </select>
                </div>
              )}

              {(problem ?? createEvent.error ?? updateEvent.error) && (
                <div role="alert" className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] font-semibold text-[#B91C1C]">
                  {problem ?? createEvent.error ?? updateEvent.error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEvent.pending || updateEvent.pending}
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {createEvent.pending || updateEvent.pending ? 'Saving…' : draft.id ? 'Save event' : 'Add to calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
