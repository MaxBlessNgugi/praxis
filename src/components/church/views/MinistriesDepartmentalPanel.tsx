import React, { useState } from 'react';
import { CHURCH, DEFAULT_LOCATION, LOCATIONS } from '../../../data/churchDomain';
import { 
  Building2, 
  Users, 
  Wallet, 
  ShieldCheck, 
  Search, 
  Plus, 
  MoreVertical, 
  Calendar, 
  Mail, 
  Phone, 
  ArrowRight, 
  CheckCircle, 
  X,
  ArrowUpDown,
  Filter,
  Grid,
  List
} from 'lucide-react';

interface Department {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  category: string;
  statusBadge: string;
  cohortCount: string;
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
  remainingText: string;
}

const DEPARTMENTS: Department[] = [
  {
    id: 'mv-01',
    code: 'MV-01',
    name: 'Men of Valor',
    subtitle: 'Brotherhood & Discipleship',
    category: 'Men',
    statusBadge: 'Chartered',
    cohortCount: '184 Men',
    cohortLabel: 'Active Cohort',
    icon: 'shield',
    director: 'Elder Marcus Jenkins',
    directorRole: 'Director',
    directorInitials: 'MJ',
    directorColor: 'bg-[#ffdbd0] text-[#9b2f00]',
    associate: 'Assoc: Timothy Vance',
    schedule: 'Meets: Alternate Saturdays · 7:30 AM',
    email: 'marcus.j@destinysanctuary.co.ke',
    phone: '+254 734 567 120',
    tags: ["Men's Retreat", "Saturday Breakfast", "Mentorship"],
    budgetDisbursed: 31500,
    budgetTotal: 42000,
    remainingText: 'KSh 10,500 Remaining',
  },
  {
    id: 'dg-02',
    code: 'DG-02',
    name: 'Daughters of Grace',
    subtitle: "Women's Fellowship",
    category: 'Women',
    statusBadge: 'Chartered',
    cohortCount: '226 Women',
    cohortLabel: 'Active Cohort',
    icon: 'spa',
    director: 'Rev. Sarah Alistair',
    directorRole: 'Director',
    directorInitials: 'SA',
    directorColor: 'bg-[#ffdcc3] text-[#904d00]',
    associate: 'Counselor: Martha Miller',
    schedule: 'Meets: Thursdays · 7:00 PM',
    email: 'sarah.a@destinysanctuary.co.ke',
    phone: '+254 778 901 230',
    tags: ["Sisterhood Circles", "Annual Conference", "Benevolence Quilt"],
    budgetDisbursed: 46480,
    budgetTotal: 56000,
    remainingText: 'KSh 9,520 Remaining',
  },
  {
    id: 'ay-03',
    code: 'AY-03',
    name: 'Apex Youth Ministry',
    subtitle: 'Teens & High School',
    category: 'Youth',
    statusBadge: 'High Activity',
    cohortCount: '112 Teens',
    cohortLabel: 'Active Cohort',
    icon: 'local_fire_department',
    director: 'Hannah Abbott',
    directorRole: 'Youth Pastor',
    directorInitials: 'HA',
    directorColor: 'bg-[#ffdbd0] text-[#9b2f00]',
    associate: 'Campus Youth Loft Wing',
    schedule: 'Meets: Fridays · 6:30 PM (Youth Loft)',
    email: 'david.a@destinysanctuary.co.ke',
    phone: '+254 756 789 340',
    tags: ["Friday Live Worship", "Summer Camp", "Confirmation Class"],
    budgetDisbursed: 57800,
    budgetTotal: 68000,
    remainingText: 'KSh 10,200 Remaining',
  },
  {
    id: 'kk-04',
    code: 'KK-04',
    name: 'Kingdom Kids',
    subtitle: 'Children & Nursery (Ages 0–12)',
    category: 'Children',
    statusBadge: 'CPP Verified',
    cohortCount: '148 Kids',
    cohortLabel: 'Enrolled Children',
    icon: 'toys',
    director: 'Elena Vance',
    directorRole: "Children's Director",
    directorInitials: 'EV',
    directorColor: 'bg-[#ffdcc3] text-[#904d00]',
    associate: '28 Vetted Background Staff',
    schedule: 'Meets: Sundays · 9:00 & 11:00 AM',
    email: 'elena.vance@destinysanctuary.co.ke',
    phone: '+254 767 890 450',
    tags: ["KidCheck Secure Wing", "VBS Summer", "Nursery Care"],
    budgetDisbursed: 39000,
    budgetTotal: 52000,
    remainingText: 'KSh 13,000 Remaining',
  },
  {
    id: 'mb-05',
    code: 'MB-05',
    name: 'Mercy & Benevolence',
    subtitle: 'Community Welfare & Outreach',
    category: 'Outreach',
    statusBadge: 'Community Core',
    cohortCount: '52 Volunteers',
    cohortLabel: 'Volunteer Corps',
    icon: 'volunteer_activism',
    director: 'Deaconess Clara Oswald',
    directorRole: 'Almoner',
    directorInitials: 'CO',
    directorColor: 'bg-[#ffdbd0] text-[#9b2f00]',
    associate: 'Assoc: Arthur Miller · 38 Fam/Mo',
    schedule: 'HQ: Food Pantry Annex · Tue & Sat',
    email: 'clara.oswald@destinysanctuary.co.ke',
    phone: '+254 778 901 560',
    tags: ["Food Bank", "Emergency Fuel", "Senior Visitation"],
    budgetDisbursed: 32980,
    budgetTotal: 48500,
    remainingText: 'KSh 15,520 Remaining',
  },
  {
    id: 'ba-06',
    code: 'BA-06',
    name: 'Berean Academy',
    subtitle: 'Bible School & Discipleship',
    category: 'Education',
    statusBadge: 'Academic',
    cohortCount: '76 Students',
    cohortLabel: 'Enrolled Students',
    icon: 'menu_book',
    director: 'Dr. Jonathan Edwards',
    directorRole: 'Dean',
    directorInitials: 'JE',
    directorColor: 'bg-[#ffdcc3] text-[#904d00]',
    associate: '5 Residential & Guest Faculty',
    schedule: 'Location: Seminars Hall A · Mon/Wed Eve',
    email: 'j.edwards@berean.destinysanctuary.co.ke',
    phone: '+254 745 678 230',
    tags: ["Hermeneutics", "Systematic Theology", "Catechism"],
    budgetDisbursed: 21760,
    budgetTotal: 34000,
    remainingText: 'KSh 12,240 Remaining',
  },
  {
    id: 'pc-07',
    code: 'PC-07',
    name: 'Clergy & Pastoral Team',
    subtitle: 'Clergy & Council Oversight',
    category: 'Church Council',
    statusBadge: 'Pastoral Team',
    cohortCount: '14 Clergy & Elders',
    cohortLabel: 'Church Council Bench',
    icon: 'account_balance',
    director: 'Bishop Sammy',
    directorRole: 'Bishop & Visionary Leader',
    directorInitials: 'BS',
    directorColor: 'bg-[#ffdbd0] text-[#9b2f00]',
    associate: 'Rev. Alice · Church Administrator',
    schedule: 'Meets: 1st Tuesday · Council Room',
    email: 'bishop@destinysanctuary.co.ke',
    phone: CHURCH.phone,
    tags: ["Counseling", "Pulpit Supply", "Doctrinal Oversight"],
    budgetDisbursed: 12280,
    budgetTotal: 24000,
    remainingText: 'KSh 11,720 Remaining',
  },
];

/** Roster size, so the Ministries tab badge can't drift from the grid it counts. */
export const DEPARTMENT_COUNT = DEPARTMENTS.length;

export const MinistriesDepartmentalPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [campus, setCampus] = useState<string>(DEFAULT_LOCATION);
  const [sortMode, setSortMode] = useState('Headcount (High to Low)');
  const [viewFormat, setViewFormat] = useState<'grid' | 'list'>('grid');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
            <span className="font-headline text-3xl font-bold text-[#1e1b19]">7</span>
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
            <span className="font-headline text-3xl font-bold text-[#1e1b19]">842</span>
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
            <span className="font-headline text-3xl font-bold text-[#1e1b19]">KSh 324,500</span>
          </div>
          <div className="mt-3 space-y-1.5 pt-2 border-t border-[#f4ece8]">
            <div className="flex justify-between text-xs font-headline">
              <span className="text-[#59413a]">KSh 241,800 Released</span>
              <span className="text-[#9b2f00] font-bold">74.5%</span>
            </div>
            <div className="w-full bg-[#f4ece8] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#c2410c] h-full rounded-full transition-all duration-700" style={{ width: '74.5%' }}></div>
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
                    <span className="font-headline text-sm font-bold text-[#1e1b19]">{dept.cohortCount}</span>
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
                    <span>{dept.remainingText}</span>
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
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
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
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Form Fields */}
              <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                <div>
                  <label className="block text-xs font-semibold text-[#1e1b19] mb-1">Ministry Name</label>
                  <input aria-label="Ministry Name"
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
                    <label className="block text-xs font-semibold text-[#1e1b19] mb-1">Ministry Code</label>
                    <input aria-label="Ministry Code"
                      type="text"
                      value={newDeptCode}
                      onChange={(e) => setNewDeptCode(e.target.value)}
                      placeholder="e.g. MS-08"
                      className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs uppercase focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1e1b19] mb-1">Campus</label>
                    <select aria-label="Campus" className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none">
                      {LOCATIONS.map((location) => (
                        <option key={location}>{location}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1e1b19] mb-1">Lead Director / Pastor</label>
                  <input aria-label="Lead Director / Pastor"
                    type="text"
                    value={newDeptDirector}
                    onChange={(e) => setNewDeptDirector(e.target.value)}
                    placeholder="Search ordained or elder personnel..."
                    className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1e1b19] mb-1">Annual Allocation (KSh)</label>
                    <input aria-label="Annual Allocation (KSh)"
                      type="number"
                      value={newDeptBudget}
                      onChange={(e) => setNewDeptBudget(e.target.value)}
                      placeholder="25,000"
                      className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1e1b19] mb-1">Initial Target Cohort</label>
                    <input aria-label="Initial Target Cohort"
                      type="number"
                      value={newDeptCohort}
                      onChange={(e) => setNewDeptCohort(e.target.value)}
                      placeholder="45"
                      className="w-full h-10 px-3 rounded-xl bg-[#faf2ee] border border-[#EAE1D7] text-[#1e1b19] text-xs focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1e1b19] mb-1">Regular Meeting Rhythm</label>
                  <input aria-label="Regular Meeting Rhythm"
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
