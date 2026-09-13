import React from 'react';
import { CommunicationsSubTab } from '../../../types';
import { AnnouncementsPanel } from './communications/AnnouncementsPanel';
import { BroadcastsPanel } from './communications/BroadcastsPanel';
import { EventsCalendarPanel } from './communications/EventsCalendarPanel';
import { PrayerRequestsPanel } from './communications/PrayerRequestsPanel';
import { BirthdaysAnniversariesPanel } from './communications/BirthdaysAnniversariesPanel';

interface CommunicationsViewProps {
  activeSubTab: CommunicationsSubTab;
  onSelectSubTab: (subTab: CommunicationsSubTab) => void;
}

export const CommunicationsView: React.FC<CommunicationsViewProps> = ({
  activeSubTab,
  onSelectSubTab,
}) => {
  const subTabs = [
    { id: 'announcements' as CommunicationsSubTab, label: 'Announcements', icon: 'campaign' },
    { id: 'broadcasts' as CommunicationsSubTab, label: 'Broadcasts (SMS/Email)', icon: 'send' },
    { id: 'events-calendar' as CommunicationsSubTab, label: 'Events & Calendar', icon: 'calendar_month' },
    { id: 'prayer-requests' as CommunicationsSubTab, label: 'Prayer Requests', icon: 'volunteer_activism' },
    { id: 'birthdays-anniversaries' as CommunicationsSubTab, label: 'Birthdays & Milestones', icon: 'cake' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Sub-tab navigation */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-[#C2410C]/10 text-[#C2410C] text-[11px] font-bold uppercase tracking-wider">
                Church Communications & Outreach
              </span>
              <span className="text-xs text-[#A8A29E] font-medium">· Multichannel Pastoral Hub</span>
            </div>
            <h1 className="font-headline text-2xl font-black text-[#1C1917]">
              Church Communications & Community
            </h1>
            <p className="text-xs text-[#57534E] mt-0.5">
              Publish bulletin news, dispatch targeted SMS/email blasts, organize church calendars, maintain prayer chains, and honor member milestones.
            </p>
          </div>

          {/* Horizontal Sub-tab Segmented Controls */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F8F1E9] rounded-[12px] border border-[#E7E5E4] self-start lg:self-auto">
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

      {/* Render Active Sub-panel */}
      {activeSubTab === 'announcements' && <AnnouncementsPanel />}
      {activeSubTab === 'broadcasts' && <BroadcastsPanel />}
      {activeSubTab === 'events-calendar' && <EventsCalendarPanel />}
      {activeSubTab === 'prayer-requests' && <PrayerRequestsPanel />}
      {activeSubTab === 'birthdays-anniversaries' && <BirthdaysAnniversariesPanel />}
    </div>
  );
};
