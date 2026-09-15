import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { errorMessage } from '../../hooks/useApi';

/**
 * The strip that says an operator is standing in another church.
 *
 * It is deliberately the loudest thing on the screen and it never goes away while the visit lasts.
 * That is the point of a support session being a *visible* state: the operator must not forget which
 * church they are writing to, and a church's staff watching a screen share must be able to see that
 * the person at the keyboard is Praxis, not their own administrator.
 *
 * Ending the visit asks for a reason, because the closing line lands in the church's own audit log
 * beside the opening one and the pair is what turns a convenience into something a parish can audit.
 */

/** How many minutes are left, against the server's expiry rather than a local countdown of our own. */
function minutesLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000));
}

export const SupportSessionBanner: React.FC = () => {
  const { supportSession, exitSupportSession } = useAuth();
  const [ending, setEnding] = useState(false);
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(supportSession ? minutesLeft(supportSession.expiresAt) : 0);

  // A minute-tick rather than a live second counter: the useful fact is "about forty minutes", and a
  // ticking stopwatch on an operator's screen reads as a deadline rather than a boundary.
  useEffect(() => {
    if (!supportSession) return;
    setRemaining(minutesLeft(supportSession.expiresAt));
    const timer = window.setInterval(() => setRemaining(minutesLeft(supportSession.expiresAt)), 30_000);
    return () => window.clearInterval(timer);
  }, [supportSession]);

  if (!supportSession) return null;

  const finish = async () => {
    if (reason.trim().length < 3) {
      setProblem('Say what the visit covered — the church reads this line.');
      return;
    }
    setEnding(true);
    setProblem(null);
    try {
      await exitSupportSession(reason.trim());
    } catch (error) {
      setProblem(errorMessage(error));
      setEnding(false);
    }
  };

  return (
    <div role="status" className="w-full px-6 sm:px-8 py-2.5 bg-[#1C1917] text-white border-b border-[#1C1917]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs">
          <span aria-hidden="true" className="material-symbols-outlined text-[15px] align-[-2px] text-[#FDBA74] mr-1.5">
            support_agent
          </span>
          Support session — you are working inside <strong>{supportSession.organization.name}</strong> as a Praxis
          operator. {remaining > 0 ? `About ${remaining} minute${remaining === 1 ? '' : 's'} left.` : 'This session has expired.'}{' '}
          Everything you do is written to their audit log.
        </p>

        {ending ? (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="support-session-reason" className="sr-only">
              What this visit covered
            </label>
            <input
              id="support-session-reason"
              aria-label="What this visit covered"
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="What the visit covered"
              className="px-3 py-1.5 rounded-[8px] text-xs bg-white/10 text-white placeholder:text-white/50 border border-white/20 focus:outline-none focus:border-[#FDBA74]"
            />
            <button
              type="button"
              onClick={() => void finish()}
              className="px-3 py-1.5 rounded-[8px] bg-[#C2410C] hover:bg-[#EA580C] text-xs font-bold cursor-pointer"
            >
              End and leave
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEnding(true)}
            className="px-3 py-1.5 rounded-[8px] bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
          >
            End support session
          </button>
        )}
      </div>

      {problem && <p className="text-[11px] text-[#FDBA74] mt-1.5">{problem}</p>}
    </div>
  );
};
