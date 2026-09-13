import React, { useEffect, useRef, useState } from 'react';

/**
 * Praxis sign-in screen — the app's entry gate (`App.tsx` renders it until it
 * reports success). Rendered outside the church navigation shell: no sidebar,
 * no top header.
 *
 * Both fields are pre-filled and the submit is a demo-only transition — there is
 * no backend to authenticate against.
 */
interface AuthScreenProps {
  /** Fired once the demo sign-in transition finishes, so the app can show the console. */
  onSignIn: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn }) => {
  const [email, setEmail] = useState<string>('bishop@destinysanctuary.co.ke');
  const [password, setPassword] = useState<string>('praxis-demo-2024');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const submitTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimer.current !== null) {
        window.clearTimeout(submitTimer.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    // Demo-only: hold the button's loading treatment briefly, then hand off to the console.
    submitTimer.current = window.setTimeout(() => {
      submitTimer.current = null;
      setIsSubmitting(false);
      onSignIn();
    }, 1400);
  };

  return (
    <div className="w-full h-full flex bg-[#FDF8F3] text-[#1C1917] font-['Inter',sans-serif] overflow-hidden">
      {/* LEFT PANEL — Brand & Composition (42%) */}
      <aside className="relative w-[42%] h-full bg-[#F8F1E9] flex flex-col items-center justify-center overflow-hidden px-12">
        {/* Soft warm depth: gentle light gradient with abstract shapes */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#FFF8F5] via-[#F8F1E9] to-[#F5EDE4]" />
        <div className="pointer-events-none absolute -top-24 -left-24 w-[440px] h-[440px] rounded-full bg-[#C2410C]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 w-[480px] h-[480px] rounded-full bg-[#FE932C]/15 blur-3xl" />
        <div className="pointer-events-none absolute top-[26%] right-12 w-64 h-64 rounded-full border border-[#C2410C]/15" />
        <div className="pointer-events-none absolute bottom-24 left-6 w-40 h-40 rounded-full border border-[#904D00]/15" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-[16px] bg-[#C2410C] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(194,65,12,0.35)] mb-6">
            <span className="material-symbols-outlined text-[32px]">church</span>
          </div>

          <h1 className="font-headline text-[52px] leading-[58px] font-black tracking-tight text-[#C2410C]">
            Praxis
          </h1>

          <p className="font-headline text-[14px] font-semibold tracking-[0.18em] uppercase text-[#57534E] mt-3">
            Church Operations Platform
          </p>
        </div>

        <div className="absolute bottom-10 inset-x-12 z-10 flex items-center justify-center gap-2 text-[11px] font-medium text-[#57534E]">
          <span className="material-symbols-outlined text-[16px] text-[#C2410C]">encrypted</span>
          Church records secured under church confidentiality
        </div>
      </aside>

      {/* RIGHT PANEL — Authentication Card (58%) */}
      <main className="relative w-[58%] h-full bg-[#FDF8F3] flex items-center justify-center px-12">
        <div className="w-full max-w-[420px] bg-[#FFFFFF] rounded-[14px] border border-[#E7E5E4] shadow-warm-card p-8">
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
                placeholder="bishop@destinysanctuary.co.ke"
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

            {/* Remember me + forgot password */}
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
                className="text-xs font-bold text-[#C2410C] hover:text-[#EA580C] hover:underline transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-5 py-3 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-85 disabled:cursor-wait text-white text-sm font-bold shadow-[0_2px_8px_rgba(194,65,12,0.25)] hover:shadow-[0_4px_14px_rgba(194,65,12,0.32)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[19px] ${isSubmitting ? 'animate-spin' : ''}`}>
                {isSubmitting ? 'progress_activity' : 'login'}
              </span>
              {isSubmitting ? 'Signing in…' : 'Sign In to Praxis'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
