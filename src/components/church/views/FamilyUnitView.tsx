import React, { useState, useEffect } from 'react';
import { HouseholdUnit } from '../../../types';
import { useDialog } from '../dialog';
import { EmptyState } from '../../ui';
import { ErrorBlock } from '../DataState';
import { useLocations } from '../../../lib/hooks/useMembers';
import { useMembers } from '../../../lib/hooks/useMembers';
import { ApiError, reportsApi } from '../../../lib/api';
import { downloadBlob } from '../../../lib/export';

interface FamilyUnitViewProps {
  onNavigateToAddChristian?: () => void;
}

export const FamilyUnitView: React.FC<FamilyUnitViewProps> = ({
  onNavigateToAddChristian,
}) => {
  const { listAllHouseholds, createHousehold: apiCreateHousehold } = useMembers();
  const [households, setHouseholds] = useState<HouseholdUnit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [sortMode, setSortMode] = useState<'name' | 'largest'>('name');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const createModalOpenDialog = useDialog(() => setIsCreateModalOpen(false), "Create New Household");
  const [newSurname, setNewSurname] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [newCampus, setNewCampus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { locations } = useLocations();

  useEffect(() => {
    const loadHouseholds = async () => {
      try {
        setHouseholds(await listAllHouseholds());
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.body.error : 'Failed to load households');
      }
    };
    loadHouseholds();
  }, [listAllHouseholds]);

  /**
   * The whole directory, as the server has it — not the filtered page on screen.
   *
   * The export used to be an `alert()` with a hardcoded "412 households" beside it, so the one
   * button on the screen that promised a file delivered nothing. The server composes the same
   * register the list reads, under the same gates, and the browser just names the download.
   */
  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      downloadBlob('praxis-households.csv', await reportsApi.householdsCsv());
    } catch (err) {
      setError(err instanceof ApiError ? err.body.error : 'The export could not be built');
    } finally {
      setExporting(false);
    }
  };

  /**
   * The next number in the church's own series (`HH-101`, `HH-102` …).
   *
   * Suggested rather than invented: the clerk may have a roll of numbers in front of them, and a unit
   * number the system made up is one nobody can find the household under later.
   */
  const nextUnitNumber = (() => {
    const highest = households.reduce((max, row) => Math.max(max, Number(row.unitNumber.replace(/\D/g, '')) || 0), 100);
    return `HH-${highest + 1}`;
  })();

  const householdMembers = households.reduce((total, row) => total + row.memberCount, 0);
  const averageSize = households.length === 0 ? '0' : (householdMembers / households.length).toFixed(1);
  const headless = households.filter((row) => row.headName === 'No head recorded').length;
  const congregations = new Set(households.map((row) => row.campus)).size;

  const filteredHouseholds = households.filter((h) => {
    const matchSearch =
      searchTerm === '' ||
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.headName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCampus = campusFilter === 'all' || h.campus === campusFilter;

    return matchSearch && matchCampus;
  });

  /** The two orders the toolbar offers, applied to what the filters left. */
  const householdsShown = [...filteredHouseholds].sort((a, b) =>
    sortMode === 'largest' ? b.memberCount - a.memberCount : a.name.localeCompare(b.name),
  );

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    // The field shows the suggested number until the clerk types over it, so the suggestion is what
    // an untouched form submits.
    const unitNumber = (newUnitNumber || nextUnitNumber).trim();
    if (!newSurname.trim() || !unitNumber) return;

    try {
      const newUnit = await apiCreateHousehold({
        name: `The ${newSurname.trim()} Household`,
        unitNumber,
        location: newCampus,
        ...(newAddress.trim() ? { address: newAddress.trim() } : {}),
      });
      setHouseholds((current) => [newUnit, ...current]);
      setIsCreateModalOpen(false);
      setNewSurname('');
      setNewAddress('');
      setNewUnitNumber('');
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.body.error : 'Failed to create household');
    }
  };

  return (
    <div className="flex flex-col w-full gap-6 pb-12">
      {/* What the register itself holds — no invented quarterly deltas. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Households on the roll', value: String(households.length), icon: 'roofing', tone: 'bg-[#f4ece8] text-[#9b2f00]', caption: `${congregations} congregation${congregations === 1 ? '' : 's'}` },
          { label: 'Members in households', value: String(householdMembers), icon: 'family_restroom', tone: 'bg-[#ffdcc3] text-[#904d00]', caption: 'Filed under a household' },
          { label: 'Average members / unit', value: averageSize, icon: 'calculate', tone: 'bg-[#eee7e3] text-[#59413a]', caption: 'Across every household' },
          { label: 'Households without a head', value: String(headless), icon: 'person_off', tone: 'bg-[#ffdad6] text-[#93000a]', caption: headless === 0 ? 'Every household has one' : 'Open a member record to appoint one' },
        ].map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-xl shadow-sm relative overflow-hidden border border-[#EAE1D7]/60">
            <div className="flex items-center justify-between mb-2">
              <span className="font-headline text-xs uppercase tracking-wider text-[#59413a] font-bold">{card.label}</span>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.tone}`}>
                <span aria-hidden="true" className="material-symbols-outlined text-[22px]">{card.icon}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl text-[#1e1b19] font-bold">{card.value}</span>
            </div>
            <p className="font-body text-xs text-[#59413a] mt-1">{card.caption}</p>
          </div>
        ))}
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
                {locations.map((location) => (
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
              <select aria-label="Order of the register"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as 'name' | 'largest')}
                className="appearance-none h-10 pl-3 pr-8 rounded-lg bg-[#f4ece8] font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer focus:outline-none border border-[#e1bfb5]/40"
              >
                <option value="name">Name (A–Z)</option>
                <option value="largest">Largest household first</option>
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
        {error && (
          <div className="col-span-full">
            <ErrorBlock message={error} />
          </div>
        )}
        {!error && householdsShown.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon="holiday_village"
              title="No households match this view"
              description="Clear the location or status filter to see the whole roll."
            />
          </div>
        )}
        {householdsShown.map((unit) => (
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
            Showing <span className="font-bold text-[#1e1b19]">1 - {householdsShown.length}</span> of{' '}
            <span className="font-bold text-[#1e1b19]">{households.length}</span> households
          </span>
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
              className="px-3 py-1.5 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] disabled:opacity-60 font-headline text-xs font-semibold text-[#1e1b19] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">file_download</span>{' '}
              {exporting ? 'Preparing…' : 'Export Roll (CSV)'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33302d]/50 backdrop-blur-xs" {...createModalOpenDialog}>
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
                <label htmlFor="household-unit" className="block font-headline text-xs font-bold text-[#1e1b19] mb-1">
                  Unit Number *
                </label>
                <input id="household-unit" aria-label="Unit Number"
                  type="text"
                  required
                  value={newUnitNumber || nextUnitNumber}
                  onChange={(e) => setNewUnitNumber(e.target.value)}
                  placeholder="e.g. HH-108"
                  className="w-full h-9 px-3 rounded-lg border border-[#e1bfb5] text-[#1e1b19] focus:outline-none focus:border-[#9b2f00]"
                />
                <p className="font-body text-[11px] text-[#59413a] mt-1">
                  The head of the household is filed from their own member record — open it in Members and set them as head.
                </p>
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
                  {locations.map((location) => (
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
