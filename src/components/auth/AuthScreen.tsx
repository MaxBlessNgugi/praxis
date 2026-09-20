import React, { useState } from 'react';
import logoMark from '../../assets/brand/praxis-icon.webp';
import logoWordmark from '../../assets/brand/praxis-wordmark.webp';
import { useAuth } from '../../lib/auth';
import { errorMessage } from '../../hooks/useApi';
import { SignupForm } from './SignupForm';
import { LegalDialog } from '../legal/LegalDialog';

/**
 * Praxis sign-in screen — the app's entry gate (`App.tsx` renders it until it
 * reports success). Rendered outside the church navigation shell: no sidebar,
 * no top header.
 *
 * Calls POST /api/auth/login and stores the JWT on success.
 *
 * Neither field is filled in for you. The seeded account and password used to sit in this form as
 * default values, which meant the console opened with working credentials already typed into it — a
 * demo convenience that is a security defect the moment a real church signs in.
 *
 * **Remember Me** is wired to the token storage rather than being decoration, and it starts
 * *unticked*: ticked keeps the session in `localStorage` across browser restarts, unticked leaves it
 * in `sessionStorage` so closing the window ends it. The parish computer is shared, so the safe
 * behaviour is the one that needs no decision.
 *
 * A **forgotten password** is finished here too. The link the API emails carries its token in the
 * query string (`?reset=…`), which is why this screen reads it on mount: there is no router in the
 * console, and a reset link that landed on a not-found page would be a dead end for the person who
 * has nobody to ask.
 */
interface AuthScreenProps {
  /**
   * Fired once authentication succeeds. Optional: the gate is driven by the session itself, so
   * `App` swaps this screen for the console as soon as `useAuth()` reports a signed-in user.
   */
  onSignIn?: () => void;
}

/** The token a reset email carries in `/?reset=<token>`. There is no router in the console, so the
 * one link that arrives from outside is read here. */
const resetTokenFromUrl = (): string | null => new URLSearchParams(window.location.search).get('reset');

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn }) => {
  /** Sign in, start a church that has no account yet, or finish a password reset from an email. */
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(() => (resetTokenFromUrl() ? 'reset' : 'signin'));
  // Read once, on mount: the token is single-use and short-lived, and re-reading it on every render
  // would only re-open a flow the person has already finished.
  const [resetToken] = useState(resetTokenFromUrl);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  /** Which document the visitor asked for, or nothing. Owned here so both cards open the same one. */
  const [legal, setLegal] = useState<'privacy' | 'terms' | 'data' | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await login(email, password, rememberMe);
      onSignIn?.();
    } catch (err) {
      // A rejected fetch (server down, DNS, CORS preflight refused) surfaces as a TypeError — the
      // common case while the API is not running yet, so it is named rather than called unexpected.
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#FDF8F3] text-[#1C1917] font-['Inter',sans-serif] overflow-hidden">
      {/* LEFT PANEL — Brand & Composition (42%). On a phone it stacks above the card
          (branding on top, form below) rather than disappearing. */}
      <aside className="relative w-full md:w-[42%] shrink-0 bg-[#F8F1E9] flex flex-col items-center justify-center overflow-hidden px-8 py-10 md:h-full md:px-12 md:py-0">
        {/* Soft warm depth: gentle light gradient with abstract shapes */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#FFF8F5] via-[#F8F1E9] to-[#F5EDE4]" />
        <div className="pointer-events-none absolute -top-24 -left-24 w-[440px] h-[440px] rounded-full bg-[#C2410C]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 w-[480px] h-[480px] rounded-full bg-[#FE932C]/15 blur-3xl" />
        <div className="pointer-events-none absolute top-[26%] right-12 w-64 h-64 rounded-full border border-[#C2410C]/15" />
        <div className="pointer-events-none absolute bottom-24 left-6 w-40 h-40 rounded-full border border-[#904D00]/15" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <img src={logoMark} alt="" aria-hidden="true" className="h-20 w-auto mb-6" />

          {/* The heading is the wordmark itself, so the name keeps the uploaded lockup's own
              letterforms while staying a real h1 whose accessible name is "Praxis Church OS". */}
          <h1 className="flex justify-center">
            <img src={logoWordmark} alt="Praxis Church OS" className="w-[240px] max-w-full h-auto" />
          </h1>

          <p className="font-headline text-[14px] font-semibold tracking-[0.18em] uppercase text-[#57534E] mt-3">
            Church Operations Platform
          </p>
        </div>

        <div className="absolute bottom-10 inset-x-12 z-10 hidden md:flex items-center justify-center gap-2 text-[11px] font-medium text-[#57534E]">
          <span className="material-symbols-outlined text-[16px] text-[#C2410C]" aria-hidden="true">encrypted</span>
          Church records secured under church confidentiality
        </div>
      </aside>

      {/* RIGHT PANEL — Authentication Card (58%) */}
      <main className="relative w-full md:w-[58%] flex-1 min-h-0 bg-[#FDF8F3] flex overflow-y-auto px-6 py-8 md:px-12 md:py-0">
        {mode === 'signup' ? (
          <SignupForm onCancel={() => setMode('signin')} onShowLegal={setLegal} />
        ) : mode === 'reset' ? (
          <ResetForm initialToken={resetToken} onShowLegal={setLegal} onCancel={() => setMode('signin')} />
        ) : (
        <div className="m-auto w-full max-w-[420px] bg-[#FFFFFF] rounded-[14px] border border-[#E7E5E4] shadow-warm-card p-8">
          <div className="mb-7">
            <h2 className="font-headline text-[20px] font-bold text-[#1C1917] tracking-tight">
              Welcome back
            </h2>
            {/* No church is named here: an unauthenticated visitor has not said which one they serve,
                and the console learns it from the sign-in, not before. */}
            <p className="text-[13px] text-[#57534E] mt-1">
              Sign in to continue to your church's console.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email / Username */}
            <div>
              <label htmlFor="auth-email" className="block text-xs font-bold text-[#1C1917] mb-1.5">
                Email or Username
              </label>
              <input
                id="auth-email"
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@destinysanctuary.co.ke"
                className="w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15"
              />
            </div>

            {/* Password with show / hide toggle */}
            <div>
              <label htmlFor="auth-password" className="block text-xs font-bold text-[#1C1917] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full px-3.5 py-2.5 pr-12 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-[7px] text-[#57534E] hover:text-[#C2410C] hover:bg-[#F5EDE4] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember me, and the way back in when it is forgotten. The link goes to a real flow —
                the API mails a single-use, expiring token — rather than the dead button this used to
                have to avoid. */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#57534E] select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D6D3D1] accent-[#C2410C] cursor-pointer"
                />
                Remember Me
              </label>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-xs font-semibold text-[#C2410C] hover:underline cursor-pointer"
              >
                Forgot your password?
              </button>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-5 py-3 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-85 disabled:cursor-wait text-white text-sm font-bold shadow-[0_2px_8px_rgba(194,65,12,0.25)] hover:shadow-[0_4px_14px_rgba(194,65,12,0.32)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span aria-hidden="true" className={`material-symbols-outlined text-[19px] ${isSubmitting ? 'animate-spin' : ''}`}>
                {isSubmitting ? 'progress_activity' : 'login'}
              </span>
              {isSubmitting ? 'Signing in…' : 'Sign In to Praxis'}
            </button>
          </form>
          {/* The other door. A church that does not exist yet cannot sign in, so the way to get one
              lives here rather than behind a sales address nobody writes down. */}
          <button
            type="button"
            onClick={() => setMode('signup')}
            className="mt-5 w-full text-center text-xs font-semibold text-[#57534E] hover:text-[#C2410C] transition-colors cursor-pointer"
          >
            New to Praxis? Start your church's fourteen-day trial
          </button>

          {/* What a church is agreeing to, on the screen where it decides. Both documents are in one
              dialog, opened from either card. */}
          <p className="mt-3 text-center text-[11px] leading-relaxed text-[#57534E]">
            Your church's records stay your church's records.{' '}
            <button
              type="button"
              onClick={() => setLegal('privacy')}
              className="font-semibold text-[#C2410C] hover:underline cursor-pointer"
            >
              Privacy
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => setLegal('terms')}
              className="font-semibold text-[#C2410C] hover:underline cursor-pointer"
            >
              Terms
            </button>
          </p>

          {error && (
            <div
              className="mt-4 p-3 rounded-[7px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>
        )}
      </main>

      {legal && <LegalDialog initialSection={legal} onClose={() => setLegal(null)} />}
    </div>
  );
};

const FIELD =
  'w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1.5';
const CARD = 'm-auto w-full max-w-[420px] bg-[#FFFFFF] rounded-[14px] border border-[#E7E5E4] shadow-warm-card p-8';

/**
 * Forgot your password — ask for a link, then spend it.
 *
 * One component for both halves because they are one flow, and whether it starts at the request or at
 * the confirmation is decided by whether the URL carried a token. The token is read from the address
 * bar exactly once and then cleared from it, so a person who reloads after resetting does not land
 * back inside a flow they have finished — and so the token does not linger in the browser's history.
 */
const ResetForm: React.FC<{
  /** The token from the emailed link, or nothing when the person arrived by asking for one. */
  initialToken: string | null;
  onCancel: () => void;
  onShowLegal: (section: 'privacy' | 'terms' | 'data') => void;
}> = ({ initialToken, onCancel, onShowLegal }) => {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  const clearTokenFromUrl = () => {
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
  };

  const askForLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const answer = await requestPasswordReset(email);
      setNotice(
        answer.canSendEmail
          ? `${answer.message} The link can be used once and expires in ${answer.expiresInMinutes} minutes.`
          : `${answer.message} This server has no email provider configured, so no mail can be sent — ask your administrator to set one.`,
      );
      setDevLink(answer.devLink ?? null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const spendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !token) return;
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmPasswordReset(token, password);
      clearTokenFromUrl();
      setToken(null);
      setNotice('Your password has been replaced, and every other session on the account has ended. Sign in with the new one.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={CARD}>
      <div className="mb-7">
        <h2 className="font-headline text-[20px] font-bold text-[#1C1917] tracking-tight">
          {token ? 'Choose a new password' : 'Reset your password'}
        </h2>
        <p className="text-[13px] text-[#57534E] mt-1">
          {token
            ? 'This link can be used once. Every other session on the account ends when you save.'
            : 'Tell us the address you sign in with and we will email you a link that can be used once.'}
        </p>
      </div>

      {notice && (
        <div className="mb-5 p-3 rounded-[7px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs" role="status">
          {notice}
        </div>
      )}

      {devLink && (
        <div className="mb-5 p-3 rounded-[7px] bg-[#F8F1E9] border border-[#E7E5E4] text-[#57534E] text-xs break-all">
          Development only — this server sends no email, so here is the link:{' '}
          <a href={devLink} className="font-semibold text-[#C2410C] hover:underline">
            {devLink}
          </a>
        </div>
      )}

      {token && !notice ? (
        <form onSubmit={spendLink} className="space-y-5">
          <div>
            <label htmlFor="reset-password" className={LABEL}>
              New password
            </label>
            <input
              id="reset-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="reset-confirm" className={LABEL}>
              Repeat it
            </label>
            <input
              id="reset-confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={FIELD}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full px-5 py-3 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-85 disabled:cursor-wait text-white text-sm font-bold transition-all cursor-pointer"
          >
            {busy ? 'Saving…' : 'Save the new password'}
          </button>
        </form>
      ) : (
        !notice && (
          <form onSubmit={askForLink} className="space-y-5">
            <div>
              <label htmlFor="reset-email" className={LABEL}>
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@destinysanctuary.co.ke"
                className={FIELD}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full px-5 py-3 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-85 disabled:cursor-wait text-white text-sm font-bold transition-all cursor-pointer"
            >
              {busy ? 'Sending…' : 'Email me a link'}
            </button>
          </form>
        )
      )}

      {error && (
        <div className="mt-4 p-3 rounded-[7px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs" role="alert">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="mt-5 w-full text-center text-xs font-semibold text-[#57534E] hover:text-[#C2410C] transition-colors cursor-pointer"
      >
        Back to sign in
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-[#57534E]">
        Your church's records stay your church's records.{' '}
        <button type="button" onClick={() => onShowLegal('privacy')} className="font-semibold text-[#C2410C] hover:underline cursor-pointer">
          Privacy
        </button>
      </p>
    </div>
  );
};
