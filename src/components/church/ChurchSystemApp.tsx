import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  ParishNavTab, 
  MembersSubTab, 
  MinistriesSubTab, 
  FinancesSubTab, 
  AdminSubTab,
  ServicesSubTab,
  CommunicationsSubTab,
  SettingsSubTab,
} from '../../types';
import { ChurchSidebar } from './ChurchSidebar';
import { ChurchHeader } from './ChurchHeader';
import { HomeDashboardView } from './views/HomeDashboardView';
import { AddNewChristianView } from './views/AddNewChristianView';
import { FindChristianView } from './views/FindChristianView';
import { DeleteChristianView } from './views/DeleteChristianView';
import { FamilyUnitView } from './views/FamilyUnitView';
import { MinistriesView } from './views/MinistriesView';
import { StewardshipFinancesView } from './views/StewardshipFinancesView';
import { InventoryAssetsView } from './views/InventoryAssetsView';
import { ReportsCertsView } from './views/ReportsCertsView';
import { GovernanceView } from './views/GovernanceView';
import { AdminSecurityView } from './views/AdminSecurityView';
import { ServicesWorshipView } from './views/ServicesWorshipView';
import { CommunicationsView } from './views/CommunicationsView';
import { useDialog } from './dialog';
import { SettingsView } from './views/SettingsView';
import { CommandPalette, type CommandAction } from './CommandPalette';
import { SubscriptionBanner } from './SubscriptionBanner';
import { SupportSessionBanner } from './SupportSessionBanner';
import { EmptyBlock } from './DataState';
import { useRouter } from '../../lib/router';
import { usePermissions } from '../../lib/permissions';

/**
 * Which sidebar panel each section belongs to, for the route gate: a section a role may not see is
 * refused here before its screen renders, with the same sentence the in-panel checks use. The
 * backend remains the authority — this only spares a viewer a screen of their own refusals.
 */
const TAB_PANEL: Partial<Record<ParishNavTab, string>> = {
  'find-christian': 'members',
  'add-new-christian': 'members',
  'delete-christian': 'members',
  'family-unit': 'members',
  'services-worship': 'services',
  'giving-stewardship': 'giving',
  'inventory-assets': 'inventory',
  'ministries-groups': 'groups',
  'reports-certs': 'reports',
  governance: 'council',
  communications: 'communications',
  'settings-profile': 'settings',
  'admin-portal': 'admin',
};

interface ChurchSystemAppProps {
  compactMode?: boolean;
}

export const ChurchSystemApp: React.FC<ChurchSystemAppProps> = ({
  compactMode = false,
}) => {
  // The URL is the single source of truth for location: every navigation is a `pushState`, and
  // back/forward arrive through the same parse. Sub-tab defaults are the sections' own.
  const { route, navigate } = useRouter();
  const activeTab = route.tab;
  const { canView } = usePermissions();

  const go = useCallback((tab: ParishNavTab, sub: string | null = null, replace = false) => {
    navigate({ tab, sub, memberId: null }, replace);
  }, [navigate]);

  const setActiveTab = (tab: ParishNavTab) => go(tab);
  const setActiveSubTab = (sub: MembersSubTab) => go(sub);
  const setActiveMinistriesSubTab = (sub: MinistriesSubTab) => go('ministries-groups', sub);
  const setActiveFinancesSubTab = (sub: FinancesSubTab) => go('giving-stewardship', sub);
  const setActiveAdminSubTab = (sub: AdminSubTab) => go('admin-portal', sub);
  const setActiveServicesSubTab = (sub: ServicesSubTab) => go('services-worship', sub);
  const setActiveCommunicationsSubTab = (sub: CommunicationsSubTab) => go('communications', sub);
  const setActiveSettingsSubTab = (sub: SettingsSubTab) => go('settings-profile', sub);

  const [searchTerm, setSearchTerm] = useState('');
  const [quickActionModal, setQuickActionModal] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  /** The same navigation the sidebar performs, so a command lands exactly where a click would. */
  const goTo = (tab: ParishNavTab) => {
    setActiveTab(tab);
  };

  /** Every section, plus the register actions worth reaching without hunting through a sidebar. */
  const commandActions: CommandAction[] = [
    { id: 'find-christian', label: 'Find a member', hint: 'Members', icon: 'person_search', run: () => goTo('find-christian') },
    { id: 'add-new-christian', label: 'Add a member', hint: 'Members', icon: 'person_add', run: () => goTo('add-new-christian') },
    { id: 'family-unit', label: 'Household units', hint: 'Members', icon: 'holiday_village', run: () => goTo('family-unit') },
    { id: 'delete-christian', label: 'Trash & soft delete', hint: 'Members', icon: 'delete', run: () => goTo('delete-christian') },
    { id: 'services-worship', label: 'Services & Worship', hint: 'Section', icon: 'menu_book', run: () => goTo('services-worship') },
    { id: 'ministries-groups', label: 'Groups & Fellowships', hint: 'Section', icon: 'groups', run: () => goTo('ministries-groups') },
    { id: 'giving-stewardship', label: 'Giving & Stewardship', hint: 'Section', icon: 'volunteer_activism', run: () => goTo('giving-stewardship') },
    { id: 'inventory-assets', label: 'Inventory & Assets', hint: 'Section', icon: 'inventory_2', run: () => goTo('inventory-assets') },
    { id: 'governance', label: 'Church Council', hint: 'Section', icon: 'account_balance', run: () => goTo('governance') },
    { id: 'reports-certs', label: 'Reports & Certificates', hint: 'Section', icon: 'description', run: () => goTo('reports-certs') },
    { id: 'communications', label: 'Communications', hint: 'Section', icon: 'campaign', run: () => goTo('communications') },
    { id: 'settings-profile', label: 'Settings & Profile', hint: 'Section', icon: 'settings', run: () => goTo('settings-profile') },
    { id: 'admin-portal', label: 'Admin & Security', hint: 'Section', icon: 'admin_panel_settings', run: () => goTo('admin-portal') },
  ];

  // Cmd/Ctrl + K from anywhere in the console.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const quickActionModalDialog = useDialog(() => setQuickActionModal(false), "Quick Actions");

  const isMembersView = 
    activeTab === 'find-christian' || 
    activeTab === 'add-new-christian' || 
    activeTab === 'delete-christian' || 
    activeTab === 'family-unit';

  /** The sidebar sections this role may open, for the route gate below. */
  const visibleForRole = useMemo(() => {
    const panel = TAB_PANEL[activeTab];
    return !panel || canView(panel as never);
  }, [activeTab, canView]);

  const getHeaderTitle = () => {
    if (activeTab === 'home') return 'Home Cloud Dashboard';
    if (isMembersView) return 'Members & Believers Registry';
    if (activeTab === 'services-worship') return 'Services & Worship Administration';
    if (activeTab === 'ministries-groups') return 'Ministries & Volunteer Rosters';
    if (activeTab === 'giving-stewardship') return 'Giving & Stewardship Treasury';
    if (activeTab === 'inventory-assets') return 'Inventory & Assets Register';
    if (activeTab === 'governance') return 'Leadership & Church Council';
    if (activeTab === 'reports-certs') return 'Reports & Official Certificates';
    if (activeTab === 'communications') return 'Church Communications & Community';
    if (activeTab === 'settings-profile') return 'Church Settings & Configuration';
    if (activeTab === 'admin-portal') return 'Admin & System Security';
    return "Destiny Sanctuary Int'L Console";
  };

  // A section the role may not see is refused before it renders — the same verdict the panels'
  // own checks give, applied at the boundary a URL can cross. The backend still refuses every
  // request; this only keeps a shared link from showing a viewer their own refusals.
  if (!visibleForRole) {
    return (
      <div className="w-full h-full flex bg-[#FDF8F3] text-[#1C1917] font-['Inter',sans-serif] overflow-hidden">
        <ChurchSidebar activeTab={activeTab} activeSubTab={'find-christian'} onSelectTab={setActiveTab} onSelectSubTab={setActiveSubTab} collapsed={compactMode} />
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="max-w-md w-full rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
            <EmptyBlock
              icon="lock"
              title="This panel is not part of your role"
              hint="Your account does not include this section, so the console will not open it. The server refuses these requests either way — ask a super administrator if you need it."
            />
          </div>
        </div>
      </div>
    );
  }

  // The members section *is* four tabs — each sub-tab is its own top-level tab in the sidebar —
  // so the register's sub-tab and the section are the same value here, as the old state kept them.
  const activeSubTab = (isMembersView ? activeTab : 'find-christian') as MembersSubTab;

  return (
    <div className="w-full h-full flex bg-[#FDF8F3] text-[#1C1917] font-['Inter',sans-serif] overflow-hidden">
      {/* Sidebar Navigation */}
      <ChurchSidebar
        activeTab={activeTab}
        activeSubTab={activeSubTab}
        onSelectTab={setActiveTab}
        onSelectSubTab={setActiveSubTab}
        collapsed={compactMode}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#FDF8F3]">
        {/* Top Header */}
        <ChurchHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onQuickAction={() => setQuickActionModal(true)}
          onOpenCommandPalette={() => setPaletteOpen(true)}
          activeTabTitle={getHeaderTitle()}
        />

        {/* Above everything, because whose access this is outranks what the church is on. */}
        <SupportSessionBanner />

        {/* The commercial state, when it needs an answer. Silent otherwise. */}
        <SubscriptionBanner
          onOpenBilling={() => {
            setActiveSettingsSubTab('subscription');
            setActiveTab('settings-profile');
          }}
        />

        {/* Inner Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto">
          {/* If Home Dashboard tab is selected */}
          {activeTab === 'home' && (
            <HomeDashboardView
              onNavigateTab={(tab, subTab) => {
                setActiveTab(tab);
                if (subTab) setActiveSubTab(subTab as MembersSubTab);
              }}
            />
          )}

          {/* If Services & Worship tab is selected */}
          {activeTab === 'services-worship' && (
            <div className="w-full px-6 sm:px-8 py-6">
              <ServicesWorshipView
                activeSubTab={(route.sub ?? 'service-planner') as ServicesSubTab}
                onSelectSubTab={setActiveServicesSubTab}
              />
            </div>
          )}

          {/* If Groups & Fellowships tab is selected */}
          {activeTab === 'ministries-groups' && (
            <div className="w-full px-6 sm:px-8 py-6">
              <MinistriesView 
                initialSubTab={(route.sub ?? 'ministries-departmental') as MinistriesSubTab}
                onSubTabChange={setActiveMinistriesSubTab}
              />
            </div>
          )}

          {/* If Giving & Stewardship tab is selected */}
          {activeTab === 'giving-stewardship' && (
            <div className="w-full px-6 sm:px-8 py-6">
              <StewardshipFinancesView
                initialSubTab={(route.sub ?? 'tithes') as FinancesSubTab}
                onSubTabChange={setActiveFinancesSubTab}
              />
            </div>
          )}

          {/* If Inventory & Assets tab is selected */}
          {activeTab === 'inventory-assets' && (
            <div className="w-full px-6 sm:px-8 py-6">
              <InventoryAssetsView />
            </div>
          )}

          {/* If Church Council & Sessions tab is selected */}
          {activeTab === 'governance' && (
            <div className="w-full px-6 sm:px-8 py-6">
              <GovernanceView />
            </div>
          )}

          {/* If Reports & Certificates tab is selected */}
          {activeTab === 'reports-certs' && (
            <div className="w-full px-6 sm:px-8 py-6">
              <ReportsCertsView />
            </div>
          )}

          {/* If Communications tab is selected */}
          {activeTab === 'communications' && (
            <div className="w-full px-6 sm:px-8 py-6">
              <CommunicationsView
                activeSubTab={(route.sub ?? 'announcements') as CommunicationsSubTab}
                onSelectSubTab={setActiveCommunicationsSubTab}
              />
            </div>
          )}

          {/* If Settings & Profile tab is selected */}
          {activeTab === 'settings-profile' && (
            <div className="w-full px-6 sm:px-8 py-6">
              <SettingsView
                activeSubTab={(route.sub ?? 'org-profile') as SettingsSubTab}
                onSelectSubTab={setActiveSettingsSubTab}
              />
            </div>
          )}

          {/* If Admin & Security Portal tab is selected */}
          {activeTab === 'admin-portal' && (
            <div className="w-full px-6 sm:px-8 py-6">
              <AdminSecurityView
                initialSubTab={(route.sub ?? 'users-rights') as AdminSubTab}
                onSubTabChange={setActiveAdminSubTab}
              />
            </div>
          )}

          {/* If Members & Believers Registry is selected */}
          {isMembersView && (
            <>
              {/* Section Header with Tabs */}
              <div className="w-full px-6 sm:px-8 pt-6 pb-4 border-b border-[#E7E5E4] bg-[#FFFFFF] shadow-sm">
                <div className="flex flex-col gap-1">
                  <h1 className="font-headline text-2xl font-bold text-[#1C1917] tracking-tight">
                    Members & Believers Registry
                  </h1>
                  <p className="font-body text-xs sm:text-sm text-[#57534E]">
                    Comprehensive members register, baptism register, household mappings, and church records.
                  </p>
                </div>

                {/* Sub Tabs Navigation */}
                <div className="mt-4">
                  <nav className="flex items-center gap-6 border-b border-[#E7E5E4] text-xs font-headline font-bold">
                    {[
                      { id: 'add-new-christian', label: 'Add New Christian' },
                      { id: 'find-christian', label: 'Find Christian' },
                      { id: 'delete-christian', label: 'Delete Christian' },
                      { id: 'family-unit', label: 'Family Unit' },
                    ].map((tab) => {
                      const isActive = activeSubTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveSubTab(tab.id as MembersSubTab)}
                          className={`pb-3 px-1 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            isActive
                              ? 'border-[#C2410C] text-[#C2410C] font-bold'
                              : 'border-transparent text-[#57534E] hover:text-[#1C1917]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>

              {/* Sub-view Rendering Container */}
              <div className="w-full px-6 sm:px-8 py-6">
                {activeSubTab === 'add-new-christian' && (
                  <AddNewChristianView onNavigateToFind={() => setActiveSubTab('find-christian')} />
                )}

                {activeSubTab === 'find-christian' && (
                  <FindChristianView
                    onNavigateToAdd={() => setActiveSubTab('add-new-christian')}
                    onNavigateToFamilyUnit={() => setActiveSubTab('family-unit')}
                    onSelectMemberForArchive={() => setActiveSubTab('delete-christian')}
                  />
                )}

                {activeSubTab === 'delete-christian' && <DeleteChristianView />}

                {activeSubTab === 'family-unit' && (
                  <FamilyUnitView onNavigateToAddChristian={() => setActiveSubTab('add-new-christian')} />
                )}
              </div>
            </>
          )}

          {/* Other tabs fallback */}
          {!isMembersView && 
            activeTab !== 'home' &&
            activeTab !== 'services-worship' &&
            activeTab !== 'ministries-groups' && 
            activeTab !== 'giving-stewardship' && 
            activeTab !== 'governance' && 
            activeTab !== 'reports-certs' && 
            activeTab !== 'communications' && 
            activeTab !== 'settings-profile' && 
            activeTab !== 'admin-portal' && (
            <div className="w-full px-6 sm:px-8 py-12 text-center">
              <div className="max-w-md mx-auto p-8 rounded-[14px] bg-[#FFFFFF] border border-[#E7E5E4] shadow-warm-card">
                <span aria-hidden="true" className="material-symbols-outlined text-4xl text-[#C2410C] mb-2">church</span>
                <h3 className="font-headline text-lg font-bold text-[#1C1917] capitalize">
                  {activeTab.replace('-', ' ')}
                </h3>
                <p className="text-xs text-[#57534E] mt-1 mb-5">
                  Module configuration and live feeds loaded. Switch to Ministries or Giving & Stewardship to inspect the comprehensive operating panels.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('ministries-groups')}
                    className="px-4 py-2 rounded-[9px] bg-[#F5EDE4] hover:bg-[#EAE1D7] text-xs font-bold text-[#C2410C] border border-[#E7E5E4] transition-colors cursor-pointer"
                  >
                    Groups & Fellowships
                  </button>
                  <button
                    onClick={() => setActiveTab('giving-stewardship')}
                    className="px-4 py-2 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-[0_2px_8px_rgba(194,65,12,0.25)] transition-all cursor-pointer"
                  >
                    Giving & Stewardship
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Modal */}
      {paletteOpen && <CommandPalette actions={commandActions} onClose={() => setPaletteOpen(false)} />}

      {quickActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/40 backdrop-blur-xs" {...quickActionModalDialog}>
          <div className="bg-[#FFFFFF] rounded-[14px] max-w-sm w-full p-5 shadow-2xl border border-[#E7E5E4] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
              <h3 className="font-headline text-sm font-bold text-[#1C1917]">Quick Actions</h3>
              <button
                type="button"
                onClick={() => setQuickActionModal(false)}
                className="text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EDE4] p-1 rounded-[9px] transition-colors"
              aria-label="Close">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="py-3 space-y-2 text-xs font-headline font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('add-new-christian');
                  setActiveTab('add-new-christian');
                  setQuickActionModal(false);
                }}
                className="w-full p-2.5 rounded-[9px] bg-[#FDF8F3] hover:bg-[#F5EDE4] text-left flex items-center gap-2.5 text-[#1C1917] border border-[#E7E5E4] transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[#C2410C] text-[18px]">person_add</span>
                <span>Enroll New Christian</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ministries-groups');
                  setActiveMinistriesSubTab('ministries-departmental');
                  setQuickActionModal(false);
                }}
                className="w-full p-2.5 rounded-[9px] bg-[#FDF8F3] hover:bg-[#F5EDE4] text-left flex items-center gap-2.5 text-[#1C1917] border border-[#E7E5E4] transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[#D97706] text-[18px]">domain_add</span>
                <span>Manage Ministries & Departments</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('giving-stewardship');
                  setActiveFinancesSubTab('tithes');
                  setQuickActionModal(false);
                }}
                className="w-full p-2.5 rounded-[9px] bg-[#FDF8F3] hover:bg-[#F5EDE4] text-left flex items-center gap-2.5 text-[#1C1917] border border-[#E7E5E4] transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[#059669] text-[18px]">volunteer_activism</span>
                <span>Giving & Stewardship Treasury</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('family-unit');
                  setActiveTab('family-unit');
                  setQuickActionModal(false);
                }}
                className="w-full p-2.5 rounded-[9px] bg-[#FDF8F3] hover:bg-[#F5EDE4] text-left flex items-center gap-2.5 text-[#1C1917] border border-[#E7E5E4] transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[#C2410C] text-[18px]">add_home</span>
                <span>Create Household Unit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
