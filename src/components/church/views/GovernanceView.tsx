import React from 'react';
import { SittingsPanel } from './council/SittingsPanel';
import { ResolutionsPanel } from './council/ResolutionsPanel';
import { DocumentLibraryPanel } from './council/DocumentLibraryPanel';

/**
 * Church Council: the sittings, the resolutions, and the papers they were decided under.
 *
 * The screen this replaced was a mock-up of a council — a fixed calendar, thirty-two invented
 * resolutions, a "100% Compliant" score nobody had measured. What is here instead is the register
 * itself, written by the clerk: a sitting is called, the roll decides whether it is quorate, the
 * minute is written and sealed, and a resolution moves from proposed to closed through the acts the
 * council actually takes.
 *
 * In the order of the work rather than of the interface: what was decided, what is being done about
 * it, and the rules it was decided under.
 */
export const GovernanceView: React.FC = () => (
  <div className="flex w-full flex-col gap-6 pb-16">
    <div className="flex flex-col gap-1.5 pt-1">
      <div className="flex items-center gap-2 font-headline text-xs font-bold uppercase tracking-wide text-[#C2410C]">
        <span aria-hidden="true" className="material-symbols-outlined text-[16px]">account_balance</span>
        <span>Church Council &amp; Council Records</span>
      </div>
      <h1 className="font-headline text-3xl font-black tracking-tight text-[#1C1917]">Church Council</h1>
      <p className="max-w-3xl text-sm text-[#57534E]">
        The sittings of the council with their minutes, the docket of resolutions moving from proposed to closed, and the
        constitution, by-laws and policies the council works from.
      </p>
    </div>

    <SittingsPanel />
    <ResolutionsPanel />
    <DocumentLibraryPanel />
  </div>
);
