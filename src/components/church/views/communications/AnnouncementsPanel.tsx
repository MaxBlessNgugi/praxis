import React, { useState } from 'react';
import { useDialog } from '../../dialog';
import {
  announcementsApi,
  type AnnouncementBody,
  type AnnouncementDto,
  type AnnouncementPriority,
} from '../../../../lib/api';
import { formatDate } from '../../../../lib/adapters';
import { useAnnouncements, useMutation } from '../../../../hooks/useApi';
import { usePermissions } from '../../../../lib/permissions';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * The notice sheet, as the church actually keeps it.
 *
 * The table stores a title, a body, who it is for, how loudly it asks to be read, and the two dates
 * that decide when it is on the board. Every control here writes one of those and nothing else — the
 * old panel offered a category and a priority the record had no column for, so a notice's importance
 * was a display default rather than something the office had decided.
 *
 * The three states a notice can be in are read off those dates rather than stored: not yet up,
 * on the board, taken down. That is why "Publish now" and "Take down" are the same two dates moved.
 */

/** The audiences the office posts to. Stored as written, so the label *is* the record. */
const AUDIENCES = ['Everyone', 'Members', 'Ministry Leaders', 'Youth', 'Church Council'] as const;

const FIELD =
  'w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1';

type NoticeState = 'scheduled' | 'live' | 'lapsed';

function stateOf(notice: AnnouncementDto): NoticeState {
  const now = Date.now();
  if (new Date(notice.publishedAt).getTime() > now) return 'scheduled';
  if (notice.expiresAt && new Date(notice.expiresAt).getTime() <= now) return 'lapsed';
  return 'live';
}

const STATE_LABELS: Record<NoticeState, string> = {
  scheduled: 'Goes up later',
  live: 'On the board',
  lapsed: 'Taken down',
};

/** `YYYY-MM-DD` for a date input, in the reader's own zone. */
const dayInput = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-CA') : '');

/** A day input means the start of that day local time; an empty one means no date at all. */
const instantOf = (day: string) => (day ? new Date(`${day}T00:00:00`).toISOString() : undefined);

interface Draft {
  id: string | null;
  title: string;
  body: string;
  audience: string;
  priority: AnnouncementPriority;
  isPinned: boolean;
  publishedOn: string;
  expiresOn: string;
}

const emptyDraft = (): Draft => ({
  id: null,
  title: '',
  body: '',
  audience: AUDIENCES[0],
  priority: 'normal',
  isPinned: false,
  publishedOn: new Date().toLocaleDateString('en-CA'),
  expiresOn: '',
});

const draftOf = (notice: AnnouncementDto): Draft => ({
  id: notice.id,
  title: notice.title,
  body: notice.body,
  audience: notice.audience,
  priority: notice.priority,
  isPinned: notice.isPinned,
  publishedOn: dayInput(notice.publishedAt),
  expiresOn: dayInput(notice.expiresAt),
});

export const AnnouncementsPanel: React.FC = () => {
  const { items, loading, error, refetch } = useAnnouncements({ pageSize: 100 });
  const createAnnouncement = useMutation(announcementsApi.create);
  const updateAnnouncement = useMutation(announcementsApi.update);
  const retireAnnouncement = useMutation(announcementsApi.retire);
  const { canEdit, canDelete } = usePermissions();

  const [selectedAudience, setSelectedAudience] = useState<string>('all');
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [isEditing, setIsEditing] = useState(false);
  const editingDialog = useDialog(() => setIsEditing(false), 'Church Notice');

  // The audience filter is the loaded rows, not a second request: the panel holds the whole sheet.
  const shown = selectedAudience === 'all' ? items : items.filter((notice) => notice.audience === selectedAudience);
  const boards = items.filter((notice) => stateOf(notice) === 'live');

  const openComposer = (notice?: AnnouncementDto) => {
    setDraft(notice ? draftOf(notice) : emptyDraft());
    setIsEditing(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.body.trim()) return;

    const body = {
      title: draft.title.trim(),
      body: draft.body.trim(),
      audience: draft.audience,
      priority: draft.priority,
      isPinned: draft.isPinned,
      publishedAt: instantOf(draft.publishedOn),
      expiresAt: instantOf(draft.expiresOn) ?? null,
    };

    try {
      if (draft.id) await updateAnnouncement.run(draft.id, body);
      else await createAnnouncement.run(body);
      await refetch();
      setIsEditing(false);
    } catch {
      // The write's own error is rendered inside the dialog.
    }
  };

  /**
   * Pinning, publishing now and taking a notice down are all the same act — one row changed — so the
   * two date buttons and the pin share this.
   */
  const change = async (notice: AnnouncementDto, fields: Partial<AnnouncementBody>) => {
    await updateAnnouncement.run(notice.id, fields);
    await refetch();
  };

  const retire = async (notice: AnnouncementDto) => {
    await retireAnnouncement.run(notice.id, {
      reason: 'other',
      reasonLabel: 'Taken off the noticeboard by the church office',
    });
    await refetch();
  };

  const writeError = updateAnnouncement.error ?? retireAnnouncement.error ?? createAnnouncement.error;

  return (
    <div className="flex flex-col space-y-6">
      {/* What the sheet holds right now. Each figure is the rows on screen, nothing else. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'On the board', value: `${boards.length} Live`, hint: 'Published and not yet taken down' },
          { label: 'Urgent', value: `${items.filter((n) => n.priority === 'urgent').length} Alerts`, hint: 'Placed first on every list' },
          { label: 'Pinned', value: `${items.filter((n) => n.isPinned).length} Featured`, hint: 'Held at the top of the sheet' },
          {
            label: 'Written ahead',
            value: `${items.filter((n) => stateOf(n) === 'scheduled').length} Scheduled`,
            hint: 'Waiting for the day they go up',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card"
          >
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
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">newspaper</span>
              Church Notice Sheet
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Write a notice, say who it is for and the day it goes up. The office can hold it back or take it
              down again without losing the wording.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by audience"
              value={selectedAudience}
              onChange={(event) => setSelectedAudience(event.target.value)}
              className="px-3 py-1.5 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
            >
              <option value="all">Every audience</option>
              {AUDIENCES.map((audience) => (
                <option key={audience} value={audience}>
                  {audience}
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
                New notice
              </button>
            )}
          </div>
        </div>

        {writeError && <ErrorBlock message={writeError} onRetry={() => void refetch()} className="mb-4" />}

        {loading && items.length === 0 ? (
          <LoadingBlock label="Reading the notice sheet…" />
        ) : error ? (
          <ErrorBlock message={error} onRetry={() => void refetch()} />
        ) : shown.length === 0 ? (
          <EmptyBlock
            icon="campaign"
            title={items.length === 0 ? 'Nothing on the notice sheet yet' : 'No notices for that audience'}
            hint={
              items.length === 0
                ? 'Write the first notice and it appears here for the whole church.'
                : 'Choose another audience, or write one for this group.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shown.map((notice) => {
              const state = stateOf(notice);
              return (
                <div
                  key={notice.id}
                  className={`p-4 rounded-[12px] border transition-all flex flex-col justify-between ${
                    notice.isPinned
                      ? 'bg-[#FDF8F3] border-[#C2410C]/40 ring-1 ring-[#C2410C]/20 shadow-sm'
                      : 'bg-[#FFFFFF] border-[#E7E5E4] hover:bg-[#FDF8F3]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {notice.priority === 'urgent' && (
                          <span className="px-2 py-0.5 rounded-full bg-[#DC2626]/10 text-[#DC2626] text-[10px] font-bold uppercase tracking-wider">
                            Urgent
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            state === 'live'
                              ? 'bg-[#059669]/10 text-[#059669]'
                              : state === 'scheduled'
                                ? 'bg-[#D97706]/10 text-[#D97706]'
                                : 'bg-[#57534E]/10 text-[#57534E]'
                          }`}
                        >
                          {STATE_LABELS[state]}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#C2410C]/10 text-[#C2410C] text-[10px] font-bold">
                          {notice.audience}
                        </span>
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => void change(notice, { isPinned: !notice.isPinned })}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            notice.isPinned ? 'text-[#C2410C] bg-[#C2410C]/10' : 'text-[#A8A29E] hover:text-[#1C1917]'
                          }`}
                          title={notice.isPinned ? 'Unpin' : 'Pin to the top of the sheet'}
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">push_pin</span>
                        </button>
                      )}
                    </div>

                    <h4 className="font-headline text-sm font-bold text-[#1C1917] mb-1.5 leading-snug">{notice.title}</h4>
                    <p className="text-xs text-[#57534E] leading-relaxed line-clamp-3 mb-3">{notice.body}</p>
                  </div>

                  <div className="pt-3 border-t border-[#E7E5E4]/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#A8A29E]">
                    <div>
                      By <strong className="text-[#1C1917]">{notice.author?.name ?? 'Church office'}</strong> ·{' '}
                      <span className="font-mono">{formatDate(notice.publishedAt)}</span>
                      {notice.expiresAt && <> → {formatDate(notice.expiresAt)}</>}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openComposer(notice)}
                          className="px-2 py-1 rounded-[6px] font-bold text-[#1C1917] hover:bg-[#F5EDE4] cursor-pointer"
                        >
                          Edit
                        </button>
                        {state === 'live' ? (
                          <button
                            type="button"
                            onClick={() => void change(notice, { expiresAt: new Date().toISOString() })}
                            className="px-2 py-1 rounded-[6px] font-bold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer"
                          >
                            Take down
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void change(notice, { publishedAt: new Date().toISOString(), expiresAt: null })}
                            className="px-2 py-1 rounded-[6px] font-bold text-[#059669] hover:bg-[#059669]/10 cursor-pointer"
                          >
                            Publish now
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => void retire(notice)}
                            title="Move to the Trash"
                            className="p-1 rounded text-[#DC2626] hover:text-[#B91C1C] cursor-pointer"
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...editingDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-lg w-full p-6 shadow-2xl border border-[#E7E5E4] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">
                {draft.id ? 'Edit notice' : 'Write a notice'}
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
                <label htmlFor="notice-title" className={LABEL}>
                  Headline *
                </label>
                <input
                  id="notice-title"
                  type="text"
                  required
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Harvest thanksgiving — service times move forward"
                  className={FIELD}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="notice-audience" className={LABEL}>
                    Who it is for
                  </label>
                  <select
                    id="notice-audience"
                    value={draft.audience}
                    onChange={(event) => setDraft({ ...draft, audience: event.target.value })}
                    className={`${FIELD} cursor-pointer`}
                  >
                    {AUDIENCES.map((audience) => (
                      <option key={audience} value={audience}>
                        {audience}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="notice-priority" className={LABEL}>
                    How loudly it asks
                  </label>
                  <select
                    id="notice-priority"
                    value={draft.priority}
                    onChange={(event) => setDraft({ ...draft, priority: event.target.value as AnnouncementPriority })}
                    className={`${FIELD} cursor-pointer`}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="notice-body" className={LABEL}>
                  The notice *
                </label>
                <textarea
                  id="notice-body"
                  rows={5}
                  required
                  value={draft.body}
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                  placeholder="What the church needs to know, in the words the office would use."
                  className={FIELD}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="notice-publishes" className={LABEL}>
                    Goes up
                  </label>
                  <input
                    id="notice-publishes"
                    type="date"
                    value={draft.publishedOn}
                    onChange={(event) => setDraft({ ...draft, publishedOn: event.target.value })}
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="notice-expires" className={LABEL}>
                    Comes down (optional)
                  </label>
                  <input
                    id="notice-expires"
                    type="date"
                    value={draft.expiresOn}
                    onChange={(event) => setDraft({ ...draft, expiresOn: event.target.value })}
                    className={FIELD}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notice-pinned"
                  checked={draft.isPinned}
                  onChange={(event) => setDraft({ ...draft, isPinned: event.target.checked })}
                  className="rounded text-[#C2410C] focus:ring-[#C2410C]"
                />
                <label htmlFor="notice-pinned" className="text-xs font-bold text-[#1C1917] cursor-pointer">
                  Hold it at the top of the sheet
                </label>
              </div>

              {(createAnnouncement.error ?? updateAnnouncement.error) && (
                <div role="alert" className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[11px] font-semibold text-[#B91C1C]">
                  {createAnnouncement.error ?? updateAnnouncement.error}
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
                  disabled={createAnnouncement.pending || updateAnnouncement.pending}
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-70 disabled:cursor-wait text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {createAnnouncement.pending || updateAnnouncement.pending ? 'Saving…' : 'Save notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
