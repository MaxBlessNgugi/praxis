import React, { useState } from 'react';
import { SoftDeleteRecord } from '../../../types';
import { INITIAL_SOFT_DELETE_RECORDS } from '../../../data/churchMockData';

interface DeleteChristianViewProps {
  onRestoreMember?: (record: SoftDeleteRecord) => void;
}

export const DeleteChristianView: React.FC<DeleteChristianViewProps> = ({
  onRestoreMember,
}) => {
  const [selectedReason, setSelectedReason] = useState<'transfer' | 'memorial' | 'inactive' | 'admin'>('transfer');
  const [destParish, setDestParish] = useState('Deliverance Church Nyahururu');
  const [destPastor, setDestPastor] = useState('Rev. Thomas Sterling');
  const [rationale, setRationale] = useState(
    'Approved via Church Council Meeting Minute #2025-10-B. Official dismissal certificate issued upon written request of member relocating to a Nyahururu church fellowship.'
  );
  const [filterDisposition, setFilterDisposition] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [records, setRecords] = useState<SoftDeleteRecord[]>(INITIAL_SOFT_DELETE_RECORDS);

  const handleProceedClick = () => {
    setIsModalOpen(true);
  };

  const handleConfirmSoftDelete = () => {
    setIsModalOpen(false);
    const newArchived: SoftDeleteRecord = {
      id: `sd-${Date.now()}`,
      name: 'Elena Vance',
      memberId: '#MBR-1082',
      initials: 'EV',
      dismissalDate: 'Today',
      daysLeft: 30,
      reason: selectedReason,
      reasonLabel: selectedReason === 'transfer' ? 'Church Transfer' : selectedReason === 'memorial' ? 'Memorial Book of Life' : selectedReason === 'inactive' ? 'Pastoral Inactivity' : 'Registry Cleanse',
      authorizedBy: 'Bishop Sammy',
      destinationParish: destParish,
      rationale,
    };
    setRecords([newArchived, ...records]);
    setToastMessage('Elena Vance moved to Trash. Record retained in 30-day grace vault.');
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const handleRestore = (rec: SoftDeleteRecord) => {
    setRecords(records.filter((r) => r.id !== rec.id));
    if (onRestoreMember) {
      onRestoreMember(rec);
    }
    setToastMessage(`${rec.name} restored from Trash back to active Members Register.`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const filteredQueue = records.filter((r) => {
    if (filterDisposition === 'all') return true;
    if (filterDisposition === 'transfer') return r.reason === 'transfer';
    if (filterDisposition === 'memorial') return r.reason === 'memorial';
    if (filterDisposition === 'inactive') return r.reason === 'inactive';
    if (filterDisposition === 'admin') return r.reason === 'admin';
    return true;
  });

  return (
    <div className="flex flex-col w-full gap-6 pb-12">
      {/* Church Mandate Banner */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#ffdad6] via-[#eee7e3] to-[#f4ece8] p-6 shadow-sm border border-[#e1bfb5]/40">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-[#9b2f00]/5 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4 max-w-4xl">
            <div className="w-12 h-12 rounded-xl bg-[#ba1a1a] text-white flex items-center justify-center shrink-0 shadow-md">
              <span aria-hidden="true" className="material-symbols-outlined text-[26px]">gavel</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white font-headline text-[11px] uppercase tracking-wider font-bold">
                  Canon 4.12 Strict Guard
                </span>
                <span className="font-headline text-xs text-[#59413a] font-medium">
                  Council Resolution #SR-2024-88
                </span>
              </div>
              <h2 className="font-headline text-xl font-bold text-[#1e1b19] tracking-tight">
                Official Roll Retention & Pastoral Care Notice
              </h2>
              <p className="font-body text-xs text-[#59413a] leading-relaxed">
                Church regulations require verified documentation and Church Secretary attestation before any baptized believer is expunged or soft-deleted from the congregational roll. All removals are isolated inside the <strong>30-day Trash repository</strong> before irreversible purge, allowing grace for pastoral reclamation and clerk audits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-end text-right">
              <span className="font-headline text-[11px] text-[#59413a] uppercase tracking-wider font-semibold">
                Council Audit Cycle
              </span>
              <span className="font-headline text-xl text-[#9b2f00] font-bold">14 Active Days</span>
            </div>
            <div className="h-10 w-px bg-[#e1bfb5]/40 mx-2"></div>
            <button
              type="button"
              onClick={() => alert('Displaying Official Bylaws Section 4.12: Church Council Roll Retention Rules')}
              className="p-2.5 rounded-lg bg-white text-[#1e1b19] hover:bg-[#faf2ee] transition-colors shadow-sm cursor-pointer border border-[#EAE1D7]"
              title="View Official Bylaws"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">policy</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter & Rapid Lookup Toolbar */}
      <section className="bg-white rounded-xl p-4 shadow-sm border border-[#EAE1D7]/60">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <span aria-hidden="true" className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-[#59413a]">
              search
            </span>
            <input aria-label="Member on file"
              type="text"
              readOnly
              value="Elena Vance (#MBR-1082)"
              className="w-full h-11 pl-11 pr-16 rounded-lg bg-[#faf2ee] text-[#1e1b19] font-body text-sm placeholder:text-[#59413a]/60 focus:outline-none shadow-inner"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#eee7e3] text-[#59413a] text-xs font-headline font-bold">
              Target
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-headline text-xs font-semibold uppercase tracking-wider text-[#59413a] mr-1">
              Filter Archive Stream:
            </span>
            {[
              { id: 'all', label: 'All Dispositions' },
              { id: 'transfer', label: 'Church Transfer' },
              { id: 'memorial', label: 'Memorial / Deceased' },
              { id: 'inactive', label: 'Pastoral Disciplinary (>24mo)' },
              { id: 'admin', label: 'Registry Correction' },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilterDisposition(chip.id)}
                className={`px-3 py-1.5 rounded-lg font-headline text-xs font-semibold transition-colors cursor-pointer ${
                  filterDisposition === chip.id
                    ? 'bg-[#9b2f00] text-white shadow-sm'
                    : 'bg-[#faf2ee] hover:bg-[#f4ece8] text-[#59413a]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Split Workspace: Left 7 Cols vs Right 5 Cols */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Removal Processing Console */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          {/* Selected Member Identity Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#EAE1D7]/60 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-[#c2410c] text-white flex items-center justify-center font-headline text-xl font-bold shadow-sm">
                    EV
                  </div>
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#ba1a1a] border-2 border-white"
                    title="Pending Status Change"
                  ></span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline text-xl font-bold text-[#1e1b19]">Elena Vance</h3>
                    <span className="px-2 py-0.5 rounded bg-[#eee7e3] text-[#1e1b19] font-mono text-xs font-bold">
                      #MBR-1082
                    </span>
                  </div>
                  <span className="font-body text-xs text-[#59413a]">
                    Member • Vance Household • Enrolled Aug 14, 2018
                  </span>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-headline font-semibold">
                    <span className="inline-flex items-center gap-1 text-[#006243]">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">water_drop</span> Baptism Confirmed
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#59413a]">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">home</span> Primary Resident
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#904d00]">
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">savings</span> Envelope #0482
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert('Search and select another member from the roll')}
                className="px-3 py-1 rounded-lg bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] font-headline text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">swap_horiz</span> Change Member
              </button>
            </div>

            {/* Household Impact Alert */}
            <div className="bg-[#faf2ee] rounded-lg p-4 flex items-center justify-between gap-4 border border-[#e1bfb5]/40">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#fe932c]">family_restroom</span>
                <div className="flex flex-col">
                  <span className="font-headline text-xs font-bold text-[#1e1b19]">
                    Household Association: Vance Family Unit (3 Active)
                  </span>
                  <span className="font-body text-xs text-[#59413a]">
                    Michael Vance (Spouse/Head), David Vance (Son). Elena's removal will disassociate her giving records.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert('Viewing Vance Family Unit in Family Unit registry')}
                className="font-headline text-xs text-[#9b2f00] font-bold hover:underline shrink-0 cursor-pointer"
              >
                View Unit
              </button>
            </div>
          </div>

          {/* Processing Form Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#EAE1D7]/60 flex flex-col gap-6">
            {/* Step 1: Archival Category Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-headline text-xs text-[#1e1b19] font-bold flex items-center gap-1">
                  <span>1. Official Disposition Reason</span>
                  <span className="text-[#ba1a1a] font-bold">*</span>
                </label>
                <span className="font-headline text-xs text-[#59413a]">Select session category</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Option 1: Transfer */}
                <div
                  onClick={() => setSelectedReason('transfer')}
                  className={`p-4 rounded-xl cursor-pointer transition-all flex items-start gap-3 border ${
                    selectedReason === 'transfer'
                      ? 'bg-[#c2410c]/10 border-[#c2410c] shadow-sm'
                      : 'bg-[#faf2ee] border-transparent hover:bg-[#f4ece8]'
                  }`}
                >
                  <input aria-label="Transfer of letter"
                    type="radio"
                    checked={selectedReason === 'transfer'}
                    onChange={() => setSelectedReason('transfer')}
                    className="mt-1 accent-[#c2410c]"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#9b2f00]">
                        forward_to_inbox
                      </span>
                      <span className="font-headline text-xs text-[#1e1b19] font-bold">Transfer of Letter</span>
                    </div>
                    <p className="font-body text-xs text-[#59413a] mt-0.5">
                      Formal certificate forwarded to the sister church or Church Council.
                    </p>
                  </div>
                </div>

                {/* Option 2: Memorial */}
                <div
                  onClick={() => setSelectedReason('memorial')}
                  className={`p-4 rounded-xl cursor-pointer transition-all flex items-start gap-3 border ${
                    selectedReason === 'memorial'
                      ? 'bg-[#c2410c]/10 border-[#c2410c] shadow-sm'
                      : 'bg-[#faf2ee] border-transparent hover:bg-[#f4ece8]'
                  }`}
                >
                  <input aria-label="Memorial / deceased"
                    type="radio"
                    checked={selectedReason === 'memorial'}
                    onChange={() => setSelectedReason('memorial')}
                    className="mt-1 accent-[#c2410c]"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#904d00]">
                        church
                      </span>
                      <span className="font-headline text-xs text-[#1e1b19] font-bold">Memorial / Deceased</span>
                    </div>
                    <p className="font-body text-xs text-[#59413a] mt-0.5">
                      Consecrate to the Eternal Memorial Registry Book of Life.
                    </p>
                  </div>
                </div>

                {/* Option 3: Pastoral Inactivity */}
                <div
                  onClick={() => setSelectedReason('inactive')}
                  className={`p-4 rounded-xl cursor-pointer transition-all flex items-start gap-3 border ${
                    selectedReason === 'inactive'
                      ? 'bg-[#c2410c]/10 border-[#c2410c] shadow-sm'
                      : 'bg-[#faf2ee] border-transparent hover:bg-[#f4ece8]'
                  }`}
                >
                  <input aria-label="Inactive / non-resident"
                    type="radio"
                    checked={selectedReason === 'inactive'}
                    onChange={() => setSelectedReason('inactive')}
                    className="mt-1 accent-[#c2410c]"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#59413a]">
                        person_off
                      </span>
                      <span className="font-headline text-xs text-[#1e1b19] font-bold">Inactive / Non-Resident</span>
                    </div>
                    <p className="font-body text-xs text-[#59413a] mt-0.5">
                      Unreachable for &gt;24 months following two elder visitations.
                    </p>
                  </div>
                </div>

                {/* Option 4: Admin Correction */}
                <div
                  onClick={() => setSelectedReason('admin')}
                  className={`p-4 rounded-xl cursor-pointer transition-all flex items-start gap-3 border ${
                    selectedReason === 'admin'
                      ? 'bg-[#c2410c]/10 border-[#c2410c] shadow-sm'
                      : 'bg-[#faf2ee] border-transparent hover:bg-[#f4ece8]'
                  }`}
                >
                  <input aria-label="Registry rectification"
                    type="radio"
                    checked={selectedReason === 'admin'}
                    onChange={() => setSelectedReason('admin')}
                    className="mt-1 accent-[#c2410c]"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#8d7168]">
                        content_copy
                      </span>
                      <span className="font-headline text-xs text-[#1e1b19] font-bold">Registry Rectification</span>
                    </div>
                    <p className="font-body text-xs text-[#59413a] mt-0.5">
                      Purge accidental duplicate record or clerical entry error.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Destination Church Field (if transfer) */}
            {selectedReason === 'transfer' && (
              <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-[#faf2ee] border border-[#e1bfb5]/40">
                <label className="font-headline text-xs text-[#1e1b19] font-bold flex items-center justify-between">
                  <span>Destination Church / Receiving Congregation</span>
                  <span className="font-headline text-[11px] text-[#006243] font-semibold">
                    Ecumenical Clearance verified
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  <input aria-label="Destination Church / Receiving Congregation Ecumenical Clearance verified"
                    type="text"
                    value={destParish}
                    onChange={(e) => setDestParish(e.target.value)}
                    placeholder="e.g. St. Jude Anglican Church, Austin TX"
                    className="h-10 px-3 rounded-lg bg-white border border-[#e1bfb5]/60 text-[#1e1b19] font-body text-xs focus:outline-none focus:border-[#9b2f00]"
                  />
                  <input aria-label="Receiving Pastor / Church Clerk Name"
                    type="text"
                    value={destPastor}
                    onChange={(e) => setDestPastor(e.target.value)}
                    placeholder="Receiving Pastor / Church Clerk Name"
                    className="h-10 px-3 rounded-lg bg-white border border-[#e1bfb5]/60 text-[#1e1b19] font-body text-xs focus:outline-none focus:border-[#9b2f00]"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Mandatory Council Rationale Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-headline text-xs text-[#1e1b19] font-bold flex items-center gap-1">
                  <span>2. Mandatory Removal Rationale & Council Minute #</span>
                  <span className="text-[#ba1a1a] font-bold">*</span>
                </label>
                <span className="font-mono text-xs text-[#59413a]">
                  {rationale.length} / 500 characters
                </span>
              </div>
              <p className="font-body text-xs text-[#59413a]">
                Document the verified official grounds, Council meeting minute designation, and official postal dispatch date for pastoral archive audit trails.
              </p>
              <textarea aria-label="2. Mandatory Removal Rationale &amp; Council Minute #"
                rows={3}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                maxLength={500}
                className="w-full p-3 rounded-xl bg-[#faf2ee] border border-[#e1bfb5]/60 text-[#1e1b19] font-body text-xs focus:outline-none focus:bg-white focus:border-[#9b2f00] transition-all resize-none shadow-inner"
              />
            </div>

            {/* Step 3: Sign-Off Officer Authorization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="flex flex-col gap-1">
                <label className="font-headline text-[11px] text-[#59413a] uppercase tracking-wider font-semibold">
                  Authorized Sign-off Officer
                </label>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#faf2ee] border border-[#e1bfb5]/40">
                  <div className="w-8 h-8 rounded-full bg-[#9b2f00] text-white flex items-center justify-center font-bold text-xs">
                    MV
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline text-xs text-[#1e1b19] font-bold">Bishop Sammy</span>
                    <span className="font-body text-[11px] text-[#59413a]">Lead Pastor & Visionary Leader</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-headline text-[11px] text-[#59413a] uppercase tracking-wider font-semibold">
                  Church Secretary Confirmation
                </label>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#faf2ee] border border-[#e1bfb5]/40">
                  <div className="w-8 h-8 rounded-full bg-[#006243] text-white flex items-center justify-center font-bold text-xs">
                    EC
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline text-xs text-[#1e1b19] font-bold">Elder Carolyn Wright</span>
                    <span className="font-body text-[11px] text-[#59413a]">Church Secretary (Attested)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[#f4ece8]">
              <button
                type="button"
                onClick={() => {
                  setRationale('');
                  setSelectedReason('transfer');
                }}
                className="px-4 py-2 rounded-lg bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] font-headline text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset Form
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => alert('Draft note saved to pending Council agenda.')}
                  className="px-4 py-2.5 rounded-lg bg-[#eee7e3] text-[#1e1b19] hover:bg-[#e9e1dd] font-headline text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Draft Note
                </button>
                <button
                  type="button"
                  onClick={handleProceedClick}
                  className="px-5 py-2.5 rounded-lg bg-[#ba1a1a] hover:bg-red-700 text-white font-headline text-xs font-bold transition-colors shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete_sweep</span>
                  <span>Proceed to Soft-Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Trash Queue & Vault Repository */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          {/* Integrity Metric Box */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#EAE1D7]/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[22px]">auto_delete</span>
                <h3 className="font-headline text-lg font-bold text-[#1e1b19]">
                  30-Day Soft-Delete Vault
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#ffdad6] text-[#93000a] font-headline text-xs font-bold">
                {records.length} Records In Grace Period
              </span>
            </div>
            <p className="font-body text-xs text-[#59413a] mb-4 leading-relaxed">
              Soft-deleted believers are immediately isolated from group distribution trees, volunteer assignments, and quarterly pledge reports. Records can be restored in a single click before the countdown expires.
            </p>

            <div className="p-4 rounded-xl bg-[#faf2ee] flex flex-col gap-2 border border-[#e1bfb5]/40">
              <div className="flex justify-between items-center font-headline text-xs">
                <span className="text-[#1e1b19] font-bold">Vault Capacity & Grace Status</span>
                <span className="text-[#59413a]">{records.length} of 500 max cached</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#eee7e3] overflow-hidden">
                <div className="bg-[#9b2f00] h-full rounded-full" style={{ width: `${Math.min(100, (records.length / 50) * 100)}%` }}></div>
              </div>
              <div className="flex items-center justify-between text-[#59413a] font-mono text-[11px] pt-1">
                <span>Next Automated Purge: Sunday, 23:59 CST</span>
                <span className="text-[#ba1a1a] font-bold">1 record retiring in 48h</span>
              </div>
            </div>
          </div>

          {/* Pending Council Ratification Roll Queue */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#EAE1D7]/60 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-headline text-sm font-bold text-[#1e1b19]">
                  Pending Council Ratification Roll
                </h4>
                <span className="font-body text-xs text-[#59413a]">
                  Awaiting final Church Council / church minutes
                </span>
              </div>
              <button
                type="button"
                onClick={() => alert('Refreshing queue status with Church Council ledger...')}
                className="p-1.5 rounded-lg text-[#59413a] hover:bg-[#f4ece8] transition-colors cursor-pointer"
                title="Refresh queue"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">sync</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {filteredQueue.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl transition-all flex flex-col gap-2 border ${
                    item.isUrgent
                      ? 'bg-[#ffdad6]/25 border-[#ffdad6] hover:bg-[#ffdad6]/40'
                      : 'bg-[#faf2ee] border-transparent hover:bg-[#f4ece8]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-headline text-xs font-bold ${
                          item.isUrgent ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-[#eee7e3] text-[#1e1b19]'
                        }`}
                      >
                        {item.initials}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-headline text-xs font-bold text-[#1e1b19]">{item.name}</span>
                          {item.isUrgent ? (
                            <span className="px-1.5 py-0.2 rounded bg-[#ba1a1a] text-white font-mono text-[10px] font-bold">
                              2 Days Left
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-[#59413a]">{item.memberId}</span>
                          )}
                        </div>
                        <span className="font-body text-[11px] text-[#59413a]">
                          Dismissed {item.dismissalDate} • {item.daysLeft} days left
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestore(item)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#007d57] hover:text-white text-[#006243] font-headline text-xs font-bold transition-colors flex items-center gap-1 shadow-sm border border-[#e1bfb5]/40 cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">restore_from_trash</span>
                      <span>Restore</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 font-headline text-[11px]">
                    <span className="text-[#59413a]">
                      Reason: <strong className="text-[#1e1b19]">{item.reasonLabel}</strong>
                    </span>
                    <span className="text-[#59413a]">Auth: {item.authorizedBy}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#e1bfb5]/40 text-xs font-headline">
              <button
                type="button"
                onClick={() => alert('Opening the Full Church Trash Repository Archive')}
                className="text-[#9b2f00] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Trash Repository History</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
              <span className="font-mono text-[#59413a] text-[11px]">Archive Retention v3.4</span>
            </div>
          </div>

          {/* Tip Card */}
          <div className="rounded-xl p-4 bg-[#fe932c]/15 border border-[#fe932c]/30 flex items-start gap-3">
            <span aria-hidden="true" className="material-symbols-outlined text-[#904d00] text-[22px] shrink-0 mt-0.5">
              menu_book
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-headline text-xs font-bold text-[#1e1b19]">
                Church Council Quarterly Certificate Dispatch
              </span>
              <p className="font-body text-xs text-[#59413a] leading-relaxed">
                All dismissed members with approved letter transfers automatically receive their sealed digital letters through encrypted church postal sync. In case of pastoral dispute, Church Secretaries may issue an injunction from the Admin Portal.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33302d]/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE1D7] relative animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[#59413a] hover:bg-[#f4ece8] cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#ffdad6] text-[#93000a] flex items-center justify-center shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[26px]">delete_forever</span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-headline text-base font-bold text-[#1e1b19] leading-snug">
                  Confirm Soft-Delete to Trash: Elena Vance (#MBR-1082)
                </h3>
                <span className="font-headline text-xs text-[#ba1a1a] font-bold mt-1">
                  Council Action Required • 30-Day Safe Grace Active
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#faf2ee] mb-4 flex flex-col gap-1.5 border border-[#e1bfb5]/40 text-xs">
              <p className="font-body text-[#1e1b19] leading-relaxed">
                Executing this action will immediately remove <strong>Elena Vance</strong> from active ministry volunteer rosters, pastoral prayer cohorts, small group directories, and automatic envelope batch numbering.
              </p>
              <div className="flex items-center gap-2 text-[#59413a] pt-1">
                <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#006243]">check_circle</span>
                <span>Her record is safely restorable within <strong>30 days</strong> from <em>Admin &gt; Trash</em>.</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#eee7e3]/60 mb-6 flex items-center justify-between font-headline text-xs text-[#59413a]">
              <span>Attested By: <strong className="text-[#1e1b19]">Bishop Sammy</strong></span>
              <span>Reason: <strong className="text-[#1e1b19]">Letter Transfer</strong></span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] text-[#1e1b19] font-headline text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel / Retain on Roll
              </button>
              <button
                type="button"
                onClick={handleConfirmSoftDelete}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#ba1a1a] hover:bg-red-700 text-white font-headline text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete</span>
                <span>Confirm Move to Trash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Undo Toast */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-4 p-4 rounded-xl bg-[#33302d] text-[#f7efeb] shadow-2xl max-w-md animate-in slide-in-from-bottom duration-300">
          <div className="w-9 h-9 rounded-lg bg-[#9b2f00] flex items-center justify-center text-white shrink-0">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">archive</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-headline text-xs font-bold truncate">{toastMessage}</span>
            <span className="font-body text-[11px] opacity-80">Record retained in 30-day grace vault.</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-headline text-xs font-bold transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
