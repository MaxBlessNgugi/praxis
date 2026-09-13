import React from 'react';

interface ChurchHeaderProps {
  onQuickAction?: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  activeTabTitle?: string;
}

export const ChurchHeader: React.FC<ChurchHeaderProps> = ({
  onQuickAction,
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
          <span>Sunday, Feb 09, 2025</span>
        </div>

        <button
          type="button"
          className="relative p-2 rounded-[9px] text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917] transition-colors cursor-pointer"
          title="Notifications"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C2410C]"></span>
        </button>

        <button
          onClick={onQuickAction}
          type="button"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] bg-[#D97706] hover:bg-[#F59E0B] text-white font-headline text-xs font-bold transition-all shadow-[0_2px_8px_rgba(217,119,6,0.25)] cursor-pointer active:scale-98"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
          <span>Quick Action</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-[#C2410C] text-white flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(194,65,12,0.25)] font-semibold text-xs">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">person</span>
        </div>
      </div>
    </header>
  );
};
