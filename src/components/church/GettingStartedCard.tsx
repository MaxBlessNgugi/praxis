import React from 'react';
import type { ParishNavTab } from '../../types';

/**
 * The first-run card a church sees while the roll is still empty.
 *
 * It exists because an empty console is indistinguishable from a broken one: every panel a new church
 * opens is empty for the best possible reason, and nothing on screen says so. Four steps, each
 * opening the panel that answers it, is the whole design.
 *
 * Shown when there is nobody on the roll and never again after that — a checklist that outlives the
 * work it lists becomes furniture. It is guidance and not a gate: nothing is hidden behind it, and a
 * church that would rather start in the Service Planner can.
 */

interface Step {
  tab: ParishNavTab;
  icon: string;
  title: string;
  hint: string;
}

const STEPS: Step[] = [
  {
    tab: 'find-christian',
    icon: 'person_add',
    title: 'Put your first names on the roll',
    hint: 'Add a member one at a time, or import the register you already keep in a spreadsheet.',
  },
  {
    tab: 'services-worship',
    icon: 'auto_stories',
    title: 'Plan this Sunday',
    hint: 'Build the order of service, then take attendance on the day.',
  },
  {
    tab: 'giving-stewardship',
    icon: 'volunteer_activism',
    title: 'Record the offering',
    hint: 'Tithes and offerings go into a ledger where nothing can be quietly altered afterwards.',
  },
  {
    tab: 'admin-portal',
    icon: 'group_add',
    title: 'Bring the office on board',
    hint: 'Give the secretary and the treasurer their own accounts, with only the rights they need.',
  },
];

export const GettingStartedCard: React.FC<{ onNavigate?: (tab: ParishNavTab) => void }> = ({ onNavigate }) => (
  <section
    aria-labelledby="getting-started-heading"
    className="rounded-[14px] bg-[#FFFFFF] border border-[#E7E5E4] shadow-warm-card p-5 sm:p-6"
  >
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="material-symbols-outlined text-[22px] text-[#C2410C]">
        rocket_launch
      </span>
      <div>
        <h2 id="getting-started-heading" className="text-sm font-bold text-[#1C1917]">
          Getting started
        </h2>
        <p className="mt-0.5 text-xs text-[#57534E]">
          Your console is ready and empty, which is exactly how it should be on the first day. These
          four are the ones worth doing first — everything else can wait until you need it.
        </p>
      </div>
    </div>

    <ol className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
      {STEPS.map((step, index) => (
        <li key={step.tab}>
          <button
            type="button"
            onClick={() => onNavigate?.(step.tab)}
            className="group flex w-full items-start gap-3 rounded-[14px] border border-[#E7E5E4] bg-[#FDF8F3] p-3.5 text-left transition-all hover:border-[#D6D3D1] hover:bg-[#F8F1E9] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/15 cursor-pointer"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C2410C]/10 text-[12px] font-bold text-[#C2410C]"
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917]">
                {step.title}
                <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#A8A29E] group-hover:text-[#C2410C]">
                  arrow_forward
                </span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-[#57534E]">{step.hint}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>

    <p className="mt-4 border-t border-[#E7E5E4] pt-3 text-[11px] text-[#57534E]">
      Don&apos;t worry about filling everything in. Your church&apos;s data belongs to your church —
      you can export all of it from{' '}
      <span className="font-semibold text-[#1C1917]">Settings &rarr; Data &amp; backup</span> whenever
      you like, and you can carry on entering this week&apos;s records with nothing set up beyond your
      name.
    </p>
  </section>
);
