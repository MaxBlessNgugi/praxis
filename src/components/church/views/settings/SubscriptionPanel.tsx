import React, { useState } from 'react';
import { useAuth } from '../../../../lib/auth';
import { billingApi, type PlanDto, type SubscriptionDto } from '../../../../lib/api';
import { errorMessage, usePayments, usePlanCatalogue } from '../../../../hooks/useApi';
import { useDialog } from '../../dialog';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * What the church is on, what it owes, and how it changes.
 *
 * Three things in one screen, in the order a treasurer would ask them: where do we stand (this plan,
 * this status, these dates, this usage), what else is there (the catalogue), and what has been paid
 * (the record).
 *
 * The church cannot change its own plan, and that is deliberate rather than a missing feature. A
 * parish office pays by bank transfer, cheque or M-Pesa and then telephones; the honest version of that
 * flow is a *request* the vendor sees, not a card form that pretends to be Stripe. So the button says
 * "Request", the request is visible here until it is answered, and the payments list is filled in by
 * whoever receives the money.
 */

/** The one place a status becomes a colour and a word, so the panel and the banner agree. */
const STATUS_STYLES: Record<SubscriptionDto['status'], { label: string; className: string }> = {
  trial: { label: 'Trial', className: 'bg-[#D97706]/10 text-[#B45309] border-[#D97706]/30' },
  active: { label: 'Active', className: 'bg-[#059669]/10 text-[#047857] border-[#059669]/30' },
  past_due: { label: 'Payment due', className: 'bg-[#EA580C]/10 text-[#C2410C] border-[#EA580C]/30' },
  cancelled: { label: 'Cancelled', className: 'bg-[#57534E]/10 text-[#57534E] border-[#57534E]/30' },
  expired: { label: 'Paused', className: 'bg-[#DC2626]/10 text-[#B91C1C] border-[#DC2626]/30' },
};

function formatDay(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const money = (amount: number, currency: string) => `${currency} ${amount.toLocaleString()}`;

const intervalOf = (plan: PlanDto) => (plan.interval === 'yearly' ? 'year' : 'month');

/** A plan's limits as the two sentences a church actually compares. */
function limitLines(plan: PlanDto): string[] {
  const lines: string[] = [];
  if (plan.limits.maxMembers) lines.push(`Up to ${plan.limits.maxMembers.toLocaleString()} members`);
  if (plan.limits.maxUsers) lines.push(`Up to ${plan.limits.maxUsers} staff accounts`);
  return lines;
}

function UsageBar({ used, limit, label }: { used: number; limit?: number; label: string }) {
  // No limit is a plan feature, not a missing value, so it is stated rather than drawn as empty.
  if (!limit) {
    return (
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-[#57534E]">{label}</span>
        <span className="font-bold text-[#1C1917]">{used.toLocaleString()} · unlimited</span>
      </div>
    );
  }
  const percent = Math.min(100, Math.round((used / limit) * 100));
  const full = used >= limit;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-[#57534E]">{label}</span>
        <span className={`font-bold ${full ? 'text-[#B91C1C]' : 'text-[#1C1917]'}`}>
          {used.toLocaleString()} of {limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-[#E7E5E4] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${full ? 'bg-[#DC2626]' : 'bg-[#C2410C]'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {full && (
        <p className="mt-1 text-[11px] text-[#B91C1C] font-semibold">
          At the limit — new records of this kind are refused until the plan changes.
        </p>
      )}
    </div>
  );
}

export const SubscriptionPanel: React.FC = () => {
  const { organization, subscription, refreshSubscription } = useAuth();
  const catalogue = usePlanCatalogue();
  const payments = usePayments();

  const [requested, setRequested] = useState<PlanDto | null>(null);
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const requestDialog = useDialog(() => setRequested(null), 'Request a plan change');

  const closeRequest = () => {
    setRequested(null);
    setNote('');
    setProblem(null);
  };

  const sendRequest = async () => {
    if (!requested || isSending) return;
    setIsSending(true);
    setProblem(null);
    try {
      await billingApi.requestUpgrade({ planKey: requested.key, note: note.trim() || undefined });
      await refreshSubscription();
      setSent(`Praxis has your request for the ${requested.name} plan and will be in touch about payment.`);
      closeRequest();
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  if (!subscription) {
    return (
      <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card">
        {catalogue.error ? (
          <ErrorBlock message={catalogue.error} onRetry={() => void catalogue.refetch()} />
        ) : catalogue.loading ? (
          <LoadingBlock label="Reading your subscription…" />
        ) : (
          <EmptyBlock
            icon="receipt_long"
            title="No plan on this church yet"
            hint="Praxis sets the first plan when it opens a console. Telephone the office and it will appear here."
          />
        )}
      </div>
    );
  }

  const status = STATUS_STYLES[subscription.status];
  const plan = subscription.plan;
  const pending = subscription.requestedPlan;

  /**
   * The dates a treasurer reads off this screen.
   *
   * The grace card is the server's to offer: it sends a date only when one is actually running — a
   * trial, or a period already overdue — so the card is built from what arrived. Showing "If it lapses
   * —" beside a paid-up church would claim a deadline that does not exist.
   */
  const facts = [
    { label: 'Started', value: formatDay(subscription.currentPeriodStart ?? subscription.trialEndsAt) },
    {
      label: subscription.status === 'trial' ? 'Trial ends' : 'Current period ends',
      value: formatDay(subscription.trialEndsAt ?? subscription.currentPeriodEnd),
    },
    {
      label: 'Days remaining',
      value: subscription.daysLeft === null ? 'No end date' : `${Math.max(0, subscription.daysLeft)} days`,
    },
    ...(subscription.graceEndsAt ? [{ label: 'If it lapses', value: formatDay(subscription.graceEndsAt) }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* ============ WHERE THE CHURCH STANDS ============ */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#E7E5E4]">
          <div>
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">
                workspace_premium
              </span>
              Subscription & Billing
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              {organization?.name ?? 'This church'} on the {plan.name} plan · {money(plan.price, plan.currency)} per{' '}
              {intervalOf(plan)}.
            </p>
          </div>
          <span className={`self-start px-3 py-1 rounded-full border text-xs font-bold ${status.className}`}>
            {status.label}
          </span>
        </div>

        {sent && (
          <div className="p-3.5 rounded-[12px] bg-[#059669]/10 border border-[#059669]/30 text-[#047857] text-xs font-bold flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              check_circle
            </span>
            {sent}
          </div>
        )}

        {/* The sentence is written by the server, which is the only party that knows today's date. */}
        <p className="text-[13px] text-[#1C1917] leading-relaxed">{subscription.headline}</p>

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${facts.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
        >
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-[10px] border border-[#E7E5E4] bg-[#FDF8F3] px-3.5 py-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#A8A29E]">
                {fact.label}
              </span>
              <span className="mt-0.5 block text-sm font-bold text-[#1C1917]">{fact.value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E]">What this church is using</h4>
          <UsageBar used={subscription.usage.members} limit={subscription.limits.maxMembers} label="Members on the register" />
          <UsageBar used={subscription.usage.users} limit={subscription.limits.maxUsers} label="Staff accounts" />
        </div>

        {pending && (
          <div className="p-3.5 rounded-[12px] bg-[#C2410C]/5 border border-[#C2410C]/25 text-xs text-[#1C1917] flex items-start gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#C2410C]">
              hourglass_top
            </span>
            <span>
              You asked Praxis for the <strong>{pending.name}</strong> plan on {formatDay(subscription.requestedAt)}. The
              console keeps working on {plan.name} until the change is confirmed.
            </span>
          </div>
        )}

        {/* The column is written by both sides — a church's note with its request, and Praxis's when it
            answers one — so the label names the note rather than claiming an author. */}
        {subscription.notes && (
          <p className="text-xs text-[#57534E] border-t border-[#E7E5E4] pt-3">
            Note on this subscription: {subscription.notes}
          </p>
        )}
      </div>

      {/* ============ THE PLANS ============ */}
      <div className="space-y-3">
        <div>
          <h3 className="font-headline text-base font-bold text-[#1C1917]">Plans</h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            Ask for any plan and Praxis will confirm the price and record the payment — nothing changes until then.
          </p>
        </div>

        {catalogue.loading && <LoadingBlock label="Loading plans…" />}
        {catalogue.error && <ErrorBlock message={catalogue.error} onRetry={() => void catalogue.refetch()} />}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {catalogue.plans.map((option) => {
            const isCurrent = option.key === plan.key;
            const isPending = pending?.key === option.key;
            return (
              <div
                key={option.key}
                className={`rounded-[14px] border bg-[#FFFFFF] p-5 shadow-warm-card flex flex-col gap-3 ${
                  isCurrent ? 'border-[#C2410C]/50 ring-2 ring-[#C2410C]/15' : 'border-[#E7E5E4]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-headline text-sm font-bold text-[#1C1917]">{option.name}</h4>
                    {option.tagline && <p className="text-[11px] text-[#57534E] mt-0.5">{option.tagline}</p>}
                  </div>
                  {isCurrent && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#C2410C] text-white text-[10px] font-bold uppercase tracking-wider">
                      Current
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="font-headline text-xl font-black text-[#1C1917]">
                    {money(option.price, option.currency)}
                  </span>
                  <span className="text-xs text-[#57534E]">/ {intervalOf(option)}</span>
                </div>

                <ul className="space-y-1.5 text-xs text-[#1C1917]">
                  {[...limitLines(option), ...option.features].map((line) => (
                    <li key={line} className="flex gap-2">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-[#C2410C] shrink-0">
                        check_circle
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                {option.trialDays > 0 && !isCurrent && (
                  <p className="text-[11px] text-[#57534E]">{option.trialDays}-day trial on a new church.</p>
                )}

                <div className="mt-auto pt-2">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full px-4 py-2 rounded-[9px] bg-[#F5EDE4] border border-[#E7E5E4] text-[#57534E] text-xs font-bold cursor-default"
                    >
                      This is your plan
                    </button>
                  ) : isPending ? (
                    <button
                      type="button"
                      disabled
                      className="w-full px-4 py-2 rounded-[9px] bg-[#F5EDE4] border border-[#E7E5E4] text-[#57534E] text-xs font-bold cursor-default"
                    >
                      Requested — with Praxis
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRequested(option);
                        setNote('');
                        setProblem(null);
                      }}
                      className="w-full px-4 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-[0_2px_8px_rgba(194,65,12,0.25)] transition-colors cursor-pointer"
                    >
                      {option.price > plan.price ? 'Request upgrade' : 'Request this plan'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ WHAT HAS BEEN PAID ============ */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-4">
        <div>
          <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">
              receipt_long
            </span>
            Payments received
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            Every payment Praxis records for this church, with the period it covers. Pay by bank transfer, cheque or
            M-Pesa and telephone the office — this list is the receipt.
          </p>
        </div>

        {payments.loading && <LoadingBlock label="Loading payments…" />}
        {payments.error && <ErrorBlock message={payments.error} onRetry={() => void payments.refetch()} />}

        {!payments.loading && !payments.error && payments.payments.length === 0 && (
          <EmptyBlock
            icon="payments"
            title="No payments recorded yet"
            hint={
              subscription.status === 'trial'
                ? 'The trial period has not needed one. When it ends, Praxis records the first payment here.'
                : 'When the office receives a payment, it appears here with the dates it covers.'
            }
          />
        )}

        {payments.payments.length > 0 && (
          <div className="rounded-[10px] border border-[#E7E5E4] overflow-hidden overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#FDF8F3] text-[#57534E]">
                <tr>
                  <th className="text-left font-bold px-3 py-2 whitespace-nowrap">Received</th>
                  <th className="text-left font-bold px-3 py-2 whitespace-nowrap">Amount</th>
                  <th className="text-left font-bold px-3 py-2 whitespace-nowrap">Method</th>
                  <th className="text-left font-bold px-3 py-2 whitespace-nowrap">Reference</th>
                  <th className="text-left font-bold px-3 py-2 whitespace-nowrap">Covers</th>
                  <th className="text-left font-bold px-3 py-2 whitespace-nowrap">Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {payments.payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-[#E7E5E4]/70">
                    <td className="px-3 py-2 text-[#1C1917] whitespace-nowrap">{formatDay(payment.receivedAt)}</td>
                    <td className="px-3 py-2 font-bold text-[#1C1917] whitespace-nowrap">
                      {money(payment.amount, payment.currency)}
                    </td>
                    <td className="px-3 py-2 text-[#57534E] capitalize">{payment.method.replace('_', ' ')}</td>
                    <td className="px-3 py-2 text-[#57534E] font-mono">{payment.reference ?? '—'}</td>
                    <td className="px-3 py-2 text-[#57534E] whitespace-nowrap">
                      {formatDay(payment.periodStart)} → {formatDay(payment.periodEnd)}
                    </td>
                    <td className="px-3 py-2 text-[#57534E]">{payment.recordedBy?.name ?? 'Praxis'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: REQUEST A PLAN */}
      {requested && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/50 backdrop-blur-xs"
          {...requestDialog}
        >
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-md w-full p-6 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-base font-bold text-[#1C1917]">Request the {requested.name} plan</h3>
              <button
                type="button"
                onClick={closeRequest}
                aria-label="Close"
                className="text-[#57534E] hover:text-[#1C1917] p-1 rounded-md cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-[10px] border border-[#E7E5E4] bg-[#FDF8F3] px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-bold text-[#1C1917]">{requested.name}</span>
                  <span className="text-xs font-semibold text-[#57534E]">
                    {money(requested.price, requested.currency)} / {intervalOf(requested)}
                  </span>
                </div>
                <p className="text-[11px] text-[#A8A29E] mt-1">
                  {[...limitLines(requested), ...requested.features].join(' · ') || 'No limits set on this plan.'}
                </p>
              </div>

              <div>
                <label htmlFor="upgrade-note" className="block text-xs font-bold text-[#1C1917] mb-1.5">
                  Anything the office should know <span className="font-normal text-[#A8A29E]">(optional)</span>
                </label>
                <textarea
                  id="upgrade-note"
                  aria-label="Anything the office should know"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="We would like to move onto this plan from the start of next month."
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] resize-none"
                />
              </div>

              <p className="text-[11px] text-[#57534E] leading-relaxed">
                This does not change the church's data or its plan. Praxis will confirm the amount, agree how it is paid,
                and record the payment.
              </p>

              {problem && <ErrorBlock message={problem} />}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={closeRequest}
                  className="px-4 py-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void sendRequest()}
                  disabled={isSending}
                  className="px-4 py-2 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-85 disabled:cursor-wait text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {isSending ? 'Sending…' : 'Send request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
