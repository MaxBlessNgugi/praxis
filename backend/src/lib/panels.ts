/**
 * The console's sections, as the server needs to know them.
 *
 * These keys are a contract between three places: the console's `PanelKey` union, the role templates
 * the seed writes, and the gate in `middleware/authorize.ts` that enforces them. A right granted
 * under a key no gate asks about is a right nobody has, and a gate asking about a key no role grants
 * is a panel nobody can open — so the list lives here rather than being written out three times.
 */
export const PANEL_KEYS = [
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
] as const;

export type PanelKey = (typeof PANEL_KEYS)[number];

/** The three actions a role may carry, in the vocabulary the console already uses. */
export type ActionKey = 'view' | 'edit' | 'delete';
