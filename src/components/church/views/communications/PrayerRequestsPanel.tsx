import React, { useMemo, useState } from 'react';
import { PrayerRequestItem, PrayerPrivacyLevel } from '../../../../types';
import { useDialog } from '../../dialog';
import { prayerApi } from '../../../../lib/api';
import { toPrayerRequestItem } from '../../../../lib/adapters';
import { usePrayerRequests, useMutation } from '../../../../hooks/useApi';
import { usePermissions } from '../../../../lib/permissions';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

export const PrayerRequestsPanel: React.FC = () => {
  const { items, loading, error, refetch } = usePrayerRequests();
  const createPrayer = useMutation(prayerApi.create);
  const answerPrayer = useMutation(prayerApi.answer);
  const { canEdit } = usePermissions();

  const prayers = useMemo(() => items.map(toPrayerRequestItem), [items]);

  const [selectedPrivacy, setSelectedPrivacy] = useState<string>('all');
  const [isSubmittingPrayer, setIsSubmittingPrayer] = useState<boolean>(false);
  const submittingPrayerDialog = useDialog(() => setIsSubmittingPrayer(false), "Submit Prayer Petition");
  const [answeringPrayer, setAnsweringPrayer] = useState<PrayerRequestItem | null>(null);
  const answeringPrayerDialog = useDialog(() => setAnsweringPrayer(null), "Record Answered Prayer");
  const [praiseText, setPraiseText] = useState<string>('');

  // New Prayer Form State. The prayer_requests table stores the request itself, who asked and
  // whether it is private — so the form asks for that and nothing it would have to discard.
  const [details, setDetails] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState<PrayerPrivacyLevel>('public');

  const filteredPrayers = prayers.filter((p) => {
    if (selectedPrivacy !== 'all' && p.privacyLevel !== selectedPrivacy) return false;
    return true;
  });

  const handleCreatePrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) return;

    try {
      await createPrayer.run({
        request: details.trim(),
        ...(isAnonymous ? {} : { requesterName: requestedBy.trim() || undefined }),
        isPrivate: privacyLevel !== 'public',
      });
      await refetch();
      setIsSubmittingPrayer(false);
      setDetails('');
      setRequestedBy('');
    } catch {
      // createPrayer.error is rendered inside the modal.
    }
  };

  const handleMarkAnswered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answeringPrayer) return;

    try {
      await answerPrayer.run(answeringPrayer.id, { note: praiseText.trim() || undefined });
      await refetch();
      setAnsweringPrayer(null);
      setPraiseText('');
    } catch {
      // answerPrayer.error is rendered inside the modal.
    }
  };

  const writeError = createPrayer.error ?? answerPrayer.error;

  return (
    <div className="flex flex-col space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Active Petitions</span>
            <div className="text-2xl font-black text-[#1C1917] mt-0.5">
              {prayers.filter((p) => !p.isAnswered).length} Petitions
            </div>
            <span className="text-xs text-[#C2410C] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">local_fire_department</span>
              24/7 Prayer Vigil Active
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">favorite</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Public Prayer Chain</span>
            <div className="text-2xl font-black text-[#059669] mt-0.5">
              {prayers.filter((p) => p.privacyLevel === 'public').length} Shared
            </div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">volunteer_activism</span>
              Visible to the whole church
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#059669]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">volunteer_activism</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Answered & Praises</span>
            <div className="text-2xl font-black text-[#2563EB] mt-0.5">
              {prayers.filter((p) => p.isAnswered).length} Testimonies
            </div>
            <span className="text-xs text-[#059669] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">celebration</span>
              Glory to God
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#2563EB]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">workspace_premium</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-[14px] border border-[#E7E5E4] shadow-warm-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">Pastoral & Leaders</span>
            <div className="text-2xl font-black text-[#D97706] mt-0.5">
              {prayers.filter((p) => p.privacyLevel !== 'public').length} Held Privately
            </div>
            <span className="text-xs text-[#57534E] font-medium flex items-center gap-1 mt-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">lock</span>
              Pastors & Elders only
            </span>
          </div>
          <div className="w-11 h-11 rounded-[11px] bg-[#FDF8F3] border border-[#E7E5E4] flex items-center justify-center text-[#D97706]">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">shield_person</span>
          </div>
        </div>
      </div>

      {/* Prayer Requests Directory */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4] mb-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">volunteer_activism</span>
              Church Prayer Chain & Intercession Wall
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Submit petitions, stand in the gap, and celebrate answered prayers with the church community.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Privacy level filter"
              value={selectedPrivacy}
              onChange={(e) => setSelectedPrivacy(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
            >
              <option value="all">All Privacy Levels</option>
              <option value="public">Public Prayer Chain</option>
              <option value="leaders-only">Ministry Leaders Only</option>
              <option value="pastoral-private">Pastoral Confidential</option>
            </select>

            {canEdit && (
              <button
                type="button"
                onClick={() => setIsSubmittingPrayer(true)}
                className="px-3 py-1.5 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_circle</span>
                Submit Petition
              </button>
            )}
          </div>
        </div>

        {writeError && <ErrorBlock message={writeError} onRetry={() => void refetch()} className="mb-4" />}

        {/* Prayer Requests Cards */}
        {loading && items.length === 0 ? (
          <LoadingBlock label="Loading prayer requests…" />
        ) : error ? (
          <ErrorBlock message={error} onRetry={() => void refetch()} />
        ) : filteredPrayers.length === 0 ? (
          <EmptyBlock
            icon="volunteer_activism"
            title="No prayer requests here"
            hint="Submit a petition and the prayer chain can stand with you."
          />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrayers.map((pr) => (
            <div
              key={pr.id}
              className={`p-4 rounded-[12px] border transition-all flex flex-col justify-between ${
                pr.isAnswered
                  ? 'bg-[#059669]/5 border-[#059669]/30 ring-1 ring-[#059669]/20'
                  : 'bg-[#FDF8F3] border-[#E7E5E4] hover:border-[#C2410C]/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        pr.privacyLevel === 'public'
                          ? 'bg-[#059669]/10 text-[#059669]'
                          : pr.privacyLevel === 'leaders-only'
                          ? 'bg-[#2563EB]/10 text-[#2563EB]'
                          : 'bg-[#DC2626]/10 text-[#DC2626]'
                      }`}
                    >
                      {pr.privacyLevel.replace('-', ' ')}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-[#A8A29E]">{pr.dateSubmitted}</span>
                </div>

                <h4 className="font-headline text-sm font-bold text-[#1C1917] mb-1">
                  {pr.title}
                </h4>

                <div className="text-xs text-[#57534E] mb-2 font-medium">
                  Requested by: <strong className="text-[#1C1917]">{pr.requestedBy}</strong>
                </div>

                <p className="text-xs text-[#57534E] leading-relaxed line-clamp-3 mb-3">
                  {pr.details}
                </p>

                {pr.isAnswered && pr.answerDate && (
                  <div className="p-2.5 rounded-[8px] bg-[#059669]/10 border border-[#059669]/30 text-xs text-[#059669] mb-3">
                    <div className="font-bold flex items-center gap-1">
                      <span aria-hidden="true" className="material-symbols-outlined text-[15px]">celebration</span>
                      Answered on {pr.answerDate}
                    </div>
                  </div>
                )}
              </div>

              {!pr.isAnswered && canEdit && (
                <div className="pt-3 border-t border-[#E7E5E4]/80 flex items-center justify-end text-xs">
                  <button
                    type="button"
                    onClick={() => setAnsweringPrayer(pr)}
                    className="px-2.5 py-1 rounded-[6px] bg-[#059669]/10 hover:bg-[#059669] hover:text-white text-[#059669] text-xs font-bold border border-[#059669]/30 transition-all cursor-pointer"
                  >
                    Answered!
                  </button>
                </div>
              )}
            </div>          ))}
        </div>
        )}

      </div>

      {/* MODAL: Submit Prayer Petition */}
      {isSubmittingPrayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...submittingPrayerDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-lg w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Submit Prayer Petition</h3>
              <button
                type="button"
                onClick={() => setIsSubmittingPrayer(false)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreatePrayer} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prayer-requested-by" className="block text-xs font-bold text-[#1C1917] mb-1">Requested By</label>
                  <input id="prayer-requested-by" aria-label="Requested By"
                    type="text"
                    disabled={isAnonymous}
                    placeholder="Your name"
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="prayer-privacy" className="block text-xs font-bold text-[#1C1917] mb-1">Privacy Level</label>
                  <select id="prayer-privacy" aria-label="Privacy Level"
                    value={privacyLevel}
                    onChange={(e) => setPrivacyLevel(e.target.value as PrayerPrivacyLevel)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                  >
                    <option value="public">Public Prayer Chain</option>
                    <option value="leaders-only">Ministry Leaders Only</option>
                    <option value="pastoral-private">Pastoral Confidential (Elders/Pastors)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonCheck"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-[#C2410C] focus:ring-[#C2410C]"
                />
                <label htmlFor="anonCheck" className="text-xs font-bold text-[#1C1917] cursor-pointer">
                  Submit Anonymously (Hide name from prayer list)
                </label>
              </div>

              <div>
                <label htmlFor="prayer-details" className="block text-xs font-bold text-[#1C1917] mb-1">Prayer Request *</label>
                <textarea id="prayer-details" aria-label="Prayer Details"
                  rows={3}
                  required
                  placeholder="Share details so intercessors can pray specifically..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              {createPrayer.error && <ErrorBlock message={createPrayer.error} />}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setIsSubmittingPrayer(false)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPrayer.pending}
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {createPrayer.pending ? 'Submitting…' : 'Submit Prayer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Praise / Answered Prayer */}
      {answeringPrayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...answeringPrayerDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Record Answered Prayer</h3>
              <button
                type="button"
                onClick={() => setAnsweringPrayer(null)}
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleMarkAnswered} className="mt-4 space-y-4">
              <div className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4]">
                <div className="text-[10px] font-bold text-[#A8A29E] uppercase">Petition</div>
                <div className="font-bold text-xs text-[#1C1917] mt-0.5">{answeringPrayer.title}</div>
              </div>

              <div>
                <label htmlFor="praise-testimony" className="block text-xs font-bold text-[#1C1917] mb-1">
                  Note for the record
                </label>
                <textarea id="praise-testimony" aria-label="Note for the record"
                  rows={3}
                  placeholder="How was this prayer answered? Kept in the audit trail beside the date."
                  value={praiseText}
                  onChange={(e) => setPraiseText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>

              {answerPrayer.error && <ErrorBlock message={answerPrayer.error} />}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setAnsweringPrayer(null)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={answerPrayer.pending}
                  className="px-4 py-2 rounded-[8px] bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  {answerPrayer.pending ? 'Saving…' : 'Mark as Answered'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
