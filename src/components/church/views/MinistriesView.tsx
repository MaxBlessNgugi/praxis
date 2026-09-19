import React, { useState } from 'react';
import { MinistriesSubTab } from '../../../types';
import { MinistriesDepartmentalPanel } from './MinistriesDepartmentalPanel';
import { MinistriesLeadershipPanel } from './MinistriesLeadershipPanel';
import { MinistriesVolunteerPanel } from './MinistriesVolunteerPanel';
import { GroupsFellowshipPanel } from './GroupsFellowshipPanel';

interface MinistriesViewProps {
  initialSubTab?: MinistriesSubTab;
  onSubTabChange?: (tab: MinistriesSubTab) => void;
}

export const MinistriesView: React.FC<MinistriesViewProps> = ({
  initialSubTab = 'ministries-departmental',
  onSubTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<MinistriesSubTab>(initialSubTab);

  const handleTabChange = (tab: MinistriesSubTab) => {
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
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">groups_2</span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C]">
              Church Body & Roster
            </span>
          </div>
          <h1 className="font-headline text-2xl font-extrabold text-[#1C1917] tracking-tight">
            Ministries & Departments
          </h1>
          <p className="text-xs text-[#57534E] mt-0.5">
            Active charter councils, ordained clergy & elder rolls, and weekly service volunteer matrix.
          </p>
        </div>

        {/* Subtab Segmented Pill */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#F8F1E9] rounded-[14px] border border-[#E7E5E4] self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => handleTabChange('ministries-departmental')}
            className={`px-4 py-2 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'ministries-departmental'
                ? 'bg-[#C2410C] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">domain</span>
            <span>Departmental</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'ministries-departmental' ? 'bg-white/20 text-white' : 'bg-[#E7E5E4] text-[#57534E]'
            }`}>
              Departments
            </span>
          </button>

          <button
            onClick={() => handleTabChange('ministries-leadership')}
            className={`px-4 py-2 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'ministries-leadership'
                ? 'bg-[#C2410C] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">military_tech</span>
            <span>Leadership Roles</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'ministries-leadership' ? 'bg-white/20 text-white' : 'bg-[#E7E5E4] text-[#57534E]'
            }`}>
              Roles
            </span>
          </button>

          <button
            onClick={() => handleTabChange('ministries-volunteers')}
            className={`px-4 py-2 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'ministries-volunteers'
                ? 'bg-[#C2410C] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">event_seat</span>
            <span>Volunteer Roles</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'ministries-volunteers' ? 'bg-white/20 text-white' : 'bg-[#DC2626] text-white'
            }`}>
              3 Gaps
            </span>
          </button>

          <button
            onClick={() => handleTabChange('ministries-groups')}
            className={`px-4 py-2 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'ministries-groups'
                ? 'bg-[#C2410C] text-white shadow-sm'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">groups_2</span>
            <span>Groups & Fellowships</span>
          </button>
        </div>
      </div>

      {/* Render selected panel */}
      {activeTab === 'ministries-departmental' && <MinistriesDepartmentalPanel />}
      {activeTab === 'ministries-leadership' && <MinistriesLeadershipPanel />}
      {activeTab === 'ministries-volunteers' && <MinistriesVolunteerPanel />}
      {activeTab === 'ministries-groups' && <GroupsFellowshipPanel />}
    </div>
  );
};
