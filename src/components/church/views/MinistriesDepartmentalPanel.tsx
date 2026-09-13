import React, { useState } from 'react';
import { useDialog } from '../dialog';
import { CHURCH, DEFAULT_LOCATION, LOCATIONS } from '../../../data/churchDomain';

interface Department {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  category: string;
  statusBadge: string;
  cohortSize: number;
  cohortUnit: string;
  cohortLabel: string;
  icon: string;
  director: string;
  directorRole: string;
  directorInitials: string;
  directorColor: string;
  associate?: string;
  schedule: string;
  email: string;
  phone: string;
  tags: string[];
  budgetDisbursed: number;
  budgetTotal: number;
}

const DEPARTMENTS: Department[] = [
  {
    id: 'vc-01',
    code: 'VC-01',
    name: 'Visionary Leadership & Church Council',
    subtitle: 'Bishop, Clergy & Council Oversight',
    category: 'Church Council',
    statusBadge: 'Chartered',
    cohortSize: 14,
    cohortUnit: 'Clergy & Elders',
    cohortLabel: 'Church Council Bench',
    icon: 'account_balance',
    director: 'Bishop Sammy',
    directorRole: 'Visionary Leader & Bishop',
    directorInitials: 'BS',
    directorColor: 'bg-[#ffdbd0] text-[#9b2f00]',
    associate: 'Rev. Alice · Co-Visionary Leader & Church Administrator',
    schedule: 'Meets: 1st Tuesday · Council Room',
    email: 'office@destinysanctuary.co.ke',
    phone: CHURCH.phone,
    tags: ["Doctrinal Oversight", "Pulpit Supply", "Pastoral Counseling"],
    budgetDisbursed: 12280,
    budgetTotal: 24000,
  },
  {
    id: 'wm-02',
    code: 'WM-02',
    name: 'Worship & Word Ministry',
    subtitle: 'Praise, Worship & Pulpit Ministry',
    category: 'Worship',
    statusBadge: 'Chartered',
    cohortSize: 96,
    cohortUnit: 'Ministers',
    cohortLabel: 'Choir, Band & Pulpit Team',
    icon: 'music_note',
    director: 'Bishop Sammy',
    directorRole: 'Visionary Leader & Bishop',
    directorInitials: 'BS',
    directorColor: 'bg-[#ffdcc3] text-[#904d00]',
    associate: 'Assoc: Caleb Timothy Mwangi · Director of Music & Service',
    schedule: 'Sundays · 10:00 AM Praise & Worship · 11:30 AM Word Ministry',
    email: 'worship@destinysanctuary.co.ke',
    phone: '+254 745 678 230',
    tags: ["Praise & Worship", "Sermon / Word Ministry", "Choir & Band"],
    budgetDisbursed: 26400,
    budgetTotal: 38000,
  },
  {
    id: 'wf-03',
    code: 'WF-03',
    name: "Women's Fellowship",
    subtitle: 'National Women’s Conference Host',
    category: 'Women',
    statusBadge: 'Conference Host',
    cohortSize: 226,
    cohortUnit: 'Women',
    cohortLabel: 'Active Cohort',
    icon: 'spa',
    director: 'Rev. Alice',
    directorRole: 'Co-Visionary Leader & Church Administrator',
    directorInitials: 'RA',
    directorColor: 'bg-[#ffdbd0] text-[#9b2f00]',
    associate: 'Assoc: Sarah Kimani · Women’s Ministry Coordinator',
    schedule: 'Meets: Thursdays · 7:00 PM · Fellowship Hall',
    email: 'women@destinysanctuary.co.ke',
    phone: '+254 778 901 230',
    tags: ["National Women’s Conference", "Sisterhood Circles", "Benevolence"],
    budgetDisbursed: 46480,
    budgetTotal: 56000,
  },
  {
    id: 'dy-04',
    code: 'DY-04',
    name: 'Destiny Youth',
    subtitle: 'Teens & Young Adults',
    category: 'Youth',
    statusBadge: 'High Activity',
    cohortSize: 112,
    cohortUnit: 'Youth',
    cohortLabel: 'Active Cohort',
    icon: 'local_fire_department',
    director: 'Rev. Alice',
    directorRole: 'Co-Visionary Leader & Church Administrator',
    directorInitials: 'RA',
    directorColor: 'bg-[#ffdcc3] text-[#904d00]',
    associate: 'Assoc: Hannah Kimani · Youth Coordinator',
    schedule: 'Meets: Fridays · 6:30 PM · Youth Hall',
    email: 'youth@destinysanctuary.co.ke',
    phone: '+254 756 789 340',
    tags: ["National Youth Conference", "Youth Retreats", "Mentorship"],
    budgetDisbursed: 57800,
    budgetTotal: 68000,
  },
  {
    id: 'ng-05',
    code: 'NG-05',
    name: 'Next Generation & Children',
    subtitle: 'Raising a Generation · Ages 0–12',
    category: 'Children',
    statusBadge: 'CPP Verified',
    cohortSize: 148,
    cohortUnit: 'Kids',
    cohortLabel: 'Enrolled Children',
    icon: 'toys',
    director: 'Rev. Alice',
    directorRole: 'Co-Visionary Leader & Church Administrator',
    directorInitials: 'RA',
    directorColor: 'bg-[#ffdbd0] text-[#9b2f00]',
    associate: 'Assoc: Elena Mwangi · Children’s Director',
    schedule: 'Meets: Sundays · 9:00 AM · Children’s Wing',
    email: 'children@destinysanctuary.co.ke',
    phone: '+254 767 890 450',
    tags: ["Kids Church", "VBS Holiday Club", "Nursery Care"],
    budgetDisbursed: 39000,
    budgetTotal: 52000,
  },
  {
    id: 'gd-06',
    code: 'GD-06',
    name: 'Groups & Discipleship',
    subtitle: 'Small Groups, Classes & Equipping',
    category: 'Discipleship',
    statusBadge: 'Equipping',
    cohortSize: 176,
    cohortUnit: 'Members',
    cohortLabel: 'Group Members',
    icon: 'groups',
    director: 'Bishop Sammy',
    directorRole: 'Visionary Leader & Bishop',
    directorInitials: 'BS',
    directorColor: 'bg-[#ffdcc3] text-[#904d00]',
    associate: 'Assoc: Dr. Jonathan Mwaura · Discipleship & Bible Study Dean',
    schedule: 'Meets: Sundays · 1:30 PM Groups Meetings & Fellowship',
    email: 'groups@destinysanctuary.co.ke',
    phone: '+254 734 567 120',
    tags: ["Small Groups", "Membership Class", "Bible Study"],
    budgetDisbursed: 31500,
    budgetTotal: 42000,
  },
  {
    id: 'mm-07',
    code: 'MM-07',
    name: 'Missions, Mercy & Church Planting',
    subtitle: 'Community Outreach & Church Planting',
    category: 'Outreach',
    statusBadge: 'Community Core',
    cohortSize: 52,
    cohortUnit: 'Volunteers',
    cohortLabel: 'Volunteer Corps',
    icon: 'volunteer_activism',
    director: 'Bishop Sammy',
    directorRole: 'Visionary Leader & Bishop',
    directorInitials: 'BS',
    directorColor: 'bg-[#ffdbd0] text-[#9b2f00]',
    associate: 'Assoc: Clara Wambui · Outreach Almoner',
    schedule: 'Desk: Tuesdays & Saturdays · Outreach Office',
    email: 'missions@destinysanctuary.co.ke',
    phone: '+254 778 901 560',
    tags: ["Church Planting", "Mercy Drives", "Community Engagement"],
    budgetDisbursed: 32980,
    budgetTotal: 48500,
  },
];

/** Roster size, so the Ministries tab badge can't drift from the grid it counts. */
export const DEPARTMENT_COUNT = DEPARTMENTS.length;

/** KPI band totals, derived so the band can never disagree with the ministry cards. */
const TOTAL_COHORT = DEPARTMENTS.reduce((total, dept) => total + dept.cohortSize, 0);
const BUDGET_ALLOCATED = DEPARTMENTS.reduce((total, dept) => total + dept.budgetTotal, 0);
const BUDGET_RELEASED = DEPARTMENTS.reduce((total, dept) => total + dept.budgetDisbursed, 0);
const BUDGET_UTILISED = Math.round((BUDGET_RELEASED / BUDGET_ALLOCATED) * 100);

export const MinistriesDepartmentalPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [campus, setCampus] = useState<string>(DEFAULT_LOCATION);
  const [sortMode, setSortMode] = useState('Headcount (High to Low)');
  const [viewFormat, setViewFormat] = useState<'grid' | 'list'>('grid');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerOpenDialog = useDialog(() => setIsDrawerOpen(false), "New Department Charter");

  // Form State
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDirector, setNewDeptDirector] = useState('');
  const [newDeptBudget, setNewDeptBudget] = useState('25000');
  const [newDeptCohort, setNewDeptCohort] = useState('45');
  const [newDeptSchedule, setNewDeptSchedule] = useState('Alternate Tuesdays 6:30 PM in Fellowship Hall');

  const filteredDepts = DEPARTMENTS.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Visual Metrics & Operating KPI Band */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Governed Entities */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-headline text-xs text-[#59413a] uppercase tracking-wider font-semibold">
              Governed Entities
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#9b2f00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">corporate_fare</span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#1e1b19]">{DEPARTMENT_COUNT}</span>
            <span className="font-headline text-sm text-[#9b2f00] font-semibold">Active</span>
          </div>
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[#f4ece8]">
            <span className="inline-flex items-center text-[#006243] font-headline text-xs font-semibold gap-1">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">check_circle</span>
              100% Chartered
            </span>
            <span className="text-[#59413a] text-xs">· 0 Dormant</span>
          </div>
        </div>

        {/* Metric 2: Total Enrolled Body */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-headline text-xs text-[#59413a] uppercase tracking-wider font-semibold">
              Total Enrolled Body
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#904d00] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">groups_3</span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#1e1b19]">{TOTAL_COHORT}</span>
            <span className="font-headline text-sm text-[#59413a]">Members</span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#f4ece8] text-xs">
            <span className="text-[#59413a]">Across campus operations</span>
            <span className="font-headline text-[#904d00] font-semibold">+4.8% m/m</span>
          </div>
        </div>

        {/* Metric 3: Annual Budget Utilization */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-headline text-xs text-[#59413a] uppercase tracking-wider font-semibold">
              Disbursed Stewardship
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#c2410c] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#1e1b19]">KSh {BUDGET_ALLOCATED.toLocaleString()}</span>
          </div>
          <div className="mt-3 space-y-1.5 pt-2 border-t border-[#f4ece8]">
            <div className="flex justify-between text-xs font-headline">
              <span className="text-[#59413a]">KSh {BUDGET_RELEASED.toLocaleString()} Released</span>
              <span className="text-[#9b2f00] font-bold">{BUDGET_UTILISED}%</span>
            </div>
            <div className="w-full bg-[#f4ece8] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#c2410c] h-full rounded-full transition-all duration-700" style={{ width: `${BUDGET_UTILISED}%` }}></div>
            </div>
          </div>
        </div>

        {/* Metric 4: Safeguarding Compliance */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EAE1D7]/80 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-headline text-xs text-[#59413a] uppercase tracking-wider font-semibold">
              Vetting & Safeguards
            </span>
            <span className="p-2 rounded-xl bg-[#f4ece8] text-[#006243] flex items-center justify-center">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">verified_user</span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#006243]">100%</span>
            <span className="font-headline text-sm text-[#006243] font-semibold">Certified</span>
          </div>
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#f4ece8] text-xs">
            <span className="text-[#59413a]">CPP audits current</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#85f8c4]/30 text-[#005137] font-headline font-semibold">
              Clean
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Control Toolbar */}
      <div className="bg-[#faf2ee] p-3.5 rounded-2xl border border-[#EAE1D7] flex flex-col lg:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Search Field */}
        <div className="relative w-full lg:w-96">
          <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#8d7168] text-[20px]">
            manage_search
          </span>
          <input aria-label="Search department name, director, or code"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search department name, director, or code..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white text-[#1e1b19] placeholder:text-[#8d7168] text-xs border border-[#EAE1D7] focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
          />
        </div>

        {/* Controls & Creation CTA */}
        <div className="flex flex-wrap items-center justify-end w-full lg:w-auto gap-2">
          {/* Campus Selector */}
          <div className="relative">
            <button 
              type="button" 
              className="h-10 px-3.5 rounded-xl bg-white hover:bg-[#f4ece8] text-[#1e1b19] text-xs font-semibold flex items-center gap-2 border border-[#EAE1D7] transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#9b2f00]">domain</span>
              <span>{campus}</span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#8d7168]">keyboard_arrow_down</span>
            </button>
          </div>

          {/* Sort Control */}
          <div className="relative">
            <button 
              type="button"
              className="h-10 px-3.5 rounded-xl bg-white hover:bg-[#f4ece8] text-[#1e1b19] text-xs font-semibold flex items-center gap-2 border border-[#EAE1D7] transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#8d7168]">sort</span>
              <span className="text-[#59413a] font-normal">Sort:</span>
              <span className="font-semibold">{sortMode}</span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#8d7168]">keyboard_arrow_down</span>
            </button>
          </div>

          {/* Add Department Trigger */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            type="button"
            className="h-10 px-4 rounded-xl bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">add_business</span>
            <span>Add New Department</span>
          </button>
        </div>
      </div>

      {/* Active Filter Status & Sub-Counter */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#59413a]">
            Viewing {filteredDepts.length} of {DEPARTMENTS.length} registered ministries
          </span>
          <span className="w-1 h-1 rounded-full bg-[#8d7168]"></span>
          <span className="text-xs font-bold text-[#9b2f00]">
            Active Council 2024–2025
          </span>
        </div>
        <div className="flex items-center gap-1 bg-[#faf2ee] p-1 rounded-lg border border-[#EAE1D7]">
          <button
            onClick={() => setViewFormat('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              viewFormat === 'grid' ? 'bg-white text-[#9b2f00] shadow-xs' : 'text-[#59413a] hover:text-[#1e1b19]'
            }`}
            title="Grid View"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">grid_view</span>
          </button>
          <button
            onClick={() => setViewFormat('list')}
            className={`p-1.5 rounded-md transition-colors ${
              viewFormat === 'list' ? 'bg-white text-[#9b2f00] shadow-xs' : 'text-[#59413a] hover:text-[#1e1b19]'
            }`}
            title="List View"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">table_rows</span>
          </button>
        </div>
      </div>

      {/* 7 Detailed Ministry Cards (Responsive Grid) */}
      <div className={viewFormat === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" : "flex flex-col gap-3"}>
        {filteredDepts.map((dept) => {
          const utilPct = Math.round((dept.budgetDisbursed / dept.budgetTotal) * 100);

          return (
            <div
              key={dept.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-[#EAE1D7]/80 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header & Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#f4ece8] flex items-center justify-center text-[#9b2f00] group-hover:bg-[#ffdbd0] transition-colors shrink-0">
                      <span aria-hidden="true" className="material-symbols-outlined text-[26px]">{dept.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#59413a] font-semibold">{dept.code}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#85f8c4]/30 text-[#005137] text-[10px] font-bold">
                          {dept.statusBadge}
                        </span>
                      </div>
                      <h3 className="font-headline text-base font-bold text-[#1e1b19] mt-0.5">
                        {dept.name}
                      </h3>
                      <p className="text-xs text-[#59413a]">{dept.subtitle}</p>
                    </div>
                  </div>
                  <button aria-label="Department options" className="text-[#8d7168] hover:text-[#1e1b19] p-1 rounded-md" type="button">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </div>

                {/* Headcount & Key Leadership */}
                <div className="mt-4 p-3 bg-[#faf2ee] rounded-xl space-y-2 border border-[#EAE1D7]/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#59413a] flex items-center gap-1.5">
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#9b2f00]">groups</span>
                      {dept.cohortLabel}
                    </span>
                    <span className="font-headline text-sm font-bold text-[#1e1b19]">{dept.cohortSize} {dept.cohortUnit}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-[#EAE1D7]">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${dept.directorColor}`}>
                      {dept.directorInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#1e1b19] truncate">
                        {dept.director} <span className="text-[#59413a] font-normal">({dept.directorRole})</span>
                      </p>
                      {dept.associate && (
                        <p className="text-[11px] text-[#59413a] truncate">{dept.associate}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logistics & Contacts */}
                <div className="mt-3 space-y-1 text-xs text-[#59413a]">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#8d7168]">schedule</span>
                    <span className="truncate">{dept.schedule}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#8d7168]">mail</span>
                    <span className="truncate text-[#1e1b19]">{dept.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#8d7168]">call</span>
                    <span className="truncate">{dept.phone}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {dept.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-[#f4ece8] text-[#59413a] text-[10px] font-medium">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Budget Progress Bar */}
                <div className="mt-3.5 p-3 rounded-xl bg-[#faf2ee] space-y-1.5 border border-[#EAE1D7]/60">
                  <div className="flex justify-between text-xs font-headline">
                    <span className="text-[#59413a]">Budget Disbursed</span>
                    <span className="text-[#9b2f00] font-bold">
                      KSh {dept.budgetDisbursed.toLocaleString()} <span className="font-normal text-[#59413a]">/ KSh {dept.budgetTotal.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#EAE1D7] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#c2410c] h-full rounded-full transition-all duration-500" style={{ width: `${utilPct}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#59413a]">
                    <span>{utilPct}% Utilized</span>
                    <span>KSh {(dept.budgetTotal - dept.budgetDisbursed).toLocaleString()} Remaining</span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-4 pt-3 border-t border-[#f4ece8] flex items-center justify-between">
                <button className="text-xs text-[#59413a] hover:text-[#1e1b19] font-semibold flex items-center gap-1" type="button">
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">badge</span>
                  Manage Roster
                </button>
                <button className="text-xs text-[#9b2f00] hover:text-[#c2410c] font-semibold flex items-center gap-1" type="button">
                  <span>View Details</span>
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDepts.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center space-y-3 border border-[#EAE1D7]">
          <div className="w-12 h-12 rounded-full bg-[#f4ece8] text-[#59413a] flex items-center justify-center mx-auto">
            <span aria-hidden="true" className="material-symbols-outlined text-[24px]">search_off</span>
          </div>
          <h4 className="font-headline text-base font-bold text-[#1e1b19]">No ministries match your query</h4>
          <p className="text-xs text-[#59413a] max-w-sm mx-auto">Try clearing search terms or verifying spelling for department codes and leaders.</p>
          <button 
            onClick={() => setSearchQuery('')}
            className="inline-flex items-center gap-1 text-[#9b2f00] text-xs font-bold hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Quick Department Creation Drawer / Modal (Warm Ember overlay) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" {...drawerOpenDialog}>
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE1D7]">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[24px]">domain_add</span>
                  <h2 className="font-headline text-lg font-bold text-[#1e1b19]">New Department Charter</h2>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-[#59413a] hover:bg-[#f4ece8] transition-colors"
                aria-label="Close">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Form Fields */}
              <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                <div>
                  <label htmlFor="ministry-name" className="block text-xs font-semibold text-[#1e1b19] mb-1">Ministry Name</label>
                  <input id="ministry-name" aria-label="Ministry Name"
                    type="text"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="e.g. Media & Sacred Arts"
                    required
                    className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ministry-code" className="block text-xs font-semibold text-[#1e1b19] mb-1">Ministry Code</label>
                    <input id="ministry-code" aria-label="Ministry Code"
                      type="text"
                      value={newDeptCode}
                      onChange={(e) => setNewDeptCode(e.target.value)}
                      placeholder="e.g. MS-08"
                      className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs uppercase focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="ministry-campus" className="block text-xs font-semibold text-[#1e1b19] mb-1">Campus</label>
                    <select id="ministry-campus" aria-label="Campus" className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none">
                      {LOCATIONS.map((location) => (
                        <option key={location}>{location}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="ministry-director" className="block text-xs font-semibold text-[#1e1b19] mb-1">Lead Director / Pastor</label>
                  <input id="ministry-director" aria-label="Lead Director / Pastor"
                    type="text"
                    value={newDeptDirector}
                    onChange={(e) => setNewDeptDirector(e.target.value)}
                    placeholder="Search ordained or elder personnel..."
                    className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ministry-allocation" className="block text-xs font-semibold text-[#1e1b19] mb-1">Annual Allocation (KSh)</label>
                    <input id="ministry-allocation" aria-label="Annual Allocation (KSh)"
                      type="number"
                      value={newDeptBudget}
                      onChange={(e) => setNewDeptBudget(e.target.value)}
                      placeholder="25,000"
                      className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="ministry-cohort" className="block text-xs font-semibold text-[#1e1b19] mb-1">Initial Target Cohort</label>
                    <input id="ministry-cohort" aria-label="Initial Target Cohort"
                      type="number"
                      value={newDeptCohort}
                      onChange={(e) => setNewDeptCohort(e.target.value)}
                      placeholder="45"
                      className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ministry-schedule" className="block text-xs font-semibold text-[#1e1b19] mb-1">Regular Meeting Rhythm</label>
                  <input id="ministry-schedule" aria-label="Regular Meeting Rhythm"
                    type="text"
                    value={newDeptSchedule}
                    onChange={(e) => setNewDeptSchedule(e.target.value)}
                    placeholder="e.g. Alternate Tuesdays 6:30 PM in Fellowship Hall"
                    className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                  />
                </div>

                <div className="p-3.5 bg-[#faf2ee] rounded-xl flex items-start gap-3 border border-[#EAE1D7]">
                  <span aria-hidden="true" className="material-symbols-outlined text-[#c2410c] text-[20px] mt-0.5">verified_user</span>
                  <div className="text-xs text-[#59413a]">
                    <span className="font-semibold text-[#1e1b19] block mb-0.5">Mandatory Child Protection Protocol</span>
                    Departments engaging minors require CPP credential registration prior to launch.
                  </div>
                </div>
              </form>
            </div>

            {/* Drawer Footer Buttons */}
            <div className="pt-4 border-t border-[#EAE1D7] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#59413a] hover:bg-[#f4ece8] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#9b2f00] hover:bg-[#c2410c] text-white text-xs font-bold shadow-sm transition-colors"
              >
                Create Department
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
