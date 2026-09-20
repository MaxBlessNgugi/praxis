import React from 'react';

/**
 * The screen for an address the console does not have.
 *
 * The router parses every URL against the sections the sidebar actually carries; anything else
 * lands here rather than silently opening the dashboard under a wrong address — a dashboard that
 * disagrees with its own URL reads as the app being broken, not the link being old. The way out is
 * the way in for everything: the sidebar, plus a home link for a keyboard-only user who has just
 * followed a dead bookmark.
 */
export const NotFoundScreen: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center p-6 overflow-y-auto">
    <div className="max-w-md w-full rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card text-center">
      <span aria-hidden="true" className="material-symbols-outlined text-[36px] text-[#C2410C]">
        wrong_location
      </span>
      <h1 className="mt-2 font-headline text-lg font-bold text-[#1C1917]">That page does not exist</h1>
      <p className="mt-1 text-xs text-[#57534E]">
        The address does not name a section of this console. It may be an old link, or a typo — use
        the navigation on the left, or go home.
      </p>
      <a
        href="/"
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">cottage</span>
        Go home
      </a>
    </div>
  </div>
);
