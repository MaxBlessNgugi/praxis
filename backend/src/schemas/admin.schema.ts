import { z } from 'zod';
import { booleanQuery, window } from './common';

export const auditActionSchema = z.enum(['create', 'update', 'delete', 'restore', 'login']);

/**
 * The panels a role can be granted.
 *
 * These are the console's own keys, taken from `src/lib/permissions.tsx`'s `PanelKey` union, because
 * the rights editor is useless if it cannot express a right the console enforces: a key that is not
 * in this list is rejected by `/api/admin/roles`, and a key the console does not have would grant
 * nothing. `inventory` is the one the schema has no module behind yet — the console still gates it.
 */
export const panelKeySchema = z.enum([
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
]);

export const listTrashQuerySchema = z.object({
  entityName: z.string().trim().max(60).optional(),
  q: z.string().trim().max(120).optional(),
  /** Archived rows are shown by default; this includes the ones already brought back. */
  includeRestored: booleanQuery.default('false'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const listAuditQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  action: auditActionSchema.optional(),
  entityName: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(60).optional(),
  actorId: z.string().uuid().optional(),
  ...window,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * Rights are two maps of booleans — which panels a role can open, and which of view/edit/delete it may
 * perform — because that is the shape the token carries and the console's permission module resolves.
 */
const rightsFields = z.object({
  name: z.string().trim().min(2, 'Name the role').max(80).optional(),
  description: z.string().trim().max(300).optional(),
  panels: z.record(panelKeySchema, z.boolean()).optional(),
  actions: z.record(z.enum(['view', 'edit', 'delete']), z.boolean()).optional(),
});

export const updateRoleSchema = rightsFields.refine((value) => Object.keys(value).length > 0, {
  message: 'Send at least one field to change',
});

export const createRoleSchema = rightsFields.extend({
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{2,30}$/, 'Use lower-case letters, digits and underscores'),
  name: z.string().trim().min(2, 'Name the role').max(80),
});

export type ListTrashQuery = z.infer<typeof listTrashQuerySchema>;
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
