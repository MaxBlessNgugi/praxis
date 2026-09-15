import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ApiError, type SignupBody } from '../../lib/api';
import { errorMessage } from '../../hooks/useApi';

/**
 * A church signing itself up.
 *
 * Six fields and no more. Everything a parish would rather not type at the door — its vision, its
 * service times, its departments — is asked for by the wizard *after* the account exists, because a
 * signup form that demands a vision statement is a form nobody finishes, and an abandoned form is a
 * church that never gets a console.
 *
 * What it does insist on is a reachable phone number and a country: Praxis has to be able to telephone
 * the office about a payment, and the two fields are how the church says how it is reached. The
 * password rule is the same one the API enforces on any account it creates.
 *
 * Submitting signs the new administrator in — the API answers with the same session a sign-in would —
 * so the next thing they see is the welcome wizard inside their own console.
 */

interface SignupFormProps {
  /** Back to the sign-in card, for somebody who already has an account after all. */
  onCancel: () => void;
  /** Opens the privacy or terms document above this form. */
  onShowLegal?: (section: 'privacy' | 'terms' | 'data') => void;
}

const EMPTY: SignupBody = { churchName: '', adminName: '', email: '', password: '', phone: '', country: 'Kenya' };

const FIELD = 'w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1.5';

export const SignupForm: React.FC<SignupFormProps> = ({ onCancel, onShowLegal }) => {
  const [draft, setDraft] = useState<SignupBody>(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signup } = useAuth();

  const update = (key: keyof SignupBody, value: string) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setError(null);
  };

  /** Validated here as well as on the server, so the answer arrives without a round trip. */
  const validate = (): string | null => {
    if (draft.churchName.trim().length < 2) return 'Tell us the name of your church.';
    if (draft.adminName.trim().length < 2) return 'Tell us your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return 'Enter a valid email address — this is how you sign in.';
    if (draft.password.length < 8) return 'Use at least 8 characters for your password.';
    if (draft.phone.trim().length < 7) return 'Enter a phone number Praxis can reach your office on.';
    if (draft.country.trim().length < 2) return 'Say which country the church is in.';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await signup({
        churchName: draft.churchName.trim(),
        adminName: draft.adminName.trim(),
        email: draft.email.trim(),
        password: draft.password,
        phone: draft.phone.trim(),
        country: draft.country.trim(),
      });
      // Nothing to do on success: the session is set, and the gate swaps this screen for the console.
    } catch (err) {
      // A taken email is the one refusal worth rewording: the server says "sign in instead", which is
      // the right instruction and reads oddly under a signup form. Everything else — a weak password
      // above all — is shown in the server's own words, which name the field and what is wrong with it.
      setError(
        err instanceof ApiError && err.status === 409
          ? 'An account already uses that email address. Sign in instead, or use another one.'
          : errorMessage(err),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="m-auto w-full max-w-[460px] bg-[#FFFFFF] rounded-[14px] border border-[#E7E5E4] shadow-warm-card p-8">
      <div className="mb-6">
        <h2 className="font-headline text-[20px] font-bold text-[#1C1917] tracking-tight">Start your church on Praxis</h2>
        <p className="text-[13px] text-[#57534E] mt-1">
          Fourteen days, no card, no commitment. Your records stay yours — you can export them at any time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-church" className={LABEL}>
            Church name
          </label>
          <input
            id="signup-church"
            aria-label="Church name"
            type="text"
            required
            autoComplete="organization"
            value={draft.churchName}
            onChange={(e) => update('churchName', e.target.value)}
            placeholder="Grace Chapel, Nakuru"
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="signup-admin" className={LABEL}>
            Your name
          </label>
          <input
            id="signup-admin"
            aria-label="Your name"
            type="text"
            required
            autoComplete="name"
            value={draft.adminName}
            onChange={(e) => update('adminName', e.target.value)}
            placeholder="Pastor Jane Wanjiru"
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="signup-email" className={LABEL}>
            Email
          </label>
          <input
            id="signup-email"
            aria-label="Email"
            type="email"
            required
            autoComplete="email"
            value={draft.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="office@gracechapel.co.ke"
            className={FIELD}
          />
          <p className="text-[11px] text-[#A8A29E] mt-1">This is your sign-in, and where Praxis sends receipts.</p>
        </div>

        <div>
          <label htmlFor="signup-password" className={LABEL}>
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              aria-label="Password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={draft.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="At least 8 characters"
              className={`${FIELD} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-[7px] text-[#57534E] hover:text-[#C2410C] hover:bg-[#F5EDE4] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[19px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="signup-phone" className={LABEL}>
              Phone
            </label>
            <input
              id="signup-phone"
              aria-label="Phone"
              type="tel"
              required
              autoComplete="tel"
              value={draft.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+254 7xx xxx xxx"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="signup-country" className={LABEL}>
              Country
            </label>
            <input
              id="signup-country"
              aria-label="Country"
              type="text"
              required
              autoComplete="country-name"
              value={draft.country}
              onChange={(e) => update('country', e.target.value)}
              className={FIELD}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-5 py-3 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-85 disabled:cursor-wait text-white text-sm font-bold shadow-[0_2px_8px_rgba(194,65,12,0.25)] hover:shadow-[0_4px_14px_rgba(194,65,12,0.32)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span aria-hidden="true" className={`material-symbols-outlined text-[19px] ${isSubmitting ? 'animate-spin' : ''}`}>
            {isSubmitting ? 'progress_activity' : 'church'}
          </span>
          {isSubmitting ? 'Creating your console…' : 'Create our church account'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-xs font-semibold text-[#57534E] hover:text-[#C2410C] transition-colors cursor-pointer py-1"
        >
          I already have an account — sign in
        </button>

        {/* A new church is agreeing to terms and to how its members' data is held, so it is told
            that here, in one line, before the account exists rather than in a document afterwards. */}
        <p className="text-center text-[11px] leading-relaxed text-[#57534E]">
          Starting a church here means accepting the{' '}
          <button
            type="button"
            onClick={() => onShowLegal?.('terms')}
            className="font-semibold text-[#C2410C] hover:underline cursor-pointer"
          >
            terms of use
          </button>{' '}
          and the{' '}
          <button
            type="button"
            onClick={() => onShowLegal?.('privacy')}
            className="font-semibold text-[#C2410C] hover:underline cursor-pointer"
          >
            privacy and data-protection summary
          </button>
          .
        </p>
      </form>

      {error && (
        <div className="mt-4 p-3 rounded-[7px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
