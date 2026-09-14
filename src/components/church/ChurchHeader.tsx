import React, { useState, useRef, useEffect } from 'react';
import { CHURCH, DEMO_TODAY, initialsOf } from '../../data/churchDomain';
import { useDemoData } from '../../data/demoStore';
import { ROLES, type DemoRole } from '../../lib/permissions';
import { useDialog } from './dialog';

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
  // The console is editable now, so the header — the one strip every screen shares —
  // carries the way back to the original mock data, and the role it is being viewed as.
  const { resetDemo, role, setRole } = useDemoData();
  const [isResetOpen, setIsResetOpen] = useState(false);
  const resetDialog = useDialog(() => setIsResetOpen(false), 'Reset the demo data');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const handleReset = () => {
    resetDemo();
    setIsResetOpen(false);
    setToast('Demo data restored to the original register, trash and tithe ledger.');
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  };

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
          <span>{DEMO_TODAY.label}</span>
        </div>

        {/* ECCLESIA resolves rights per panel and action; switching the role here is how the
            mockup shows what the same console looks like to a treasurer or a volunteer. */}
        <label className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[9px] bg-[#F8F1E9] border border-[#E7E5E4] font-headline text-xs text-[#57534E]">
          <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#C2410C]">
            badge
          </span>
          <span className="sr-only">View the console as</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as DemoRole)}
            title="View the console as this role"
            className="bg-transparent font-semibold text-[#1C1917] rounded-[6px] py-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C2410C]/40"
          >
            {ROLES.map((option) => (
              <option key={option} value={option}>
                {option.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setIsResetOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-[#F8F1E9] hover:bg-[#F5EDE4] text-[#57534E] hover:text-[#1C1917] font-headline text-xs font-semibold border border-[#E7E5E4] transition-colors cursor-pointer"
          title="Reset the demo data to the original mock data"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">restart_alt</span>
          <span className="hidden sm:inline">Reset demo data</span>
        </button>

        <button
          type="button"
          className="relative p-2 rounded-[9px] text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917] transition-colors cursor-pointer"
          title="Notifications"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C2410C]"></span>
        </button>

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

        {/* The signed-in user's initials, named for assistive tech since this strip carries no
            other user text — the sidebar footer is where the full name is printed. */}
        <div
          role="img"
          aria-label={`Signed in as ${CHURCH.visionaryLeader}`}
          title={`Signed in as ${CHURCH.visionaryLeader}`}
          className="w-8 h-8 rounded-full bg-[#C2410C] text-white flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(194,65,12,0.25)] font-headline font-bold text-[11px] tracking-tight"
        >
          {initialsOf(CHURCH.visionaryLeader)}
        </div>
      </div>

      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33302d]/50 backdrop-blur-xs" {...resetDialog}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#EAE1D7] animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#FDF8F3] text-[#C2410C] flex items-center justify-center shrink-0 border border-[#E7E5E4]">
                <span aria-hidden="true" className="material-symbols-outlined text-[26px]">restart_alt</span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-headline text-base font-bold text-[#1e1b19] leading-snug">Reset the demo data</h3>
                <span className="font-body text-xs text-[#59413a] mt-1">
                  Everything you have added or removed in this browser is discarded and the church's original
                  mock register, trash queue and tithe ledger come back.
                </span>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsResetOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] text-[#1e1b19] font-headline text-xs font-bold transition-colors cursor-pointer"
              >
                Keep my changes
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#C2410C] hover:bg-[#9b2f00] text-white font-headline text-xs font-bold transition-colors shadow-md cursor-pointer"
              >
                Reset demo data
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-[9px] bg-[#1C1917] text-white shadow-2xl border border-[#E7E5E4]"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[#059669] text-[20px]">verified</span>
          <span className="text-xs font-semibold">{toast}</span>
        </div>
      )}
    </header>
  );
};
