import React, { useState } from 'react';
import { FinancesSubTab } from '../../../types';
import { CHURCH, formatKes } from '../../../data/churchDomain';
import { useFinanceSummary } from '../../../hooks/useApi';
import { day, describeWindow, PERIOD_LABELS, rangeFor, type DateWindow, type RangePreset } from '../../../lib/period';
import { FinancesTithesPanel } from './FinancesTithesPanel';
import { FinancesOfferingsPanel } from './FinancesOfferingsPanel';
import { FinancesProjectFundingPanel } from './FinancesProjectFundingPanel';
import { FinancesWelfarePanel } from './FinancesWelfarePanel';
import { FinancesCharityPanel } from './FinancesCharityPanel';

interface StewardshipFinancesViewProps {
  initialSubTab?: FinancesSubTab;
  onSubTabChange?: (tab: FinancesSubTab) => void;
}

const CUSTOM: RangePreset = 'custom';

/**
 * Giving & Stewardship, and the one owner of the date window.
 *
 * The window lives here rather than in each panel because three separate things read it: the tithe
 * ledger, the offering ledger and the badges on the tabs. A treasurer who sets the screen to
 * "This month" means all of it, and three copies of the same state is how a ledger and its own badge
 * come to disagree. The totals are read once, from `/api/finance/summary`, and handed down.
 *
 * The window governs the giving screens. Welfare and Charity answer to their own filters — a relief
 * case is not "this month's" — so the picker is labelled for giving.
 */
export const StewardshipFinancesView: React.FC<StewardshipFinancesViewProps> = ({
  initialSubTab = 'tithes',
  onSubTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<FinancesSubTab>(initialSubTab);
  // Opens on the whole ledger rather than on the current month. A giving ledger is a history first —
  // "what have we received?" is the question it is opened to answer — and a first paint that shows an
  // empty month because the month is young reads as a screen with nothing behind it. The window is
  // one click away and every figure is re-read for whichever window is chosen.
  const [preset, setPreset] = useState<RangePreset>('all');
  const [custom, setCustom] = useState<DateWindow>(() => rangeFor('month'));

  const window: DateWindow = preset === CUSTOM ? custom : rangeFor(preset);
  const summary = useFinanceSummary(window);

  const handleTabChange = (tab: FinancesSubTab) => {
    setActiveTab(tab);
    onSubTabChange?.(tab);
  };

  const tabClass = (tab: FinancesSubTab) =>
    `px-3.5 py-2 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
      activeTab === tab ? 'bg-[#C2410C] text-white shadow-sm' : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
    }`;

  const badgeClass = (tab: FinancesSubTab) =>
    `px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-[#E7E5E4] text-[#57534E]'}`;

  return (
    <div className="flex flex-col w-full space-y-6">
      <div className="bg-[#FFFFFF] rounded-[14px] p-6 shadow-warm-card border border-[#E7E5E4] flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-[9px] bg-[#F8F1E9] text-[#C2410C] flex items-center justify-center">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">volunteer_activism</span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C]">
                Stewardship &amp; Treasury Ledger
              </span>
            </div>
            <h1 className="font-headline text-2xl font-extrabold text-[#1C1917] tracking-tight">Giving &amp; Stewardship</h1>
            <p className="text-xs text-[#57534E] mt-0.5">
              Member tithes, counted plate collections, capital campaigns, and confidential deacon welfare.
            </p>
            <a
              href={CHURCH.givingUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">volunteer_activism</span>
              Give Online
            </a>
          </div>

          <div className="flex items-center gap-1.5 p-1.5 bg-[#F8F1E9] rounded-[14px] border border-[#E7E5E4] self-start md:self-auto overflow-x-auto max-w-full">
            <button type="button" onClick={() => handleTabChange('tithes')} className={tabClass('tithes')}>
              <span aria-hidden="true" className="material-symbols-outlined text-[17px]">credit_card</span>
              <span>Tithes</span>
              <span className={badgeClass('tithes')}>{formatKes(summary.summary?.giving.tithes.total ?? 0)}</span>
            </button>

            <button type="button" onClick={() => handleTabChange('offerings')} className={tabClass('offerings')}>
              <span aria-hidden="true" className="material-symbols-outlined text-[17px]">shopping_basket</span>
              <span>Offerings</span>
              <span className={badgeClass('offerings')}>{formatKes(summary.summary?.giving.offerings.total ?? 0)}</span>
            </button>

            <button type="button" onClick={() => handleTabChange('project-funding')} className={tabClass('project-funding')}>
              <span aria-hidden="true" className="material-symbols-outlined text-[17px]">foundation</span>
              <span>Project Funding</span>
            </button>

            <button type="button" onClick={() => handleTabChange('welfare')} className={tabClass('welfare')}>
              <span aria-hidden="true" className="material-symbols-outlined text-[17px]">shield_with_heart</span>
              <span>Welfare</span>
            </button>

            <button type="button" onClick={() => handleTabChange('charity')} className={tabClass('charity')}>
              <span aria-hidden="true" className="material-symbols-outlined text-[17px]">diversity_1</span>
              <span>Charity Activities</span>
            </button>
          </div>
        </div>

        {/* The window the giving screens and their badges are read over. */}
        <div className="flex flex-wrap items-end gap-3 border-t border-[#E7E5E4] pt-4">
          <div>
            <label htmlFor="giving-window" className="block text-[10px] font-bold uppercase tracking-wide text-[#57534E] mb-1">
              Giving window
            </label>
            <select
              id="giving-window"
              value={preset}
              onChange={(event) => setPreset(event.target.value as RangePreset)}
              className="h-9 px-3 rounded-[9px] bg-[#FDF8F3] border border-[#D6D3D1] text-xs font-semibold text-[#1C1917] cursor-pointer"
            >
              {(Object.keys(PERIOD_LABELS) as Array<keyof typeof PERIOD_LABELS>).map((key) => (
                <option key={key} value={key}>{PERIOD_LABELS[key]}</option>
              ))}
              <option value={CUSTOM}>Custom dates</option>
            </select>
          </div>

          {preset === CUSTOM && (
            <>
              <div>
                <label htmlFor="giving-from" className="block text-[10px] font-bold uppercase tracking-wide text-[#57534E] mb-1">From</label>
                <input
                  id="giving-from"
                  type="date"
                  value={custom.from ?? ''}
                  onChange={(event) => setCustom((prev) => ({ ...prev, from: event.target.value || undefined }))}
                  className="h-9 px-3 rounded-[9px] bg-[#FDF8F3] border border-[#D6D3D1] text-xs text-[#1C1917]"
                />
              </div>
              <div>
                <label htmlFor="giving-to" className="block text-[10px] font-bold uppercase tracking-wide text-[#57534E] mb-1">To</label>
                <input
                  id="giving-to"
                  type="date"
                  value={custom.to ?? ''}
                  onChange={(event) => setCustom((prev) => ({ ...prev, to: event.target.value || undefined }))}
                  className="h-9 px-3 rounded-[9px] bg-[#FDF8F3] border border-[#D6D3D1] text-xs text-[#1C1917]"
                />
              </div>
            </>
          )}

          <p className="text-[11px] text-[#57534E] flex-1 min-w-[16rem]">
            {describeWindow(window, preset)} — the ledgers and the badges both read this window
            {window.to ? `, up to ${day(new Date(window.to))}` : ''}. Totals come from the API for the whole window, not
            from the rows on the page.
          </p>
        </div>
      </div>

      {activeTab === 'tithes' && (
        <FinancesTithesPanel
          window={window}
          periodLabel={describeWindow(window, preset)}
          summary={summary.summary}
          onChanged={() => void summary.refetch()}
        />
      )}
      {activeTab === 'offerings' && (
        <FinancesOfferingsPanel
          window={window}
          periodLabel={describeWindow(window, preset)}
          summary={summary.summary}
          onChanged={() => void summary.refetch()}
        />
      )}
      {activeTab === 'project-funding' && <FinancesProjectFundingPanel />}
      {activeTab === 'welfare' && <FinancesWelfarePanel />}
      {activeTab === 'charity' && <FinancesCharityPanel />}
    </div>
  );
};
