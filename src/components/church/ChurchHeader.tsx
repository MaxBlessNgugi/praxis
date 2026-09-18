import React, { useRef, useState } from 'react';
import { initialsOf } from '../../data/churchDomain';
import { useAuth } from '../../lib/auth';
import { useAnnouncements } from '../../hooks/useApi';
import { AccountMenuBody, useDismissableMenu } from './AccountMenu';
import { AccountSecurityDialog } from './AccountSecurityDialog';
import { ProfileDialog } from './ProfileDialog';

/**
 * The bell, backed by the notices that are actually on the board.
 *
 * It used to be a decorative button carrying a permanent unread dot — an indicator that lit up for
 * nobody and would have gone on lighting up whatever the church did. What it opens now is the church's
 * own live notices, read from the same endpoint the notice sheet uses; the dot appears only when an
 * urgent notice is in force.
 */
const NoticesBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { items } = useAnnouncements({ live: true, pageSize: 10 });
  const urgent = items.filter((notice) => notice.priority === 'urgent').length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-label={items.length === 0 ? 'Notices in force' : `${items.length} notices in force`}
        title="Notices in force"
        className="relative p-2 rounded-[9px] text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917] transition-colors cursor-pointer"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[20px]">notifications</span>
        {urgent > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C2410C]"></span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] rounded-[12px] border border-[#E7E5E4] shadow-warm-card p-3 z-30">
          <div className="flex items-center justify-between px-1 pb-2 border-b border-[#E7E5E4]">
            <span className="font-headline text-xs font-bold text-[#1C1917]">Notices in force</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notices"
              className="text-[#57534E] hover:text-[#1C1917] p-0.5 rounded cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto mt-2 space-y-2">
            {items.length === 0 ? (
              <p className="text-[11px] text-[#57534E] px-1 py-2">
                Nothing is on the board. The office posts notices under Communications.
              </p>
            ) : (
              items.map((notice) => (
                <div key={notice.id} className="px-2 py-1.5 rounded-[8px] hover:bg-[#FDF8F3]">
                  <div className="flex items-center gap-1.5">
                    {notice.priority === 'urgent' && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#DC2626]/10 text-[#DC2626] text-[9px] font-bold uppercase tracking-wider">
                        Urgent
                      </span>
                    )}
                    <span className="font-headline text-xs font-bold text-[#1C1917] truncate">{notice.title}</span>
                  </div>
                  <div className="text-[10px] text-[#A8A29E]">
                    {notice.audience} · {new Date(notice.publishedAt).toLocaleDateString('en-GB')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * The top-right account control: the avatar opens the shared account menu.
 *
 * The avatar was previously a static identity badge — it named the person and did nothing, while the
 * only way to sign out lived at the bottom of the sidebar. On a narrow screen that footer is the
 * first thing a long navigation pushes out of reach, so the one strip every screen shares now carries
 * the menu as well. It renders the same body the sidebar control opens, so identity, church
 * switching, profile, security and sign-out behave identically wherever they are reached from.
 */
const HeaderAccountMenu: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showingProfile, setShowingProfile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDismissableMenu(open, () => setOpen(false), containerRef);

  const signedInName = user?.name ?? '';
  if (!signedInName) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${signedInName}`}
        title={`Signed in as ${signedInName}`}
        className="flex items-center gap-1.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C]/60 cursor-pointer"
      >
        <span
          aria-hidden="true"
          className="w-8 h-8 rounded-full bg-[#C2410C] text-white flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(194,65,12,0.25)] font-headline font-bold text-[11px] tracking-tight"
        >
          {initialsOf(signedInName)}
        </span>
        <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#57534E]">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 z-40">
          <AccountMenuBody
            onDismiss={() => setOpen(false)}
            onOpenSecurity={() => setChangingPassword(true)}
            onOpenProfile={() => setShowingProfile(true)}
          />
        </div>
      )}

      {changingPassword && <AccountSecurityDialog onClose={() => setChangingPassword(false)} />}
      {showingProfile && <ProfileDialog onClose={() => setShowingProfile(false)} />}
    </div>
  );
};

interface ChurchHeaderProps {
  onQuickAction?: () => void;
  /** Opens the command palette; the same shortcut (Ctrl/Cmd + K) lives in the shell. */
  onOpenCommandPalette?: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  activeTabTitle?: string;
}

export const ChurchHeader: React.FC<ChurchHeaderProps> = ({
  onQuickAction,
  onOpenCommandPalette,
  searchTerm,
  onSearchChange,
  activeTabTitle = 'Home Cloud Dashboard',
}) => {
  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#E7E5E4] px-6 flex items-center justify-between shadow-[0_1px_4px_rgba(87,83,78,0.04)] shrink-0 z-20">
      {/* Left: Breadcrumbs & Global Search */}
      <div className="flex items-center gap-5 min-w-0">
        <div className="flex items-center gap-2 font-headline text-xs text-[#57534E] shrink-0">
          <span className="hover:text-[#1C1917] cursor-pointer font-medium">Main Church</span>
          <span className="text-[#A8A29E]">/</span>
          <span className="font-bold text-[#1C1917]">{activeTabTitle}</span>
        </div>

        <div className="relative hidden md:block w-72 lg:w-80">
          <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#A8A29E]">
            search
          </span>
          <input aria-label="Search registry, baptism, envelope"
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search registry, baptism, envelope..."
            className="w-full h-9 pl-9 pr-3 rounded-[9px] bg-[#FFFFFF] border border-[#E7E5E4] hover:border-[#D6D3D1] font-body text-xs text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 shadow-sm"
          />
        </div>
      </div>

      {/* Right: Date, Notifications, Quick Action, Profile */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-[#F8F1E9] text-[#57534E] font-headline text-xs border border-[#E7E5E4] font-medium">
          <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#C2410C]">calendar_today</span>
          <span aria-label="Today's date">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>

        <NoticesBell />

        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Command palette"
          title="Command palette (Ctrl+K)"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-[#FDF8F3] hover:bg-[#F5EDE4] text-[#57534E] hover:text-[#1C1917] border border-[#E7E5E4] font-headline text-xs font-bold transition-all cursor-pointer"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[17px]">keyboard_command_key</span>
          <span className="hidden xl:inline">Command palette</span>
        </button>

        <button
          onClick={onQuickAction}
          type="button"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] bg-[#D97706] hover:bg-[#F59E0B] text-white font-headline text-xs font-bold transition-all shadow-[0_2px_8px_rgba(217,119,6,0.25)] cursor-pointer active:scale-98"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
          <span>Quick Action</span>
        </button>

        <HeaderAccountMenu />
      </div>

    </header>
  );
};
