import React from 'react';
import { useAuth } from '../../lib/auth';

/**
 * The strip above the workspace that a church sees when its subscription needs an answer.
 *
 * It exists because two of the commercial states are easy to miss and expensive to miss: a trial about
 * to end, and a period that has already lapsed into read-only. Both are said once, in the server's own
 * words, with the way to act on them one click away — which is the whole reason `headline` is written
 * server-side rather than composed here.
 *
 * Silent the rest of the time. An always-present billing strip is furniture; a strip that appears the
 * week before a trial ends is a message.
 */

/** How close to the end of a trial the church is told about it. */
const TRIAL_WARNING_DAYS = 7;

interface SubscriptionBannerProps {
  onOpenBilling: () => void;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ onOpenBilling }) => {
  const { subscription } = useAuth();
  if (!subscription) return null;

  const { status, daysLeft, requestedPlan } = subscription;
  const trialEndingSoon = status === 'trial' && daysLeft !== null && daysLeft <= TRIAL_WARNING_DAYS;
  const needsAttention = status === 'past_due' || status === 'cancelled' || trialEndingSoon;

  // A church that has asked for a plan is waiting on Praxis, not on itself — worth saying once, but it
  // must not outrank a real warning.
  if (!needsAttention) {
    if (!requestedPlan) return null;
    return (
      <div className="w-full px-6 sm:px-8 py-2.5 bg-[#C2410C]/5 border-b border-[#C2410C]/20 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <p className="text-xs text-[#1C1917]">
          <span aria-hidden="true" className="material-symbols-outlined text-[15px] align-[-2px] text-[#C2410C] mr-1.5">
            hourglass_top
          </span>
          Your request for the <strong>{requestedPlan.name}</strong> plan is with Praxis.
        </p>
        <button
          type="button"
          onClick={onOpenBilling}
          className="text-xs font-bold text-[#C2410C] hover:underline cursor-pointer"
        >
          Subscription &amp; Billing
        </button>
      </div>
    );
  }

  const urgent = status === 'past_due';
  return (
    <div
      role="status"
      className={`w-full px-6 sm:px-8 py-2.5 border-b flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 ${
        urgent ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FFFBEB] border-[#FDE68A]'
      }`}
    >
      <p className={`text-xs ${urgent ? 'text-[#B91C1C]' : 'text-[#B45309]'}`}>
        <span aria-hidden="true" className="material-symbols-outlined text-[15px] align-[-2px] mr-1.5">
          {urgent ? 'notification_important' : 'schedule'}
        </span>
        {subscription.headline}
      </p>
      <button
        type="button"
        onClick={onOpenBilling}
        className={`text-xs font-bold hover:underline cursor-pointer ${urgent ? 'text-[#B91C1C]' : 'text-[#B45309]'}`}
      >
        Subscription &amp; Billing
      </button>
    </div>
  );
};
