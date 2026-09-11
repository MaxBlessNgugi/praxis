import React from 'react';
import { ParishNavTab, MembersSubTab } from '../../types';

interface ChurchSidebarProps {
  activeTab: ParishNavTab;
  activeSubTab: MembersSubTab;
  onSelectTab: (tab: ParishNavTab) => void;
  onSelectSubTab: (subTab: MembersSubTab) => void;
  collapsed?: boolean;
}

export const ChurchSidebar: React.FC<ChurchSidebarProps> = ({
  activeTab,
  activeSubTab,
  onSelectTab,
  onSelectSubTab,
  collapsed = false,
}) => {
  const isMembersActive = 
    activeTab === 'find-christian' || 
    activeTab === 'add-new-christian' || 
    activeTab === 'delete-christian' || 
    activeTab === 'family-unit';

  return (
    <aside className={`h-full bg-[#F8F1E9] border-r border-[#E7E5E4] flex flex-col justify-between select-none transition-all duration-200 ${
      collapsed ? 'w-18' : 'w-72'
    }`}>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand / Church Mark */}
        <div className="h-20 px-4 flex items-center gap-3 border-b border-[#E7E5E4]">
          <div className="w-9 h-9 rounded-[9px] bg-[#C2410C] flex items-center justify-center text-white shrink-0 shadow-[0_2px_8px_rgba(194,65,12,0.25)]">
            <span className="material-symbols-outlined text-[22px]">church</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-[15px] font-bold text-[#1C1917] tracking-tight truncate">
                Praxis Church OS
              </span>
              <span className="font-headline text-[11px] font-semibold text-[#57534E] truncate">
                Grace Valley Fellowship
              </span>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          <div>
            {!collapsed && (
              <div className="px-3 mb-2 font-headline text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">
                Parish Management
              </div>
            )}
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => onSelectTab('home')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'home'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Home"
              >
                <span className="material-symbols-outlined text-[20px]">cottage</span>
                {!collapsed && <span>Home</span>}
              </button>

              <button
                onClick={() => {
                  onSelectTab('find-christian');
                  onSelectSubTab('find-christian');
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  isMembersActive
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Members & Pastoral Care"
              >
                <span className="material-symbols-outlined text-[20px]">diversity_1</span>
                {!collapsed && <span>Members</span>}
              </button>

              <button
                onClick={() => onSelectTab('services-worship')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'services-worship'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Services & Worship"
              >
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
                {!collapsed && <span>Services & Worship</span>}
              </button>

              <button
                onClick={() => onSelectTab('governance')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'governance'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Governance"
              >
                <span className="material-symbols-outlined text-[20px]">account_balance</span>
                {!collapsed && <span>Governance</span>}
              </button>

              <button
                onClick={() => onSelectTab('giving-stewardship')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'giving-stewardship'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Giving & Stewardship"
              >
                <span className="material-symbols-outlined text-[20px]">volunteer_activism</span>
                {!collapsed && <span>Giving & Stewardship</span>}
              </button>

              <button
                onClick={() => onSelectTab('ministries-groups')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'ministries-groups'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Ministries & Groups"
              >
                <span className="material-symbols-outlined text-[20px]">groups_2</span>
                {!collapsed && <span>Ministries & Groups</span>}
              </button>

              <button
                onClick={() => onSelectTab('reports-certs')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'reports-certs'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Reports & Certs"
              >
                <span className="material-symbols-outlined text-[20px]">verified</span>
                {!collapsed && <span>Reports & Certs</span>}
              </button>

              <button
                onClick={() => onSelectTab('communications')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'communications'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Communications"
              >
                <span className="material-symbols-outlined text-[20px]">outgoing_mail</span>
                {!collapsed && <span>Communications</span>}
              </button>
            </nav>
          </div>

          <div>
            {!collapsed && (
              <div className="px-3 mb-2 font-headline text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">
                Configuration
              </div>
            )}
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => onSelectTab('settings-profile')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'settings-profile'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Settings & Profile"
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
                {!collapsed && <span>Settings & Profile</span>}
              </button>

              <button
                onClick={() => onSelectTab('admin-portal')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'admin-portal'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Admin Portal"
              >
                <span className="material-symbols-outlined text-[20px]">shield_person</span>
                {!collapsed && <span>Admin</span>}
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom User Profile */}
      <div className="p-3 border-t border-[#E7E5E4] bg-[#F8F1E9]">
        <div className="flex items-center gap-3 p-2.5 rounded-[14px] bg-[#FFFFFF] shadow-[0_2px_8px_rgba(87,83,78,0.06)] border border-[#E7E5E4]">
          <div className="w-9 h-9 rounded-full bg-[#C2410C] flex items-center justify-center shrink-0 text-white shadow-sm">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
          {!collapsed && (
            <>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-headline text-[13px] text-[#1C1917] font-bold truncate">
                  Pastor David
                </span>
                <span className="font-headline text-[11px] text-[#57534E] truncate">
                  Senior Pastor & Moderator
                </span>
              </div>
              <button 
                type="button" 
                className="text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4] p-1 rounded-[9px] transition-colors"
                title="User Menu"
              >
                <span className="material-symbols-outlined text-[18px]">unfold_more</span>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
