/**
 * Panel + action permissions, ported from ECCLESIA (`src/permissions.tsx`).
 *
 * The real system does not carry fifty roles. It carries a set of panel keys, three actions and
 * four roles, and resolves rights the same way on both sides of the wire:
 *
 *   1. the role's rights below              → the baseline for that role
 *   2. a per-user override would merge here → (the real backend stores it on User.panels/actions)
 *   3. a missing field                      → stays as the baseline
 *
 * super_admin reaches everything because its rights are full, not through a bypass branch — the
 * mockup has no per-user overrides, which is the only thing the real bypass exists to skip.
 *
 * The backend enforces this with `requireModule(panel)` returning 403; the frontend mirrors it so a
 * control is hidden rather than offered and then refused. A missing provider grants full access, the
 * same fallback ECCLESIA uses, so an isolated render can never break.
 */
import React, { createContext, useContext, useMemo } from 'react';

/** One key per section of the console. Mirrors ECCLESIA's panel vocabulary, not its labels. */
export type PanelKey =
  | 'home'
  | 'members'
  | 'services'
  | 'council'
  | 'giving'
  | 'inventory'
  | 'groups'
  | 'reports'
  | 'communications'
  | 'settings'
  | 'admin';

/** The console's own roles, matching ECCLESIA's `UserRole` enum. */
export type DemoRole = 'super_admin' | 'admin' | 'staff' | 'viewer';

export const ROLES: DemoRole[] = ['super_admin', 'admin', 'staff', 'viewer'];

type Panels = Record<PanelKey, boolean>;

interface Rights {
  panels: Panels;
  actions: { view: boolean; edit: boolean; delete: boolean };
}

/** Every panel, so a right has to be taken away rather than granted one key at a time. */
const FULL: Panels = {
  home: true,
  members: true,
  services: true,
  council: true,
  giving: true,
  inventory: true,
  groups: true,
  reports: true,
  communications: true,
  settings: true,
  admin: true,
};

/** What each role may do. `staff` cannot delete and `viewer` cannot write — the visible difference. */
const RIGHTS: Record<DemoRole, Rights> = {
  super_admin: { panels: FULL, actions: { view: true, edit: true, delete: true } },
  admin: { panels: FULL, actions: { view: true, edit: true, delete: true } },
  staff: { panels: { ...FULL, admin: false }, actions: { view: true, edit: true, delete: false } },
  viewer: { panels: FULL, actions: { view: true, edit: false, delete: false } },
};

export interface PermissionsApi {
  role: DemoRole;
  canView: (panel: PanelKey) => boolean;
  canEdit: (panel: PanelKey) => boolean;
  canDelete: (panel: PanelKey) => boolean;
}

const full: PermissionsApi = {
  role: 'super_admin',
  canView: () => true,
  canEdit: () => true,
  canDelete: () => true,
};

const PermissionsContext = createContext<PermissionsApi>(full);

export const PermissionsProvider: React.FC<{ role: DemoRole; children: React.ReactNode }> = ({ role, children }) => {
  const value = useMemo<PermissionsApi>(() => {
    const rights = RIGHTS[role];
    const canView = (panel: PanelKey) => rights.panels[panel] !== false;
    return {
      role,
      canView,
      canEdit: (panel: PanelKey) => canView(panel) && rights.actions.edit,
      canDelete: (panel: PanelKey) => canView(panel) && rights.actions.delete,
    };
  }, [role]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export function usePermissions(): PermissionsApi {
  return useContext(PermissionsContext);
}
