import React, { useState } from 'react';
import { useAuth } from '../../../lib/auth';
import {
  vendorApi,
  type PlanDto,
  type SubscriptionDto,
  type SubscriptionPaymentDto,
  type VendorOrganizationDto,
  type VendorOrganizationStatsDto,
} from '../../../lib/api';
import { errorMessage, useVendorOrganizations, useVendorPlans } from '../../../hooks/useApi';
import { useDialog } from '../dialog';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../DataState';

/**
 * Praxis's own view of every church on the platform.
 *
 * This is the one screen in the console that belongs to the vendor rather than to a parish, so it is
 * shaped like an accountant's ledger: one row per church, its standing, what it uses, and the two
 * things an operator actually does — put a church on a plan, and record money that arrived.
 *
 * It deliberately does not create plans. Plans are a small, considered catalogue that Praxis writes
 * once and revisits rarely; the API can create them, and the seeded set is what a church sees. A screen
 * for editing them would be a screen used twice a year and misused in between.
 *
 * Two habits worth noting because they are what makes the list trustworthy. The status shown is the
 * *clock's* verdict, not the stored column — a church whose period ended this morning reads as overdue
 * here without anyone having run a job. And every write answers with the church as it now stands, so
 * the row updates from the server's own arithmetic rather than from what the form assumed.
 *
 * Behind *Manage* are the three things a call to Praxis is actually about: how big the parish is, how
 * to look inside it without asking for a password over the telephone, and how to switch it off when
 * something has gone wrong. Both of the write actions demand a reason, which is written into the
 * church's own audit log — a church that finds its access cut, or finds an operator in its records,
 * is owed the sentence saying who and why.
 */

const STATUS_LABELS: Record<VendorOrganizationDto['status'], string> = {
  trial: 'Trial',
  active: 'Active',
  past_due: 'Payment due',
  cancelled: 'Cancelled',
  expired: 'Paused',
  none: 'No plan',
};

const STATUS_STYLES: Record<VendorOrganizationDto['status'], string> = {
  trial: 'bg-[#D97706]/10 text-[#B45309] border-[#D97706]/30',
  active: 'bg-[#059669]/10 text-[#047857] border-[#059669]/30',
  past_due: 'bg-[#EA580C]/10 text-[#C2410C] border-[#EA580C]/30',
  cancelled: 'bg-[#57534E]/10 text-[#57534E] border-[#57534E]/30',
  expired: 'bg-[#DC2626]/10 text-[#B91C1C] border-[#DC2626]/30',
  none: 'bg-[#57534E]/10 text-[#57534E] border-[#57534E]/30',
};

const PAYMENT_METHODS: SubscriptionPaymentDto['method'][] = ['mpesa', 'bank_transfer', 'cheque', 'cash', 'card'];

const FIELD =
  'w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1.5';

const day = (value: string | null) => (value ? new Date(value).toLocaleDateString('en-GB') : '—');
const money = (amount: number, currency: string) => `${currency} ${amount.toLocaleString()}`;

/** The dates a vendor scans: when the trial or period runs out, and when writes stop. */
function standing(row: VendorOrganizationDto): string {
  if (row.status === 'none') return 'Never put on a plan';
  if (row.status === 'trial') return `Trial to ${day(row.trialEndsAt)}`;
  if (row.status === 'expired') return `Lapsed ${day(row.graceEndsAt)}`;
  return `Paid to ${day(row.currentPeriodEnd)} · lapses ${day(row.graceEndsAt)}`;
}

export const VendorChurchesPanel: React.FC = () => {
  const { user, organization, enterSupportSession } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VendorOrganizationDto['status'] | ''>('');
  const churches = useVendorOrganizations({ q: search.trim() || undefined, status: status || undefined });
  const plans = useVendorPlans();

  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // The two dialogs share one target church: whichever row was acted on.
  const [target, setTarget] = useState<VendorOrganizationDto | null>(null);
  const [planKey, setPlanKey] = useState('');
  const [assignStatus, setAssignStatus] = useState<SubscriptionDto['status'] | ''>('');
  const [trialDays, setTrialDays] = useState('');
  const [periodMonths, setPeriodMonths] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  const assignDialog = useDialog(() => setTarget(null), 'Put a church on a plan');

  const [payTarget, setPayTarget] = useState<VendorOrganizationDto | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<SubscriptionPaymentDto['method']>('mpesa');
  const [reference, setReference] = useState('');
  const [months, setMonths] = useState('1');
  const [payNote, setPayNote] = useState('');
  const [recording, setRecording] = useState(false);
  const payDialog = useDialog(() => setPayTarget(null), 'Record a payment');

  // One dialog for the church's operations — usage, a visit, and the switch — because they are asked
  // together: an operator looking at "4 members, last write in March" is usually deciding about both.
  const [manageTarget, setManageTarget] = useState<VendorOrganizationDto | null>(null);
  const [stats, setStats] = useState<VendorOrganizationStatsDto | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);
  const manageDialog = useDialog(() => setManageTarget(null), 'Church on Praxis');

  const openAssign = (row: VendorOrganizationDto) => {
    setTarget(row);
    setPlanKey(row.requestedPlan?.key ?? row.plan?.key ?? plans.plans[0]?.key ?? '');
    // A church that asked for something gets that plan preselected, since answering is the common case.
    setAssignStatus('');
    setTrialDays('');
    setPeriodMonths('');
    setAssignNote('');
    setProblem(null);
  };

  const openPayment = (row: VendorOrganizationDto) => {
    setPayTarget(row);
    setAmount(row.price > 0 ? String(row.price) : '');
    setMethod('mpesa');
    setReference('');
    setMonths('1');
    setPayNote('');
    setProblem(null);
  };

  const assign = async () => {
    if (!target || !planKey || assigning) return;
    setAssigning(true);
    setProblem(null);
    try {
      const updated = await vendorApi.assignPlan(target.id, {
        planKey,
        status: assignStatus || undefined,
        trialDays: trialDays ? Number(trialDays) : undefined,
        periodMonths: periodMonths ? Number(periodMonths) : undefined,
        note: assignNote.trim() || undefined,
      });
      // The row comes back from the server already carrying the new period, so it is replaced rather
      // than refetched: one fewer round trip, and no window in which the list is stale.
      churches.setItems((rows) => rows.map((row) => (row.id === updated.data.id ? updated.data : row)));
      setMessage(
        `${updated.data.name} is now on the ${updated.data.plan?.name ?? planKey} plan (${STATUS_LABELS[updated.data.status]}).`,
      );
      setTarget(null);
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setAssigning(false);
    }
  };

  const openManage = async (row: VendorOrganizationDto) => {
    setManageTarget(row);
    setReason('');
    setProblem(null);
    setStats(null);
    setLoadingStats(true);
    try {
      setStats((await vendorApi.stats(row.id)).data);
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setLoadingStats(false);
    }
  };

  /** Switch a church off, or back on. Refused without a reason, because the church reads it. */
  const applySuspension = async (suspended: boolean) => {
    if (!manageTarget || working) return;
    if (reason.trim().length < 3) {
      setProblem('Say why — this line is written into the church’s own audit log.');
      return;
    }
    setWorking(true);
    setProblem(null);
    try {
      const result = await vendorApi.setSuspension(manageTarget.id, { suspended, reason: reason.trim() });
      churches.setItems((rows) =>
        rows.map((row) => (row.id === result.data.id ? { ...row, isActive: result.data.isActive } : row)),
      );
      setMessage(
        result.data.isActive
          ? `${result.data.name} is switched back on and can sign in again.`
          : `${result.data.name} is suspended — its office cannot sign in until it is switched back on.`,
      );
      setManageTarget(null);
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  /**
   * Step inside the church. The panel disappears with the session: during a visit the operator holds
   * the church's own access and not the vendor's, so the next thing they see is that church's console
   * with a strip across the top saying whose visit it is.
   */
  const startSupport = async () => {
    if (!manageTarget || working) return;
    if (reason.trim().length < 3) {
      setProblem('Say what you are going in to look at — the church reads this line.');
      return;
    }
    setWorking(true);
    setProblem(null);
    try {
      const session = await vendorApi.startSupportSession(manageTarget.id, { reason: reason.trim() });
      await enterSupportSession(session.data);
    } catch (err) {
      setProblem(errorMessage(err));
      setWorking(false);
    }
  };

  const recordPayment = async () => {
    if (!payTarget || recording) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setProblem('Record the amount that came in.');
      return;
    }
    setRecording(true);
    setProblem(null);
    try {
      const result = await vendorApi.recordPayment(payTarget.id, {
        amount: value,
        method,
        reference: reference.trim() || undefined,
        months: Number(months) || 1,
        note: payNote.trim() || undefined,
      });
      const payment = result.data;
      setMessage(
        `Recorded ${money(payment.amount, payment.currency)} for ${payTarget.name}, covering to ${day(payment.periodEnd)}.`,
      );
      setPayTarget(null);
      await churches.refetch();
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setRecording(false);
    }
  };

  if (!user?.isPlatformAdmin) {
    return (
      <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card">
        <EmptyBlock
          icon="lock"
          title="Praxis staff only"
          hint="The list across churches is available to platform administrators. Ask Praxis if you need access."
        />
      </div>
    );
  }

  const rows = churches.items;

  return (
    <div className="space-y-5">
      <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">
                domain
              </span>
              Churches on Praxis
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Every church, what it is on, and what it is waiting for. Status is read from the clock, so an
              overdue church appears here the morning its period ends.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or handle"
              aria-label="Search churches"
              className={`${FIELD} w-full sm:w-56`}
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as VendorOrganizationDto['status'] | '')}
              aria-label="Filter by status"
              className={`${FIELD} w-full sm:w-40 cursor-pointer`}
            >
              <option value="">Any status</option>
              {(Object.keys(STATUS_LABELS) as VendorOrganizationDto['status'][]).map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {message && (
          <div className="p-3.5 rounded-[12px] bg-[#059669]/10 border border-[#059669]/30 text-[#047857] text-xs font-bold flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              check_circle
            </span>
            {message}
          </div>
        )}

        {churches.loading && <LoadingBlock label="Reading the churches…" />}
        {churches.error && <ErrorBlock message={churches.error} onRetry={() => void churches.refetch()} />}

        {!churches.loading && !churches.error && rows.length === 0 && (
          <EmptyBlock
            icon="domain_disabled"
            title={search || status ? 'No church matches that' : 'No churches yet'}
            hint={
              search || status
                ? 'Try a different name, or clear the status filter.'
                : 'A church appears here the moment it signs itself up.'
            }
          />
        )}

        {rows.length > 0 && (
          <div className="rounded-[10px] border border-[#E7E5E4] overflow-hidden overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#FDF8F3] text-[#57534E]">
                <tr>
                  <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Church</th>
                  <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Standing</th>
                  <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Usage</th>
                  <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Waiting for</th>
                  <th className="text-right font-bold px-3 py-2.5 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#E7E5E4]/70 align-top">
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5 min-w-[180px]">
                        <span className="font-bold text-[#1C1917]">{row.name}</span>
                        <span className="text-[11px] text-[#A8A29E] font-mono">{row.slug}</span>
                        <span className="text-[11px] text-[#57534E]">
                          Joined {day(row.createdAt)}
                          {row.onboardedAt ? '' : ' · wizard not finished'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1 min-w-[170px]">
                        {!row.isActive && (
                          <span className="self-start px-2 py-0.5 rounded-full border border-[#DC2626]/30 bg-[#DC2626]/10 text-[#B91C1C] text-[10px] font-bold uppercase tracking-wider">
                            Suspended
                          </span>
                        )}
                        <span
                          className={`self-start px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[row.status]}`}
                        >
                          {STATUS_LABELS[row.status]}
                        </span>
                        <span className="text-[11px] text-[#57534E]">{row.plan?.name ?? 'No plan'}</span>
                        <span className="text-[11px] text-[#57534E]">{standing(row)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-[#57534E] whitespace-nowrap">
                      {row.usage.members.toLocaleString()} members
                      <br />
                      {row.usage.users.toLocaleString()} accounts
                      <br />
                      <span className="text-[#A8A29E]">
                        limit {row.limits.maxMembers?.toLocaleString() ?? '∞'} / {row.limits.maxUsers ?? '∞'}
                      </span>
                    </td>
                    <td className="px-3 py-3 min-w-[150px]">
                      {row.requestedPlan ? (
                        <span className="text-[11px] text-[#C2410C] font-bold">
                          {row.requestedPlan.name} · {day(row.requestedAt)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#A8A29E]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void openManage(row)}
                          className="px-3 py-1.5 rounded-[8px] border border-[#E7E5E4] bg-white hover:bg-[#F5EDE4] text-[#1C1917] text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => openAssign(row)}
                          className="px-3 py-1.5 rounded-[8px] border border-[#E7E5E4] bg-white hover:bg-[#F5EDE4] text-[#1C1917] text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Set plan
                        </button>
                        <button
                          type="button"
                          onClick={() => openPayment(row)}
                          disabled={row.status === 'none'}
                          className="px-3 py-1.5 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold shadow-[0_2px_8px_rgba(194,65,12,0.25)] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Record payment
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {churches.meta && rows.length > 0 && (
          <p className="text-[11px] text-[#A8A29E]">
            Showing {rows.length} of {churches.meta.total} churches.
          </p>
        )}
      </div>

      {/* MODAL: MANAGE — usage, a visit, and the switch */}
      {manageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...manageDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-xl w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">{manageTarget.name}</h3>
              <button
                type="button"
                onClick={() => setManageTarget(null)}
                aria-label="Close"
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {loadingStats && <LoadingBlock label="Counting this church’s records…" />}

              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Members', value: stats.members.toLocaleString(), hint: `${stats.activeMembers} active` },
                    { label: 'Households', value: stats.households.toLocaleString(), hint: `${stats.ministries} ministries` },
                    { label: 'Services', value: stats.services.toLocaleString(), hint: `${stats.staffAccounts} accounts` },
                    {
                      label: 'Given this year',
                      value: `${stats.giving.currency} ${(stats.giving.tithes + stats.giving.offerings).toLocaleString()}`,
                      hint: `${stats.files} files`,
                    },
                  ].map((card) => (
                    <div key={card.label} className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">{card.label}</span>
                      <div className="text-sm font-bold text-[#1C1917] mt-0.5">{card.value}</div>
                      <span className="text-[10px] text-[#57534E]">{card.hint}</span>
                    </div>
                  ))}
                </div>
              )}

              {stats && (
                <p className="text-[11px] text-[#57534E]">
                  {stats.lastActivity
                    ? `Last activity: ${stats.lastActivity.summary} — ${day(stats.lastActivity.at)}${stats.lastActivity.actor ? ` (${stats.lastActivity.actor})` : ''}.`
                    : 'Nothing has been written in this church yet.'}
                </p>
              )}

              <div>
                <label htmlFor="vendor-reason" className={LABEL}>
                  Reason <span className="font-normal text-[#A8A29E]">(written into their audit log)</span>
                </label>
                <input
                  id="vendor-reason"
                  aria-label="Reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Investigating the missing Sunday attendance records."
                  className={FIELD}
                />
              </div>

              <p className="text-[11px] text-[#57534E] leading-relaxed">
                A support session gives you this church’s own console for an hour, with your name on every row you
                touch and both ends of the visit written into their log. It expires on its own, and a reload ends it.
              </p>

              {problem && <ErrorBlock message={problem} />}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => void applySuspension(!manageTarget.isActive)}
                  // The church the operator's own account sits in is off limits, and the server says so:
                  // switching it off would refuse every request the account makes, including the one
                  // that would switch it back on. Disabled here as well, so the rule is visible rather
                  // than discovered by pressing it.
                  disabled={working || (!manageTarget.isActive ? false : manageTarget.id === organization?.id)}
                  title={
                    manageTarget.isActive && manageTarget.id === organization?.id
                      ? 'This is the church your own account belongs to — switch it off from a Praxis account outside it.'
                      : undefined
                  }
                  className={`px-4 py-2 rounded-[8px] text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    manageTarget.isActive
                      ? 'border border-[#DC2626]/30 text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2]'
                      : 'border border-[#059669]/30 text-[#047857] bg-[#ECFDF5] hover:bg-[#D1FAE5]'
                  }`}
                >
                  {manageTarget.isActive ? 'Suspend this church' : 'Switch back on'}
                </button>

                <button
                  type="button"
                  onClick={() => void startSupport()}
                  disabled={working}
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-85 disabled:cursor-wait text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {working ? 'Opening…' : 'Open support session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SET PLAN */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...assignDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-lg w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">{target.name} — plan</h3>
              <button
                type="button"
                onClick={() => setTarget(null)}
                aria-label="Close"
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {target.requestedPlan && (
                <p className="text-[11px] text-[#C2410C] font-semibold">
                  This church asked for {target.requestedPlan.name} on {day(target.requestedAt)}. Assigning any plan
                  answers the request.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vendor-plan" className={LABEL}>
                    Plan
                  </label>
                  <select
                    id="vendor-plan"
                    aria-label="Plan"
                    value={planKey}
                    onChange={(e) => setPlanKey(e.target.value)}
                    className={`${FIELD} cursor-pointer`}
                  >
                    <option value="">Choose a plan</option>
                    {plans.plans.map((option: PlanDto) => (
                      <option key={option.key} value={option.key}>
                        {option.name} — {money(option.price, option.currency)}/{option.interval === 'yearly' ? 'yr' : 'mo'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="vendor-status" className={LABEL}>
                    Standing <span className="font-normal text-[#A8A29E]">(leave to the clock)</span>
                  </label>
                  <select
                    id="vendor-status"
                    aria-label="Standing"
                    value={assignStatus}
                    onChange={(e) => setAssignStatus(e.target.value as SubscriptionDto['status'] | '')}
                    className={`${FIELD} cursor-pointer`}
                  >
                    <option value="">Derive from dates</option>
                    <option value="trial">Trial</option>
                    <option value="active">Active — paid up</option>
                    <option value="past_due">Payment due — still writing</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Paused — read-only</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="vendor-trial" className={LABEL}>
                    Grant trial days <span className="font-normal text-[#A8A29E]">(optional)</span>
                  </label>
                  <input
                    id="vendor-trial"
                    aria-label="Grant trial days"
                    type="number"
                    min={0}
                    max={365}
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    placeholder="14"
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="vendor-period" className={LABEL}>
                    Months already paid <span className="font-normal text-[#A8A29E]">(optional)</span>
                  </label>
                  <input
                    id="vendor-period"
                    aria-label="Months already paid"
                    type="number"
                    min={1}
                    max={36}
                    value={periodMonths}
                    onChange={(e) => setPeriodMonths(e.target.value)}
                    placeholder="1"
                    className={FIELD}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vendor-assign-note" className={LABEL}>
                  Note for the church <span className="font-normal text-[#A8A29E]">(optional)</span>
                </label>
                <input
                  id="vendor-assign-note"
                  aria-label="Note for the church"
                  type="text"
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="Trial extended after the harvest."
                  className={FIELD}
                />
              </div>

              <p className="text-[11px] text-[#57534E] leading-relaxed">
                A trial and a paid period are alternatives — granting one clears the other's dates. The church sees the
                plan and the standing in its own Settings immediately.
              </p>

              {problem && <ErrorBlock message={problem} />}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void assign()}
                  disabled={assigning || !planKey}
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {assigning ? 'Saving…' : 'Save plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs" {...payDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-lg w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">{payTarget.name} — payment</h3>
              <button
                type="button"
                onClick={() => setPayTarget(null)}
                aria-label="Close"
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vendor-amount" className={LABEL}>
                    Amount ({payTarget.currency})
                  </label>
                  <input
                    id="vendor-amount"
                    aria-label="Amount"
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="vendor-method" className={LABEL}>
                    Method
                  </label>
                  <select
                    id="vendor-method"
                    aria-label="Method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as SubscriptionPaymentDto['method'])}
                    className={`${FIELD} cursor-pointer`}
                  >
                    {PAYMENT_METHODS.map((option) => (
                      <option key={option} value={option}>
                        {option.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="vendor-months" className={LABEL}>
                    Months this buys
                  </label>
                  <input
                    id="vendor-months"
                    aria-label="Months this buys"
                    type="number"
                    min={1}
                    max={36}
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="vendor-reference" className={LABEL}>
                    Reference <span className="font-normal text-[#A8A29E]">(optional)</span>
                  </label>
                  <input
                    id="vendor-reference"
                    aria-label="Reference"
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="M-Pesa QK12AB34"
                    className={FIELD}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vendor-pay-note" className={LABEL}>
                  Note <span className="font-normal text-[#A8A29E]">(optional)</span>
                </label>
                <input
                  id="vendor-pay-note"
                  aria-label="Note"
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className={FIELD}
                />
              </div>

              <p className="text-[11px] text-[#57534E] leading-relaxed">
                The period starts when the current one ends, so a church that pays early keeps those days. Recording a
                payment also puts the church back to active and answers any plan request.
              </p>

              {problem && <ErrorBlock message={problem} />}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setPayTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void recordPayment()}
                  disabled={recording}
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-85 disabled:cursor-wait text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {recording ? 'Recording…' : 'Record payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
