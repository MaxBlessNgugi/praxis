import React, { useEffect, useState } from 'react';
import { memberRefName, rosterApi, type DutyDto, type DutyStatus } from '../../../../lib/api';
import { errorMessage, useMemberOptions, useRoster, useServices, useSwaps } from '../../../../hooks/useApi';
import { usePermissions } from '../../../../lib/permissions';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';
import { useDialog } from '../../dialog';

/**
 * Who is serving, and who is covering for whom.
 *
 * The roster is the church's actual duty list: a person, a role, and a state — scheduled, confirmed,
 * completed, missed, replaced, cancelled. Two things here exist because the API does and the mock it
 * replaced did not. Statuses are the six the server accepts rather than three invented ones, and a
 * swap is a *request* with a decision: somebody asks for cover, and an administrator approves it,
 * which is one transaction that moves the duty and closes the request together.
 *
 * Deciding is gated on the administrator's role because the endpoint is — an approval that changed the
 * duty would otherwise be a way for any volunteer to reassign the sound desk.
 */

const STATUSES: DutyStatus[] = ['scheduled', 'confirmed', 'completed', 'missed', 'replaced', 'cancelled'];

const STATUS_STYLE: Record<DutyStatus, string> = {
  scheduled: 'bg-[#F8F1E9] text-[#57534E]',
  confirmed: 'bg-[#ECFDF5] text-[#047857]',
  completed: 'bg-[#EFF6FF] text-[#1D4ED8]',
  missed: 'bg-[#FEF2F2] text-[#B91C1C]',
  replaced: 'bg-[#FFFBEB] text-[#92400E]',
  cancelled: 'bg-[#F5F5F4] text-[#78716C]',
};

const FIELD =
  'w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1.5';

const whenOf = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

export const VolunteerRosterPanel: React.FC = () => {
  // Most recent first, so the panel opens on the service being rostered rather than on the oldest one
  // in the church's history — which is where `upcoming` lands a parish whose calendar is behind today.
  const services = useServices({ pageSize: 100, sort: 'recent' });
  const members = useMemberOptions();
  const { canEdit, role } = usePermissions();
  const isAdministrator = role === 'admin' || role === 'super_admin';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const duties = useRoster(selectedId ? { serviceId: selectedId } : {});
  const swaps = useSwaps('requested');

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [isAssigning, setIsAssigning] = useState(false);
  const assigningDialog = useDialog(() => setIsAssigning(false), 'Assign a volunteer');
  const [swapFor, setSwapFor] = useState<DutyDto | null>(null);
  const swapDialog = useDialog(() => setSwapFor(null), 'Request cover');

  const [draft, setDraft] = useState({ memberId: '', roleTitle: '', status: 'scheduled' as DutyStatus, notes: '' });
  const [swapDraft, setSwapDraft] = useState({ replacementId: '', reason: '' });

  const serviceRows = services.items.filter((service) => !service.isTemplate);
  const selected = serviceRows.find((service) => service.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && serviceRows.length > 0) setSelectedId(serviceRows[0].id);
  }, [selectedId, serviceRows]);

  const visible = duties.items.filter((duty) => !selectedId || duty.serviceId === selectedId);
  const confirmed = visible.filter((duty) => duty.status === 'confirmed').length;
  const open = visible.filter((duty) => duty.status === 'scheduled').length;

  const run = async (id: string, work: () => Promise<unknown>, done: string) => {
    setBusyId(id);
    setError(null);
    try {
      await work();
      setNotice(done);
      await Promise.all([duties.refetch(), swaps.refetch()]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const assign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    const member = members.members.find((row) => row.id === draft.memberId);
    setBusyId('assign');
    setError(null);
    try {
      await rosterApi.createDuty(selectedId, {
        memberId: draft.memberId,
        roleTitle: draft.roleTitle.trim(),
        status: draft.status,
        ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
      });
      setIsAssigning(false);
      setDraft({ memberId: '', roleTitle: '', status: 'scheduled', notes: '' });
      announce(`Added ${memberRefName(member) || 'a volunteer'} to the roster as ${draft.roleTitle.trim()}.`);
      await duties.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  function announce(message: string) {
    setNotice(message);
    setError(null);
  }

  const requestSwap = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!swapFor) return;
    setBusyId(swapFor.id);
    setError(null);
    try {
      await rosterApi.requestSwap(swapFor.id, {
        reason: swapDraft.reason.trim(),
        ...(swapDraft.replacementId ? { replacementId: swapDraft.replacementId } : {}),
      });
      setSwapFor(null);
      setSwapDraft({ replacementId: '', reason: '' });
      announce('The request for cover is with the administrators.');
      await swaps.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const decide = (swapId: string, decision: 'approved' | 'declined') =>
    void run(
      swapId,
      () => rosterApi.decideSwap(swapId, { decision }),
      decision === 'approved' ? 'The swap is approved and the duty has moved.' : 'The request was declined.',
    );

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

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <label className={LABEL} htmlFor="roster-service">Which service</label>
            <select
              id="roster-service"
              value={selectedId ?? ''}
              onChange={(event) => setSelectedId(event.target.value)}
              className={`${FIELD} max-w-md`}
            >
              {serviceRows.length === 0 && <option value="">Nothing on the calendar yet</option>}
              {serviceRows.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title} · {whenOf(service.heldAt)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'On the roster', value: visible.length },
              { label: 'Confirmed', value: confirmed },
              { label: 'Still to confirm', value: open },
            ].map((card) => (
              <div key={card.label} className="rounded-[12px] border border-[#E7E5E4] bg-[#FDF8F3] px-3 py-2 text-center">
                <div className="font-headline text-xl font-bold text-[#1C1917]">{card.value}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[#57534E]">{card.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
        <div className="flex flex-col gap-3 border-b border-[#E7E5E4] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#C2410C]">badge</span>
              Duties for this service
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              Each row is a person, a role and a state. Changing the state is how a confirmation is recorded.
            </p>
          </div>
          {canEdit('services') && (
            <button
              type="button"
              onClick={() => setIsAssigning(true)}
              disabled={!selected}
              className="inline-flex items-center gap-1.5 self-start rounded-[9px] bg-[#C2410C] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">person_add</span>
              Assign a volunteer
            </button>
          )}
        </div>

        <div className="pt-4">
          {duties.loading && <LoadingBlock label="Reading the roster…" />}
          {duties.error && <ErrorBlock message={duties.error} onRetry={() => void duties.refetch()} />}
          {!duties.loading && !duties.error && visible.length === 0 && (
            <EmptyBlock
              icon="group_off"
              title="Nobody is on the roster yet"
              hint="Assign the roles this service needs — preacher, worship lead, ushers, sound desk — and each person can confirm or ask for cover."
            />
          )}

          {visible.length > 0 && (
            <ul className="divide-y divide-[#E7E5E4]">
              {visible.map((duty) => (
                <li key={duty.id} className="flex flex-col gap-3 py-3.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#1C1917]">{memberRefName(duty.holder) || 'Unassigned'}</span>
                      <span className={`rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[duty.status]}`}>
                        {duty.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#57534E]">
                      {duty.roleTitle}
                      {duty.holder?.phone ? ` · ${duty.holder.phone}` : ''}
                    </p>
                    {duty.notes && <p className="mt-0.5 text-[11px] italic text-[#57534E]">{duty.notes}</p>}
                  </div>

                  {canEdit('services') && (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`status-${duty.id}`}>State of {duty.roleTitle}</label>
                      <select
                        id={`status-${duty.id}`}
                        value={duty.status}
                        disabled={busyId === duty.id}
                        onChange={(event) =>
                          void run(
                            duty.id,
                            () => rosterApi.updateDuty(duty.id, { status: event.target.value as DutyStatus }),
                            `${memberRefName(duty.holder)}'s duty is marked ${event.target.value}.`,
                          )
                        }
                        className="rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] px-2.5 py-1.5 text-xs font-semibold text-[#1C1917] capitalize cursor-pointer"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setSwapDraft({ replacementId: '', reason: '' });
                          setSwapFor(duty);
                        }}
                        className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
                      >
                        Ask for cover
                      </button>
                      <button
                        type="button"
                        disabled={busyId === duty.id}
                        onClick={() => void run(duty.id, () => rosterApi.removeDuty(duty.id), 'That duty was taken off the roster.')}
                        className="rounded-[9px] border border-[#FECACA] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-bold text-[#B91C1C] transition-colors hover:bg-[#FEF2F2] disabled:opacity-60 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-5 shadow-warm-card">
        <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
          <span aria-hidden="true" className="material-symbols-outlined text-[19px] text-[#C2410C]">swap_horiz</span>
          Requests for cover
        </h3>
        <p className="mt-0.5 text-xs text-[#57534E]">
          {isAdministrator
            ? 'Approving moves the duty to the replacement and closes the request in one step.'
            : 'An administrator approves a swap — it changes who is serving, so it is not a volunteer’s decision.'}
        </p>

        <div className="mt-4">
          {swaps.loading && <LoadingBlock label="Reading the requests…" />}
          {swaps.error && <ErrorBlock message={swaps.error} onRetry={() => void swaps.refetch()} />}
          {!swaps.loading && !swaps.error && swaps.items.length === 0 && (
            <EmptyBlock
              icon="pending_actions"
              title="No swaps waiting"
              hint="When somebody asks for cover, the request appears here with their reason and the person they suggested."
            />
          )}

          {swaps.items.length > 0 && (
            <ul className="divide-y divide-[#E7E5E4]">
              {swaps.items.map((swap) => (
                <li key={swap.id} className="flex flex-col gap-3 py-3.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#1C1917]">{memberRefName(swap.requestedBy)}</span>
                      <span className="text-xs text-[#57534E]">needs cover for</span>
                      <span className="text-xs font-semibold text-[#1C1917]">{swap.duty?.roleTitle ?? 'a duty'}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#57534E]">
                      {swap.duty?.service ? `${swap.duty.service.title} · ${whenOf(swap.duty.service.heldAt)}` : 'Service not recorded'}
                      {swap.replacement ? ` · suggested: ${memberRefName(swap.replacement)}` : ' · no replacement suggested'}
                    </p>
                    {swap.reason && <p className="mt-0.5 text-[11px] italic text-[#57534E]">“{swap.reason}”</p>}
                  </div>

                  {isAdministrator ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busyId === swap.id}
                        onClick={() => decide(swap.id, 'approved')}
                        className="rounded-[9px] bg-[#047857] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#065F46] disabled:opacity-60 cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === swap.id}
                        onClick={() => decide(swap.id, 'declined')}
                        className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] disabled:opacity-60 cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 text-[11px] font-semibold text-[#57534E]">Waiting on an administrator</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isAssigning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...assigningDialog}>
          <form onSubmit={assign} className="w-full max-w-[480px] rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">Assign a volunteer</h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              {selected ? `${selected.title} · ${whenOf(selected.heldAt)}` : 'Choose a service first.'}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className={LABEL} htmlFor="duty-member">Who</label>
                <select
                  id="duty-member"
                  required
                  value={draft.memberId}
                  onChange={(e) => setDraft((previous) => ({ ...previous, memberId: e.target.value }))}
                  className={FIELD}
                >
                  <option value="">Choose somebody on the register</option>
                  {members.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {memberRefName(member)}
                    </option>
                  ))}
                </select>
                {members.members.length === 0 && !members.loading && (
                  <p className="mt-1 text-[11px] text-[#57534E]">
                    The register is empty — enrol people on the Members screen first.
                  </p>
                )}
              </div>
              <div>
                <label className={LABEL} htmlFor="duty-role">Which role</label>
                <input
                  id="duty-role"
                  required
                  value={draft.roleTitle}
                  onChange={(e) => setDraft((previous) => ({ ...previous, roleTitle: e.target.value }))}
                  placeholder="Aisle 2 collection steward"
                  className={FIELD}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="duty-status">State</label>
                <select
                  id="duty-status"
                  value={draft.status}
                  onChange={(e) => setDraft((previous) => ({ ...previous, status: e.target.value as DutyStatus }))}
                  className={FIELD}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="duty-notes">Notes for them</label>
                <input
                  id="duty-notes"
                  value={draft.notes}
                  onChange={(e) => setDraft((previous) => ({ ...previous, notes: e.target.value }))}
                  placeholder="Collect the badge from the welcome kiosk by 09:30."
                  className={FIELD}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsAssigning(false)} className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] hover:bg-[#F5EDE4] cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busyId === 'assign'} className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer">
                {busyId === 'assign' ? 'Assigning…' : 'Put them on the roster'}
              </button>
            </div>
          </form>
        </div>
      )}

      {swapFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...swapDialog}>
          <form onSubmit={requestSwap} className="w-full max-w-[460px] rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">Ask for cover</h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              {swapFor.roleTitle} · {memberRefName(swapFor.holder)}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className={LABEL} htmlFor="swap-replacement">Who might take it</label>
                <select
                  id="swap-replacement"
                  value={swapDraft.replacementId}
                  onChange={(e) => setSwapDraft((previous) => ({ ...previous, replacementId: e.target.value }))}
                  className={FIELD}
                >
                  <option value="">Nobody in mind — the office will find somebody</option>
                  {members.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {memberRefName(member)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="swap-reason">Why</label>
                <textarea
                  id="swap-reason"
                  required
                  rows={3}
                  value={swapDraft.reason}
                  onChange={(e) => setSwapDraft((previous) => ({ ...previous, reason: e.target.value }))}
                  placeholder="Family travel that weekend."
                  className={FIELD}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setSwapFor(null)} className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] hover:bg-[#F5EDE4] cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busyId === swapFor.id} className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer">
                {busyId === swapFor.id ? 'Sending…' : 'Send the request'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
