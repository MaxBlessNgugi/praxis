import React, { useMemo, useState } from 'react';
import { useDialog } from '../../dialog';
import { prayerApi, type PrayerRequestDto } from '../../../../lib/api';
import { formatDate } from '../../../../lib/adapters';
import { usePrayerRequests, useMutation } from '../../../../hooks/useApi';
import { usePermissions } from '../../../../lib/permissions';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * The prayer wall — petitions the church holds together, and the ones it holds quietly.
 *
 * A petition carries one flag, `isPrivate`, and the server decides who may read it: a private request
 * is pastoral correspondence and only an administrator receives it, in the list and by id alike. The
 * old screen offered three levels of confidentiality against that one flag, so "ministry leaders only"
 * was stored as strictly private, and it printed "Pastors & Elders only" over a rule nobody enforced.
 * The console now offers the two levels the record has and says who the second one actually reaches.
 *
 * Statuses are the four the table stores — open, being prayed for, answered, archived — and the
 * buttons below walk a petition through them rather than showing a stage that only exists on screen.
 */

const STATUS_LABELS: Record<PrayerRequestDto['status'], string> = {
  open: 'Open',
  praying: 'Being prayed for',
  answered: 'Answered',
  archived: 'Off the wall',
};

const FIELD =
  'w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1';

const whoAsked = (prayer: PrayerRequestDto) =>
  prayer.requesterName ?? (prayer.member ? `${prayer.member.firstName} ${prayer.member.lastName}` : 'Anonymous');

export const PrayerRequestsPanel: React.FC = () => {
  const { items, loading, error, refetch } = usePrayerRequests({ pageSize: 100 });
  const createPrayer = useMutation(prayerApi.create);
  const updatePrayer = useMutation(prayerApi.update);
  const answerPrayer = useMutation(prayerApi.answer);
  const retirePrayer = useMutation(prayerApi.retire);
  const { canEdit, canDelete, role } = usePermissions();

  const [statusFilter, setStatusFilter] = useState<'all' | PrayerRequestDto['status']>('all');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingDialog = useDialog(() => setIsSubmitting(false), 'Log a prayer request');
  const [answering, setAnswering] = useState<PrayerRequestDto | null>(null);
  const answeringDialog = useDialog(() => setAnswering(null), 'Record an answered prayer');
  const [praiseNote, setPraiseNote] = useState('');

  const [request, setRequest] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const { beingPrayedFor, answered, shared, offTheWall, shown } = useMemo(() => {
    const onWall = items.filter((prayer) => prayer.status !== 'archived');
    return {
      beingPrayedFor: onWall.filter((prayer) => prayer.status !== 'answered').length,
      answered: items.filter((prayer) => prayer.status === 'answered').length,
      shared: onWall.filter((prayer) => !prayer.isPrivate).length,
      offTheWall: items.filter((prayer) => prayer.status === 'archived').length,
      shown: statusFilter === 'all' ? items : items.filter((prayer) => prayer.status === statusFilter),
    };
  }, [items, statusFilter]);

  const isAdministrator = role === 'admin' || role === 'super_admin';

  const openComposer = () => {
    setRequest('');
    setRequestedBy('');
    setIsAnonymous(false);
    setIsPrivate(false);
    setIsSubmitting(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!request.trim()) return;

    try {
      await createPrayer.run({
        request: request.trim(),
        ...(isAnonymous ? {} : { requesterName: requestedBy.trim() || undefined }),
        isPrivate,
      });
      await refetch();
      setIsSubmitting(false);
    } catch {
      // The write's own error is rendered inside the dialog.
    }
  };

  const walk = async (prayer: PrayerRequestDto, status: PrayerRequestDto['status']) => {
    await updatePrayer.run(prayer.id, { status });
    await refetch();
  };

  const markAnswered = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!answering) return;

    try {
      await answerPrayer.run(answering.id, { note: praiseNote.trim() || undefined });
      await refetch();
      setAnswering(null);
      setPraiseNote('');
    } catch {
      // The write's own error is rendered inside the dialog.
    }
  };

  const retire = async (prayer: PrayerRequestDto) => {
    await retirePrayer.run(prayer.id, {
      reason: 'other',
      reasonLabel: 'Taken off the prayer wall by the pastoral office',
    });
    await refetch();
  };

  const writeError = updatePrayer.error ?? answerPrayer.error ?? retirePrayer.error;

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Being prayed for', value: `${beingPrayedFor} On the wall`, hint: 'Open and in prayer' },
          { label: 'Answered', value: `${answered} Testimonies`, hint: 'Answered and dated' },
          { label: 'Shared openly', value: `${shared} Public`, hint: 'Read by the whole office' },
          { label: 'Off the wall', value: `${offTheWall} Archived`, hint: 'Kept for the record' },
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
                volunteer_activism
              </span>
              Church Prayer Wall
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              {isAdministrator
                ? 'Requests marked private are included here, because an administrator is the only account the server releases them to.'
                : 'Requests marked private are not sent to this account at all; only an administrator receives them.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by where a request has got to"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | PrayerRequestDto['status'])}
              className="px-3 py-1.5 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
            >
              <option value="all">Every request</option>
              <option value="open">Open</option>
              <option value="praying">Being prayed for</option>
              <option value="answered">Answered</option>
              <option value="archived">Off the wall</option>
            </select>

            {canEdit && (
              <button
                type="button"
                onClick={openComposer}
                className="px-3 py-1.5 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_circle</span>
                Log a request
              </button>
            )}
          </div>
        </div>

        {writeError && <ErrorBlock message={writeError} onRetry={() => void refetch()} className="mb-4" />}

        {loading && items.length === 0 ? (
          <LoadingBlock label="Reading the prayer wall…" />
        ) : error ? (
          <ErrorBlock message={error} onRetry={() => void refetch()} />
        ) : shown.length === 0 ? (
          <EmptyBlock
            icon="volunteer_activism"
            title={items.length === 0 ? 'Nothing on the prayer wall' : 'Nothing at that stage'}
            hint={
              items.length === 0
                ? 'Log a request and the church can stand with the person who asked.'
                : 'Choose another stage, or look at every request.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shown.map((prayer) => (
              <div
                key={prayer.id}
                className={`p-4 rounded-[12px] border flex flex-col justify-between ${
                  prayer.status === 'answered'
                    ? 'bg-[#059669]/5 border-[#059669]/30 ring-1 ring-[#059669]/20'
                    : 'bg-[#FDF8F3] border-[#E7E5E4] hover:border-[#C2410C]/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          prayer.status === 'answered'
                            ? 'bg-[#059669]/10 text-[#059669]'
                            : prayer.status === 'archived'
                              ? 'bg-[#57534E]/10 text-[#57534E]'
                              : 'bg-[#C2410C]/10 text-[#C2410C]'
                        }`}
                      >
                        {STATUS_LABELS[prayer.status]}
                      </span>
                      {prayer.isPrivate && (
                        <span className="px-2 py-0.5 rounded-full bg-[#1C1917]/5 text-[#1C1917] text-[10px] font-bold uppercase tracking-wider">
                          Private
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-[#A8A29E]">{formatDate(prayer.submittedAt)}</span>
                  </div>

                  <div className="text-xs text-[#57534E] mb-2 font-medium">
                    Asked by <strong className="text-[#1C1917]">{whoAsked(prayer)}</strong>
                  </div>

                  <p className="text-xs text-[#57534E] leading-relaxed mb-3">{prayer.request}</p>

                  {prayer.answeredAt && (
                    <div className="p-2.5 rounded-[8px] bg-[#059669]/10 border border-[#059669]/30 text-xs text-[#047857] mb-3">
                      <div className="font-bold flex items-center gap-1">
                        <span aria-hidden="true" className="material-symbols-outlined text-[15px]">celebration</span>
                        Answered {formatDate(prayer.answeredAt)}
                      </div>
                    </div>
                  )}
                </div>

                {canEdit && (
                  <div className="pt-3 border-t border-[#E7E5E4]/80 flex flex-wrap items-center justify-end gap-1 text-[11px]">
                    {prayer.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => void walk(prayer, 'praying')}
                        className="px-2 py-1 rounded-[6px] font-bold text-[#C2410C] hover:bg-[#C2410C]/10 cursor-pointer"
                      >
                        Taken to prayer
                      </button>
                    )}
                    {prayer.status !== 'answered' && prayer.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => {
                          setPraiseNote('');
                          setAnswering(prayer);
                        }}
                        className="px-2 py-1 rounded-[6px] font-bold text-[#059669] hover:bg-[#059669]/10 cursor-pointer"
                      >
                        Answered
                      </button>
                    )}
                    {prayer.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => void walk(prayer, 'archived')}
                        className="px-2 py-1 rounded-[6px] font-bold text-[#57534E] hover:bg-[#F5EDE4] cursor-pointer"
                      >
                        Take off the wall
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void retire(prayer)}
                        title="Move to the Trash"
                        className="p-1 rounded text-[#DC2626] hover:text-[#B91C1C] cursor-pointer"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...submittingDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-lg w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Log a prayer request</h3>
              <button
                type="button"
                onClick={() => setIsSubmitting(false)}
                aria-label="Close"
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="prayer-requested-by" className={LABEL}>
                  Asked by
                </label>
                <input
                  id="prayer-requested-by"
                  type="text"
                  disabled={isAnonymous}
                  value={requestedBy}
                  onChange={(event) => setRequestedBy(event.target.value)}
                  placeholder="Their name, or leave it anonymous"
                  className={`${FIELD} disabled:opacity-50`}
                />
              </div>

              <div>
                <label htmlFor="prayer-request" className={LABEL}>
                  The request *
                </label>
                <textarea
                  id="prayer-request"
                  rows={4}
                  required
                  value={request}
                  onChange={(event) => setRequest(event.target.value)}
                  placeholder="Enough detail for the church to pray specifically, and no more."
                  className={FIELD}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="prayer-anonymous"
                    checked={isAnonymous}
                    onChange={(event) => setIsAnonymous(event.target.checked)}
                    className="rounded text-[#C2410C] focus:ring-[#C2410C]"
                  />
                  <label htmlFor="prayer-anonymous" className="text-xs font-bold text-[#1C1917] cursor-pointer">
                    Leave the name off the wall
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="prayer-private"
                    checked={isPrivate}
                    onChange={(event) => setIsPrivate(event.target.checked)}
                    className="rounded text-[#C2410C] focus:ring-[#C2410C]"
                  />
                  <label htmlFor="prayer-private" className="text-xs font-bold text-[#1C1917] cursor-pointer">
                    Keep it private — administrators only
                  </label>
                </div>
              </div>

              {createPrayer.error && <ErrorBlock message={createPrayer.error} />}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsSubmitting(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPrayer.pending}
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {createPrayer.pending ? 'Saving…' : 'Log request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {answering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...answeringDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Record an answered prayer</h3>
              <button
                type="button"
                onClick={() => setAnswering(null)}
                aria-label="Close"
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={markAnswered} className="mt-4 space-y-4">
              <div className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4]">
                <div className="text-[10px] font-bold text-[#A8A29E] uppercase">Request</div>
                <div className="text-xs text-[#1C1917] mt-0.5">{answering.request}</div>
              </div>

              <div>
                <label htmlFor="praise-note" className={LABEL}>
                  Note for the record
                </label>
                <textarea
                  id="praise-note"
                  rows={3}
                  value={praiseNote}
                  onChange={(event) => setPraiseNote(event.target.value)}
                  placeholder="How it was answered. Kept beside the date and in the audit trail."
                  className={FIELD}
                />
              </div>

              {answerPrayer.error && <ErrorBlock message={answerPrayer.error} />}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setAnswering(null)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={answerPrayer.pending}
                  className="px-4 py-2 rounded-[8px] bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {answerPrayer.pending ? 'Saving…' : 'Mark as answered'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
