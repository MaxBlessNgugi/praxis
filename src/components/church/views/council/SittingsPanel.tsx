import React, { useEffect, useState } from 'react';
import { governanceApi, memberRefName, type MeetingDto, type MeetingKind, type MeetingStatus } from '../../../../lib/api';
import { errorMessage, useMeeting, useMeetings, useMemberOptions } from '../../../../hooks/useApi';
import { usePermissions } from '../../../../lib/permissions';
import { useDialog } from '../../dialog';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';
import { Notice, Pager, RetireDialog } from './CouncilControls';
import {
  FIELD,
  LABEL,
  MEETING_KIND_LABELS,
  MEETING_KIND_ORDER,
  MEETING_STATUS_LABELS,
  MEETING_STATUS_ORDER,
  QUORUM_CHIP,
  QUORUM_RULE_HINT,
  SITTING_RETIRE_REASONS,
  STAGE_LABELS,
  dayOf,
  instantFromLocalInput,
  quorumStanding,
  timeOf,
  toLocalInput,
  whenOf,
} from './vocabulary';

/**
 * The sittings log: when the council met, who was in the room, what was on the order of business, and
 * the minute that closes it.
 *
 * Two of the facts here are the server's and are only reported. Whether a sitting was **quorate** is
 * counted from the council roll when it is created and stamped on it, so the register can be read
 * later against the figure that applied that day. And a **sealed** minute is final: the API refuses to
 * change the register or the minute afterwards, so the screen stops offering to.
 */
const EMPTY_DRAFT = {
  id: null as string | null,
  title: '',
  kind: 'stated' as MeetingKind,
  status: 'scheduled' as MeetingStatus,
  heldAt: '',
  venue: '',
  chairId: '',
  secretaryId: '',
  attendees: '',
  agenda: '',
  minutes: '',
};
type Draft = typeof EMPTY_DRAFT;

export const SittingsPanel: React.FC = () => {
  const { canEdit, canDelete, role } = usePermissions();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<MeetingKind | ''>('');
  const [status, setStatus] = useState<MeetingStatus | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const meetings = useMeetings({
    q: query || undefined,
    kind: kind || undefined,
    status: status || undefined,
    page,
    pageSize,
  });
  const detail = useMeeting(selectedId);
  const members = useMemberOptions();

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formOpen, setFormOpen] = useState(false);
  const [retiring, setRetiring] = useState<MeetingDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const formDialog = useDialog(() => setFormOpen(false), draft.id ? 'Change the notice' : 'Call a sitting');

  const rows = meetings.items;
  const selected = rows.find((meeting) => meeting.id === selectedId) ?? null;
  // The dossier is the one read that carries the resolutions tabled at the sitting.
  const dossier = detail.meeting ?? selected;

  useEffect(() => {
    if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  const announce = (message: string) => {
    setError(null);
    setNotice(message);
  };

  const openForm = (meeting?: MeetingDto) => {
    setError(null);
    if (!meeting) {
      setDraft({ ...EMPTY_DRAFT, venue: 'Main Church - Council Chamber' });
      setFormOpen(true);
      return;
    }
    setDraft({
      id: meeting.id,
      title: meeting.title,
      kind: meeting.kind,
      status: meeting.status,
      heldAt: toLocalInput(meeting.heldAt),
      venue: meeting.venue,
      chairId: meeting.chairId ?? '',
      secretaryId: meeting.secretaryId ?? '',
      attendees: meeting.attendees === null ? '' : String(meeting.attendees),
      agenda: (meeting.agenda ?? []).join('\n'),
      minutes: meeting.minutes ?? '',
    });
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.heldAt) {
      setError('Say when the sitting is held.');
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      title: draft.title.trim(),
      kind: draft.kind,
      status: draft.status,
      heldAt: instantFromLocalInput(draft.heldAt),
      venue: draft.venue.trim(),
      chairId: draft.chairId || undefined,
      secretaryId: draft.secretaryId || undefined,
      ...(draft.attendees.trim() === '' ? {} : { attendees: Number(draft.attendees) }),
      agenda: draft.agenda
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      minutes: draft.minutes.trim(),
    };
    try {
      if (draft.id) {
        await governanceApi.updateMeeting(draft.id, {
          ...body,
          chairId: draft.chairId || null,
          secretaryId: draft.secretaryId || null,
        });
        announce('The notice is changed.');
      } else {
        const { data } = await governanceApi.createMeeting(body);
        setSelectedId(data.id);
        announce(`${data.title} is on the calendar. Its order of business can follow.`);
      }
      setFormOpen(false);
      await meetings.refetch();
      if (selectedId) await detail.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const seal = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await governanceApi.sealMinutes(selectedId);
      announce('The minute is sealed, and the sitting is closed.');
      await Promise.all([meetings.refetch(), detail.refetch()]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const retire = async (reason: string, reasonLabel: string) => {
    if (!retiring) return;
    setBusy(true);
    setError(null);
    try {
      await governanceApi.retireMeeting(retiring.id, { reason, reasonLabel });
      setRetiring(null);
      setSelectedId(null);
      announce('The sitting is in the Trash, where an administrator can restore it.');
      await meetings.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const standing = dossier ? quorumStanding(dossier) : null;

  return (
    <div className="space-y-5">
      {error && <Notice tone="bad">{error}</Notice>}
      {notice && <Notice tone="ok">{notice}</Notice>}

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
        <div className="flex flex-col gap-3 border-b border-[#E7E5E4] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">gavel</span>
              Board &amp; Council Meetings
            </h2>
            <p className="mt-0.5 text-xs text-[#57534E]">
              Every sitting, its order of business, its register and its minute — and the figure each one had to reach.
            </p>
          </div>
          {canEdit('council') && (
            <button
              type="button"
              onClick={() => openForm()}
              className="inline-flex items-center gap-1.5 self-start rounded-[9px] bg-[#C2410C] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">event</span>
              Call a sitting
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="sittings-q">Search the sittings</label>
          <input
            id="sittings-q"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by title, venue or the words of a minute"
            className={`${FIELD} sm:w-72`}
          />
          <label className="sr-only" htmlFor="sittings-kind">Filter by kind of sitting</label>
          <select
            id="sittings-kind"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as MeetingKind | '');
              setPage(1);
            }}
            className={FIELD}
          >
            <option value="">Every kind</option>
            {MEETING_KIND_ORDER.map((option) => (
              <option key={option} value={option}>
                {MEETING_KIND_LABELS[option]}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="sittings-status">Filter by status</label>
          <select
            id="sittings-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as MeetingStatus | '');
              setPage(1);
            }}
            className={FIELD}
          >
            <option value="">Any status</option>
            {MEETING_STATUS_ORDER.map((option) => (
              <option key={option} value={option}>
                {MEETING_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* The register of sittings */}
          <div className="space-y-3 xl:col-span-4">
            {meetings.loading && <LoadingBlock label="Reading the sittings…" />}
            {meetings.error && <ErrorBlock message={meetings.error} onRetry={() => void meetings.refetch()} />}
            {!meetings.loading && !meetings.error && rows.length === 0 && (
              <EmptyBlock
                icon="event_busy"
                title="No sittings recorded"
                hint="A minute is written about a sitting, so call one first — the council roll decides what it needs to be quorate."
              />
            )}
            {rows.map((meeting) => {
              const standing = quorumStanding(meeting);
              return (
                <button
                  key={meeting.id}
                  type="button"
                  onClick={() => setSelectedId(meeting.id)}
                  aria-current={meeting.id === selectedId ? 'true' : undefined}
                  className={`w-full rounded-[12px] border p-3 text-left transition-all cursor-pointer ${
                    meeting.id === selectedId
                      ? 'border-[#C2410C] bg-[#FDF8F3] shadow-[0_2px_8px_rgba(194,65,12,0.12)]'
                      : 'border-[#E7E5E4] bg-[#FFFFFF] hover:border-[#D6D3D1] hover:bg-[#FDF8F3]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#F5EDE4] px-1.5 py-0.5 font-headline text-[10px] font-bold uppercase tracking-wide text-[#57534E]">
                      {MEETING_KIND_LABELS[meeting.kind]}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#C2410C]">
                      {MEETING_STATUS_LABELS[meeting.status]}
                    </span>
                    {meeting.minutesFinalizedAt && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#047857]">Minute sealed</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-[#1C1917]">{meeting.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#57534E]">
                    {dayOf(meeting.heldAt)} · {timeOf(meeting.heldAt)} · {meeting.venue}
                  </p>
                  <p className={`mt-1.5 inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${QUORUM_CHIP[standing.tone]}`}>
                    {standing.tone === 'met' ? 'Quorate' : standing.tone === 'short' ? 'Not quorate' : 'Not yet counted'}
                  </p>
                </button>
              );
            })}
            {rows.length > 0 && (
              <Pager
                page={meetings.meta?.page ?? page}
                pageSize={pageSize}
                total={meetings.meta?.total ?? rows.length}
                noun="sittings"
                onPage={setPage}
              />
            )}
          </div>

          {/* The sitting itself */}
          <div className="space-y-5 xl:col-span-8">
            {!selected && !meetings.loading && (
              <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
                <EmptyBlock icon="menu_book" title="Choose a sitting" hint="Its order of business, its register and its minute are on the right." />
              </div>
            )}

            {dossier && standing && (
              <>
                <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#C2410C]">
                        {MEETING_KIND_LABELS[dossier.kind]} sitting · {MEETING_STATUS_LABELS[dossier.status]}
                      </p>
                      <h3 className="mt-0.5 font-headline text-xl font-extrabold text-[#1C1917]">{dossier.title}</h3>
                      <p className="mt-1 text-xs text-[#57534E]">
                        {whenOf(dossier.heldAt)} at {timeOf(dossier.heldAt)} · {dossier.venue}
                      </p>
                      <p className="mt-1 text-xs text-[#57534E]">
                        Chaired by {memberRefName(dossier.chair) ?? 'nobody recorded'} · Clerking:{' '}
                        {memberRefName(dossier.secretary) ?? 'nobody recorded'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canEdit('council') && (
                        <button
                          type="button"
                          onClick={() => openForm(dossier)}
                          className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#C2410C] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] cursor-pointer"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">edit</span>
                          {dossier.minutesFinalizedAt ? 'Amend the sealed minute' : 'Change the notice'}
                        </button>
                      )}
                      {isAdmin && dossier.status === 'held' && !dossier.minutesFinalizedAt && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void seal()}
                          className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1.5 text-xs font-bold text-[#047857] transition-colors hover:bg-[#D1FAE5] disabled:opacity-60 cursor-pointer"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">verified</span>
                          {busy ? 'Sealing…' : 'Seal the minutes'}
                        </button>
                      )}
                      {canDelete('council') && (
                        <button
                          type="button"
                          onClick={() => setRetiring(dossier)}
                          className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#B91C1C] transition-colors hover:bg-[#FEF2F2] cursor-pointer"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                          Retire it
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[12px] border border-[#E7E5E4] bg-[#FDF8F3] p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#57534E]">The register</p>
                    <p className="mt-1 text-xs text-[#1C1917]">{standing.text}</p>
                    <p className="mt-1 text-[11px] text-[#57534E]">{QUORUM_RULE_HINT}</p>
                  </div>
                </div>

                <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
                  <h4 className="font-headline text-sm font-bold text-[#1C1917]">Order of business</h4>
                  {dossier.agenda && dossier.agenda.length > 0 ? (
                    <ol className="mt-3 space-y-1.5">
                      {dossier.agenda.map((item, index) => (
                        <li key={`${item}-${index}`} className="flex gap-2.5 text-xs text-[#1C1917]">
                          <span className="font-headline font-bold text-[#C2410C]">{index + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-xs text-[#57534E]">
                      No order of business is filed. The chair's agenda can be added when the notice is written.
                    </p>
                  )}
                </div>

                <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
                  <h4 className="font-headline text-sm font-bold text-[#1C1917]">Resolutions tabled here</h4>
                  {dossier.resolutions && dossier.resolutions.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {dossier.resolutions.map((resolution) => (
                        <li key={resolution.id} className="rounded-[10px] border border-[#E7E5E4] px-3 py-2">
                          <p className="text-xs font-bold text-[#1C1917]">
                            <span className="font-headline text-[#C2410C]">{resolution.code}</span> · {resolution.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#57534E]">
                            {STAGE_LABELS[resolution.stage]}
                            {resolution.voteSummary ? ` · ${resolution.voteSummary}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-[#57534E]">
                      Nothing was put to this sitting. A resolution is tabled from the docket below.
                    </p>
                  )}
                </div>

                <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
                  <h4 className="font-headline text-sm font-bold text-[#1C1917]">The minute</h4>
                  {dossier.minutes ? (
                    <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[#1C1917]">{dossier.minutes}</p>
                  ) : (
                    <p className="mt-2 text-xs text-[#57534E]">
                      The minute is written after the sitting. Mark the sitting held, write the words, then seal it — sealing is
                      what closes the register.
                    </p>
                  )}
                  {dossier.minutesFinalizedAt && (
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-[#047857]">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">lock</span>
                      Sealed by {dossier.minutesFinalizedBy?.name ?? 'an administrator'} on {whenOf(dossier.minutesFinalizedAt)}.
                      Only an administrator may change the register or the minute now.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...formDialog}>
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">
              {draft.id ? 'Change the notice' : 'Call a sitting'}
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              The quorum figure is counted from the council roll when the sitting is saved, so nothing here asks for it.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="meet-title">What is it called?</label>
                <input
                  id="meet-title"
                  required
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Q2 Stated Council Conclave"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="meet-kind">What kind of sitting</label>
                <select
                  id="meet-kind"
                  value={draft.kind}
                  onChange={(event) => setDraft({ ...draft, kind: event.target.value as MeetingKind })}
                  className={FIELD}
                >
                  {MEETING_KIND_ORDER.map((option) => (
                    <option key={option} value={option}>
                      {MEETING_KIND_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="meet-status">Where it stands</label>
                <select
                  id="meet-status"
                  value={draft.status}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value as MeetingStatus })}
                  className={FIELD}
                >
                  {MEETING_STATUS_ORDER.map((option) => (
                    <option key={option} value={option}>
                      {MEETING_STATUS_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="meet-when">When</label>
                <input
                  id="meet-when"
                  type="datetime-local"
                  required
                  value={draft.heldAt}
                  onChange={(event) => setDraft({ ...draft, heldAt: event.target.value })}
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="meet-attendees">Officers present</label>
                <input
                  id="meet-attendees"
                  type="number"
                  min={0}
                  value={draft.attendees}
                  onChange={(event) => setDraft({ ...draft, attendees: event.target.value })}
                  placeholder="Counted at the roll call"
                  className={FIELD}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="meet-venue">Where it is held</label>
                <input
                  id="meet-venue"
                  required
                  value={draft.venue}
                  onChange={(event) => setDraft({ ...draft, venue: event.target.value })}
                  placeholder="Main Church - Council Chamber"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="meet-chair">Who chairs it</label>
                <select
                  id="meet-chair"
                  value={draft.chairId}
                  onChange={(event) => setDraft({ ...draft, chairId: event.target.value })}
                  className={FIELD}
                >
                  <option value="">Nobody recorded</option>
                  {members.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {memberRefName(member)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="meet-secretary">Who clerks it</label>
                <select
                  id="meet-secretary"
                  value={draft.secretaryId}
                  onChange={(event) => setDraft({ ...draft, secretaryId: event.target.value })}
                  className={FIELD}
                >
                  <option value="">Nobody recorded</option>
                  {members.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {memberRefName(member)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="meet-agenda">Order of business — one item per line</label>
                <textarea
                  id="meet-agenda"
                  rows={4}
                  value={draft.agenda}
                  onChange={(event) => setDraft({ ...draft, agenda: event.target.value })}
                  placeholder={'Opening devotion and roll call\nMinutes of the last sitting'}
                  className={FIELD}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="meet-minutes">The minute</label>
                <textarea
                  id="meet-minutes"
                  rows={6}
                  value={draft.minutes}
                  onChange={(event) => setDraft({ ...draft, minutes: event.target.value })}
                  placeholder="What was moved, seconded and carried — written after the sitting."
                  className={FIELD}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Saving…' : draft.id ? 'Save the notice' : 'Call the sitting'}
              </button>
            </div>
          </form>
        </div>
      )}

      {retiring && (
        <RetireDialog
          what={`the sitting "${retiring.title}"`}
          caption={`${whenOf(retiring.heldAt)} · ${retiring.venue}.`}
          reasons={SITTING_RETIRE_REASONS}
          busy={busy}
          onClose={() => setRetiring(null)}
          onConfirm={(reason, reasonLabel) => void retire(reason, reasonLabel)}
        />
      )}
    </div>
  );
};
