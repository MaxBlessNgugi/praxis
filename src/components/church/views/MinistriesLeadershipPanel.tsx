import React, { useState } from 'react';
import { CHURCH } from '../../../data/churchDomain';

interface LeaderRow {
  id: string;
  role: string;
  department: string;
  deptDotColor: string;
  name: string;
  credentials: string;
  credentialCode: string;
  initials: string;
  avatarBg: string;
  email: string;
  phone: string;
  startDate: string;
  termEnd: string;
  termUrgencyText?: string;
  isPerpetual?: boolean;
  status: 'active' | 'renewal-due' | 'emeritus';
}

const LEADERS: LeaderRow[] = [
  {
    id: 'lead-1',
    role: 'Bishop & Visionary Leader',
    department: 'Visionary Leadership & Church Council',
    deptDotColor: 'bg-[#9b2f00]',
    name: 'Bishop Sammy',
    credentials: 'Consecrated Bishop',
    credentialCode: '#ORD-001',
    initials: 'BS',
    avatarBg: 'bg-[#9b2f00] text-white',
    email: 'bishop@destinysanctuary.co.ke',
    phone: CHURCH.phone,
    startDate: 'Founding Visionary',
    termEnd: 'Perpetual / Tenured',
    isPerpetual: true,
    status: 'active',
  },
  {
    id: 'lead-9',
    role: 'Co-Visionary Leader & Church Administrator',
    department: 'Visionary Leadership & Church Council',
    deptDotColor: 'bg-[#9b2f00]',
    name: 'Rev. Alice',
    credentials: 'Ordained Clergy',
    credentialCode: '#ORD-002',
    initials: 'RA',
    avatarBg: 'bg-[#ffdcc3] text-[#2f1500]',
    email: 'rev.alice@destinysanctuary.co.ke',
    phone: CHURCH.phone,
    startDate: 'Founding Visionary',
    termEnd: 'Perpetual / Tenured',
    isPerpetual: true,
    status: 'active',
  },
  {
    id: 'lead-2',
    role: 'Church Elder & Church Secretary',
    department: 'Pastoral Team & Church Council',
    deptDotColor: 'bg-[#904d00]',
    name: 'Elder Marcus Jenkins',
    credentials: 'Church Elder',
    credentialCode: "Class of '26",
    initials: 'MJ',
    avatarBg: 'bg-[#ffdcc3] text-[#2f1500]',
    email: 'marcus.j@destinysanctuary.co.ke',
    phone: '+254 734 567 120',
    startDate: 'Nov 01, 2021',
    termEnd: 'Dec 31, 2026',
    termUrgencyText: '· 2 yrs left',
    status: 'active',
  },
  {
    id: 'lead-3',
    role: 'Dean & Chief Academic Officer',
    department: 'Berean Bible Academy',
    deptDotColor: 'bg-[#006243]',
    name: 'Dr. Jonathan Edwards',
    credentials: 'Faculty Dean',
    credentialCode: 'Member',
    initials: 'JE',
    avatarBg: 'bg-[#007d57] text-white',
    email: 'j.edwards@berean.org',
    phone: '+254 745 678 230',
    startDate: 'Sep 01, 2020',
    termEnd: 'Aug 31, 2025',
    termUrgencyText: '· 10 mos left',
    status: 'active',
  },
  {
    id: 'lead-4',
    role: "Director of Women's Ministry",
    department: "Women's Discipleship Guild",
    deptDotColor: 'bg-[#fe932c]',
    name: 'Rev. Sarah Alistair',
    credentials: 'Ordained Clergy',
    credentialCode: '#ORD-112',
    initials: 'SA',
    avatarBg: 'bg-[#fe932c] text-white',
    email: 'sarah.alistair@destinysanctuary.co.ke',
    phone: '+254 778 901 230',
    startDate: 'Oct 15, 2021',
    termEnd: 'Nov 15, 2024',
    termUrgencyText: '· 18 days left',
    status: 'renewal-due',
  },
  {
    id: 'lead-5',
    role: 'Youth Pastor & Sports Chaplain',
    department: 'NextGen & Youth Ministries',
    deptDotColor: 'bg-[#c2410c]',
    name: 'Hannah Abbott',
    credentials: 'Appointed Staff',
    credentialCode: 'Licentiate',
    initials: 'DA',
    avatarBg: 'bg-[#e9e1dd] text-[#1e1b19]',
    email: 'david.alistair@destinysanctuary.co.ke',
    phone: '+254 756 789 340',
    startDate: 'Jun 01, 2022',
    termEnd: 'May 31, 2025',
    termUrgencyText: '· 7 mos left',
    status: 'active',
  },
  {
    id: 'lead-6',
    role: "Nursery & Children's Director",
    department: 'Kids of Grace Ministry',
    deptDotColor: 'bg-[#ffb77d]',
    name: 'Elena Vance',
    credentials: 'CPP Certified',
    credentialCode: 'Member',
    initials: 'EV',
    avatarBg: 'bg-[#ffdbd0] text-[#390c00]',
    email: 'elena.vance@destinysanctuary.co.ke',
    phone: '+254 767 890 450',
    startDate: 'Aug 15, 2021',
    termEnd: 'Dec 31, 2025',
    termUrgencyText: '· 1 yr left',
    status: 'active',
  },
  {
    id: 'lead-7',
    role: 'Lead Almoner & Deaconess',
    department: 'Board of Deacons & Mercy',
    deptDotColor: 'bg-[#68dba9]',
    name: 'Deaconess Clara Oswald',
    credentials: 'Ordained Deaconess',
    credentialCode: "Class of '25",
    initials: 'CO',
    avatarBg: 'bg-[#85f8c4] text-[#002114]',
    email: 'clara.oswald@destinysanctuary.co.ke',
    phone: '+254 778 901 560',
    startDate: 'Feb 01, 2022',
    termEnd: 'Jan 31, 2025',
    termUrgencyText: '· 65 days left',
    status: 'active',
  },
  {
    id: 'lead-8',
    role: 'Church Elder Emeritus & Trustee',
    department: 'Board of Trustees & Endowment',
    deptDotColor: 'bg-[#8d7168]',
    name: 'Arthur Miller',
    credentials: 'Elder Emeritus',
    credentialCode: '30yr Service',
    initials: 'AM',
    avatarBg: 'bg-[#eee7e3] text-[#59413a]',
    email: 'arthur.miller@destinysanctuary.co.ke',
    phone: '+254 789 012 670',
    startDate: 'Jan 10, 1994',
    termEnd: 'Life Appointment',
    status: 'emeritus',
  },
];

/** Roster size, so the Ministries tab badge can't drift from the table it counts. */
export const LEADER_COUNT = LEADERS.length;

/** Filter options are derived from the roster, so an option can never match nothing. */
const DEPARTMENTS = ['All Councils & Ministries', ...new Set(LEADERS.map((leader) => leader.department))];
const ROLES = ['All Leadership Tiers', ...new Set(LEADERS.map((leader) => leader.role))];

const STATUS_LABELS: Record<LeaderRow['status'], string> = {
  active: 'Active Tenures',
  'renewal-due': 'Renewal Due',
  emeritus: 'Emeritus / Honorary',
};
const countByStatus = (status: LeaderRow['status']) => LEADERS.filter((leader) => leader.status === status).length;
const STATUS_OPTIONS = [
  { value: 'all', label: `Status: All (${LEADERS.length})` },
  ...(Object.keys(STATUS_LABELS) as LeaderRow['status'][]).map((status) => ({
    value: status,
    label: `${STATUS_LABELS[status]} (${countByStatus(status)})`,
  })),
];

const ACTIVE_COUNT = countByStatus('active');
/** Share of the roster on an active tenure, for the tenures card. */
const TENURE_PERCENT = Math.round((ACTIVE_COUNT / LEADERS.length) * 100);

export const MinistriesLeadershipPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Councils & Ministries');
  const [selectedTier, setSelectedTier] = useState('All Leadership Tiers');
  const [selectedStatus, setSelectedStatus] = useState<'all' | LeaderRow['status']>('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedRows.length === LEADERS.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(LEADERS.map(l => l.id));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const filteredLeaders = LEADERS.filter((leader) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      query === '' ||
      [leader.name, leader.role, leader.department, leader.email].some((value) =>
        value.toLowerCase().includes(query),
      );
    return (
      matchesSearch &&
      (selectedDept === DEPARTMENTS[0] || leader.department === selectedDept) &&
      (selectedTier === ROLES[0] || leader.role === selectedTier) &&
      (selectedStatus === 'all' || leader.status === selectedStatus)
    );
  });

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Stat Metrics Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Stat 1: Total Appointed Leaders */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Total Appointed Leaders
            </span>
            <span aria-hidden="true" className="p-2 rounded-xl bg-[#f4ece8] text-[#9b2f00] material-symbols-outlined text-[20px]">
              assignment_ind
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#1e1b19] tracking-tight">{LEADERS.length}</span>
            <span className="text-xs font-semibold text-[#006243] flex items-center gap-0.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">trending_up</span>
              {ACTIVE_COUNT} active
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[#f4ece8] text-[#59413a] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#c2410c] inline-block"></span>
            <span>Across {DEPARTMENTS.length - 1} Pastoral Departments</span>
          </div>
        </div>

        {/* Stat 2: Active Tenures */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Active Tenures
            </span>
            <span aria-hidden="true" className="p-2 rounded-xl bg-[#f4ece8] text-[#006243] material-symbols-outlined text-[20px]">
              how_to_reg
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#1e1b19] tracking-tight">{ACTIVE_COUNT}</span>
            <span className="text-xs text-[#59413a]">/ {LEADERS.length} installed</span>
          </div>
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[#f4ece8]">
            <div className="w-full h-1.5 rounded-full bg-[#f4ece8] overflow-hidden">
              <div className="h-full bg-[#006243] rounded-full" style={{ width: `${TENURE_PERCENT}%` }}></div>
            </div>
            <span className="font-mono text-xs text-[#006243] font-bold">{TENURE_PERCENT}%</span>
          </div>
        </div>

        {/* Stat 3: Expiring <= 60 Days */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#904d00] uppercase tracking-wider">
              Expiring ≤ 60 Days
            </span>
            <span aria-hidden="true" className="p-2 rounded-xl bg-[#f4ece8] text-[#904d00] material-symbols-outlined text-[20px]">
              schedule
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#904d00] tracking-tight">{countByStatus('renewal-due')}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#ffdcc3] text-[#2f1500] text-xs font-bold">
              Action Required
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-[#f4ece8] text-[#59413a] text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#904d00]">notification_important</span>
            <span>Reappointment review slated</span>
          </div>
        </div>

        {/* Stat 4: Council & Church Council Quorum */}
        <div className="p-5 rounded-2xl bg-white shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Council Quorum
            </span>
            <span aria-hidden="true" className="p-2 rounded-xl bg-[#f4ece8] text-[#007d57] material-symbols-outlined text-[20px]">
              gavel
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#007d57] tracking-tight">100%</span>
            <span className="text-xs text-[#006243] font-bold">Ratified</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-[#f4ece8] text-[#59413a] text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#007d57]">verified_user</span>
            <span>Leadership requirements valid</span>
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#EAE1D7] shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search & Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#8d7168] text-[18px]">
              search
            </span>
            <input aria-label="Search leader name, office, ministry, email"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leader name, office, ministry, email..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#faf2ee] text-[#1e1b19] placeholder:text-[#8d7168] text-xs border border-[#EAE1D7] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#9b2f00]/20 transition-all"
            />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <select aria-label="Council or ministry filter"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl bg-[#faf2ee] text-[#1e1b19] text-xs font-medium border border-[#EAE1D7] outline-none appearance-none cursor-pointer hover:bg-[#f4ece8]"
            >
              {DEPARTMENTS.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </select>
            <span aria-hidden="true" className="material-symbols-outlined absolute right-2 top-2.5 text-[#8d7168] text-[18px] pointer-events-none">
              arrow_drop_down
            </span>
          </div>

          {/* Leadership Tier Filter */}
          <div className="relative">
            <select aria-label="Leadership tier filter"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl bg-[#faf2ee] text-[#1e1b19] text-xs font-medium border border-[#EAE1D7] outline-none appearance-none cursor-pointer hover:bg-[#f4ece8]"
            >
              {ROLES.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
            <span aria-hidden="true" className="material-symbols-outlined absolute right-2 top-2.5 text-[#8d7168] text-[18px] pointer-events-none">
              arrow_drop_down
            </span>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select aria-label="Status filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl bg-[#faf2ee] text-[#1e1b19] text-xs font-medium border border-[#EAE1D7] outline-none appearance-none cursor-pointer hover:bg-[#f4ece8]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="material-symbols-outlined absolute right-2 top-2.5 text-[#8d7168] text-[18px] pointer-events-none">
              arrow_drop_down
            </span>
          </div>
        </div>

        {/* Right Buttons */}
        <div className="flex items-center gap-2 justify-end shrink-0">
          <button 
            type="button"
            className="h-10 px-3.5 rounded-xl bg-[#faf2ee] hover:bg-[#f4ece8] text-[#1e1b19] text-xs font-semibold flex items-center gap-1.5 border border-[#EAE1D7] transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#8d7168]">file_download</span>
            <span>Export CSV</span>
          </button>
          <button 
            type="button"
            className="h-10 px-4 rounded-xl bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add</span>
            <span>Assign New Role</span>
          </button>
        </div>
      </div>

      {/* Main Roster Data Table Container */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-[#EAE1D7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#faf2ee] text-[#59413a] text-xs font-semibold uppercase tracking-wider border-b border-[#EAE1D7]">
                <th className="py-3 px-4 w-12 text-center">
                  <input aria-label="Select all leaders"
                    type="checkbox"
                    checked={selectedRows.length === LEADERS.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-[#c2410c] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Role & Ministry Department</th>
                <th className="py-3 px-4">Appointed Person & Credentials</th>
                <th className="py-3 px-4">Contact Information</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">Term End / Urgency</th>
                <th className="py-3 px-4">Church Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE1D7] text-xs text-[#1e1b19]">
              {filteredLeaders.map((leader) => {
                const isSelected = selectedRows.includes(leader.id);
                const isRenewal = leader.status === 'renewal-due';

                return (
                  <tr 
                    key={leader.id}
                    className={`transition-colors group ${
                      isRenewal 
                        ? 'bg-[#ffdcc3]/30 hover:bg-[#ffdcc3]/50' 
                        : isSelected 
                        ? 'bg-[#f4ece8]' 
                        : 'hover:bg-[#faf2ee]/70'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <input aria-label="Select leader"
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(leader.id)}
                        className="w-4 h-4 rounded text-[#c2410c] cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-headline font-semibold text-[#1e1b19] group-hover:text-[#9b2f00] transition-colors">
                          {leader.role}
                        </span>
                        <span className="text-[11px] text-[#59413a] flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${leader.deptDotColor} inline-block`}></span>
                          {leader.department}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${leader.avatarBg}`}>
                          {leader.initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#1e1b19]">{leader.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-[#f4ece8] text-[#59413a] text-[10px] font-mono">
                              {leader.credentials}
                            </span>
                            <span className="text-[#59413a] text-[10px] font-mono">{leader.credentialCode}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <a className="text-[#1e1b19] hover:text-[#9b2f00] transition-colors" href={`mailto:${leader.email}`}>
                          {leader.email}
                        </a>
                        <span className="text-[#59413a] font-mono text-[11px]">{leader.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#59413a]">
                      {leader.startDate}
                    </td>
                    <td className="py-3.5 px-4">
                      {leader.isPerpetual ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#faf2ee] text-[#1e1b19] font-medium text-xs">
                          <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#006243]">all_inclusive</span>
                          <span>Perpetual / Tenured</span>
                        </div>
                      ) : isRenewal ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ffdcc3] text-[#6e3900] font-semibold text-xs">
                          <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#904d00]">alarm</span>
                          <span>{leader.termEnd}</span>
                          <span className="font-mono text-[11px] font-bold">{leader.termUrgencyText}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#faf2ee] text-[#1e1b19] text-xs font-medium">
                          <span>{leader.termEnd}</span>
                          {leader.termUrgencyText && (
                            <span className="text-[#59413a] font-mono text-[11px]">{leader.termUrgencyText}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {leader.status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#85f8c4]/30 text-[#005137] text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#006243] inline-block"></span>
                          Active
                        </span>
                      )}
                      {leader.status === 'renewal-due' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffdcc3] text-[#6e3900] text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#904d00] inline-block animate-pulse"></span>
                          Renewal Due
                        </span>
                      )}
                      {leader.status === 'emeritus' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#e9e1dd] text-[#59413a] text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8d7168] inline-block"></span>
                          Emeritus
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {isRenewal ? (
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded-md bg-[#904d00] text-white hover:bg-[#6e3900] font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">cycle</span>
                            <span>Renew</span>
                          </button>
                        ) : (
                          <button className="p-1.5 rounded-md hover:bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] transition-colors" title="Edit leader">
                            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        )}
                        <button className="p-1.5 rounded-md hover:bg-[#f4ece8] text-[#59413a] hover:text-[#1e1b19] transition-colors" title="Options">
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">more_vert</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="px-5 py-3.5 bg-[#faf2ee] flex items-center gap-2 border-t border-[#EAE1D7] text-xs text-[#59413a]">
          {filteredLeaders.length === 0 ? (
            <span>No leaders match the current filters</span>
          ) : (
            <span>Showing <strong className="text-[#1e1b19] font-semibold">1–{filteredLeaders.length}</strong> of <strong className="text-[#1e1b19] font-semibold">{LEADERS.length}</strong> appointed leaders</span>
          )}
        </div>
      </div>

      {/* Church Council Church Council Quorum Ratified Banner */}
      <div className="p-5 rounded-2xl bg-[#faf2ee] border border-[#EAE1D7] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#007d57] text-white flex items-center justify-center shrink-0 shadow-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-[26px]">balance</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                Church Council Leadership & Council Ratification
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#85f8c4]/30 text-[#005137] text-xs font-bold">
                Quorum Validated
              </span>
            </div>
            <p className="text-xs text-[#59413a] mt-0.5">
              All appointed Church Elders and ministry leaders fulfil the church's leadership requirements. Next formal Church Council assembly convened on <strong className="text-[#1e1b19]">Thursday, Nov 21, 2024</strong>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
          <button 
            type="button" 
            className="h-9 px-3.5 rounded-xl bg-white hover:bg-[#f4ece8] text-[#1e1b19] text-xs font-semibold border border-[#EAE1D7] flex items-center gap-1.5 transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>View Book of Order</span>
          </button>
          <button 
            type="button" 
            className="h-9 px-3.5 rounded-xl bg-[#904d00] hover:bg-[#6e3900] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">verified</span>
            <span>Download Minutes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
