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
import { useAuth } from './auth';
import type { User } from '../types';

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

/** The same keys at runtime, so a right can be resolved by iterating rather than by hand. */
export const PANEL_KEYS: readonly PanelKey[] = [
  'home',
  'members',
  'services',
  'council',
  'giving',
  'inventory',
  'groups',
  'reports',
  'communications',
  'settings',
  'admin',
];

/** The console's own roles, matching ECCLESIA's `UserRole` enum. */
export type DemoRole = 'super_admin' | 'admin' | 'staff' | 'viewer';

export const ROLES: DemoRole[] = ['super_admin', 'admin', 'staff', 'viewer'];

type Panels = Record<PanelKey, boolean>;

interface Rights {
  panels: Panels;
  actions: { view: boolean; edit: boolean; delete: boolean };
}

/** Every panel at a given value. Derived from `PANEL_KEYS` so a new panel cannot be half-granted. */
function allPanels(value: boolean): Panels {
  return PANEL_KEYS.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = value;
    return acc;
  }, {}) as Panels;
}

/** Every panel, so a right has to be taken away rather than granted one key at a time. */
const FULL: Panels = allPanels(true);

/** No panel at all — the honest starting point for a role granted rights one key at a time. */
const NONE: Panels = allPanels(false);

/**
 * What each role may do, mirroring the backend seed exactly. The narrowing ones are the point:
 * `staff` loses the admin panel, and `viewer` keeps four panels read-only. A preview that claims a
 * role sees everything would be worse than no preview at all.
 */
const RIGHTS: Record<DemoRole, Rights> = {
  super_admin: { panels: FULL, actions: { view: true, edit: true, delete: true } },
  admin: { panels: FULL, actions: { view: true, edit: true, delete: true } },
  staff: { panels: { ...FULL, admin: false }, actions: { view: true, edit: true, delete: false } },
  viewer: {
    panels: { ...NONE, home: true, members: true, giving: true, reports: true },
    actions: { view: true, edit: false, delete: false },
  },
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

function getRoleFromUser(user: User | null): DemoRole {
  if (!user) return 'viewer';
  return user.roleKey;
}

function getPanelsFromUser(user: User | null): Panels {
  // No session at all: fall back to full, so an isolated render (a test, a detached preview) holds.
  if (!user) return FULL;
  // With a session, the server's map is authoritative and a panel it did not explicitly grant is
  // **denied**. The API ships the role's permitted keys — the narrow roles rely on omission — so
  // reading a missing key as "allow" is precisely how a viewer would come to see the admin panel.
  const panels = { ...FULL };
  for (const key of PANEL_KEYS) {
    panels[key] = user.panels?.[key] === true;
  }
  return panels;
}

function getActionsFromUser(user: User | null): { view: boolean; edit: boolean; delete: boolean } {
  if (!user?.actions) return { view: true, edit: true, delete: true };
  return {
    view: user.actions.view ?? true,
    edit: user.actions.edit ?? false,
    delete: user.actions.delete ?? false,
  };
}

const PermissionsContext = createContext<PermissionsApi>(full);

interface PermissionsProviderProps {
  children: React.ReactNode;
  /** Optional explicit role override (used by the header's role switcher in demo mode). */
  overrideRole?: DemoRole;
}

export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({
  children,
  overrideRole,
}) => {
  const { user } = useAuth();

  const value = useMemo<PermissionsApi>(() => {
    const role = overrideRole ?? getRoleFromUser(user);
    const panels = overrideRole ? RIGHTS[overrideRole].panels : getPanelsFromUser(user);
    const actions = overrideRole ? RIGHTS[overrideRole].actions : getActionsFromUser(user);

    const canView = (panel: PanelKey) => panels[panel] !== false;
    return {
      role,
      canView,
      canEdit: (panel: PanelKey) => canView(panel) && actions.edit,
      canDelete: (panel: PanelKey) => canView(panel) && actions.delete,
    };
  }, [user, overrideRole]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export function usePermissions(): PermissionsApi {
  return useContext(PermissionsContext);
}