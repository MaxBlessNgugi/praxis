import React from 'react';
import { SettingsSubTab } from '../../../types';
import { OrgProfileSettingsPanel } from './settings/OrgProfileSettingsPanel';
import { SubscriptionPanel } from './settings/SubscriptionPanel';
import { NotificationSettingsPanel } from './settings/NotificationSettingsPanel';
import { IntegrationsSettingsPanel } from './settings/IntegrationsSettingsPanel';
import { DataBackupSettingsPanel } from './settings/DataBackupSettingsPanel';
import { CustomizationSettingsPanel } from './settings/CustomizationSettingsPanel';

interface SettingsViewProps {
  activeSubTab: SettingsSubTab;
  onSelectSubTab: (subTab: SettingsSubTab) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeSubTab,
  onSelectSubTab,
}) => {
  const subTabs = [
    { id: 'org-profile' as SettingsSubTab, label: 'Organization Profile', icon: 'church' },
    { id: 'subscription' as SettingsSubTab, label: 'Subscription & Billing', icon: 'workspace_premium' },
    { id: 'notifications' as SettingsSubTab, label: 'Notifications & Alerts', icon: 'notifications_active' },
    { id: 'integrations' as SettingsSubTab, label: 'Integrations & APIs', icon: 'hub' },
    { id: 'data-backup' as SettingsSubTab, label: 'Data Sovereignty & Backup', icon: 'backup' },
    { id: 'customization' as SettingsSubTab, label: 'Customization & Lexicon', icon: 'palette' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Sub-tab navigation */}
      <div className="bg-[#FFFFFF] rounded-[14px] p-5 border border-[#E7E5E4] shadow-warm-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-[#C2410C]/10 text-[#C2410C] text-[11px] font-bold uppercase tracking-wider">
                System Configuration
              </span>
              <span className="text-xs text-[#A8A29E] font-medium">· Church Settings & Data Control</span>
            </div>
            <h1 className="font-headline text-2xl font-black text-[#1C1917]">
              Church System Settings & Configuration
            </h1>
            <p className="text-xs text-[#57534E] mt-0.5">
              Manage organization metadata, automated notifications, merchant giving integrations, database backups, and custom denominational terminology.
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
      {activeSubTab === 'org-profile' && <OrgProfileSettingsPanel />}
      {activeSubTab === 'subscription' && <SubscriptionPanel />}
      {activeSubTab === 'notifications' && <NotificationSettingsPanel />}
      {activeSubTab === 'integrations' && <IntegrationsSettingsPanel />}
      {activeSubTab === 'data-backup' && <DataBackupSettingsPanel />}
      {activeSubTab === 'customization' && <CustomizationSettingsPanel />}
    </div>
  );
};
