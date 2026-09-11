import React, { useState } from 'react';
import { AdminSubTab } from '../../../types';

interface TrashItem {
  id: string;
  name: string;
  recordType: 'Members & Pastoral Care' | 'Giving & Stewardship' | 'Governance & Council' | 'Ministries & Groups' | 'Reports & Certificates';
  recordId: string;
  deletedBy: string;
  daysRemaining: number;
  expiryDate: string;
  isExpiringSoon: boolean;
  rationale: string;
}

const INITIAL_TRASH_ITEMS: TrashItem[] = [
  {
    id: 'trash-1',
    name: 'Elena Vance',
    recordType: 'Members & Pastoral Care',
    recordId: '#MBR-1082',
    deletedBy: 'Deaconess Clara Oswald',
    daysRemaining: 2,
    expiryDate: 'Nov 19',
    isExpiringSoon: true,
    rationale: 'Duplicate household entry during autumn census reconciliation; preserved for confirmation record cross-check.',
  },
  {
    id: 'trash-2',
    name: 'Batch #041 Draft Tithe Slips',
    recordType: 'Giving & Stewardship',
    recordId: '#TTH-8821',
    deletedBy: 'Hannah Abbott (Bookkeeper)',
    daysRemaining: 26,
    expiryDate: 'Dec 13',
    isExpiringSoon: false,
    rationale: 'Draft tithe batch superseded by automated ACH reconciliation ledger #8822.',
  },
  {
    id: 'trash-3',
    name: 'Q3 Session Minutes (Redacted Draft)',
    recordType: 'Governance & Council',
    recordId: '#GOV-509',
    deletedBy: 'Pastor David Alistair',
    daysRemaining: 1,
    expiryDate: 'Nov 18',
    isExpiringSoon: true,
    rationale: 'Preliminary session working notes replaced by final ratified minutes with pastoral seal.',
  },
  {
    id: 'trash-4',
    name: 'High School Autumn Retreat Roster',
    recordType: 'Ministries & Groups',
    recordId: '#MIN-0244',
    deletedBy: 'Elder Marcus Brody',
    daysRemaining: 21,
    expiryDate: 'Dec 08',
    isExpiringSoon: false,
    rationale: 'Re-assigned volunteer slotting table merged into master youth event ledger.',
  },
  {
    id: 'trash-5',
    name: 'Certificate of Infant Dedication (Misspelled)',
    recordType: 'Reports & Certificates',
    recordId: '#CERT-912',
    deletedBy: 'Deaconess Clara Oswald',
    daysRemaining: 2,
    expiryDate: 'Nov 19',
    isExpiringSoon: true,
    rationale: 'Typographical error in middle surname; correct certificate re-issued under #CERT-913.',
  },
];

interface AuditBlock {
  height: number;
  timestamp: string;
  title: string;
  type: string;
  amount: string;
  isCredit: boolean;
  fund: string;
  officer: string;
  dualWitness: string;
  hash: string;
  fullHash: string;
}

const AUDIT_BLOCKS: AuditBlock[] = [
  {
    height: 48192,
    timestamp: 'Nov 17, 2024 • 11:42:15 AM EST',
    title: 'Sunday Loose Plate Reconciled',
    type: 'Offering Audit',
    amount: '+$3,410.50',
    isCredit: true,
    fund: 'General Operating Fund #101',
    officer: 'Deaconess Clara Oswald',
    dualWitness: 'Pr. Michael Vance (2 Signatures Confirmed)',
    hash: '0x7a8b...39fc',
    fullHash: '0x7a8b8c2d91ef45a8b7c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a139fc',
  },
  {
    height: 48191,
    timestamp: 'Nov 17, 2024 • 09:15:02 AM EST',
    title: 'Welfare Disbursement Approved',
    type: 'Benevolence Voucher',
    amount: '-$850.00',
    isCredit: false,
    fund: 'Benevolence Escrow #402',
    officer: 'Elder Marcus Jenkins',
    dualWitness: 'Treasurer Sarah Lin (2 Signatures Confirmed)',
    hash: '0x992f...e412',
    fullHash: '0x992fe412b189cc372a884ef90123cbfa91448bca1209774619d8213ba9741e412',
  },
  {
    height: 48190,
    timestamp: 'Nov 16, 2024 • 04:30:19 PM EST',
    title: 'Sanctuary Capital Escrow Wire',
    type: 'Trustee Wire',
    amount: '-$50,000.00',
    isCredit: false,
    fund: 'Building Expansion Fund #610',
    officer: 'Treasurer Sarah Lin',
    dualWitness: '3 Tri-Key Attestation (Pr. Vance, A. Miller, S. Lin)',
    hash: '0x4e88...77ca',
    fullHash: '0x4e8877ca918823ddbf992147ae55341299abceef87625100aa762149bb4477ca',
  },
  {
    height: 48189,
    timestamp: 'Nov 16, 2024 • 01:12:44 PM EST',
    title: 'Tithe Batch Ingestion',
    type: 'Automated ACH Clearing',
    amount: '+$14,280.00',
    isCredit: true,
    fund: 'General Operating Fund #101',
    officer: 'System Payment Bridge',
    dualWitness: 'Automated Stripe Direct Batch #9011',
    hash: '0xaa71...004b',
    fullHash: '0xaa71004b8832aaeef9100123984ca3b2c1d0e9f8a7b6c5d4e3f2a1772188004b',
  },
  {
    height: 48188,
    timestamp: 'Nov 15, 2024 • 05:22:10 PM EST',
    title: 'Inter-Fund Reallocation',
    type: 'Session Approved Rebalance',
    amount: '$12,000.00 Rebalance',
    isCredit: true,
    fund: '#101 → Missions Reserve #204',
    officer: 'Pr. Michael Vance',
    dualWitness: 'Elder Marcus Jenkins (Session Resolution RES-2024-039)',
    hash: '0x38bf...884d',
    fullHash: '0x38bf884deca1190227bbfa99142388019ab9872134567890abcdef123456884d',
  },
];

interface AdminSecurityViewProps {
  initialSubTab?: AdminSubTab;
  onSubTabChange?: (tab: AdminSubTab) => void;
}

export const AdminSecurityView: React.FC<AdminSecurityViewProps> = ({
  initialSubTab = 'users-rights',
  onSubTabChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>(initialSubTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Users & Rights states
  const [searchRoles, setSearchRoles] = useState('');
  const [parishUnit, setParishUnit] = useState('Downtown Sanctuary #01');
  const [hasPendingChanges, setHasPendingChanges] = useState(true);

  // Trash states
  const [trashItems, setTrashItems] = useState<TrashItem[]>(INITIAL_TRASH_ITEMS);
  const [trashFilter, setTrashFilter] = useState('All Record Types (14)');
  const [searchTrash, setSearchTrash] = useState('');
  const [demoEmptyTrash, setDemoEmptyTrash] = useState(false);
  const [purgeModalItem, setPurgeModalItem] = useState<TrashItem | null>(null);
  const [purgePasscode, setPurgePasscode] = useState('');
  const [trashPoliciesDrawer, setTrashPoliciesDrawer] = useState(false);

  // Finance Audit states
  const [searchAudit, setSearchAudit] = useState('');
  const [selectedAuditBlock, setSelectedAuditBlock] = useState<AuditBlock | null>(null);
  const [auditFilterType, setAuditFilterType] = useState('All Event Types');
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSubTabSwitch = (tab: AdminSubTab) => {
    setActiveSubTab(tab);
    onSubTabChange?.(tab);
  };

  const handleRestoreTrash = (item: TrashItem) => {
    setTrashItems(trashItems.filter((i) => i.id !== item.id));
    showToast(`Record "${item.name}" (${item.recordId}) successfully restored to live active registry.`);
  };

  const handleConfirmPurge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purgeModalItem) return;
    setTrashItems(trashItems.filter((i) => i.id !== purgeModalItem.id));
    showToast(`Record "${purgeModalItem.name}" permanently expunged with dual-key authorization.`);
    setPurgeModalItem(null);
    setPurgePasscode('');
  };

  const handleVerifyChain = () => {
    setIsVerifyingChain(true);
    setTimeout(() => {
      setIsVerifyingChain(false);
      showToast("Merkle Chain Audit Complete: 1,420 blocks verified with zero discrepancies. Root hash intact.");
    }, 1200);
  };

  return (
    <div className="flex flex-col w-full gap-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-[#1e1b19] text-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <span className="material-symbols-outlined text-[#85f8c4] text-[20px]">check_circle</span>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[#59413a] font-headline text-xs tracking-wide uppercase font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c2410c]"></span>
              <span>Immutable Ledger & Compliance • Cryptographically Attested</span>
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl text-[#1e1b19] font-bold tracking-tight">
              Admin & System Security
            </h1>
            <p className="text-xs sm:text-sm text-[#59413a] max-w-2xl">
              Granular ecclesiastical access governance, permission matrix, and role credential management.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleVerifyChain}
              disabled={isVerifyingChain}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#eee7e3] text-[#1e1b19] font-semibold text-xs hover:bg-[#e9e1dd] transition-colors shadow-sm cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[19px] text-[#006243] ${isVerifyingChain ? 'animate-spin' : ''}`}>
                lock
              </span>
              <span>{isVerifyingChain ? 'Verifying Hashes...' : 'Verify Merkle Root'}</span>
            </button>
            <button
              type="button"
              onClick={() => showToast("Exporting complete Presbytery Audit Dossier (CSV/PDF bundle)...")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#c2410c] text-white font-semibold text-xs hover:bg-[#9b2f00] transition-all shadow-[0_2px_8px_rgba(194,65,12,0.25)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[19px]">file_download</span>
              <span>Export Audit Dossier</span>
            </button>
          </div>
        </div>

        {/* SUB-TABS NAVIGATION BAR */}
        <div className="flex items-center gap-2 border-b border-[#e1bfb5]/40 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleSubTabSwitch('users-rights')}
            className={`px-4 py-2 rounded-lg font-headline text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'users-rights'
                ? 'bg-[#c2410c] text-white shadow-sm'
                : 'bg-white text-[#59413a] hover:text-[#1e1b19] hover:bg-[#faf2ee] border border-[#e1bfb5]/40'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            <span>Users & Rights (8 Roles)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubTabSwitch('trash')}
            className={`px-4 py-2 rounded-lg font-headline text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'trash'
                ? 'bg-[#c2410c] text-white shadow-sm'
                : 'bg-white text-[#59413a] hover:text-[#1e1b19] hover:bg-[#faf2ee] border border-[#e1bfb5]/40'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
            <span>Trash ({trashItems.length} Items)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubTabSwitch('finance-audit')}
            className={`px-4 py-2 rounded-lg font-headline text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'finance-audit'
                ? 'bg-[#c2410c] text-white shadow-sm'
                : 'bg-white text-[#59413a] hover:text-[#1e1b19] hover:bg-[#faf2ee] border border-[#e1bfb5]/40'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span>Finance Audit (Read-Only • 1,420 Events)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: USERS & RIGHTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'users-rights' && (
        <div className="flex flex-col gap-6">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#e1bfb5]/40 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#f4ece8] flex items-center justify-center shrink-0 text-[#c2410c]">
                <span className="material-symbols-outlined text-[22px]">manage_accounts</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[#59413a] truncate">Total Managed Accounts</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-headline text-[#1e1b19] font-bold">34 Staff & Clergy</span>
                </div>
                <span className="text-[10px] text-[#006243] font-bold">MFA Enforced: 100%</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#e1bfb5]/40 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#ffdcc3]/40 flex items-center justify-center shrink-0 text-[#904d00]">
                <span className="material-symbols-outlined text-[22px]">badge</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[#59413a] truncate">Ecclesiastical Roles</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-headline text-[#1e1b19] font-bold">8 Configured</span>
                </div>
                <span className="text-[10px] text-[#59413a]">3 System Native, 5 Delegated</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#e1bfb5]/40 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#ffdbd0] flex items-center justify-center shrink-0 text-[#9b2f00]">
                <span className="material-symbols-outlined text-[22px]">security</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[#59413a] truncate">Session Security</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-headline text-[#1e1b19] font-bold">TLS 1.3 Strict</span>
                </div>
                <span className="text-[10px] text-[#59413a]">Auto-logout: 15m idle</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#e1bfb5]/40 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#007d57]/15 flex items-center justify-center shrink-0 text-[#006243]">
                <span className="material-symbols-outlined text-[22px]">verified</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[#59413a] truncate">Permission Status</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-headline text-[#006243] font-bold">Audit Certified</span>
                </div>
                <span className="text-[10px] text-[#59413a]">Signed by Pastor M. Vance</span>
              </div>
            </div>
          </div>

          {/* Matrix Filter & Search toolbar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e1bfb5]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#59413a] text-[18px]">search</span>
              <input
                type="text"
                value={searchRoles}
                onChange={(e) => setSearchRoles(e.target.value)}
                placeholder="Search permission names, role definitions..."
                className="w-full h-9 pl-9 pr-3 bg-[#faf2ee] rounded-lg text-xs font-medium text-[#1e1b19] placeholder:text-[#8d7168] focus:outline-none focus:bg-white border border-[#e1bfb5]/40"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={parishUnit}
                onChange={(e) => setParishUnit(e.target.value)}
                className="h-9 px-3 rounded-lg bg-[#faf2ee] text-xs font-medium text-[#1e1b19] border border-[#e1bfb5]/40 focus:outline-none cursor-pointer"
              >
                <option>Downtown Sanctuary #01</option>
                <option>Eastside Chapel #02</option>
                <option>All Parish Campuses</option>
              </select>
              <button
                type="button"
                onClick={() => showToast("Opening Ecclesiastical RBAC Presets modal...")}
                className="px-3.5 py-2 rounded-lg bg-[#eee7e3] text-[#1e1b19] text-xs font-bold hover:bg-[#e9e1dd] cursor-pointer"
              >
                Presets
              </button>
            </div>
          </div>

          {/* Table of 8 Roles with Granular Functional Access Clusters */}
          <div className="bg-white rounded-xl shadow-sm border border-[#e1bfb5]/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f4ece8] text-[#59413a] text-[11px] font-headline font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 min-w-[200px]">Role Title & Scope</th>
                    <th className="py-3.5 px-3 text-center">Members & Pastoral</th>
                    <th className="py-3.5 px-3 text-center">Worship & Liturgy</th>
                    <th className="py-3.5 px-3 text-center">Stewardship & Giving</th>
                    <th className="py-3.5 px-3 text-center">Governance & Session</th>
                    <th className="py-3.5 px-3 text-center">Ministries & Groups</th>
                    <th className="py-3.5 px-3 text-center">Reports & Archives</th>
                    <th className="py-3.5 px-4 text-right">Status / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1bfb5]/30 text-xs text-[#1e1b19]">
                  {/* Role 1: Senior Pastor */}
                  <tr className="hover:bg-[#faf2ee]/60 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-[#1e1b19]">Senior Pastor / Lead Clergy</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#007d57]/10 text-[#006243] text-[10px] font-bold">Immutable</span>
                        </div>
                        <span className="text-[11px] text-[#59413a]">Full sovereign access across parish modules</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-xs font-bold text-[#59413a] bg-[#eee7e3] px-2.5 py-1 rounded-md">Root Sovereign</span>
                    </td>
                  </tr>

                  {/* Role 2: Ruling Elder / Clerk */}
                  <tr className="hover:bg-[#faf2ee]/60 transition-colors bg-[#faf2ee]/30">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-[#1e1b19]">Ruling Elder / Session Clerk</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#ffdbd0] text-[#9b2f00] text-[10px] font-bold">System Native</span>
                        </div>
                        <span className="text-[11px] text-[#59413a]">Session meeting docket, canonical seals & minutes</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        type="button"
                        onClick={() => showToast("Reviewing Ruling Elder permission cluster...")}
                        className="text-xs font-bold text-[#c2410c] hover:underline cursor-pointer"
                      >
                        Edit Cluster
                      </button>
                    </td>
                  </tr>

                  {/* Role 3: Deacon & Treasurer */}
                  <tr className="hover:bg-[#faf2ee]/60 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-[#1e1b19]">Deacon & Parish Treasurer</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#ffdcc3] text-[#904d00] text-[10px] font-bold">Stewardship</span>
                        </div>
                        <span className="text-[11px] text-[#59413a]">Dual-custody treasury, disbursements, and benevolence</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="text-gray-300">—</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        type="button"
                        onClick={() => showToast("Reviewing Deacon & Treasurer dual-custody cluster...")}
                        className="text-xs font-bold text-[#c2410c] hover:underline cursor-pointer"
                      >
                        Edit Cluster
                      </button>
                    </td>
                  </tr>

                  {/* Role 4: Pastoral Counselor */}
                  <tr className="hover:bg-[#faf2ee]/60 transition-colors bg-[#faf2ee]/30">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-[#1e1b19]">Pastoral Counselor</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#eee7e3] text-[#59413a] text-[10px] font-bold">Confidential</span>
                        </div>
                        <span className="text-[11px] text-[#59413a]">Pastoral care notes, prayer circles, and house visits</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="text-gray-300">—</span></td>
                    <td className="py-4 px-3 text-center"><span className="text-gray-300">—</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="text-gray-300">—</span></td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        type="button"
                        onClick={() => showToast("Reviewing Pastoral Counselor confidential access...")}
                        className="text-xs font-bold text-[#c2410c] hover:underline cursor-pointer"
                      >
                        Edit Cluster
                      </button>
                    </td>
                  </tr>

                  {/* Role 5: Ministry Department Director */}
                  <tr className="hover:bg-[#ffdcc3]/20 transition-colors bg-[#ffdcc3]/10">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-[#1e1b19]">Ministry Department Director</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#ffdbd0] text-[#9b2f00] text-[10px] font-bold animate-pulse">2 Changes Pending</span>
                        </div>
                        <span className="text-[11px] text-[#59413a]">Department charters, volunteer rosters, and event budgets</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#9b2f00] text-[20px] font-bold">add_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#9b2f00] text-[20px] font-bold">add_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="text-gray-300">—</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        type="button"
                        onClick={() => showToast("Inspecting pending changes for Ministry Director role.")}
                        className="text-xs font-bold text-[#9b2f00] hover:underline cursor-pointer"
                      >
                        Review Adjustments
                      </button>
                    </td>
                  </tr>

                  {/* Role 6: Safeguarding & CPP Officer */}
                  <tr className="hover:bg-[#faf2ee]/60 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-[#1e1b19]">Safeguarding & CPP Officer</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#007d57]/15 text-[#006243] text-[10px] font-bold">CPP Certified</span>
                        </div>
                        <span className="text-[11px] text-[#59413a]">Background clearances, child safety check-in, incident audits</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="text-gray-300">—</span></td>
                    <td className="py-4 px-3 text-center"><span className="text-gray-300">—</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        type="button"
                        onClick={() => showToast("Reviewing Safeguarding Officer clearance matrix...")}
                        className="text-xs font-bold text-[#c2410c] hover:underline cursor-pointer"
                      >
                        Edit Cluster
                      </button>
                    </td>
                  </tr>

                  {/* Role 7: Volunteer Team Lead */}
                  <tr className="hover:bg-[#faf2ee]/60 transition-colors bg-[#faf2ee]/30">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-[#1e1b19]">Volunteer Team Lead</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#eee7e3] text-[#59413a] text-[10px] font-bold">Operational</span>
                        </div>
                        <span className="text-[11px] text-[#59413a]">Roster scheduling, attendance check-in, volunteer swap</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center"><span className="text-gray-300">—</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="text-gray-300">—</span></td>
                    <td className="py-4 px-3 text-center"><span className="text-gray-300">—</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#006243] text-[20px]">check_circle</span></td>
                    <td className="py-4 px-3 text-center"><span className="text-gray-300">—</span></td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        type="button"
                        onClick={() => showToast("Reviewing Volunteer Lead access limits...")}
                        className="text-xs font-bold text-[#c2410c] hover:underline cursor-pointer"
                      >
                        Edit Cluster
                      </button>
                    </td>
                  </tr>

                  {/* Role 8: Presbytery Auditor */}
                  <tr className="hover:bg-[#faf2ee]/60 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-[#1e1b19]">Presbytery External Auditor</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#eee7e3] text-[#59413a] text-[10px] font-bold">Observer</span>
                        </div>
                        <span className="text-[11px] text-[#59413a]">Read-only aggregate census, verified minutes, financial trail</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-3 text-center"><span className="material-symbols-outlined text-[#59413a] text-[20px]">visibility</span></td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-xs font-semibold text-[#59413a] bg-[#eee7e3] px-2.5 py-1 rounded-md">Read-Only</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky Floating Action Dock */}
          {hasPendingChanges && (
            <div className="p-4 rounded-xl bg-[#faf2ee] border border-[#e1bfb5] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#ffdcc3] flex items-center justify-center text-[#904d00] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">pending</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-[#1e1b19] font-headline">2 unsaved adjustments detected.</span>
                  <p className="text-[11px] text-[#59413a]">Pending changes in Ministry Department Director awaiting session clerk ratification.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setHasPendingChanges(false);
                    showToast("Pending role adjustments discarded.");
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-white hover:bg-[#f4ece8] text-xs font-bold text-[#59413a] border border-[#e1bfb5]/50 cursor-pointer"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasPendingChanges(false);
                    showToast("Role updates ratified and signed into access ledger.");
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save & Apply Changes
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: TRASH & CANONICAL RETENTION VAULT */}
      {/* ========================================================================= */}
      {activeSubTab === 'trash' && (
        <div className="flex flex-col gap-6">
          {/* Canonic Retention Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#ffdbd0]/60 via-[#ffdcc3]/40 to-[#faf2ee] border border-[#e1bfb5] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#9b2f00] shadow-sm shrink-0 border border-[#e1bfb5]/40">
                <span className="material-symbols-outlined text-[26px]">lock_clock</span>
              </div>
              <div>
                <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                  Canonic Retention Window & Custody
                </h3>
                <p className="text-xs text-[#59413a] max-w-2xl mt-0.5 leading-relaxed">
                  All soft-deleted parishioners, financial batches, and meeting minutes remain quarantined in this vault for 30 days before permanent ecclesiastical purge. Recovery requires Clerk / Senior Pastor credential dual-authorization.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setTrashPoliciesDrawer(true)}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#faf2ee] text-xs font-bold text-[#1e1b19] border border-[#e1bfb5]/50 shadow-sm cursor-pointer"
              >
                Trash Policies
              </button>
              <button
                type="button"
                onClick={() => showToast("Checking 30-day purge criteria... No records exceed 30 days today.")}
                className="px-3.5 py-2 rounded-lg bg-[#9b2f00] hover:bg-[#832600] text-xs font-bold text-white shadow-sm cursor-pointer"
              >
                Purge Expired (30+ Days)
              </button>
            </div>
          </div>

          {/* 3 KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#e1bfb5]/40 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#f4ece8] flex items-center justify-center shrink-0 text-[#c2410c]">
                <span className="material-symbols-outlined text-[22px]">auto_delete</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[#59413a]">Recoverable Records</span>
                <span className="text-xl font-headline text-[#1e1b19] font-bold">
                  {demoEmptyTrash ? 0 : trashItems.length}
                </span>
                <span className="text-[10px] text-[#59413a]">Within 30-day grace window</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#e1bfb5]/40 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#ffdcc3]/50 flex items-center justify-center shrink-0 text-[#904d00]">
                <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[#59413a]">Auto-Expiring &lt; 48 Hours</span>
                <span className="text-xl font-headline text-[#904d00] font-bold">
                  {demoEmptyTrash ? 0 : 3}
                </span>
                <span className="text-[10px] text-[#904d00] font-bold">Action recommended</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#e1bfb5]/40 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#007d57]/15 flex items-center justify-center shrink-0 text-[#006243]">
                <span className="material-symbols-outlined text-[22px]">verified_user</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[#59413a]">Cryptographic Integrity</span>
                <span className="text-xl font-headline text-[#006243] font-bold">0 Damaged</span>
                <span className="text-[10px] text-[#006243] font-bold">No orphaned database pointers</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl shadow-sm border border-[#e1bfb5]/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[220px] flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2 text-[#59413a] text-[18px]">search</span>
                <input
                  type="text"
                  value={searchTrash}
                  onChange={(e) => setSearchTrash(e.target.value)}
                  placeholder="Search deleted items by name, ID, or deleting officer..."
                  className="w-full h-9 pl-9 pr-3 bg-[#faf2ee] rounded-lg text-xs font-medium text-[#1e1b19] placeholder:text-[#8d7168] focus:outline-none focus:bg-white border border-[#e1bfb5]/40"
                />
              </div>

              <select
                value={trashFilter}
                onChange={(e) => setTrashFilter(e.target.value)}
                className="h-9 px-3 rounded-lg bg-[#faf2ee] text-xs font-medium text-[#1e1b19] border border-[#e1bfb5]/40 focus:outline-none cursor-pointer"
              >
                <option>All Record Types (14)</option>
                <option>Members & Household (6)</option>
                <option>Giving & Stewardship (4)</option>
                <option>Governance & Minutes (2)</option>
                <option>Ministries & Groups (1)</option>
                <option>Reports & Certificates (1)</option>
              </select>

              <button
                type="button"
                onClick={() => showToast("Exporting 30-Day Retention Manifest...")}
                className="px-3 py-1.5 rounded-lg bg-[#eee7e3] hover:bg-[#e9e1dd] text-xs font-semibold text-[#1e1b19] cursor-pointer"
              >
                Export Retention Manifest
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-[#59413a]">
              <span>Demo Empty View:</span>
              <button
                type="button"
                onClick={() => setDemoEmptyTrash(!demoEmptyTrash)}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                  demoEmptyTrash ? 'bg-[#006243]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                    demoEmptyTrash ? 'left-4.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Trash Table or Empty State */}
          {demoEmptyTrash || trashItems.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-[#e1bfb5]/40 shadow-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#007d57]/10 flex items-center justify-center text-[#006243] mb-3">
                <span className="material-symbols-outlined text-[32px]">delete_outline</span>
              </div>
              <h3 className="font-headline text-lg font-bold text-[#1e1b19]">Quarantine Vault is Clean</h3>
              <p className="text-xs text-[#59413a] max-w-sm mt-1 mb-4">
                No active records in soft-delete status. Parish ledger and rolls are fully synchronized.
              </p>
              <button
                type="button"
                onClick={() => setDemoEmptyTrash(false)}
                className="px-4 py-2 rounded-lg bg-[#faf2ee] hover:bg-[#f4ece8] text-xs font-bold text-[#9b2f00] border border-[#e1bfb5]/40 cursor-pointer"
              >
                Reset Demo View
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-[#e1bfb5]/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f4ece8] text-[#59413a] text-[11px] font-headline font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Item Name & ID</th>
                      <th className="py-3 px-4">Originating Module</th>
                      <th className="py-3 px-4">Deleted By</th>
                      <th className="py-3 px-4">Retention Window</th>
                      <th className="py-3 px-4">Ecclesiastical Rationale</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e1bfb5]/30 text-xs text-[#1e1b19]">
                    {trashItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#faf2ee]/70 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-headline font-bold text-[#1e1b19]">{item.name}</span>
                            <span className="font-mono text-[11px] text-[#9b2f00] font-semibold">{item.recordId}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-[#59413a] font-medium">
                          {item.recordType}
                        </td>
                        <td className="py-4 px-4 text-[#1e1b19]">
                          {item.deletedBy}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full w-max ${
                                item.isExpiringSoon
                                  ? 'bg-[#ffdbd0] text-[#9b2f00]'
                                  : 'bg-[#eee7e3] text-[#59413a]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {item.isExpiringSoon ? 'warning' : 'schedule'}
                              </span>
                              {item.daysRemaining} days left ({item.expiryDate})
                            </span>
                            {item.isExpiringSoon && (
                              <span className="text-[10px] text-[#9b2f00] font-bold">Expiring Soon</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-[#59413a] max-w-xs text-xs">
                          {item.rationale}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleRestoreTrash(item)}
                              className="px-3 py-1.5 rounded-md bg-[#007d57]/15 hover:bg-[#007d57]/25 text-[#006243] font-bold text-xs cursor-pointer transition-colors"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => setPurgeModalItem(item)}
                              className="px-2.5 py-1.5 rounded-md bg-[#faf2ee] hover:bg-[#ffdbd0] text-[#9b2f00] font-bold text-xs cursor-pointer transition-colors"
                            >
                              Permanently Purge
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cryptographic Audit Trail Footer */}
          <div className="bg-[#f4ece8] rounded-xl p-4 border border-[#e1bfb5]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#59413a]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006243] text-[18px]">verified</span>
              <span>Trash Ledger Checkpoint SHA-256: <code>0x4a92b...e381</code></span>
            </div>
            <button
              type="button"
              onClick={() => showToast("Copied SHA-256 Digest to clipboard.")}
              className="font-bold text-[#c2410c] hover:underline cursor-pointer"
            >
              Copy Hash Digest
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: FINANCE AUDIT (READ-ONLY & IMMUTABLE LEDGER) */}
      {/* ========================================================================= */}
      {activeSubTab === 'finance-audit' && (
        <div className="flex flex-col gap-6">
          {/* Read-Only & Immutable Ledger Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#1e1b19] via-[#332e2a] to-[#25201d] text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#59413a]/40">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#c2410c]/20 border border-[#c2410c]/50 flex items-center justify-center text-[#ff8c42] shrink-0">
                <span className="material-symbols-outlined text-[30px]">lock</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline text-lg sm:text-xl font-bold">
                    Read-Only & Immutable Ledger
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#007d57]/30 text-[#85f8c4] text-[11px] font-bold border border-[#85f8c4]/30">
                    Merkle Sync
                  </span>
                </div>
                <p className="text-xs text-[#c9bfb8] max-w-2xl mt-1 leading-relaxed">
                  Cryptographic hash chains seal every financial event into permanent Diocesan storage. Entries cannot be modified, deleted, or backdated.
                </p>
                <span className="text-[11px] text-[#a89c94] font-mono mt-1">
                  Genesis block verified: Nov 17, 2024 • Latest Root Hash: 0x7a8b...39fc
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={handleVerifyChain}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Re-Validate Cryptographic Seal
              </button>
            </div>
          </div>

          {/* 4 Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#e1bfb5]/40 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#f4ece8] flex items-center justify-center shrink-0 text-[#c2410c]">
                <span className="material-symbols-outlined text-[22px]">database</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[#59413a]">Total Ledger Events</span>
                <span className="text-xl font-headline text-[#1e1b19] font-bold">1,420</span>
                <span className="text-[10px] text-[#006243] font-bold">+38 this week</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#e1bfb5]/40 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#007d57]/15 flex items-center justify-center shrink-0 text-[#006243]">
                <span className="material-symbols-outlined text-[22px]">verified</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[#59413a]">Tamper Proof</span>
                <span className="text-xl font-headline text-[#006243] font-bold">100%</span>
                <span className="text-[10px] text-[#006243] font-bold">Merkle Root Matched</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#e1bfb5]/40 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#ffdcc3]/50 flex items-center justify-center shrink-0 text-[#904d00]">
                <span className="material-symbols-outlined text-[22px]">vpn_key</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[#59413a]">Active Trustees</span>
                <span className="text-xl font-headline text-[#1e1b19] font-bold">3 / 3</span>
                <span className="text-[10px] text-[#59413a]">Dual Signatures Required</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#e1bfb5]/40 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#ffdbd0] flex items-center justify-center shrink-0 text-[#9b2f00]">
                <span className="material-symbols-outlined text-[22px]">security</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[#59413a]">Anomaly Flags</span>
                <span className="text-xl font-headline text-[#006243] font-bold">0 Clean</span>
                <span className="text-[10px] text-[#006243] font-bold">Ecclesiastical Audit Passed</span>
              </div>
            </div>
          </div>

          {/* Ledger Query Engine & Cryptographic Filter Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e1bfb5]/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[240px] flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#59413a] text-[18px]">search</span>
                <input
                  type="text"
                  value={searchAudit}
                  onChange={(e) => setSearchAudit(e.target.value)}
                  placeholder="Search transaction hash, officer, voucher ID..."
                  className="w-full h-9 pl-9 pr-3 bg-[#faf2ee] rounded-lg text-xs font-medium text-[#1e1b19] placeholder:text-[#8d7168] focus:outline-none focus:bg-white border border-[#e1bfb5]/40"
                />
              </div>

              <select className="h-9 px-3 rounded-lg bg-[#faf2ee] text-xs font-medium text-[#1e1b19] border border-[#e1bfb5]/40 focus:outline-none cursor-pointer">
                <option>Fiscal Q4 2024</option>
                <option>Fiscal Q3 2024</option>
                <option>Fiscal Year 2024 YTD</option>
              </select>

              <select
                value={auditFilterType}
                onChange={(e) => setAuditFilterType(e.target.value)}
                className="h-9 px-3 rounded-lg bg-[#faf2ee] text-xs font-medium text-[#1e1b19] border border-[#e1bfb5]/40 focus:outline-none cursor-pointer"
              >
                <option>All Event Types</option>
                <option>Sunday Loose Plate</option>
                <option>Benevolence Voucher</option>
                <option>Trustee Wire</option>
                <option>Automated ACH Tithe</option>
                <option>Inter-Fund Rebalance</option>
              </select>

              <button
                type="button"
                onClick={() => showToast("Exporting Raw Merkle Audit Trail (JSON/CSV)...")}
                className="px-3.5 py-1.5 rounded-lg bg-[#eee7e3] text-xs font-bold text-[#1e1b19] hover:bg-[#e9e1dd] cursor-pointer"
              >
                Export Raw Log
              </button>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#007d57]/10 text-[#006243] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#006243] animate-pulse"></span>
              <span>Live Blockchain Merkle Root Syncing</span>
            </div>
          </div>

          {/* Table of Blocks */}
          <div className="bg-white rounded-xl shadow-sm border border-[#e1bfb5]/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f4ece8] text-[#59413a] text-[11px] font-headline font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Block Height & Time</th>
                    <th className="py-3 px-4">Ledger Event Title</th>
                    <th className="py-3 px-4">Committed Value</th>
                    <th className="py-3 px-4">Designated Fund</th>
                    <th className="py-3 px-4">Signing Officers</th>
                    <th className="py-3 px-4 text-right">Cryptographic Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1bfb5]/30 text-xs text-[#1e1b19]">
                  {AUDIT_BLOCKS.map((block) => (
                    <tr key={block.height} className="hover:bg-[#faf2ee]/70 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-[#c2410c]">#{block.height}</span>
                          <span className="text-[11px] text-[#59413a]">{block.timestamp}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-headline font-bold text-[#1e1b19]">{block.title}</span>
                          <span className="text-[11px] text-[#59413a]">{block.type}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                            block.isCredit
                              ? 'bg-[#007d57]/10 text-[#006243]'
                              : 'bg-[#ffdbd0]/60 text-[#9b2f00]'
                          }`}
                        >
                          {block.amount}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[#59413a] font-medium">
                        {block.fund}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#1e1b19]">{block.officer}</span>
                          <span className="text-[10px] text-[#59413a]">{block.dualWitness}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedAuditBlock(block)}
                          className="font-mono text-xs font-bold text-[#c2410c] hover:bg-[#ffdbd0]/40 px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          {block.hash}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Presbytery Synod Ratification Seal */}
          <div className="bg-[#f4ece8] rounded-xl p-5 border border-[#e1bfb5]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#006243] text-[28px]">verified_user</span>
              <div>
                <span className="text-xs font-bold text-[#1e1b19] font-headline">Presbytery Synod Board of Internal Examiners</span>
                <p className="text-[11px] text-[#59413a]">
                  This parish financial ledger is registered on the Diocesan Sovereign Chain. Zero unauthorized alterations since creation.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => showToast("Downloading complete Diocesan Cryptographic Audit Binder (PDF, 6.1 MB)...")}
              className="px-4 py-2 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold shadow-xs cursor-pointer whitespace-nowrap"
            >
              Download Audit Ledger Binder
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Cryptographic Proof Receipt Modal */}
      {selectedAuditBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33302d]/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e1bfb5]/40 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#f4ece8]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006243] text-[22px]">verified</span>
                <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                  Cryptographic Proof Receipt #{selectedAuditBlock.height}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditBlock(null)}
                className="text-[#59413a] hover:text-[#1e1b19] p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="bg-[#faf2ee] p-3 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#59413a]">Event Record</span>
                <div className="font-headline font-bold text-[#1e1b19] text-sm">{selectedAuditBlock.title}</div>
                <div className="text-[#59413a]">{selectedAuditBlock.timestamp}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#faf2ee] p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#59413a]">Committed Amount</span>
                  <div className="font-mono font-bold text-[#1e1b19] mt-0.5">{selectedAuditBlock.amount}</div>
                </div>
                <div className="bg-[#faf2ee] p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#59413a]">Target Fund</span>
                  <div className="font-medium text-[#1e1b19] mt-0.5 truncate">{selectedAuditBlock.fund}</div>
                </div>
              </div>

              <div className="bg-[#faf2ee] p-3 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#59413a]">Dual Witness Signatures</span>
                <div className="font-bold text-[#1e1b19]">{selectedAuditBlock.officer}</div>
                <div className="text-[#59413a]">{selectedAuditBlock.dualWitness}</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#59413a]">Full SHA-256 Digest</span>
                <div className="p-2.5 rounded-lg bg-[#1e1b19] text-[#85f8c4] font-mono text-[11px] break-all">
                  {selectedAuditBlock.fullHash}
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-[#f4ece8]">
              <span className="text-[11px] text-[#006243] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                Merkle Root Validated
              </span>
              <button
                type="button"
                onClick={() => {
                  showToast("Hash digest copied to clipboard!");
                  setSelectedAuditBlock(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Copy Hash & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dual-Key Purge Passcode Modal */}
      {purgeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#33302d]/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e1bfb5]/40 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#f4ece8]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#9b2f00] text-[22px]">warning</span>
                <h3 className="font-headline text-base font-bold text-[#1e1b19]">
                  Permanently Purge Record?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPurgeModalItem(null)}
                className="text-[#59413a] hover:text-[#1e1b19] p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmPurge} className="py-4 space-y-3.5 text-xs">
              <p className="text-[#59413a] leading-relaxed">
                You are about to irreversibly purge <strong className="text-[#1e1b19]">{purgeModalItem.name}</strong> ({purgeModalItem.recordId}). This action permanently deletes ecclesiastical data from the active database.
              </p>

              <div className="p-3 bg-[#ffdbd0]/30 rounded-xl border border-[#ffdbd0] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#9b2f00]">Dual-Key Authorization Policy</span>
                <p className="text-[11px] text-[#59413a]">
                  Requires Senior Pastor or Ruling Session Clerk security credential.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#59413a] mb-1">
                  Clerk Dual-Key Passcode *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter authorized credential passcode..."
                  value={purgePasscode}
                  onChange={(e) => setPurgePasscode(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#faf2ee] text-xs font-medium text-[#1e1b19] border border-[#e1bfb5]/50 focus:outline-none focus:ring-1 focus:ring-[#c2410c]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#f4ece8]">
                <button
                  type="button"
                  onClick={() => setPurgeModalItem(null)}
                  className="px-4 py-2 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] text-xs font-bold text-[#59413a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#9b2f00] hover:bg-[#832600] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Authorize Irreversible Purge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trash Policies Drawer */}
      {trashPoliciesDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#33302d]/60 backdrop-blur-xs">
          <div className="bg-white h-full max-w-md w-full p-6 shadow-2xl border-l border-[#e1bfb5]/40 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#f4ece8]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#c2410c] text-[22px]">policy</span>
                  <h3 className="font-headline text-base font-bold text-[#1e1b19]">Canonic Trash Policies</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTrashPoliciesDrawer(false)}
                  className="text-[#59413a] hover:text-[#1e1b19] p-1"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="py-5 space-y-4 text-xs font-medium text-[#1e1b19]">
                <div>
                  <label className="block text-xs font-bold text-[#59413a] mb-1">
                    Retention Quarantine Duration (Days)
                  </label>
                  <input
                    type="number"
                    defaultValue={30}
                    className="w-full h-10 px-3 rounded-lg bg-[#faf2ee] border border-[#e1bfb5]/50 focus:outline-none focus:ring-1 focus:ring-[#c2410c]"
                  />
                  <span className="text-[10px] text-[#59413a] mt-1 block">Default: 30 days under Canon 4.12.</span>
                </div>

                <div className="p-3 bg-[#faf2ee] rounded-xl space-y-2">
                  <span className="font-bold text-xs text-[#1e1b19]">Enforce Dual-Key Purge</span>
                  <p className="text-[11px] text-[#59413a]">
                    Prevent individual officers from permanently destroying parish records without independent counter-signature.
                  </p>
                  <div className="text-[10px] font-bold text-[#006243]">STATUS: ENFORCED</div>
                </div>

                <div className="p-3 bg-[#faf2ee] rounded-xl space-y-2">
                  <span className="font-bold text-xs text-[#1e1b19]">Daily Auto-Purge Cron Schedule</span>
                  <p className="text-[11px] text-[#59413a]">
                    Automatic expungement runs every day at 03:00 UTC for items past 30 days.
                  </p>
                  <div className="text-[10px] font-bold text-[#006243]">STATUS: ACTIVE</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                showToast("Canonic Trash Policies successfully updated.");
                setTrashPoliciesDrawer(false);
              }}
              className="w-full py-2.5 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Policy Rules
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
