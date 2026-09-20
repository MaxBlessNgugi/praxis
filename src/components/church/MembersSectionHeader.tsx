import React from 'react';
import { MembersSubTab } from '../../types';

/**
 * The members section's own header: the one section whose four tabs are four sidebar entries.
 *
 * Extracted from the shell (§2) because the header — title, description and the tab strip that
 * switches between the register's four faces — is one coherent responsibility the shell rendered
 * inline. The tabs now switch via `pushState` through the shell's own callback, so the strip and
 * the sidebar stay two doors to the same navigation.
 */
const MEMBER_TABS: Array<{ id: MembersSubTab; label: string }> = [
  { id: 'add-new-christian', label: 'Add New Christian' },
  { id: 'find-christian', label: 'Find Christian' },
  { id: 'delete-christian', label: 'Delete Christian' },
  { id: 'family-unit', label: 'Family Unit' },
];

export const MembersSectionHeader: React.FC<{
  active: MembersSubTab;
  onSelect: (tab: MembersSubTab) => void;
}> = ({ active, onSelect }) => (
  <div className="w-full px-6 sm:px-8 pt-6 pb-4 border-b border-[#E7E5E4] bg-[#FFFFFF] shadow-sm">
    <div className="flex flex-col gap-1">
      <h1 className="font-headline text-2xl font-bold text-[#1C1917] tracking-tight">
        Members &amp; Believers Registry
      </h1>
      <p className="font-body text-xs sm:text-sm text-[#57534E]">
        Comprehensive members register, baptism register, household mappings, and church records.
      </p>
    </div>

    <div className="mt-4">
      <nav className="flex items-center gap-6 border-b border-[#E7E5E4] text-xs font-headline font-bold">
        {MEMBER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-current={active === tab.id ? 'page' : undefined}
            className={`pb-3 px-1 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              active === tab.id
                ? 'border-[#C2410C] text-[#C2410C] font-bold'
                : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  </div>
);
