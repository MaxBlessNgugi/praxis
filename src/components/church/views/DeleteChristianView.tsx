import React, { useCallback, useEffect, useState } from 'react';
import { useDialog } from '../dialog';
import { useMembers } from '../../../lib/hooks/useMembers';
import { adminApi, type SoftDeletedRecordDto } from '../../../lib/api';
import { errorMessage, useTrash } from '../../../hooks/useApi';
import { usePermissions } from '../../../lib/permissions';
import { useAuth } from '../../../lib/auth';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../DataState';
import { interactiveCard } from '../interactiveCard';

/**
 * The ways a person leaves the register, in the API's own vocabulary.
 *
 * This list is the server's `retireMemberSchema` narrowed to members, and the two have to agree:
 * the screen used to offer four categories of its own — "transfer", "memorial", "inactive",
 * "registry correction" — and the API refused every one of them, so no archive from this screen had
 * ever succeeded. A disposition a clerk picks has to be a disposition the register will store.
 */
const DISPOSITIONS = [
  { id: 'transferred', label: 'Church Transfer', detail: 'A letter of transfer goes to the receiving congregation.' },
  { id: 'relocated', label: 'Relocated', detail: 'Moved away from this congregation, without a letter to another.' },
  { id: 'deceased', label: 'Memorial / Deceased', detail: 'Entered into the Memorial Book of Life.' },
  { id: 'request', label: 'Own Request', detail: 'Asked in writing to leave the roll.' },
  { id: 'disciplinary', label: 'Pastoral Discipline', detail: 'Removed following Council action.' },
  { id: 'duplicate', label: 'Duplicate Record', detail: 'A second record for one person; this is the copy.' },
  { id: 'other', label: 'Other', detail: 'Anything the categories above do not describe — say what in the rationale.' },
] as const;

type ArchiveReason = (typeof DISPOSITIONS)[number]['id'];

const REASON_LABELS = Object.fromEntries(DISPOSITIONS.map((row) => [row.id, row.label])) as Record<ArchiveReason, string>;

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** How long the office has to change its mind, in the words it uses. */
function graceLeft(deadline: string | null): string {
  if (!deadline) return 'No deadline set';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'Grace period closed';
  return days === 1 ? '1 day left' : `${days} days left`;
}

/**
 * The archive screen: retire one named member from the roll, and read the vault of everyone already
 * retired.
 *
 * Both halves are the server's. The member comes from the register, the retirement goes through
 * `DELETE /api/members/:id` with the reason and the rationale a person wrote, and the vault is the
 * Trash the API keeps — the same records the Admin screen restores. The screen this replaced read
 * its vault from a hardcoded empty array, so nothing it showed could ever have been true.
 */
export const DeleteChristianView: React.FC = () => {
  const { listAllMembers, retireMember } = useMembers();
  const { canDelete } = usePermissions();
  const { user } = useAuth();
  const vault = useTrash({ entityName: 'Member' });

  const [members, setMembers] = useState<import('../../../types').ParishMember[]>([]);
  const [targetId, setTargetId] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerDialog = useDialog(() => setIsPickerOpen(false), 'Choose a member to archive');
  const [reason, setReason] = useState<ArchiveReason>('transferred');
  const [destParish, setDestParish] = useState('');
  const [destPastor, setDestPastor] = useState('');
  const [rationale, setRationale] = useState('');
  const [dispositionFilter, setDispositionFilter] = useState<'all' | ArchiveReason>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const modalOpenDialog = useDialog(() => setIsModalOpen(false), 'Confirm move to Trash');

  const loadRoll = useCallback(async () => {
    try {
      // The picker has to hold every member, so it reads every page.
      setMembers(await listAllMembers({ sort: 'name' }));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [listAllMembers]);

  useEffect(() => {
    void loadRoll();
  }, [loadRoll]);

  const target = members.find((member) => member.id === targetId) ?? members[0];
  /** The rest of the household, because retiring the head is a change to the others as well. */
  const household = target?.householdId
    ? members.filter((member) => member.householdId === target.householdId && member.id !== target.id)
    : [];

  const flashToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleConfirmSoftDelete = async () => {
    if (!target) return;
    setIsModalOpen(false);
    setBusy(true);
    try {
      // The rationale is what the Trash shows a reader, so an empty box falls back to the
      // disposition rather than to nothing.
      await retireMember(target.id, {
        reason,
        reasonLabel: rationale.trim() || REASON_LABELS[reason],
        ...(reason === 'transferred' && destParish.trim() ? { destinationParish: destParish.trim() } : {}),
      });
      setMembers((prev) => prev.filter((member) => member.id !== target.id));
      setTargetId('');
      setRationale('');
      setDestParish('');
      setDestPastor('');
      await vault.refetch();
      flashToast(`${target.name} moved to Trash.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (record: SoftDeletedRecordDto) => {
    setBusy(true);
    try {
      await adminApi.restore(record.id);
      await Promise.all([vault.refetch(), loadRoll()]);
      flashToast(`${record.entityLabel ?? 'The member'} is back on the register.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const records = vault.items.filter((record) => dispositionFilter === 'all' || record.reason === dispositionFilter);

  return (
    <div className="flex flex-col w-full gap-6 pb-12">
      {/* Retention notice */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#ffdad6] via-[#eee7e3] to-[#f4ece8] p-6 shadow-sm border border-[#e1bfb5]/40">
        <div className="flex items-start gap-4 max-w-4xl relative z-10">
          <div className="w-12 h-12 rounded-xl bg-[#ba1a1a] text-white flex items-center justify-center shrink-0 shadow-md">
            <span aria-hidden="true" className="material-symbols-outlined text-[26px]">gavel</span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-headline text-xl font-bold text-[#1e1b19] tracking-tight">
              Roll Retention & Pastoral Care Notice
            </h2>
            <p className="font-body text-xs text-[#59413a] leading-relaxed">
              Retiring a member takes them off the register, out of ministry rosters and out of giving
              reports, and files the record in the Trash with the reason and the sentence written here.
              Nothing is deleted: every retirement can be restored from <strong>Admin → Trash</strong>, and
              the register keeps the audit entry either way.
            </p>
          </div>
        </div>
      </section>

      {error && <ErrorBlock message={error} onRetry={() => void Promise.all([loadRoll(), vault.refetch()])} />}

      {/* Target picker and disposition filter */}
      <section className="bg-white rounded-xl p-4 shadow-sm border border-[#EAE1D7]/60">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <span aria-hidden="true" className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-[#59413a]">
              search
            </span>
            <input
              aria-label="Member on file"
              type="text"
              readOnly
              value={target ? `${target.name} (${target.memberId})` : 'No members on the roll'}
              className="w-full h-11 pl-11 pr-16 rounded-lg bg-[#faf2ee] text-[#1e1b19] font-body text-sm placeholder:text-[#59413a]/60 focus:outline-none shadow-inner"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#eee7e3] text-[#59413a] text-xs font-headline font-bold">
              Target
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-headline text-xs font-semibold uppercase tracking-wider text-[#59413a] mr-1">
              Filter the vault:
            </span>
            {[{ id: 'all', label: 'All Dispositions' }, ...DISPOSITIONS].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setDispositionFilter(chip.id as 'all' | ArchiveReason)}
                className={`px-3 py-1.5 rounded-lg font-headline text-xs font-semibold transition-colors cursor-pointer ${
                  dispositionFilter === chip.id ? 'bg-[#9b2f00] text-white shadow-sm' : 'bg-[#faf2ee] hover:bg-[#f4ece8] text-[#59413a]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 flex flex-col gap-6">
          {/* Who is being retired */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#EAE1D7]/60 flex flex-col gap-4">
            {target ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-[#c2410c] text-white flex items-center justify-center font-headline text-xl font-bold shadow-sm">
                      {target.initials}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="font-headline text-xl font-bold text-[#1e1b19]">{target.name}</h3>
                        <span className="px-2 py-0.5 rounded bg-[#eee7e3] text-[#1e1b19] font-mono text-xs font-bold">
                          {target.memberId}
                        </span>
                      </div>
                      <span className="font-body text-xs text-[#59413a]">
                        {target.householdName ?? 'No household recorded'} • {target.church}
                      </span>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-headline font-semibold">
                        <span className={`inline-flex items-center gap-1 ${target.baptismType === 'none' ? 'text-[#904d00]' : 'text-[#006243]'}`}>
                          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">water_drop</span>
                          {target.baptismLabel}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#59413a]">
                          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">diversity_1</span>
                          {target.householdRole ?? 'Member'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#904d00]">
                          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">savings</span>
                          Envelope {target.envelopeNumber ?? 'not issued'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="px-3 py-1 rounded-lg bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] font-headline text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">swap_horiz</span> Change Member
                  </button>
                </div>

                <div className="bg-[#faf2ee] rounded-lg p-4 border border-[#e1bfb5]/40">
                  <span className="font-headline text-xs font-bold text-[#1e1b19]">
                    {target.householdName ? `${target.householdName} — ${household.length + 1} on the roll` : 'Not in a household'}
                  </span>
                  <p className="font-body text-xs text-[#59413a] mt-1">
                    {household.length > 0
                      ? `${household.map((member) => `${member.name} (${member.householdRole ?? 'Member'})`).join(', ')} stay on the register; ${
                          target.isHouseholdHead ? 'the household is left without a head until you appoint one.' : 'their household is unchanged.'
                        }`
                      : 'Nobody else is filed under this household, so nothing else moves with them.'}
                  </p>
                </div>
              </>
            ) : (
              <EmptyBlock message="The register is empty — add a member before archiving one." />
            )}
          </div>

          {/* The retirement itself */}
          {target && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#EAE1D7]/60 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="disposition-reason" className="font-headline text-xs text-[#1e1b19] font-bold">
                  Why they are leaving the roll
                </label>
                <select
                  id="disposition-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ArchiveReason)}
                  className="h-11 px-3 rounded-lg bg-[#faf2ee] border border-[#e1bfb5]/60 font-body text-sm text-[#1e1b19] focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                >
                  {DISPOSITIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="font-body text-xs text-[#59413a]">{DISPOSITIONS.find((option) => option.id === reason)?.detail}</p>
              </div>

              {reason === 'transferred' && (
                <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-[#faf2ee] border border-[#e1bfb5]/40">
                  <label htmlFor="disposition-destination-church" className="font-headline text-xs text-[#1e1b19] font-bold">
                    Receiving congregation
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    <input
                      id="disposition-destination-church"
                      type="text"
                      value={destParish}
                      onChange={(e) => setDestParish(e.target.value)}
                      placeholder="e.g. St. Jude Anglican Church, Nyahururu"
                      className="h-10 px-3 rounded-lg bg-white border border-[#e1bfb5]/60 text-[#1e1b19] font-body text-xs focus:outline-none focus:border-[#9b2f00]"
                    />
                    <input
                      aria-label="Receiving pastor or church clerk"
                      type="text"
                      value={destPastor}
                      onChange={(e) => setDestPastor(e.target.value)}
                      placeholder="Receiving pastor or church clerk"
                      className="h-10 px-3 rounded-lg bg-white border border-[#e1bfb5]/60 text-[#1e1b19] font-body text-xs focus:outline-none focus:border-[#9b2f00]"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="disposition-rationale" className="font-headline text-xs text-[#1e1b19] font-bold">
                    The sentence the Trash will keep
                  </label>
                  <span className="font-mono text-xs text-[#59413a]">{rationale.length} / 500 characters</span>
                </div>
                <p className="font-body text-xs text-[#59413a]">
                  Read alongside the retirement for as long as the archive exists — the Council minute, the
                  letter, or the reason in your own words.
                </p>
                <textarea
                  id="disposition-rationale"
                  rows={3}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  maxLength={500}
                  className="w-full p-3 rounded-xl bg-[#faf2ee] border border-[#e1bfb5]/60 text-[#1e1b19] font-body text-xs focus:outline-none focus:bg-white focus:border-[#9b2f00] transition-all resize-none shadow-inner"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#f4ece8]">
                <span className="font-body text-xs text-[#59413a]">
                  Recorded against <strong className="text-[#1e1b19]">{user?.name ?? 'this session'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  disabled={busy || !canDelete('members')}
                  className="px-5 py-2.5 rounded-lg bg-[#ba1a1a] hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-headline text-xs font-bold transition-colors shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete_sweep</span>
                  <span>{canDelete('members') ? 'Move to Trash' : 'Retiring a member needs an administrator'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* The vault, as the Trash actually holds it */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#EAE1D7]/60 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[22px]">auto_delete</span>
                <h3 className="font-headline text-lg font-bold text-[#1e1b19]">Trash — retired members</h3>
              </div>
              <button
                type="button"
                onClick={() => void Promise.all([vault.refetch(), loadRoll()])}
                className="p-1.5 rounded-lg text-[#59413a] hover:bg-[#f4ece8] transition-colors cursor-pointer"
                title="Ask the server again"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">sync</span>
              </button>
            </div>

            <p className="font-body text-xs text-[#59413a]">
              {vault.totals.awaitingRestore} record{vault.totals.awaitingRestore === 1 ? '' : 's'} waiting to be restored or
              left retired. Restoring is an administrator's action, on this screen and in Admin → Trash.
            </p>

            {vault.error && <ErrorBlock message={vault.error} onRetry={() => void vault.refetch()} />}
            {vault.loading && <LoadingBlock label="Reading the Trash…" />}

            {!vault.loading && records.length === 0 && (
              <EmptyBlock message={dispositionFilter === 'all' ? 'Nothing has been retired.' : 'Nothing was retired for that reason.'} />
            )}

            <div className="flex flex-col gap-3">
              {records.map((record) => (
                <div key={record.id} className="p-4 rounded-xl bg-[#faf2ee] border border-transparent flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="font-headline text-xs font-bold text-[#1e1b19] truncate">
                        {record.entityLabel ?? 'Member record'}
                      </span>
                      <span className="font-body text-[11px] text-[#59413a]">
                        Retired {formatWhen(record.deletedAt)}
                        {record.deletedBy?.name ? ` by ${record.deletedBy.name}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRestore(record)}
                      disabled={busy || !canDelete('members')}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#007d57] hover:text-white text-[#006243] font-headline text-xs font-bold transition-colors flex items-center gap-1 shadow-sm border border-[#e1bfb5]/40 disabled:opacity-50 cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">restore_from_trash</span>
                      <span>Restore</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1 font-headline text-[11px] text-[#59413a]">
                    <span>
                      Reason: <strong className="text-[#1e1b19]">{record.reasonLabel}</strong>
                    </span>
                    <span>{graceLeft(record.restoreDeadline)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Member picker — the archive acts on whoever is chosen here, not on a literal. */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33302d]/50 backdrop-blur-xs" {...pickerDialog}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-[#EAE1D7]">
            <div className="flex items-center justify-between gap-4 border-b border-[#EAE1D7] p-4">
              <div className="flex flex-col">
                <h3 className="font-headline text-base font-bold text-[#1e1b19]">Choose a member to retire</h3>
                <span className="font-body text-xs text-[#59413a]">
                  {members.length} on the roll — the archive will target whoever you pick
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="p-1 rounded-lg text-[#59413a] hover:bg-[#f4ece8] cursor-pointer"
                aria-label="Close"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-2 p-4 overflow-y-auto">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  {...interactiveCard(() => {
                    setTargetId(member.id);
                    setIsPickerOpen(false);
                  })}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    member.id === target?.id ? 'bg-[#fdefe6] border-[#e1bfb5]' : 'bg-[#faf2ee] border-transparent hover:bg-[#f4ece8]'
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="font-headline text-sm font-bold text-[#1e1b19]">{member.name}</span>
                    <span className="font-body text-xs text-[#59413a]">
                      {member.householdName ?? 'No household recorded'} • {member.church}
                    </span>
                  </span>
                  <span className="font-mono text-xs font-bold text-[#59413a]">{member.memberId}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33302d]/50 backdrop-blur-xs" {...modalOpenDialog}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE1D7] relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[#59413a] hover:bg-[#f4ece8] cursor-pointer"
              aria-label="Close"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#ffdad6] text-[#93000a] flex items-center justify-center shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[26px]">delete_forever</span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-headline text-base font-bold text-[#1e1b19] leading-snug">
                  Move {target.name} ({target.memberId}) to Trash?
                </h3>
                <span className="font-headline text-xs text-[#ba1a1a] font-bold mt-1">
                  Reason: {REASON_LABELS[reason]}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#faf2ee] mb-6 flex flex-col gap-1.5 border border-[#e1bfb5]/40 text-xs">
              <p className="font-body text-[#1e1b19] leading-relaxed">
                {target.name} leaves the register, ministry rosters and giving reports. The record itself is kept:
                anyone with administrator rights can restore it from here or from Admin → Trash.
              </p>
              <div className="flex items-center gap-2 text-[#59413a] pt-1">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#006243]">check_circle</span>
                <span>Recorded against {user?.name ?? 'this session'} in the audit log.</span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] text-[#1e1b19] font-headline text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel / retain on roll
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmSoftDelete()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#ba1a1a] hover:bg-red-700 text-white font-headline text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete</span>
                <span>Move to Trash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-4 p-4 rounded-xl bg-[#33302d] text-[#f7efeb] shadow-2xl max-w-md">
          <div className="w-9 h-9 rounded-lg bg-[#9b2f00] flex items-center justify-center text-white shrink-0">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">archive</span>
          </div>
          <span className="font-headline text-xs font-bold flex-1 min-w-0">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-headline text-xs font-bold transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
