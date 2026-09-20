import React, { useRef, useState } from 'react';
import { ParishNavTab, MembersSubTab } from '../../types';
import { initialsOf } from '../../data/churchDomain';
import { useAuth } from '../../lib/auth';
import logoMark from '../../assets/brand/praxis-icon.webp';
import logoWordmark from '../../assets/brand/praxis-wordmark.webp';
import { AccountSecurityDialog } from './AccountSecurityDialog';
import { ProfileDialog } from './ProfileDialog';
import { AccountMenuBody, useDismissableMenu } from './AccountMenu';

interface ChurchSidebarProps {
  activeTab: ParishNavTab;
  activeSubTab: MembersSubTab;
  onSelectTab: (tab: ParishNavTab) => void;
  onSelectSubTab: (subTab: MembersSubTab) => void;
  collapsed?: boolean;
}

export const ChurchSidebar: React.FC<ChurchSidebarProps> = ({
  activeTab,
  onSelectTab,
  onSelectSubTab,
  collapsed = false,
}) => {
  // The church the session is acting for, and the account signed in to it, so the chrome names the
  // parish whose records are on screen and the person reading them. Nothing is invented: before a
  // session resolves there is no name to show, and the control is not rendered until there is one.
  const { user, organization } = useAuth();
  const signedInName = user?.name ?? '';

  /**
   * The bottom-left account control.
   *
   * It sits inside `justify-between` so the navigation scrolls and this never does — the control a
   * person needs to hand the machine over is anchored at the bottom of the sidebar on every screen.
   * The menu it opens is the same body the header's avatar opens: one menu, two doors, so identity,
   * church switching and sign-out cannot drift apart between the two surfaces.
   */
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showingProfile, setShowingProfile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismissableMenu(menuOpen, () => setMenuOpen(false), menuRef);
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
        <div className="h-20 px-4 flex items-center gap-2.5 border-b border-[#E7E5E4]">
          <img src={logoMark} alt="" aria-hidden="true" className="h-9 w-auto shrink-0" />
          {!collapsed && (
            <div className="flex flex-col gap-0.5 min-w-0">
              {/* The wordmark carries the name in the brand's own letterforms; the alt text keeps
                  the full product name available to a screen reader. */}
              <img src={logoWordmark} alt="Praxis Church OS" className="h-5 w-auto self-start" />
              <span className="font-headline text-[11px] font-semibold text-[#57534E] truncate">
                {organization?.name ?? ''}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          <div>
            {!collapsed && (
              <div className="px-3 mb-2 font-headline text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">
                Church Management
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
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">cottage</span>
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
                title="Members & Believers"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">diversity_1</span>
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
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">menu_book</span>
                {!collapsed && <span>Services & Worship</span>}
              </button>

              <button
                onClick={() => onSelectTab('governance')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'governance'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Church Council"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">account_balance</span>
                {!collapsed && <span>Church Council</span>}
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
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">volunteer_activism</span>
                {!collapsed && <span>Giving & Stewardship</span>}
              </button>

              <button
                onClick={() => onSelectTab('inventory-assets')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'inventory-assets'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Inventory & Assets"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">inventory_2</span>
                {!collapsed && <span>Inventory & Assets</span>}
              </button>

              <button
                onClick={() => onSelectTab('ministries-groups')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] font-headline text-[13px] transition-all cursor-pointer w-full text-left ${
                  activeTab === 'ministries-groups'
                    ? 'bg-[#C2410C]/15 text-[#C2410C] font-bold shadow-[0_0_15px_rgba(194,65,12,0.25)] ring-1 ring-[#C2410C]/40'
                    : 'text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917]'
                }`}
                title="Groups & Fellowships"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">groups_2</span>
                {!collapsed && <span>Groups & Fellowships</span>}
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
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">verified</span>
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
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">outgoing_mail</span>
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
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">tune</span>
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
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">shield_person</span>
                {!collapsed && <span>Admin</span>}
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom User Profile */}
      <div className="p-3 border-t border-[#E7E5E4] bg-[#F8F1E9] relative" ref={menuRef}>
        {/* The menu opens upward (bottom-full), so it clears the sidebar's footer and survives a
            collapsed rail — where the control is the initials alone, and is the only account
            surface visible. */}
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 z-40">
            <AccountMenuBody
              onDismiss={() => setMenuOpen(false)}
              onOpenSecurity={() => setChangingPassword(true)}
              onOpenProfile={() => setShowingProfile(true)}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Account menu for ${signedInName}`}
          title={`Account menu — ${signedInName}`}
          className="w-full flex items-center gap-3 p-2.5 rounded-[14px] bg-[#FFFFFF] shadow-[0_2px_8px_rgba(87,83,78,0.06)] border border-[#E7E5E4] hover:bg-[#FDF8F3] transition-colors text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C]/60"
        >
          {/* The avatar is the user's initials, and the name beside it is read from the same
              record, so the two cannot drift apart. */}
          <span
            aria-hidden="true"
            className="w-9 h-9 rounded-full bg-[#C2410C] flex items-center justify-center shrink-0 text-white shadow-sm font-headline text-[12px] font-bold tracking-tight"
          >
            {initialsOf(signedInName)}
          </span>
          {!collapsed && (
            <>
              <span className="flex flex-col min-w-0 flex-1">
                <span className="font-headline text-[13px] text-[#1C1917] font-bold truncate">
                  {signedInName}
                </span>
                <span className="font-headline text-[11px] text-[#57534E] truncate">
                  {user?.roleName ?? 'Church member'}
                </span>
              </span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#57534E] shrink-0">
                {menuOpen ? 'expand_more' : 'unfold_more'}
              </span>
            </>
          )}
        </button>
      </div>

      {changingPassword && <AccountSecurityDialog onClose={() => setChangingPassword(false)} />}
      {showingProfile && <ProfileDialog onClose={() => setShowingProfile(false)} />}
    </aside>
  );
};
