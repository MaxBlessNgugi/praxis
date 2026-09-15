import React, { useEffect, useRef, useState } from 'react';
import logoMark from '../../assets/brand/praxis-icon.webp';
import logoWordmark from '../../assets/brand/praxis-wordmark.webp';
import { useAuth } from '../../lib/auth';
import { ApiError } from '../../lib/api';

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
 */
interface AuthScreenProps {
  /**
   * Fired once authentication succeeds. Optional: the gate is driven by the session itself, so
   * `App` swaps this screen for the console as soon as `useAuth()` reports a signed-in user.
   */
  onSignIn?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const submitTimer = useRef<number | null>(null);
  const { login } = useAuth();

  useEffect(() => {
    return () => {
      if (submitTimer.current !== null) {
        window.clearTimeout(submitTimer.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await login(email, password, rememberMe);
      onSignIn?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body.error ?? 'Invalid credentials');
      } else if (err instanceof TypeError) {
        // A rejected fetch (server down, DNS, CORS preflight refused) surfaces as a TypeError — the
        // common case while the API is not running yet, so say so rather than "unexpected".
        setError('Cannot reach the Praxis server. Check that the backend is running.');
      } else {
        setError('An unexpected error occurred');
      }
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
        <div className="m-auto w-full max-w-[420px] bg-[#FFFFFF] rounded-[14px] border border-[#E7E5E4] shadow-warm-card p-8">
          <div className="mb-7">
            <h2 className="font-headline text-[20px] font-bold text-[#1C1917] tracking-tight">
              Welcome back
            </h2>
            <p className="text-[13px] text-[#57534E] mt-1">
              Sign in to your Destiny Sanctuary Int'L console.
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

            {/* Remember me. Nothing sits opposite it: there is no password-reset flow to link to,
                and a link that promises one would be the dead "Forgot Password?" button again. What
                to do about a forgotten password is in the office guide, not on the gate. */}
            <div className="flex items-center pt-0.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#57534E] select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D6D3D1] accent-[#C2410C] cursor-pointer"
                />
                Remember Me
              </label>
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
          {error && (
            <div
              className="mt-4 p-3 rounded-[7px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
