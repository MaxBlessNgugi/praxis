import React, { useState } from 'react';
import type { AdminSubTab } from '../../../types';
import { useAuth } from '../../../lib/auth';
import { usePermissions } from '../../../lib/permissions';
import { AdminFinanceAuditPanel } from './AdminFinanceAuditPanel';
import { VendorChurchesPanel } from './VendorChurchesPanel';
import { UsersRightsPanel } from './admin/UsersRightsPanel';
import { TrashPanel } from './admin/TrashPanel';
import { AuditLogPanel } from './admin/AuditLogPanel';
import { EmptyBlock } from '../DataState';

/**
 * The Admin panel: accounts, the Trash, the audit trail, the money's own ledger, and — for Praxis
 * staff only — the platform's churches.
 *
 * This file used to *be* those screens, with invented contents: thirty-four staff who do not exist,
 * "MFA enforced: 100%", a Trash listing people the fixture had never heard of, and a Merkle-chain
 * verify that printed a fixed sentence after 1.2 seconds. A real church reading any of it would have
 * been reading fiction, so every one of those is gone and each tab now renders a panel that reads the
 * API. What remains here is the part that was always honest: the heading, the tabs, and the gate.
 *
 * The gate is the interesting bit. `admin` is the panel that decides the others, so it is hidden
 * unless the role carries it — and the API refuses every endpoint behind it regardless, which is what
 * makes hiding the tab a courtesy rather than the protection.
 */

const TABS: Array<{ id: AdminSubTab; label: string; icon: string }> = [
  { id: 'users-rights', label: 'Users & rights', icon: 'manage_accounts' },
  { id: 'trash', label: 'Trash', icon: 'delete' },
  { id: 'audit-log', label: 'Audit log', icon: 'history' },
  { id: 'finance-audit', label: 'Finance audit', icon: 'receipt_long' },
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
  const { user } = useAuth();
  const { canView } = usePermissions();

  // The vendor console is not a church's screen: it lists every church on the platform, and only an
  // account carrying the operator's flag may see it. The API refuses it for everybody else.
  const tabs = user?.isPlatformAdmin
    ? [...TABS, { id: 'churches' as AdminSubTab, label: 'Churches', icon: 'church' }]
    : TABS;

  if (!canView('admin')) {
    return (
      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <EmptyBlock
          icon="lock"
          title="This is for administrators"
          hint="Your role does not include the Admin panel. Ask a super administrator if you need something from it — the server refuses these requests either way."
        />
      </div>
    );
  }

  const switchTab = (tab: AdminSubTab) => {
    setActiveSubTab(tab);
    onSubTabChange?.(tab);
  };

  return (
    <div className="flex w-full flex-col gap-6 pb-16">
      <div className="flex flex-col gap-1.5 pt-2">
        <div className="flex items-center gap-2 font-headline text-xs font-bold uppercase tracking-wide text-[#57534E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C2410C]" />
          <span>Administration</span>
        </div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-[#1C1917] sm:text-4xl">
          Admin &amp; system security
        </h1>
        <p className="max-w-2xl text-xs text-[#57534E] sm:text-sm">
          Who may do what in this church, what has been retired, and the record of everything that has
          changed — read from the church&apos;s own logs rather than kept here.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Admin sections"
        className="flex flex-wrap gap-1.5 border-b border-[#E7E5E4]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeSubTab === tab.id}
            onClick={() => switchTab(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-t-[9px] px-3.5 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
              activeSubTab === tab.id
                ? 'border-b-2 border-[#C2410C] text-[#C2410C]'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'users-rights' && <UsersRightsPanel />}
      {activeSubTab === 'trash' && <TrashPanel />}
      {activeSubTab === 'audit-log' && <AuditLogPanel />}
      {activeSubTab === 'finance-audit' && <AdminFinanceAuditPanel />}
      {activeSubTab === 'churches' && <VendorChurchesPanel />}
    </div>
  );
};
