import React from 'react';
import { ParishNavTab, type MembersSubTab, type MinistriesSubTab, type FinancesSubTab } from '../../types';
import { useDialog } from './dialog';

/**
 * The header's Quick Action button, opened.
 *
 * Four shortcuts the office uses a dozen times a day. Extracted from the shell (§2) because the
 * modal — its dialog semantics, its four buttons, its close behaviour — is one coherent
 * responsibility, and the shell no longer needs to know what a quick action looks like to route
 * one: it passes a navigation callback per target kind and whether it is open.
 */
interface QuickActionsModalProps {
  open: boolean;
  onClose: () => void;
  /** Navigates to a top-level tab (used when the action has no sub-tab of its own). */
  goTo: (tab: ParishNavTab) => void;
  goToMembersSubTab: (sub: MembersSubTab) => void;
  goToMinistriesSubTab: (sub: MinistriesSubTab) => void;
  goToFinancesSubTab: (sub: FinancesSubTab) => void;
}

const ACTIONS: Array<{
  icon: string;
  tone: string;
  label: string;
  tab: ParishNavTab;
  sub?: string;
}> = [
  { icon: 'person_add', tone: 'text-[#C2410C]', label: 'Enroll New Christian', tab: 'add-new-christian' },
  { icon: 'domain_add', tone: 'text-[#D97706]', label: 'Manage Ministries & Departments', tab: 'ministries-groups', sub: 'ministries-departmental' },
  { icon: 'volunteer_activism', tone: 'text-[#059669]', label: 'Giving & Stewardship Treasury', tab: 'giving-stewardship', sub: 'tithes' },
  { icon: 'add_home', tone: 'text-[#C2410C]', label: 'Create Household Unit', tab: 'family-unit' },
];

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  open,
  onClose,
  goTo,
  goToMembersSubTab,
  goToMinistriesSubTab,
  goToFinancesSubTab,
}) => {
  const dialog = useDialog(onClose, 'Quick Actions');
  if (!open) return null;

  const run = (tab: ParishNavTab, sub?: string) => {
    if (tab === 'ministries-groups' && sub) goToMinistriesSubTab(sub as MinistriesSubTab);
    else if (tab === 'giving-stewardship' && sub) goToFinancesSubTab(sub as FinancesSubTab);
    else if (sub) goToMembersSubTab(sub as MembersSubTab);
    goTo(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/40 backdrop-blur-xs" {...dialog}>
      <div className="bg-[#FFFFFF] rounded-[14px] max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
          <h3 className="font-headline text-sm font-bold text-[#1C1917]">Quick Actions</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4] p-1 rounded-[9px] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="py-3 space-y-2 text-xs font-headline font-semibold">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => run(action.tab, action.sub)}
              className="w-full p-2.5 rounded-[9px] bg-[#FDF8F3] hover:bg-[#F5EDE4] text-left flex items-center gap-2.5 text-[#1C1917] border border-[#E7E5E4] transition-colors cursor-pointer"
            >
              <span aria-hidden="true" className={`material-symbols-outlined ${action.tone} text-[18px]`}>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
