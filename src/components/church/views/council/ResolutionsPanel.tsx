import React, { useState } from 'react';
import {
  governanceApi,
  type DecisionBody,
  type ResolutionDto,
  type ResolutionStage,
} from '../../../../lib/api';
import { errorMessage, useMeetings, useResolutions } from '../../../../hooks/useApi';
import { usePermissions } from '../../../../lib/permissions';
import { useDialog } from '../../dialog';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';
import { Notice, Pager, RetireDialog } from './CouncilControls';
import {
  FIELD,
  LABEL,
  NEXT_DECISION,
  RECORD_RETIRE_REASONS,
  STAGE_LABELS,
  STAGE_ORDER,
  dayOf,
  instantFromLocalInput,
  toLocalInput,
} from './vocabulary';

/**
 * The docket: what was put to the council and where each decision stands.
 *
 * A resolution moves in one direction and only through the decision endpoint — proposed, voted,
 * implemented, closed — so this screen never offers a stage to set. It offers the **next act**,
 * named, and the API refuses the step if the record is not at the stage the act follows.
 *
 * The code is the server's too. A minute cites `RES-2025-042`, so it is issued in the year's series
 * rather than typed in by whoever is filing.
 */

const STAGE_CHIP: Record<ResolutionStage, string> = {
  proposed: 'text-[#57534E] bg-[#F5EDE4] border-[#E7E5E4]',
  voted_approved: 'text-[#047857] bg-[#ECFDF5] border-[#A7F3D0]',
  implementing: 'text-[#9A3412] bg-[#FFF7ED] border-[#FED7AA]',
  closed: 'text-[#57534E] bg-[#FDF8F3] border-[#E7E5E4]',
};

const EMPTY_DRAFT = {
  id: null as string | null,
  title: '',
  summary: '',
  sponsor: '',
  sponsorOfficer: '',
  meetingId: '',
  councilDate: '',
  lead: '',
  leadNote: '',
};
type Draft = typeof EMPTY_DRAFT;

const EMPTY_DECISION = {
  decision: 'voted_approved' as 'voted_approved' | 'implementing' | 'closed',
  voteSummary: '',
  votesFor: '',
  votesAgainst: '',
  votesAbstain: '',
  decidedAt: '',
  note: '',
};
type DecisionDraft = typeof EMPTY_DECISION;

const numberOrUndefined = (value: string): number | undefined => {
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : undefined;
};

export const ResolutionsPanel: React.FC = () => {
  const { canEdit, canDelete, role } = usePermissions();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<ResolutionStage | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const resolutions = useResolutions({ q: query || undefined, stage: stage || undefined, page, pageSize });
  const meetings = useMeetings({ pageSize: 100 });

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formOpen, setFormOpen] = useState(false);
  const [deciding, setDeciding] = useState<ResolutionDto | null>(null);
  const [decision, setDecision] = useState<DecisionDraft>(EMPTY_DECISION);
  const [retiring, setRetiring] = useState<ResolutionDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const formDialog = useDialog(() => setFormOpen(false), draft.id ? 'Amend the resolution' : 'Table a resolution');
  const decisionDialog = useDialog(() => setDeciding(null), 'Record the decision');

  const rows = resolutions.items;
  const total = resolutions.meta?.total ?? rows.length;
  /** The whole docket, so the chip beside "Everything" counts the docket rather than the current filter. */
  const census = Object.values(resolutions.counts).reduce((sum, count) => sum + count, 0);
  const announce = (message: string) => {
    setError(null);
    setNotice(message);
  };

  const openForm = (resolution?: ResolutionDto) => {
    setError(null);
    setDraft(
      resolution
        ? {
            id: resolution.id,
            title: resolution.title,
            summary: resolution.summary,
            sponsor: resolution.sponsor,
            sponsorOfficer: resolution.sponsorOfficer ?? '',
            meetingId: resolution.meetingId ?? '',
            councilDate: toLocalInput(resolution.councilDate),
            lead: resolution.lead ?? '',
            leadNote: resolution.leadNote ?? '',
          }
        : { ...EMPTY_DRAFT, councilDate: toLocalInput(new Date().toISOString()) },
    );
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      sponsor: draft.sponsor.trim(),
      ...(draft.sponsorOfficer.trim() ? { sponsorOfficer: draft.sponsorOfficer.trim() } : {}),
      councilDate: instantFromLocalInput(draft.councilDate),
      ...(draft.lead.trim() ? { lead: draft.lead.trim() } : {}),
      ...(draft.leadNote.trim() ? { leadNote: draft.leadNote.trim() } : {}),
    };
    try {
      if (draft.id) {
        await governanceApi.updateResolution(draft.id, {
          ...body,
          meetingId: draft.meetingId || null,
        });
        announce('The resolution is amended.');
      } else {
        const { data } = await governanceApi.createResolution({
          ...body,
          ...(draft.meetingId ? { meetingId: draft.meetingId } : {}),
        });
        announce(`${data.code} is on the docket, proposed. The vote is recorded when the council sits.`);
      }
      setFormOpen(false);
      await resolutions.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openDecision = (resolution: ResolutionDto) => {
    const next = NEXT_DECISION[resolution.stage];
    if (!next) return;
    setError(null);
    setDecision({
      ...EMPTY_DECISION,
      decision: next.to as DecisionDraft['decision'],
      votesFor: resolution.votesFor === null ? '' : String(resolution.votesFor),
      votesAgainst: resolution.votesAgainst === null ? '' : String(resolution.votesAgainst),
      votesAbstain: resolution.votesAbstain === null ? '' : String(resolution.votesAbstain),
      decidedAt: toLocalInput(new Date().toISOString()),
    });
    setDeciding(resolution);
  };

  const recordDecision = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deciding) return;
    setBusy(true);
    setError(null);
    const [votesFor, votesAgainst, votesAbstain] = [decision.votesFor, decision.votesAgainst, decision.votesAbstain].map(
      numberOrUndefined,
    );
    const body: DecisionBody =
      decision.decision === 'voted_approved'
        ? {
            decision: 'voted_approved',
            voteSummary: decision.voteSummary.trim(),
            ...(votesFor === undefined ? {} : { votesFor }),
            ...(votesAgainst === undefined ? {} : { votesAgainst }),
            ...(votesAbstain === undefined ? {} : { votesAbstain }),
            ...(decision.decidedAt ? { decidedAt: instantFromLocalInput(decision.decidedAt) } : {}),
          }
        : { decision: decision.decision, note: decision.note.trim() };
    try {
      const { data } = await governanceApi.decideResolution(deciding.id, body);
      setDeciding(null);
      announce(
        data.stage === 'voted_approved'
          ? `${data.code} is carried. Start the work when the lead picks it up.`
          : data.stage === 'implementing'
            ? `${data.code} is being implemented.`
            : `${data.code} is closed.`,
      );
      await resolutions.refetch();
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
      await governanceApi.retireResolution(retiring.id, { reason, reasonLabel });
      setRetiring(null);
      announce('The resolution is in the Trash, where an administrator can restore it.');
      await resolutions.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const nextOf = deciding ? NEXT_DECISION[deciding.stage] : null;

  return (
    <div className="space-y-5">
      {error && <Notice tone="bad">{error}</Notice>}
      {notice && <Notice tone="ok">{notice}</Notice>}

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
        <div className="flex flex-col gap-3 border-b border-[#E7E5E4] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">task_alt</span>
              Resolutions &amp; Legislative Docket
            </h2>
            <p className="mt-0.5 text-xs text-[#57534E]">
              Proposed, voted, implemented, closed — each step recorded as it happens, with the division the minute quotes.
            </p>
          </div>
          {canEdit('council') && (
            <button
              type="button"
              onClick={() => openForm()}
              className="inline-flex items-center gap-1.5 self-start rounded-[9px] bg-[#C2410C] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">note_add</span>
              Table a resolution
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="res-q">Search the docket</label>
          <input
            id="res-q"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by code, title, sponsor or lead"
            className={`${FIELD} sm:w-72`}
          />
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by stage">
            {(['', ...STAGE_ORDER] as Array<ResolutionStage | ''>).map((option) => {
              const count = option === '' ? census : (resolutions.counts[option] ?? 0);
              return (
                <button
                  key={option || 'all'}
                  type="button"
                  aria-pressed={stage === option}
                  onClick={() => {
                    setStage(option);
                    setPage(1);
                  }}
                  className={`rounded-[9px] border px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    stage === option
                      ? 'border-[#C2410C] bg-[#C2410C] text-white'
                      : 'border-[#E7E5E4] bg-[#FFFFFF] text-[#57534E] hover:bg-[#F5EDE4]'
                  }`}
                >
                  {option === '' ? 'Everything' : STAGE_LABELS[option]} · {count}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {resolutions.loading && <LoadingBlock label="Reading the docket…" />}
          {resolutions.error && <ErrorBlock message={resolutions.error} onRetry={() => void resolutions.refetch()} />}
          {!resolutions.loading && !resolutions.error && rows.length === 0 && (
            <EmptyBlock
              icon="gavel"
              title="The docket is empty"
              hint="Nothing has been put to the council. A resolution is tabled here, and decided at a sitting."
            />
          )}

          {rows.map((resolution) => {
            const next = NEXT_DECISION[resolution.stage];
            return (
              <div key={resolution.id} className="rounded-[12px] border border-[#E7E5E4] bg-[#FFFFFF] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-headline text-xs font-bold text-[#C2410C]">{resolution.code}</span>
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STAGE_CHIP[resolution.stage]}`}>
                        {STAGE_LABELS[resolution.stage]}
                      </span>
                      {resolution.voteSummary && (
                        <span className="text-[11px] font-semibold text-[#57534E]">{resolution.voteSummary}</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-[#1C1917]">{resolution.title}</p>
                    <p className="mt-0.5 text-xs text-[#57534E]">{resolution.summary}</p>
                    <p className="mt-1.5 text-[11px] text-[#57534E]">
                      Moved by {resolution.sponsor}
                      {resolution.sponsorOfficer ? ` (${resolution.sponsorOfficer})` : ''} ·{' '}
                      {resolution.meeting ? `Tabled at ${resolution.meeting.title}` : 'Not tabled at a sitting'} ·{' '}
                      {dayOf(resolution.councilDate)}
                    </p>
                    {(resolution.lead || resolution.leadNote) && (
                      <p className="mt-1 text-[11px] text-[#57534E]">
                        {resolution.lead ? `Lead: ${resolution.lead}` : 'Lead: not named'}
                        {resolution.leadNote ? ` — ${resolution.leadNote}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {next && isAdmin && (
                      <button
                        type="button"
                        onClick={() => openDecision(resolution)}
                        className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1.5 text-xs font-bold text-[#047857] transition-colors hover:bg-[#D1FAE5] cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">how_to_vote</span>
                        {next.action}
                      </button>
                    )}
                    {next && !isAdmin && (
                      <span className="self-center text-[11px] text-[#57534E]">
                        {next.action} — an administrator records it.
                      </span>
                    )}
                    {canEdit('council') && (
                      <button
                        type="button"
                        onClick={() => openForm(resolution)}
                        className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">edit</span>
                        Amend
                      </button>
                    )}
                    {canDelete('council') && (
                      <button
                        type="button"
                        onClick={() => setRetiring(resolution)}
                        className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#B91C1C] transition-colors hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                        Retire
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {rows.length > 0 && (
            <Pager
              page={resolutions.meta?.page ?? page}
              pageSize={pageSize}
              total={total}
              noun="resolutions"
              onPage={setPage}
            />
          )}
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...formDialog}>
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">
              {draft.id ? 'Amend the resolution' : 'Table a resolution'}
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              The code is issued in the year's series, and the stage moves by the decision, never by an edit — so neither is
              asked for here.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="res-title">What is being decided?</label>
                <input
                  id="res-title"
                  required
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Sanctuary roof replacement contract"
                  className={FIELD}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="res-summary">In a paragraph</label>
                <textarea
                  id="res-summary"
                  required
                  rows={3}
                  value={draft.summary}
                  onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                  placeholder="Award the contract and refer implementation to the trustees."
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="res-sponsor">Who moves it</label>
                <input
                  id="res-sponsor"
                  required
                  value={draft.sponsor}
                  onChange={(event) => setDraft({ ...draft, sponsor: event.target.value })}
                  placeholder="Trustee Board"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="res-officer">The officer behind it</label>
                <input
                  id="res-officer"
                  value={draft.sponsorOfficer}
                  onChange={(event) => setDraft({ ...draft, sponsorOfficer: event.target.value })}
                  placeholder="Arthur Wanjala"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="res-date">The council date</label>
                <input
                  id="res-date"
                  type="datetime-local"
                  required
                  value={draft.councilDate}
                  onChange={(event) => setDraft({ ...draft, councilDate: event.target.value })}
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="res-meeting">Tabled at which sitting</label>
                <select
                  id="res-meeting"
                  value={draft.meetingId}
                  onChange={(event) => setDraft({ ...draft, meetingId: event.target.value })}
                  className={FIELD}
                >
                  <option value="">Not tabled at a sitting</option>
                  {meetings.items.map((meeting) => (
                    <option key={meeting.id} value={meeting.id}>
                      {meeting.title} — {dayOf(meeting.heldAt)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="res-lead">Who carries it out</label>
                <input
                  id="res-lead"
                  value={draft.lead}
                  onChange={(event) => setDraft({ ...draft, lead: event.target.value })}
                  placeholder="Elder Marcus Kamau"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="res-note">Where the work stands</label>
                <input
                  id="res-note"
                  value={draft.leadNote}
                  onChange={(event) => setDraft({ ...draft, leadNote: event.target.value })}
                  placeholder="Two of four milestones"
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
                {busy ? 'Saving…' : draft.id ? 'Save the amendment' : 'Table it'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deciding && nextOf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...decisionDialog}>
          <form onSubmit={recordDecision} className="w-full max-w-[480px] rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">
              {nextOf.to === 'voted_approved' ? 'Record the vote' : nextOf.to === 'implementing' ? 'Put it into effect' : 'Close it'}
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              {deciding.code} · {deciding.title}. It is {STAGE_LABELS[deciding.stage].toLowerCase()}, so this is the step that
              follows.
            </p>

            <div className="mt-4 space-y-3">
              {nextOf.to === 'voted_approved' && (
                <>
                  <div>
                    <label className={LABEL} htmlFor="res-vote">How the council went</label>
                    <input
                      id="res-vote"
                      required
                      minLength={2}
                      value={decision.voteSummary}
                      onChange={(event) => setDecision({ ...decision, voteSummary: event.target.value })}
                      placeholder="7 Yea - 0 Nay"
                      className={FIELD}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(
                      [
                        ['votesFor', 'For'],
                        ['votesAgainst', 'Against'],
                        ['votesAbstain', 'Abstained'],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field}>
                        <label className={LABEL} htmlFor={`res-${field}`}>{label}</label>
                        <input
                          id={`res-${field}`}
                          type="number"
                          min={0}
                          value={decision[field]}
                          onChange={(event) => setDecision({ ...decision, [field]: event.target.value })}
                          className={FIELD}
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="res-decided">Decided on</label>
                    <input
                      id="res-decided"
                      type="datetime-local"
                      value={decision.decidedAt}
                      onChange={(event) => setDecision({ ...decision, decidedAt: event.target.value })}
                      className={FIELD}
                    />
                  </div>
                </>
              )}

              {(nextOf.to === 'implementing' || nextOf.to === 'closed') && (
                <div>
                  <label className={LABEL} htmlFor="res-note-decide">
                    {nextOf.to === 'implementing' ? 'What the work is' : 'What it came to'}
                  </label>
                  <textarea
                    id="res-note-decide"
                    required
                    rows={3}
                    value={decision.note}
                    onChange={(event) => setDecision({ ...decision, note: event.target.value })}
                    placeholder={
                      nextOf.to === 'implementing'
                        ? 'The trustees have the contract and a quotation is being sought.'
                        : 'Roof replaced and paid for; the contractor has signed off.'
                    }
                    className={FIELD}
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeciding(null)}
                className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Recording…' : 'Record it'}
              </button>
            </div>
          </form>
        </div>
      )}

      {retiring && (
        <RetireDialog
          what={`resolution ${retiring.code}`}
          caption={retiring.title}
          reasons={RECORD_RETIRE_REASONS}
          busy={busy}
          onClose={() => setRetiring(null)}
          onConfirm={(reason, reasonLabel) => void retire(reason, reasonLabel)}
        />
      )}
    </div>
  );
};
