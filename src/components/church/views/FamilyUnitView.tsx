import React, { useState } from 'react';
import { HouseholdUnit } from '../../../types';
import { INITIAL_HOUSEHOLDS } from '../../../data/churchMockData';
import { dialogProps } from '../dialog';
import { DEFAULT_LOCATION, LOCATIONS } from '../../../data/churchDomain'
;

/** The statuses the mock households actually carry, so the filter cannot go dead. */
const HOUSEHOLD_STATUSES = [...new Set(INITIAL_HOUSEHOLDS.map((household) => household.statusBadge))];

interface FamilyUnitViewProps {
  onNavigateToAddChristian?: () => void;
}

export const FamilyUnitView: React.FC<FamilyUnitViewProps> = ({
  onNavigateToAddChristian,
}) => {
  const [households, setHouseholds] = useState<HouseholdUnit[]>(INITIAL_HOUSEHOLDS);
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSurname, setNewSurname] = useState('');
  const [newHead, setNewHead] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCampus, setNewCampus] = useState<string>(DEFAULT_LOCATION);

  const filteredHouseholds = households.filter((h) => {
    const matchSearch =
      searchTerm === '' ||
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.headName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCampus = campusFilter === 'all' || h.campus === campusFilter;
    const matchStatus = statusFilter === 'all' || h.statusBadge === statusFilter;

    return matchSearch && matchCampus && matchStatus;
  });

  const handleCreateHousehold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurname || !newHead) return;

    const newUnit: HouseholdUnit = {
      id: `house-${Date.now()}`,
      name: `The ${newSurname} Household`,
      unitNumber: `#${Math.floor(100 + Math.random() * 899)}`,
      campus: newCampus,
      statusBadge: 'Family Head',
      statusType: 'secondary',
      headName: newHead,
      headInitials: newHead.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
      headDob: 'Active Member',
      headTitle: 'Household Head',
      dependents: [],
      address: newAddress || 'Plot 100, Milimani Estate, Nyahururu',
      phone: newPhone || '+254 700 000 000',
    };

    setHouseholds([newUnit, ...households]);
    setIsCreateModalOpen(false);
    setNewSurname('');
    setNewHead('');
    setNewAddress('');
    setNewPhone('');
  };

  return (
    <div className="flex flex-col w-full gap-6 pb-12">
      {/* 4 Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Stat 1: Active Households */}
        <div className="bg-white p-5 rounded-xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all border border-[#EAE1D7]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-headline text-xs uppercase tracking-wider text-[#59413a] font-bold">
              Active Households
            </span>
            <div className="w-10 h-10 rounded-lg bg-[#f4ece8] flex items-center justify-center text-[#9b2f00]">
              <span aria-hidden="true" className="material-symbols-outlined text-[22px]">roofing</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold">412</span>
            <span className="font-headline text-xs text-[#006243] flex items-center font-bold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_upward</span>+14 this qtr
            </span>
          </div>
          <p className="font-body text-xs text-[#59413a] mt-1">Total verified residential covenants</p>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#9b2f00]/5 rounded-full pointer-events-none group-hover:scale-125 transition-transform"></div>
        </div>

        {/* Stat 2: Avg Members / Unit */}
        <div className="bg-white p-5 rounded-xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all border border-[#EAE1D7]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-headline text-xs uppercase tracking-wider text-[#59413a] font-bold">
              Avg Members / Unit
            </span>
            <div className="w-10 h-10 rounded-lg bg-[#ffdcc3] flex items-center justify-center text-[#904d00]">
              <span aria-hidden="true" className="material-symbols-outlined text-[22px]">family_restroom</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold">3.2</span>
            <span className="font-headline text-xs text-[#904d00] flex items-center font-bold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">horizontal_rule</span>steady
            </span>
          </div>
          <p className="font-body text-xs text-[#59413a] mt-1">1,318 total linked souls on roll</p>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#904d00]/5 rounded-full pointer-events-none group-hover:scale-125 transition-transform"></div>
        </div>

        {/* Stat 3: Single Member Homes */}
        <div className="bg-white p-5 rounded-xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all border border-[#EAE1D7]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-headline text-xs uppercase tracking-wider text-[#59413a] font-bold">
              Single Member Homes
            </span>
            <div className="w-10 h-10 rounded-lg bg-[#f4ece8] flex items-center justify-center text-[#59413a]">
              <span aria-hidden="true" className="material-symbols-outlined text-[22px]">person_outline</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold">88</span>
            <span className="font-headline text-xs text-[#59413a]/80 font-medium">21.3% of church</span>
          </div>
          <p className="font-body text-xs text-[#59413a] mt-1">Young adults, seniors & solo stewards</p>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#e1bfb5]/10 rounded-full pointer-events-none group-hover:scale-125 transition-transform"></div>
        </div>

        {/* Stat 4: Multi-Generational */}
        <div className="bg-white p-5 rounded-xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all border border-[#EAE1D7]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-headline text-xs uppercase tracking-wider text-[#59413a] font-bold">
              Multi-Generational
            </span>
            <div className="w-10 h-10 rounded-lg bg-[#85f8c4] flex items-center justify-center text-[#006243]">
              <span aria-hidden="true" className="material-symbols-outlined text-[22px]">diversity_3</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold">54</span>
            <span className="font-headline text-xs text-[#006243] flex items-center font-bold">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">verified</span>13% active
            </span>
          </div>
          <p className="font-body text-xs text-[#59413a] mt-1">Homes with elders & children linked</p>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#006243]/5 rounded-full pointer-events-none group-hover:scale-125 transition-transform"></div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#EAE1D7]/60 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 max-w-lg">
            <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#59413a]">
              search
            </span>
            <input aria-label="Search household surname, address, member ID"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search household surname, address, member ID..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#faf2ee] text-[#1e1b19] font-body text-xs placeholder:text-[#59413a]/70 focus:outline-none focus:bg-white border border-transparent focus:border-[#e1bfb5] shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select aria-label="Church campus filter"
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="appearance-none h-10 pl-3 pr-8 rounded-lg bg-[#f4ece8] font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer focus:outline-none border border-[#e1bfb5]/40"
              >
                <option value="all">All Campuses</option>
                {LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <span aria-hidden="true" className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[#59413a] pointer-events-none">
                expand_more
              </span>
            </div>

            <div className="relative">
              <select aria-label="Household status filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none h-10 pl-3 pr-8 rounded-lg bg-[#f4ece8] font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer focus:outline-none border border-[#e1bfb5]/40"
              >
                <option value="all">All Statuses</option>
                {HOUSEHOLD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <span aria-hidden="true" className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[#59413a] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => alert('Church geographical GIS map view toggle')}
            className="h-10 px-3.5 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] font-headline text-xs font-bold text-[#1e1b19] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer border border-[#e1bfb5]/40"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">filter_list</span>
            <span>Map View</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-10 px-4 rounded-lg bg-[#c2410c] text-white font-headline text-xs font-bold hover:bg-[#9b2f00] transition-colors flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">add_home</span>
            <span>+ Create New Household</span>
          </button>
        </div>
      </div>

      {/* Household Grid: 6 Units */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredHouseholds.map((unit) => (
          <div
            key={unit.id}
            className="bg-white rounded-xl shadow-sm border border-[#EAE1D7]/60 p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              {/* Unit Header */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline text-lg font-bold text-[#1e1b19] truncate">
                      {unit.name}
                    </h2>
                    <span className="font-mono text-xs text-[#59413a] bg-[#f4ece8] px-2 py-0.5 rounded">
                      {unit.unitNumber}
                    </span>
                  </div>
                  <p className="font-body text-xs text-[#59413a] flex items-center gap-1 mt-0.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">church</span>
                    <span>{unit.campus}</span>
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-headline text-[11px] font-bold whitespace-nowrap ${
                    unit.statusType === 'tertiary'
                      ? 'bg-[#85f8c4] text-[#002114]'
                      : unit.statusType === 'secondary'
                      ? 'bg-[#ffdcc3] text-[#2f1500]'
                      : 'bg-[#f4ece8] text-[#1e1b19]'
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[13px]">
                    {unit.statusBadge.includes('Star') || unit.statusBadge.includes('Member') ? 'star' : 'badge'}
                  </span>
                  {unit.statusBadge}
                </span>
              </div>

              {/* Head Card */}
              <div className="bg-[#faf2ee] rounded-lg p-3.5 mb-4 border border-[#e1bfb5]/40">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#9b2f00] text-white flex items-center justify-center font-headline text-sm font-bold shadow-sm shrink-0">
                    {unit.headInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-headline text-sm text-[#1e1b19] font-bold truncate">
                        {unit.headName}
                      </span>
                      <span aria-hidden="true" className="material-symbols-outlined text-[#fe932c] text-[16px]">verified</span>
                    </div>
                    <p className="font-body text-xs text-[#59413a] truncate">{unit.headDob}</p>
                  </div>
                </div>
              </div>

              {/* Dependents list */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-headline text-xs uppercase tracking-wider text-[#59413a]/80 font-bold">
                    Linked Dependents ({unit.dependents.length})
                  </span>
                </div>

                {unit.dependents.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {unit.dependents.map((dep, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#f4ece8] text-xs font-body"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              dep.badgeType === 'error'
                                ? 'bg-[#ba1a1a]'
                                : dep.badgeType === 'secondary'
                                ? 'bg-[#fe932c]'
                                : 'bg-[#006243]'
                            }`}
                          ></span>
                          <span className="text-[#1e1b19] font-bold truncate">{dep.name}</span>
                          <span className="text-[#59413a] text-[11px] truncate">{dep.relation}</span>
                        </div>
                        {dep.badge && (
                          <span
                            className={`font-headline text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                              dep.badgeType === 'error'
                                ? 'bg-[#ffdad6] text-[#93000a]'
                                : dep.badgeType === 'tertiary'
                                ? 'bg-[#85f8c4] text-[#002114]'
                                : 'bg-white text-[#1e1b19]'
                            }`}
                          >
                            {dep.badge}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-[#faf2ee] flex flex-col items-center justify-center text-center gap-1 border border-[#e1bfb5]/30">
                    <span aria-hidden="true" className="material-symbols-outlined text-[#8d7168] text-[24px]">group_add</span>
                    <p className="text-xs font-body text-[#59413a]">
                      No dependents linked · Can link roommates or relatives anytime
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigateToAddChristian && onNavigateToAddChristian()}
                      className="mt-1 font-headline text-xs text-[#9b2f00] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">add_link</span> + Link Existing Christian
                    </button>
                  </div>
                )}
              </div>

              {/* Address & Phone */}
              <div className="pt-2 mb-4 text-[#59413a] font-body text-xs flex flex-col gap-1 border-t border-[#f4ece8]">
                <div className="flex items-center gap-2 truncate">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#8d7168]">home_pin</span>
                  <span className="truncate">{unit.address}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#8d7168]">call</span>
                  <span>{unit.phone}</span>
                </div>
              </div>
            </div>

            {/* Card Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#f4ece8]">
              <button
                type="button"
                onClick={() => alert(`Managing unit: ${unit.name}`)}
                className="flex-1 py-2 px-3 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] font-headline text-xs text-[#1e1b19] font-bold transition-colors text-center cursor-pointer"
              >
                Manage Unit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToAddChristian) {
                    onNavigateToAddChristian();
                  } else {
                    alert(`Add Dependent workflow for ${unit.name}`);
                  }
                }}
                className="flex-1 py-2 px-3 rounded-lg bg-[#ffdcc3] hover:bg-[#ffb77d] text-[#2f1500] font-headline text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">person_add</span> + Add Dependent
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination & Export Footer */}
      <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-[#EAE1D7]/60 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-body text-xs text-[#59413a]">
            Showing <span className="font-bold text-[#1e1b19]">1 - {filteredHouseholds.length}</span> of{' '}
            <span className="font-bold text-[#1e1b19]">412</span> households
          </span>
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert('Exporting Household Directory as CSV...')}
              className="px-3 py-1.5 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] font-headline text-xs font-semibold text-[#1e1b19] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">file_download</span> Export Roll (CSV)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] font-headline text-xs font-semibold text-[#1e1b19] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">print</span> Print Directory
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-headline text-xs">
          <button
            type="button"
            disabled
            aria-label="Previous page"
            className="w-9 h-9 rounded-lg bg-[#f4ece8] text-[#59413a] flex items-center justify-center hover:bg-[#eee7e3] disabled:opacity-50"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-lg bg-[#c2410c] text-white font-bold flex items-center justify-center"
          >
            1
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] text-[#1e1b19] font-bold flex items-center justify-center cursor-pointer"
          >
            2
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] text-[#1e1b19] font-bold flex items-center justify-center cursor-pointer"
          >
            3
          </button>
          <span className="px-1 text-[#8d7168]">...</span>
          <button
            type="button"
            className="w-9 h-9 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] text-[#1e1b19] font-bold flex items-center justify-center cursor-pointer"
          >
            69
          </button>
          <button
            type="button"
            aria-label="Next page"
            className="w-9 h-9 rounded-lg bg-[#f4ece8] text-[#1e1b19] hover:bg-[#eee7e3] flex items-center justify-center cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Create New Household Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33302d]/50 backdrop-blur-xs" {...dialogProps(() => setIsCreateModalOpen(false), "Create New Household")}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#EAE1D7] relative animate-in fade-in zoom-in duration-150">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[#59413a] hover:bg-[#f4ece8] cursor-pointer"
            aria-label="Close">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#c2410c] text-white flex items-center justify-center shadow-sm">
                <span aria-hidden="true" className="material-symbols-outlined text-[24px]">add_home</span>
              </div>
              <div>
                <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                  Create New Household
                </h3>
                <span className="text-xs text-[#59413a]">Church residential member registry</span>
              </div>
            </div>

            <form onSubmit={handleCreateHousehold} className="space-y-4 text-xs font-body">
              <div>
                <label htmlFor="household-surname" className="block font-headline text-xs font-bold text-[#1e1b19] mb-1">
                  Household Surname *
                </label>
                <input id="household-surname" aria-label="Household Surname"
                  type="text"
                  required
                  value={newSurname}
                  onChange={(e) => setNewSurname(e.target.value)}
                  placeholder="e.g. Mwangi"
                  className="w-full h-9 px-3 rounded-lg border border-[#e1bfb5] text-[#1e1b19] focus:outline-none focus:border-[#9b2f00]"
                />
              </div>

              <div>
                <label htmlFor="household-head" className="block font-headline text-xs font-bold text-[#1e1b19] mb-1">
                  Primary Family Head *
                </label>
                <input id="household-head" aria-label="Primary Family Head"
                  type="text"
                  required
                  value={newHead}
                  onChange={(e) => setNewHead(e.target.value)}
                  placeholder="e.g. Timothy Mwangi"
                  className="w-full h-9 px-3 rounded-lg border border-[#e1bfb5] text-[#1e1b19] focus:outline-none focus:border-[#9b2f00]"
                />
              </div>

              <div>
                <label htmlFor="household-campus" className="block font-headline text-xs font-bold text-[#1e1b19] mb-1">
                  Church Campus
                </label>
                <select id="household-campus" aria-label="Church Campus"
                  value={newCampus}
                  onChange={(e) => setNewCampus(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-[#e1bfb5] text-[#1e1b19] focus:outline-none focus:border-[#9b2f00]"
                >
                  {LOCATIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="household-address" className="block font-headline text-xs font-bold text-[#1e1b19] mb-1">
                  Residential Address
                </label>
                <input id="household-address" aria-label="Residential Address"
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Street Address, Estate, Town"
                  className="w-full h-9 px-3 rounded-lg border border-[#e1bfb5] text-[#1e1b19] focus:outline-none focus:border-[#9b2f00]"
                />
              </div>

              <div>
                <label htmlFor="household-phone" className="block font-headline text-xs font-bold text-[#1e1b19] mb-1">
                  Primary Contact Phone
                </label>
                <input id="household-phone" aria-label="Primary Contact Phone"
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+254 700 000 000"
                  className="w-full h-9 px-3 rounded-lg border border-[#e1bfb5] text-[#1e1b19] focus:outline-none focus:border-[#9b2f00]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-[#f4ece8] text-[#1e1b19] font-headline text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white font-headline text-xs font-bold shadow-sm cursor-pointer"
                >
                  Save Household
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
