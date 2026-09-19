import { useCallback, useEffect, useState } from 'react';
import type { ParishNavTab } from '../types';

/**
 * The console's router.
 *
 * The app is a section switcher — the sidebar picks one of twelve sections, most of which carry
 * sub-tabs — so the URL's job is to name **where in that switcher** the user is: `/giving/tithes`,
 * `/admin/churches`, `/find-christian`. A route library would model screens this app does not have;
 * what it needed was the switcher written into the address bar, so back/forward and a shared link
 * land where a click would have.
 *
 * The URL is a *serialization* of the state `ChurchSystemApp` already held — not a second state.
 * Every navigation calls `history.pushState`, which makes each section a history entry, so the
 * browser's back button retraces the user's steps through the console. Every change (including back
 * and forward) is read back through one parse function, so the URL and the state cannot disagree.
 *
 * Deep links for individual records (a member's file, a sitting) live with the screens that open
 * them, as query parameters on the section's URL — see `useMemberDeepLink` in `FindChristianView`.
 */

/** A section of the switcher, as the URL names it — and as the sidebar must click it back. */
export const SECTION_SEGMENTS = {
  home: 'dashboard',
  'find-christian': 'members/find',
  'add-new-christian': 'members/add',
  'delete-christian': 'members/trash',
  'family-unit': 'households',
  'services-worship': 'services',
  governance: 'governance',
  'giving-stewardship': 'giving',
  'inventory-assets': 'inventory',
  'ministries-groups': 'ministries',
  'reports-certs': 'reports',
  communications: 'communications',
  'settings-profile': 'settings',
  'admin-portal': 'admin',
} as const satisfies Record<ParishNavTab, string>;

/** The inverse of the map above, derived so the two can never drift. */
const TAB_BY_PREFIX: Array<{ prefix: string; tab: ParishNavTab }> = Object.entries(SECTION_SEGMENTS)
  .map(([tab, segment]) => ({ prefix: `/${segment}`, tab: tab as ParishNavTab }))
  .sort((a, b) => b.prefix.length - a.prefix.length);

/** Sub-tab segments per section. A sub-tab the section does not list is refused at parse time. */
export const SUB_SEGMENTS: Partial<Record<ParishNavTab, Record<string, string>>> = {
  'services-worship': {
    'service-planner': 'service-planner',
    attendance: 'attendance',
    'volunteer-roster': 'volunteer-roster',
    'service-reports': 'service-reports',
  },
  'giving-stewardship': {
    tithes: 'tithes',
    offerings: 'offerings',
    'project-funding': 'project-funding',
    welfare: 'welfare',
    charity: 'charity',
  },
  'ministries-groups': {
    departments: 'ministries-departmental',
    leadership: 'ministries-leadership',
    volunteers: 'ministries-volunteers',
  },
  communications: {
    announcements: 'announcements',
    broadcasts: 'broadcasts',
    'events-calendar': 'events-calendar',
    'prayer-requests': 'prayer-requests',
    'birthdays-anniversaries': 'birthdays-anniversaries',
  },
  'settings-profile': {
    'org-profile': 'org-profile',
    subscription: 'subscription',
    notifications: 'notifications',
    integrations: 'integrations',
    'data-backup': 'data-backup',
    customization: 'customization',
  },
  'admin-portal': {
    'users-rights': 'users-rights',
    trash: 'trash',
    'audit-log': 'audit-log',
    'finance-audit': 'finance-audit',
    churches: 'churches',
  },
};

/** The whole location, parsed. Where the console is, and which record is open on it. */
export interface Route {
  tab: ParishNavTab;
  /** The section's sub-tab, where the section carries one. */
  sub: string | null;
  /** The member whose record dialog is open on the register, by id. */
  memberId: string | null;
  /** True when the URL names no section the console has — a broken or stale link. */
  notFound?: boolean;
}

export const SECTION_PATHS: Record<ParishNavTab, string> = Object.fromEntries(
  Object.entries(SECTION_SEGMENTS).map(([tab, segment]) => [tab, `/${segment}`]),
) as Record<ParishNavTab, string>;

/** `/giving/tithes?member=<id>` → `{ tab, sub, memberId }`. Unknown text falls back to Home. */
export function parsePath(pathname: string, search: string): Route {
  const memberId = new URLSearchParams(search).get('member');
  const path = pathname.replace(/\/+$/, '') || '/';

  for (const { prefix, tab } of TAB_BY_PREFIX) {
    if (path !== prefix && !path.startsWith(`${prefix}/`)) continue;
    const rest = path.slice(prefix.length).replace(/^\//, '');
    const subMap = SUB_SEGMENTS[tab];
    if (rest) {
      // A second segment is a sub-tab. One this section does not carry falls back to the section
      // root rather than to Home: a stale bookmark should land nearby, not throw the user out.
      if (!subMap || !(rest in subMap)) return { tab, sub: null, memberId };
      return { tab, sub: subMap[rest], memberId };
    }
    return { tab, sub: null, memberId };
  }
  // Root is home; anything else is a location the console does not have — named as such so the
  // shell can offer a not-found screen instead of silently opening the dashboard under a wrong
  // address.
  return { tab: 'home', sub: null, memberId, notFound: path !== '/' };
}

/** Serialize the route back to the URL the way it was parsed. */
export function toPath(route: Route): string {
  const base = SECTION_PATHS[route.tab];
  const subMap = SUB_SEGMENTS[route.tab];
  // Invert the sub map: the URL segment for the current sub-tab value.
  const segment = route.sub && subMap ? Object.entries(subMap).find(([, value]) => value === route.sub)?.[0] : null;
  const path = segment ? `${base}/${segment}` : base;
  return route.memberId ? `${path}?member=${route.memberId}` : path;
}

function currentRoute(): Route {
  return parsePath(window.location.pathname, window.location.search);
}

/** Fired on every programmatic navigation, so every `useRouter` reader re-parses in step. */
const NAVIGATED = 'praxis:navigated';

/**
 * The console's location, synchronized with the address bar.
 *
 * Returns the route and a `navigate` that records a history entry. Every change — `navigate`,
 * back, forward — is read back through the one parse function, and every holder of this hook
 * re-parses on every change, so two readers (the shell and a view writing a deep link) cannot
 * disagree about where the user is.
 */
export function useRouter(): { route: Route; navigate: (route: Route, replace?: boolean) => void } {
  const [route, setRoute] = useState<Route>(currentRoute);

  const navigate = useCallback((next: Route, replace = false) => {
    const path = toPath(next);
    if (replace) window.history.replaceState(null, '', path);
    else window.history.pushState(null, '', path);
    setRoute(next);
    window.dispatchEvent(new Event(NAVIGATED));
  }, []);

  useEffect(() => {
    const reparse = () => setRoute(currentRoute());
    window.addEventListener('popstate', reparse);
    window.addEventListener(NAVIGATED, reparse);
    return () => {
      window.removeEventListener('popstate', reparse);
      window.removeEventListener(NAVIGATED, reparse);
    };
  }, []);

  return { route, navigate };
}

/** Which record the register should have open, by id, from a deep link. */
export function memberIdFromRoute(route: Route): string | null {
  return route.memberId;
}
