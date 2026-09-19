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
import { SettingsView } from './views/SettingsView';
import { CommandPalette, type CommandAction } from './CommandPalette';
import { SubscriptionBanner } from './SubscriptionBanner';
import { SupportSessionBanner } from './SupportSessionBanner';
import { QuickActionsModal } from './QuickActionsModal';
import { MembersSectionHeader } from './MembersSectionHeader';
import { NotFoundScreen } from './NotFoundScreen';
import { PanelErrorBoundary } from '../ErrorBoundary';
import { EmptyBlock } from './DataState';
import { useRouter } from '../../lib/router';
import { usePermissions } from '../../lib/permissions';
import { useViewportMax } from '../../lib/useViewport';
import { usePreference } from '../../hooks/useApi';

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

/**
 * Where the header's breadcrumb names each section — read once here rather than re-derived in the
 * header, so a renamed section renames in one place.
 */
const TAB_TITLES: Record<ParishNavTab, string> = {
  home: 'Home Cloud Dashboard',
  'find-christian': 'Members & Believers Registry',
  'add-new-christian': 'Members & Believers Registry',
  'delete-christian': 'Members & Believers Registry',
  'family-unit': 'Members & Believers Registry',
  'services-worship': 'Services & Worship Administration',
  'ministries-groups': 'Ministries & Volunteer Rosters',
  'giving-stewardship': 'Giving & Stewardship Treasury',
  'inventory-assets': 'Inventory & Assets Register',
  governance: 'Leadership & Church Council',
  'reports-certs': 'Reports & Official Certificates',
  communications: 'Church Communications & Community',
  'settings-profile': 'Church Settings & Configuration',
  'admin-portal': 'Admin & System Security',
};

/**
 * A section's screen, wrapped in the boundary that keeps a crash in one panel from taking the
 * console down. Each section renders inside the standard page gutter, so the shell no longer
 * repeats the wrapper per branch.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full px-6 sm:px-8 py-6">
      <PanelErrorBoundary section={title}>{children}</PanelErrorBoundary>
    </div>
  );
}

export const ChurchSystemApp: React.FC = () => {
  // The URL is the single source of truth for location: every navigation is a `pushState`, and
  // back/forward arrive through the same parse. Sub-tab defaults are the sections' own.
  const { route, navigate } = useRouter();
  const activeTab = route.tab;
  const { canView } = usePermissions();

  const go = useCallback(
    (tab: ParishNavTab, sub: string | null = null, replace = false) => {
      navigate({ tab, sub, memberId: null }, replace);
    },
    [navigate],
  );

  const setActiveTab = (tab: ParishNavTab) => go(tab);
  const setActiveSubTab = (sub: MembersSubTab) => go(sub);
  const setActiveMinistriesSubTab = (sub: MinistriesSubTab) => go('ministries-groups', sub);
  const setActiveFinancesSubTab = (sub: FinancesSubTab) => go('giving-stewardship', sub);
  const setActiveAdminSubTab = (sub: AdminSubTab) => go('admin-portal', sub);
  const setActiveServicesSubTab = (sub: ServicesSubTab) => go('services-worship', sub);
  const setActiveCommunicationsSubTab = (sub: CommunicationsSubTab) => go('communications', sub);
  const setActiveSettingsSubTab = (sub: SettingsSubTab) => go('settings-profile', sub);

  const [quickActionModal, setQuickActionModal] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  /** Every section, plus the register actions worth reaching without hunting through a sidebar. */
  const commandActions: CommandAction[] = [
    { id: 'find-christian', label: 'Find a member', hint: 'Members', icon: 'person_search', run: () => go('find-christian') },
    { id: 'add-new-christian', label: 'Add a member', hint: 'Members', icon: 'person_add', run: () => go('add-new-christian') },
    { id: 'family-unit', label: 'Household units', hint: 'Members', icon: 'holiday_village', run: () => go('family-unit') },
    { id: 'delete-christian', label: 'Trash & soft delete', hint: 'Members', icon: 'delete', run: () => go('delete-christian') },
    { id: 'services-worship', label: 'Services & Worship', hint: 'Section', icon: 'menu_book', run: () => go('services-worship') },
    { id: 'ministries-groups', label: 'Groups & Fellowships', hint: 'Section', icon: 'groups', run: () => go('ministries-groups') },
    { id: 'giving-stewardship', label: 'Giving & Stewardship', hint: 'Section', icon: 'volunteer_activism', run: () => go('giving-stewardship') },
    { id: 'inventory-assets', label: 'Inventory & Assets', hint: 'Section', icon: 'inventory_2', run: () => go('inventory-assets') },
    { id: 'governance', label: 'Church Council', hint: 'Section', icon: 'account_balance', run: () => go('governance') },
    { id: 'reports-certs', label: 'Reports & Certificates', hint: 'Section', icon: 'description', run: () => go('reports-certs') },
    { id: 'communications', label: 'Communications', hint: 'Section', icon: 'campaign', run: () => go('communications') },
    { id: 'settings-profile', label: 'Settings & Profile', hint: 'Section', icon: 'settings', run: () => go('settings-profile') },
    { id: 'admin-portal', label: 'Admin & Security', hint: 'Section', icon: 'admin_panel_settings', run: () => go('admin-portal') },
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

  /**
   * §8, the real mobile gap: the sidebar's collapsed rail existed but nothing switched it on, so a
   * phone showed a 288px navigation over a sliver of page. Below the tablet breakpoint the rail
   * takes over (and the stored preference returns once the screen is wide enough again). The
   * Customization panel's compactMode is the church's stored density preference, honoured on wide
   * screens where a full sidebar is a choice rather than a cost.
   */
  const narrow = useViewportMax(860);
  const storedCompact = usePreference('customization');
  const collapsed = narrow || storedCompact.value.compactMode === true;

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

  const headerTitle = TAB_TITLES[activeTab];

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
        collapsed={collapsed}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#FDF8F3]">
        {/* Top Header */}
        <ChurchHeader
          onQuickAction={() => setQuickActionModal(true)}
          onOpenCommandPalette={() => setPaletteOpen(true)}
          activeTabTitle={headerTitle}
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

        {/* Inner Scrollable Workspace — suppressed when the route gate refuses the section. */}
        {visibleForRole ? (
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'home' && !route.notFound && (
            <HomeDashboardView
              onNavigateTab={(tab, subTab) => {
                setActiveTab(tab);
                if (subTab) setActiveSubTab(subTab as MembersSubTab);
              }}
            />
          )}

          {activeTab === 'services-worship' && (
            <Section title="Services & Worship">
              <ServicesWorshipView
                activeSubTab={(route.sub ?? 'service-planner') as ServicesSubTab}
                onSelectSubTab={setActiveServicesSubTab}
              />
            </Section>
          )}

          {activeTab === 'ministries-groups' && (
            <Section title="Ministries & Fellowships">
              <MinistriesView 
                initialSubTab={(route.sub ?? 'ministries-departmental') as MinistriesSubTab}
                onSubTabChange={setActiveMinistriesSubTab}
              />
            </Section>
          )}

          {activeTab === 'giving-stewardship' && (
            <Section title="Giving & Stewardship">
              <StewardshipFinancesView
                initialSubTab={(route.sub ?? 'tithes') as FinancesSubTab}
                onSubTabChange={setActiveFinancesSubTab}
              />
            </Section>
          )}

          {activeTab === 'inventory-assets' && (
            <Section title="Inventory & Assets">
              <InventoryAssetsView />
            </Section>
          )}

          {activeTab === 'governance' && (
            <Section title="Church Council">
              <GovernanceView />
            </Section>
          )}

          {activeTab === 'reports-certs' && (
            <Section title="Reports & Certificates">
              <ReportsCertsView />
            </Section>
          )}

          {activeTab === 'communications' && (
            <Section title="Communications">
              <CommunicationsView
                activeSubTab={(route.sub ?? 'announcements') as CommunicationsSubTab}
                onSelectSubTab={setActiveCommunicationsSubTab}
              />
            </Section>
          )}

          {activeTab === 'settings-profile' && (
            <Section title="Settings & Profile">
              <SettingsView
                activeSubTab={(route.sub ?? 'org-profile') as SettingsSubTab}
                onSelectSubTab={setActiveSettingsSubTab}
              />
            </Section>
          )}

          {activeTab === 'admin-portal' && (
            <Section title="Admin & Security">
              <AdminSecurityView
                initialSubTab={(route.sub ?? 'users-rights') as AdminSubTab}
                onSubTabChange={setActiveAdminSubTab}
              />
            </Section>
          )}

          {/* If Members & Believers Registry is selected */}
          {isMembersView && (
            <>
              <MembersSectionHeader active={activeSubTab} onSelect={setActiveSubTab} />

              {/* Sub-view Rendering Container */}
              <div className="w-full px-6 sm:px-8 py-6">
                <PanelErrorBoundary section="Members">
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
                </PanelErrorBoundary>
              </div>
            </>
          )}

          {/* An address the console does not have — a broken link names itself (§1). */}
          {route.notFound && <NotFoundScreen />}
        </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <div className="max-w-md w-full rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
              <EmptyBlock
                icon="lock"
                title="This panel is not part of your role"
                hint="Your account does not include this section, so the console will not open it. The server refuses these requests either way — ask a super administrator if you need it."
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Modal */}
      {paletteOpen && <CommandPalette actions={commandActions} onClose={() => setPaletteOpen(false)} />}      <QuickActionsModal
        open={quickActionModal}
        onClose={() => setQuickActionModal(false)}
        goTo={setActiveTab}
        goToMembersSubTab={setActiveSubTab}
        goToMinistriesSubTab={setActiveMinistriesSubTab}
        goToFinancesSubTab={setActiveFinancesSubTab}
      />
    </div>
  );
};
