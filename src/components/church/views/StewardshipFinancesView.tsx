import React, { useState } from 'react';
import { FinancesSubTab } from '../../../types';
import { CHURCH } from '../../../data/churchDomain';
import { FinancesTithesPanel } from './FinancesTithesPanel';
import { FinancesOfferingsPanel } from './FinancesOfferingsPanel';
import { FinancesProjectFundingPanel } from './FinancesProjectFundingPanel';
import { FinancesWelfarePanel } from './FinancesWelfarePanel';
import { FinancesCharityPanel } from './FinancesCharityPanel';

interface StewardshipFinancesViewProps {
  initialSubTab?: FinancesSubTab;
  onSubTabChange?: (tab: FinancesSubTab) => void;
}

export const StewardshipFinancesView: React.FC<StewardshipFinancesViewProps> = ({
  initialSubTab = 'tithes',
  onSubTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<FinancesSubTab>(initialSubTab);

  const handleTabChange = (tab: FinancesSubTab) => {
    setActiveTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Banner & Subtab Navigation Header */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-6 shadow-warm-card border border-[#E7E5E4] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-[9px] bg-[#F8F1E9] text-[#C2410C] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">volunteer_activism</span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C]">
              Stewardship & Treasury Ledger
            </span>
          </div>
          <h1 className="font-headline text-2xl font-extrabold text-[#1C1917] tracking-tight">
            Giving & Stewardship
          </h1>
          <p className="text-xs text-[#57534E] mt-0.5">
            Member tithes, audited Sunday plate counts, capital building campaign, and confidential deacon welfare.
          </p>
          {/* Destiny Sanctuary's own giving page (give.html on their site). */}
          <a
            href={CHURCH.givingUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-sm"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">volunteer_activism</span>
            Give Online · Destiny Sanctuary
          </a>
        </div>

        {/* Subtab Segmented Pill */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#F8F1E9] rounded-[14px] border border-[#E7E5E4] self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => handleTabChange('tithes')}
            className={`px-3.5 py-2 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'tithes'
                ? 'bg-[#C2410C] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[17px]">credit_card</span>
            <span>Tithes</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'tithes' ? 'bg-white/20 text-white' : 'bg-[#E7E5E4] text-[#57534E]'
            }`}>
              KSh 142.8k
            </span>
          </button>

          <button
            onClick={() => handleTabChange('offerings')}
            className={`px-3.5 py-2 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'offerings'
                ? 'bg-[#C2410C] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[17px]">shopping_basket</span>
            <span>Offerings</span>
          </button>

          <button
            onClick={() => handleTabChange('project-funding')}
            className={`px-3.5 py-2 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'project-funding'
                ? 'bg-[#C2410C] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[17px]">foundation</span>
            <span>Project Funding</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'project-funding' ? 'bg-white/20 text-white' : 'bg-[#D97706]/15 text-[#D97706]'
            }`}>
              75%
            </span>
          </button>

          <button
            onClick={() => handleTabChange('welfare')}
            className={`px-3.5 py-2 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'welfare'
                ? 'bg-[#C2410C] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[17px]">shield_with_heart</span>
            <span>Welfare</span>
          </button>

          <button
            onClick={() => handleTabChange('charity')}
            className={`px-3.5 py-2 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'charity'
                ? 'bg-[#C2410C] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[17px]">diversity_1</span>
            <span>Charity Activities</span>
          </button>
        </div>
      </div>

      {/* Render selected panel */}
      {activeTab === 'tithes' && <FinancesTithesPanel />}
      {activeTab === 'offerings' && <FinancesOfferingsPanel />}
      {activeTab === 'project-funding' && <FinancesProjectFundingPanel />}
      {activeTab === 'welfare' && <FinancesWelfarePanel />}
      {activeTab === 'charity' && <FinancesCharityPanel />}
    </div>
  );
};
