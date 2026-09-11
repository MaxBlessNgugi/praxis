import React, { useState } from 'react';

export const MinistriesVolunteerPanel: React.FC = () => {
  const [selectedServiceTime, setSelectedServiceTime] = useState<'9:00' | '11:00' | '6:00'>('9:00');
  const [teamFilter, setTeamFilter] = useState('All Volunteer Teams (5 Teams)');
  const [searchFilter, setSearchFilter] = useState('');
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

  // Swaps state
  const [swaps, setSwaps] = useState([
    {
      id: 'swap-1',
      name: 'Sarah Jenkins',
      role: 'Welcome Desk • 11:00 AM',
      reason: 'Family Travel',
      note: '"Requested swap with Jeremy Adams (Qualified Greeter)."',
      approved: false,
    },
    {
      id: 'swap-2',
      name: 'Rachel Adams',
      role: 'Pre-K Lead • 11:00 AM',
      reason: 'Sick Leave',
      note: '"Sudden fever, need experienced backup for Preschool room."',
      approved: false,
    },
    {
      id: 'swap-3',
      name: 'Eric Stone',
      role: 'Sound Op • 11:00 AM',
      reason: 'Unconfirmed',
      note: 'Invite sent 48h ago',
      approved: false,
    },
  ]);

  const handleApproveSwap = (id: string) => {
    setSwaps(swaps.map(s => s.id === id ? { ...s, approved: true } : s));
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Stat Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Active Pool */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Total Active Pool
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#9b2f00] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19] tracking-tight">248</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>+14 newly onboarded this term</span>
            </div>
          </div>
        </div>

        {/* Stat 2: Oct 27 Scheduled */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Oct 27 Scheduled
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#904d00] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">event_available</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-[#1e1b19] tracking-tight">64</span>
              <span className="text-xs text-[#59413a]">/ 67 Roles Filled</span>
            </div>
            <div className="w-full bg-[#f4ece8] rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-[#904d00] h-full rounded-full" style={{ width: '95.5%' }}></div>
            </div>
          </div>
        </div>

        {/* Stat 3: Critical Roster Gaps */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#ba1a1a] uppercase tracking-wider">
              Critical Roster Gaps
            </span>
            <span className="p-2 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">error</span>
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-bold text-[#ba1a1a] tracking-tight">3</span>
              <span className="text-xs font-bold text-[#ba1a1a]">Vacancies Needing Cover</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[#59413a] font-mono text-[11px]">
              <span>Kids Lead • Sound Op • Usher</span>
            </div>
          </div>
        </div>

        {/* Stat 4: Safeguarding CPP */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Safeguarding (CPP)
            </span>
            <span className="p-2 rounded-xl bg-[#85f8c4]/40 text-[#002114] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </span>
          </div>
          <div>
            <div className="font-headline text-3xl font-bold text-[#1e1b19] tracking-tight">98.4%</div>
            <div className="flex items-center gap-1 mt-1 text-[#006243] text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Background verified active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Roster Controls & Schedule Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#EAE1D7] shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Left: View Toggle & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-[#faf2ee] rounded-xl border border-[#EAE1D7]">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'matrix' ? 'bg-white text-[#1e1b19] shadow-xs' : 'text-[#59413a] hover:text-[#1e1b19]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#c2410c]">calendar_view_week</span>
              <span>Matrix View</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-white text-[#1e1b19] shadow-xs' : 'text-[#59413a] hover:text-[#1e1b19]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
              <span>List View</span>
            </button>
          </div>

          <div className="relative">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl bg-[#faf2ee] text-[#1e1b19] text-xs font-medium border border-[#EAE1D7] appearance-none outline-none cursor-pointer"
            >
              <option>All Volunteer Teams (5 Teams)</option>
              <option>Welcome & Hospitality</option>
              <option>Audio/Visual & Tech Production</option>
              <option>Kingdom Kids Care</option>
              <option>Worship Band & Vocalists</option>
              <option>Campus Safety & First Aid</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[#8d7168] pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>
        </div>

        {/* Center: Date Selector & Quick Jump */}
        <div className="flex flex-wrap items-center justify-center gap-2 bg-[#faf2ee] px-3 py-1.5 rounded-xl border border-[#EAE1D7]">
          <button className="p-1 rounded-md text-[#59413a] hover:bg-[#f4ece8] transition-colors" title="Previous">
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-[#c2410c] text-[18px]">event</span>
            <span className="font-headline text-xs font-bold text-[#1e1b19]">Sun, Oct 27, 2024</span>
            <span className="px-2 py-0.5 rounded-full bg-[#ffdcc3] text-[#2f1500] font-mono text-[10px] font-bold">
              Upcoming
            </span>
          </div>
          <button className="p-1 rounded-md text-[#59413a] hover:bg-[#f4ece8] transition-colors" title="Next">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
          <div className="h-4 w-px bg-[#EAE1D7] mx-1 hidden sm:block"></div>
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setSelectedServiceTime('9:00')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedServiceTime === '9:00' ? 'bg-[#9b2f00] text-white font-bold' : 'bg-white text-[#1e1b19] hover:bg-[#f4ece8]'
              }`}
            >
              9:00 AM
            </button>
            <button
              onClick={() => setSelectedServiceTime('11:00')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedServiceTime === '11:00' ? 'bg-[#9b2f00] text-white font-bold' : 'bg-white text-[#1e1b19] hover:bg-[#f4ece8]'
              }`}
            >
              11:00 AM
            </button>
            <button
              onClick={() => setSelectedServiceTime('6:00')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedServiceTime === '6:00' ? 'bg-[#9b2f00] text-white font-bold' : 'bg-white text-[#1e1b19] hover:bg-[#f4ece8]'
              }`}
            >
              6:00 PM
            </button>
          </div>
        </div>

        {/* Right: Search & Action CTAs */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8d7168] text-[18px]">search</span>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter person or role..."
              className="w-full sm:w-44 h-10 pl-9 pr-3 rounded-xl bg-[#faf2ee] text-[#1e1b19] placeholder:text-[#8d7168] text-xs border border-[#EAE1D7] focus:outline-none focus:bg-white"
            />
          </div>
          <button className="h-10 px-3 rounded-xl bg-[#faf2ee] hover:bg-[#f4ece8] text-[#1e1b19] text-xs font-semibold flex items-center gap-1.5 border border-[#EAE1D7] transition-colors">
            <span className="material-symbols-outlined text-[18px] text-[#904d00]">smart_toy</span>
            <span className="hidden md:inline">Auto-Schedule</span>
          </button>
          <button className="h-10 px-4 rounded-xl bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Quick Assign</span>
          </button>
        </div>
      </div>

      {/* Layout: Scheduling Matrix Grid & Side Rail */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Primary Matrix Container (8 Cols on XL) */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          {/* Matrix Header Row */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-[#faf2ee] rounded-2xl border border-[#EAE1D7] text-xs font-semibold text-[#59413a] uppercase tracking-wider">
            <div className="col-span-3">Ministry & Appointed Role</div>
            <div className="col-span-4 flex items-center gap-1.5 text-[#9b2f00]">
              <span className="w-2 h-2 rounded-full bg-[#9b2f00] inline-block"></span>
              <span>Service 1 • 9:00 AM (Main)</span>
            </div>
            <div className="col-span-5 flex items-center gap-1.5 text-[#904d00]">
              <span className="w-2 h-2 rounded-full bg-[#904d00] inline-block"></span>
              <span>Service 2 • 11:00 AM (Family)</span>
            </div>
          </div>

          {/* TEAM 1: Welcome & Hospitality */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
            <div className="px-5 py-3 bg-[#faf2ee]/70 border-b border-[#EAE1D7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#ffdbd0] text-[#9b2f00] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">door_front</span>
                </div>
                <span className="font-headline text-sm font-bold text-[#1e1b19]">Welcome & Hospitality</span>
                <span className="px-2 py-0.5 rounded-full bg-[#f4ece8] text-[#59413a] text-[10px] font-semibold">
                  4 Slots Active
                </span>
              </div>
              <span className="text-xs text-[#006243] flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[16px]">check</span> 1 Swap Requested
              </span>
            </div>

            {/* Role 1: Greeter Lead */}
            <div className="p-4 grid grid-cols-12 gap-3 items-center hover:bg-[#faf2ee]/40 transition-colors border-b border-[#EAE1D7]/60">
              <div className="col-span-3">
                <div className="font-semibold text-xs text-[#1e1b19]">Greeter Lead</div>
                <div className="font-mono text-[10px] text-[#59413a]">North Foyer</div>
              </div>
              <div className="col-span-4 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#ffdbd0] text-[#9b2f00] flex items-center justify-center text-xs font-bold shrink-0">
                    MV
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Marcus Vance</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
                <button className="p-1 rounded text-[#59413a] hover:bg-[#f4ece8]" title="Swap">
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                </button>
              </div>
              <div className="col-span-5 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#ffdcc3] text-[#2f1500] flex items-center justify-center text-xs font-bold shrink-0">
                    AM
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Arthur Miller</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded text-[#59413a] hover:bg-[#f4ece8]" title="Swap">
                    <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  </button>
                  <button className="p-1 rounded text-[#59413a] hover:bg-[#f4ece8]" title="Send SMS">
                    <span className="material-symbols-outlined text-[16px]">sms</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Role 2: Welcome Desk */}
            <div className="p-4 grid grid-cols-12 gap-3 items-center hover:bg-[#faf2ee]/40 transition-colors">
              <div className="col-span-3">
                <div className="font-semibold text-xs text-[#1e1b19]">Welcome Desk</div>
                <div className="font-mono text-[10px] text-[#59413a]">Central Hub</div>
              </div>
              <div className="col-span-4 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#9b2f00] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    CS
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Chloe Sterling</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
                <button className="p-1 rounded text-[#59413a] hover:bg-[#f4ece8]">
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                </button>
              </div>
              {/* 11:00 AM - REPLACEMENT REQUESTED */}
              <div className="col-span-5 p-2.5 rounded-xl bg-[#ffdad6]/40 flex items-center justify-between border border-[#ba1a1a]/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    SJ
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Sarah Jenkins</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#ffdad6] text-[#93000a] text-[10px] font-bold w-fit">
                      Replacement Needed
                    </span>
                  </div>
                </div>
                <button className="h-7 px-2.5 rounded-lg bg-[#9b2f00] text-white hover:bg-[#c2410c] text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer">
                  <span className="material-symbols-outlined text-[14px]">swap_calls</span>
                  <span>Swap</span>
                </button>
              </div>
            </div>
          </div>

          {/* TEAM 2: Audio/Visual & Tech Production */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
            <div className="px-5 py-3 bg-[#faf2ee]/70 border-b border-[#EAE1D7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#ffdcc3] text-[#904d00] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">mic_external_on</span>
                </div>
                <span className="font-headline text-sm font-bold text-[#1e1b19]">Audio/Visual & Tech Production</span>
                <span className="px-2 py-0.5 rounded-full bg-[#f4ece8] text-[#59413a] text-[10px] font-semibold">
                  5 Slots Active
                </span>
              </div>
              <span className="text-xs text-[#ba1a1a] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">warning</span> 1 Vacancy
              </span>
            </div>

            {/* Role 1: FOH Sound Engineer */}
            <div className="p-4 grid grid-cols-12 gap-3 items-center hover:bg-[#faf2ee]/40 transition-colors border-b border-[#EAE1D7]/60">
              <div className="col-span-3">
                <div className="font-semibold text-xs text-[#1e1b19]">FOH Sound Engineer</div>
                <div className="font-mono text-[10px] text-[#59413a]">Sound Booth Level 2</div>
              </div>
              <div className="col-span-4 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#ffb59d] text-[#390c00] flex items-center justify-center text-xs font-bold shrink-0">
                    CV
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Caleb Vance</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
                <button className="p-1 rounded text-[#59413a] hover:bg-[#f4ece8]">
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                </button>
              </div>
              <div className="col-span-5 p-2.5 rounded-xl bg-[#ffdcc3]/40 flex items-center justify-between border border-[#fe932c]/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#fe932c] text-[#2f1500] flex items-center justify-center text-xs font-bold shrink-0">
                    ES
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Eric Stone</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#ffdcc3] text-[#6e3900] text-[10px] font-bold w-fit">
                      Pending Confirmation
                    </span>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg bg-white border border-[#EAE1D7] text-[#59413a] hover:text-[#1e1b19]" title="Resend Notification">
                  <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                </button>
              </div>
            </div>

            {/* Role 2: ProPresenter Visuals */}
            <div className="p-4 grid grid-cols-12 gap-3 items-center hover:bg-[#faf2ee]/40 transition-colors">
              <div className="col-span-3">
                <div className="font-semibold text-xs text-[#1e1b19]">ProPresenter Visuals</div>
                <div className="font-mono text-[10px] text-[#59413a]">Broadcast Deck</div>
              </div>
              <div className="col-span-4 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#e9e1dd] text-[#1e1b19] flex items-center justify-center text-xs font-bold shrink-0">
                    LC
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Leo Chen</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
                <button className="p-1 rounded text-[#59413a] hover:bg-[#f4ece8]">
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                </button>
              </div>
              {/* CRITICAL OPEN SLOT */}
              <div className="col-span-5 p-2.5 rounded-xl bg-[#ffdad6]/40 flex items-center justify-between border border-[#ba1a1a]/40 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-white text-[#ba1a1a] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[18px]">person_off</span>
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#ba1a1a]">OPEN VACANCY</span>
                    <span className="font-mono text-[10px] text-[#59413a]">Requires Level 2 Training</span>
                  </div>
                </div>
                <button className="h-8 px-3 rounded-xl bg-[#9b2f00] text-white hover:bg-[#c2410c] text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Assign</span>
                </button>
              </div>
            </div>
          </div>

          {/* TEAM 3: Kingdom Kids Check-in & Care */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
            <div className="px-5 py-3 bg-[#faf2ee]/70 border-b border-[#EAE1D7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#85f8c4]/40 text-[#006243] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">child_care</span>
                </div>
                <span className="font-headline text-sm font-bold text-[#1e1b19]">Kingdom Kids Check-in & Care</span>
                <span className="px-2 py-0.5 rounded-full bg-[#f4ece8] text-[#59413a] text-[10px] font-semibold">
                  6 Slots Active
                </span>
              </div>
              <span className="text-xs font-semibold text-[#006243]">CPP Verified Required</span>
            </div>

            {/* Role 1: Nursery Assistant */}
            <div className="p-4 grid grid-cols-12 gap-3 items-center hover:bg-[#faf2ee]/40 transition-colors border-b border-[#EAE1D7]/60">
              <div className="col-span-3">
                <div className="font-semibold text-xs text-[#1e1b19]">Nursery Assistant</div>
                <div className="font-mono text-[10px] text-[#59413a]">Ages 0-2 Room B</div>
              </div>
              <div className="col-span-4 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#85f8c4] text-[#002114] flex items-center justify-center text-xs font-bold shrink-0">
                    EV
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Elena Vance</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-span-5 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#eee7e3] text-[#1e1b19] flex items-center justify-center text-xs font-bold shrink-0">
                    MJ
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Maya Jenkins</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Role 2: Pre-K Lead Teacher */}
            <div className="p-4 grid grid-cols-12 gap-3 items-center hover:bg-[#faf2ee]/40 transition-colors">
              <div className="col-span-3">
                <div className="font-semibold text-xs text-[#1e1b19]">Pre-K Lead</div>
                <div className="font-mono text-[10px] text-[#59413a]">Classroom 104</div>
              </div>
              <div className="col-span-4 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#ffdcc3] text-[#2f1500] flex items-center justify-center text-xs font-bold shrink-0">
                    HA
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Hannah Alistair</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
              </div>
              {/* 11:00 AM SWAP REQUESTED */}
              <div className="col-span-5 p-2.5 rounded-xl bg-[#ffdad6]/40 flex items-center justify-between border border-[#ba1a1a]/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    RA
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Rachel Adams</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#ffdad6] text-[#93000a] text-[10px] font-bold w-fit">
                      Swap Requested
                    </span>
                  </div>
                </div>
                <button className="h-7 px-2.5 rounded-lg bg-[#9b2f00] text-white hover:bg-[#c2410c] text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer">
                  <span className="material-symbols-outlined text-[14px]">volunteer_activism</span>
                  <span>Fill</span>
                </button>
              </div>
            </div>
          </div>

          {/* TEAM 4: Worship Band & Vocals */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
            <div className="px-5 py-3 bg-[#faf2ee]/70 border-b border-[#EAE1D7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#ffdbd0] text-[#390c00] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">piano</span>
                </div>
                <span className="font-headline text-sm font-bold text-[#1e1b19]">Worship Band & Vocals</span>
                <span className="px-2 py-0.5 rounded-full bg-[#f4ece8] text-[#59413a] text-[10px] font-semibold">
                  6 Slots Active
                </span>
              </div>
              <span className="text-xs text-[#006243] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span> All Roster Confirmed
              </span>
            </div>

            <div className="p-4 grid grid-cols-12 gap-3 items-center hover:bg-[#faf2ee]/40 transition-colors border-b border-[#EAE1D7]/60">
              <div className="col-span-3">
                <div className="font-semibold text-xs text-[#1e1b19]">Vocal Lead</div>
                <div className="font-mono text-[10px] text-[#59413a]">Sanctuary Platform</div>
              </div>
              <div className="col-span-4 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#904d00] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    TV
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Timothy Vance</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-span-5 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#904d00] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    TV
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Timothy Vance</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed (Dual Service)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 grid grid-cols-12 gap-3 items-center hover:bg-[#faf2ee]/40 transition-colors">
              <div className="col-span-3">
                <div className="font-semibold text-xs text-[#1e1b19]">Acoustic Guitar</div>
                <div className="font-mono text-[10px] text-[#59413a]">Sanctuary Stage Left</div>
              </div>
              <div className="col-span-4 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#ffdcc3] text-[#2f1500] flex items-center justify-center text-xs font-bold shrink-0">
                    SA
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Sarah Alistair</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-span-5 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#eee7e3] text-[#1e1b19] flex items-center justify-center text-xs font-bold shrink-0">
                    NR
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Nathan Ross</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TEAM 5: Campus Safety & First Aid */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
            <div className="px-5 py-3 bg-[#faf2ee]/70 border-b border-[#EAE1D7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">medical_services</span>
                </div>
                <span className="font-headline text-sm font-bold text-[#1e1b19]">Campus Safety & First Aid</span>
                <span className="px-2 py-0.5 rounded-full bg-[#f4ece8] text-[#59413a] text-[10px] font-semibold">
                  4 Slots Active
                </span>
              </div>
              <span className="text-xs text-[#ba1a1a] font-bold">1 Vacancy</span>
            </div>

            <div className="p-4 grid grid-cols-12 gap-3 items-center hover:bg-[#faf2ee]/40 transition-colors">
              <div className="col-span-3">
                <div className="font-semibold text-xs text-[#1e1b19]">Sanctuary Usher Lead</div>
                <div className="font-mono text-[10px] text-[#59413a]">Auditorium Main Aisle</div>
              </div>
              <div className="col-span-4 p-2.5 rounded-xl bg-[#faf2ee] flex items-center justify-between border border-[#EAE1D7]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#eee7e3] text-[#1e1b19] flex items-center justify-center text-xs font-bold shrink-0">
                    KW
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-[#1e1b19] truncate">Kevin Wright</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold w-fit">
                      Confirmed
                    </span>
                  </div>
                </div>
              </div>
              {/* 11:00 AM Critical Open */}
              <div className="col-span-5 p-2.5 rounded-xl bg-[#ffdad6]/40 flex items-center justify-between border border-[#ba1a1a]/40 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-white text-[#9b2f00] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[18px]">person_pin_circle</span>
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#9b2f00]">OPEN USHER</span>
                    <span className="font-mono text-[10px] text-[#59413a]">Level 1 Sanctuary</span>
                  </div>
                </div>
                <button className="h-8 px-3 rounded-xl bg-[#9b2f00] text-white hover:bg-[#c2410c] text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">flash_on</span>
                  <span>Quick Fill</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Rail (4 Cols on XL) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Urgent Swaps & Pending Approvals Drawer */}
          <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#ffdcc3] text-[#2f1500] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">sync_problem</span>
                </div>
                <div>
                  <h2 className="font-headline text-sm font-bold text-[#1e1b19]">Pending Swaps</h2>
                  <span className="text-[11px] text-[#59413a]">Requires Admin Approval</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] font-mono text-[11px] font-bold">
                {swaps.filter(s => !s.approved).length} Urgent
              </span>
            </div>

            {/* Swap cards */}
            <div className="space-y-3">
              {swaps.map((swap) => (
                <div key={swap.id} className="p-3.5 rounded-xl bg-[#faf2ee] flex flex-col gap-2.5 border border-[#EAE1D7]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-[#1e1b19]">{swap.name}</span>
                      <span className="font-mono text-[11px] text-[#59413a]">{swap.role}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold">
                      {swap.reason}
                    </span>
                  </div>
                  <p className="text-xs text-[#59413a] italic">{swap.note}</p>
                  
                  {swap.approved ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#006243] font-semibold pt-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Swap Approved & Updated</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleApproveSwap(swap.id)}
                        className="flex-1 h-8 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Approve Swap
                      </button>
                      <button className="px-3 h-8 rounded-lg bg-white border border-[#EAE1D7] text-[#1e1b19] text-xs font-semibold hover:bg-[#f4ece8] transition-colors">
                        Find Other
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Roster Automation & Safeguarding Card */}
          <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006243] text-[22px]">tune</span>
                <h3 className="font-headline text-sm font-bold text-[#1e1b19]">Scheduling Policies</h3>
              </div>
              <span className="font-mono text-[11px] text-[#006243] font-bold">ACTIVE</span>
            </div>

            <div className="space-y-2.5 text-xs text-[#1e1b19]">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]">
                <div className="flex flex-col">
                  <span className="font-semibold text-[#1e1b19]">Max Serving Frequency</span>
                  <span className="font-mono text-[10px] text-[#59413a]">Max 2 Sundays/Month</span>
                </div>
                <span className="material-symbols-outlined text-[#006243] text-[18px]">check_circle</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]">
                <div className="flex flex-col">
                  <span className="font-semibold text-[#1e1b19]">Dual-Shift Conflict Warning</span>
                  <span className="font-mono text-[10px] text-[#59413a]">Flag consecutive services</span>
                </div>
                <span className="material-symbols-outlined text-[#006243] text-[18px]">check_circle</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#faf2ee] border border-[#EAE1D7]">
                <div className="flex flex-col">
                  <span className="font-semibold text-[#1e1b19]">Child Protection Compliance</span>
                  <span className="font-mono text-[10px] text-[#59413a]">Auto-lock unverified volunteers</span>
                </div>
                <span className="material-symbols-outlined text-[#006243] text-[18px]">verified</span>
              </div>
            </div>

            {/* Weekly Blast Call-To-Action */}
            <div className="p-4 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-2 text-[#9b2f00] text-xs font-bold">
                <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                <span>Sunday Reminder Blast</span>
              </div>
              <p className="text-[11px] text-[#59413a] leading-relaxed">
                Automated WhatsApp & SMS reminders scheduled for Friday 4:00 PM to all 64 confirmed servants.
              </p>
              <button className="w-full h-8 rounded-lg bg-white border border-[#EAE1D7] hover:bg-[#f4ece8] text-[#1e1b19] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 mt-1">
                <span className="material-symbols-outlined text-[16px]">schedule_send</span>
                <span>Review Scheduled Messages</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
