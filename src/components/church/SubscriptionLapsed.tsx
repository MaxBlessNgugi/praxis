import React from 'react';
import logoMark from '../../assets/brand/praxis-icon.webp';
import { useAuth } from '../../lib/auth';

/**
 * What a church sees when its subscription has lapsed.
 *
 * Deliberately not an error page, and deliberately not the console either. The console is closed
 * rather than left open with every button failing: a screen full of controls the server refuses is a
 * worse way to learn that a payment is late than one sentence that says so.
 *
 * So the panel does three things at once — the records are safe and nothing has been deleted, this is
 * a billing lapse rather than a fault, and there is one obvious way back — and it puts a human contact
 * beside a sign-out. The API behind it keeps answering reads, so nothing a church entrusted to Praxis
 * is unreachable if it is needed in a hurry.
 */
export const SubscriptionLapsed: React.FC = () => {
  const { organization, subscription, user, logout } = useAuth();

  const plan = subscription?.plan;
  // The period that ran out is the date a treasurer recognises; the grace date is why the console has
  // only now closed, so both are named rather than collapsing the two into one date.
  const endedAt = subscription?.currentPeriodEnd ?? subscription?.trialEndsAt;
  const graceEnded = subscription?.graceEndsAt !== null && subscription?.graceEndsAt !== undefined;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-[#FDF8F3] text-[#1C1917] px-6 py-10 overflow-y-auto">
      <img src={logoMark} alt="" aria-hidden="true" className="h-14 w-auto" />

      <div className="w-full max-w-[520px] bg-white rounded-[14px] border border-[#E7E5E4] shadow-warm-card p-8 text-center">
        <span className="material-symbols-outlined text-[36px] text-[#C2410C]" aria-hidden="true">
          schedule
        </span>
        <h1 className="font-headline text-[22px] font-bold tracking-tight mt-2">
          {organization?.name ?? 'Your church'} is paused
        </h1>
        <p className="text-[13px] text-[#57534E] mt-3 leading-relaxed">
          The {plan?.name ?? 'subscription'} period ended
          {endedAt ? ` on ${new Date(endedAt).toDateString()}` : ''}
          {graceEnded ? ', and the grace period that followed has now run out' : ''}. Nothing has been
          deleted: every record — members, giving, services, minutes — is exactly where the office left it,
          and the console opens again the moment the payment is recorded.
        </p>

        {plan && (
          <div className="mt-5 rounded-[10px] border border-[#E7E5E4] bg-[#FDF8F3] px-4 py-3 text-left">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-bold text-[#1C1917]">{plan.name}</span>
              <span className="text-xs font-semibold text-[#57534E]">
                {plan.currency} {plan.price.toLocaleString()} / {plan.interval === 'yearly' ? 'year' : 'month'}
              </span>
            </div>
            <p className="text-[11px] text-[#A8A29E] mt-1">
              Paying the period and asking Praxis to record it puts the console straight back to work.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="mailto:hello@praxis.church?subject=Subscription%20payment"
            className="w-full sm:w-auto px-5 py-2.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-[0_2px_8px_rgba(194,65,12,0.25)] transition-colors"
          >
            Arrange payment with Praxis
          </a>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-[9px] border border-[#E7E5E4] bg-white hover:bg-[#F5EDE4] text-[#57534E] text-xs font-bold transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>

        {user && (
          <p className="text-[11px] text-[#A8A29E] mt-4">
            Signed in as {user.name}. Ask whoever administers billing for this church to restore it.
          </p>
        )}
      </div>
    </div>
  );
};
