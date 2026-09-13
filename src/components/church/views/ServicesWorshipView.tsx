import React from 'react';
import { ServicesSubTab } from '../../../types';
import { ServicePlannerPanel } from './services/ServicePlannerPanel';
import { AttendancePanel } from './services/AttendancePanel';
import { VolunteerRosterPanel } from './services/VolunteerRosterPanel';
import { ServiceReportsPanel } from './services/ServiceReportsPanel';

interface ServicesWorshipViewProps {
  activeSubTab: ServicesSubTab;
  onSelectSubTab: (subTab: ServicesSubTab) => void;
}

export const ServicesWorshipView: React.FC<ServicesWorshipViewProps> = ({
  activeSubTab,
  onSelectSubTab,
}) => {
  const subTabs = [
    { id: 'service-planner' as ServicesSubTab, label: 'Service Planner', icon: 'auto_stories' },
    { id: 'attendance' as ServicesSubTab, label: 'Attendance & Census', icon: 'how_to_reg' },
    { id: 'volunteer-roster' as ServicesSubTab, label: 'Volunteer Roster', icon: 'badge' },
    { id: 'service-reports' as ServicesSubTab, label: 'Service Reports', icon: 'summarize' },
  ];

  return (
    <div className="space-y-6">
      {/* Panel Intro & Sub-tab navigation bar */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-[#C2410C]/10 text-[#C2410C] text-[11px] font-bold uppercase tracking-wider">
                Church Service & Census OS
              </span>
              <span className="text-xs text-[#A8A29E] font-medium">· Lord’s Day & Midweek Worship</span>
            </div>
            <h1 className="font-headline text-2xl font-black text-[#1C1917]">
              Services & Worship Administration
            </h1>
            <p className="text-xs text-[#57534E] mt-0.5">
              Plan service orders, coordinate duty rosters, monitor attendance trends, and seal post-service council reports.
            </p>
          </div>

          {/* Horizontal Sub-tab Segmented Controls */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F8F1E9] rounded-[12px] border border-[#E7E5E4] self-start md:self-auto">
            {subTabs.map((tab) => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectSubTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#C2410C] text-white shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4]/70'
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Render Active Sub-Panel */}
      {activeSubTab === 'service-planner' && <ServicePlannerPanel />}
      {activeSubTab === 'attendance' && <AttendancePanel />}
      {activeSubTab === 'volunteer-roster' && <VolunteerRosterPanel />}
      {activeSubTab === 'service-reports' && <ServiceReportsPanel />}
    </div>
  );
};
