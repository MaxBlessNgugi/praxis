/**
 * Panel + action permissions, ported from ECCLESIA (`src/permissions.tsx`).
 *
 * The real system does not carry fifty roles. It carries nine panel keys, three actions and four
 * roles, and resolves rights the same way on both sides of the wire:
 *
 *   1. super_admin                          → full access, always
 *   2. the role preset below                → the baseline for that role
 *   3. a per-user override would merge here → (the real backend stores it on User.panels/actions)
 *   4. a missing field                      → stays as the baseline
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
  | 'groups'
  | 'reports'
  | 'communications'
  | 'settings'
  | 'admin';

export const PANEL_KEYS: PanelKey[] = [
  'home',
  'members',
  'services',
  'council',
  'giving',
  'groups',
  'reports',
  'communications',
  'settings',
  'admin',
];

export type PanelAction = 'view' | 'edit' | 'delete';

export interface PanelPermissions {
  panels: Record<PanelKey, boolean>;
  actions: Record<PanelAction, boolean>;
}

/** The console's own roles, matching ECCLESIA's `UserRole` enum. */
export type DemoRole = 'super_admin' | 'admin' | 'staff' | 'viewer';

export const ROLES: DemoRole[] = ['super_admin', 'admin', 'staff', 'viewer'];

const allPanels = (value: boolean) =>
  Object.fromEntries(PANEL_KEYS.map((key) => [key, value])) as Record<PanelKey, boolean>;

/**
 * What each role may do. `viewer` is read-only and `staff` cannot delete, which is the visible
 * difference the console is meant to demonstrate; `admin` runs the office, `super_admin` owns it.
 */
export const ROLE_PRESETS: Record<DemoRole, PanelPermissions> = {
  super_admin: { panels: allPanels(true), actions: { view: true, edit: true, delete: true } },
  admin: { panels: allPanels(true), actions: { view: true, edit: true, delete: true } },
  staff: { panels: { ...allPanels(true), admin: false }, actions: { view: true, edit: true, delete: false } },
  viewer: { panels: allPanels(true), actions: { view: true, edit: false, delete: false } },
};

export interface PermissionsApi {
  role: DemoRole;
  permissions: PanelPermissions;
  canView: (panel: PanelKey) => boolean;
  canEdit: (panel: PanelKey) => boolean;
  canDelete: (panel: PanelKey) => boolean;
}

const full: PermissionsApi = {
  role: 'super_admin',
  permissions: ROLE_PRESETS.super_admin,
  canView: () => true,
  canEdit: () => true,
  canDelete: () => true,
};

const PermissionsContext = createContext<PermissionsApi>(full);

export const PermissionsProvider: React.FC<{ role: DemoRole; children: React.ReactNode }> = ({ role, children }) => {
  const value = useMemo<PermissionsApi>(() => {
    const permissions = ROLE_PRESETS[role] ?? ROLE_PRESETS.super_admin;
    // super_admin bypasses every check, exactly as the backend middleware does.
    if (role === 'super_admin') return { role, permissions, canView: () => true, canEdit: () => true, canDelete: () => true };
    const canView = (panel: PanelKey) => permissions.panels[panel] !== false;
    return {
      role,
      permissions,
      canView,
      canEdit: (panel: PanelKey) => canView(panel) && permissions.actions.edit !== false,
      canDelete: (panel: PanelKey) => canView(panel) && permissions.actions.delete !== false,
    };
  }, [role]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export function usePermissions(): PermissionsApi {
  return useContext(PermissionsContext);
}
