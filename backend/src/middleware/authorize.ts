import type { NextFunction, Request, Response } from 'express';
import { forbiddenError, unauthorizedError } from './errorHandler';
import type { ActionKey, PanelKey } from '../lib/panels';

/**
 * Where a role's rights are enforced, rather than taken on trust.
 *
 * `panels` and `actions` used to travel from the database to the console and be consulted there and
 * almost nowhere else: the console hid a control, and the API would have allowed the call. That is the
 * wrong way round. This gate is mounted inside every operating router, after `requireAuth` has
 * resolved who is asking and which church they are asking for, and it answers the three questions a
 * protected operation has to answer — does this role's role have the section, and for this verb, the
 * action — before any handler runs.
 *
 * Three decisions are deliberate.
 *
 * **The verb decides the action.** A read needs `view`, a delete needs `delete`, and everything else
 * needs `edit`. That is one rule in one place, so a new endpoint under an existing mount is covered
 * without its author remembering anything, and a new mount is one line in its router.
 *
 * **A missing key denies.** A role that does not explicitly grant a panel does not have it — the same
 * rule the console applies, and the opposite of a `!== false` test, which would read an omission as a
 * grant. The seed lists a viewer's four panels for exactly this reason.
 *
 * **`super_admin` always passes.** An owner locked out of their own church by a rights edit is a
 * support call nobody can resolve, which is the same reasoning `requireRole` already documents.
 */
export function moduleGate(panel?: PanelKey) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(unauthorizedError());
      return;
    }
    if (user.roleKey === 'super_admin') {
      next();
      return;
    }

    if (panel && user.panels[panel] !== true) {
      next(forbiddenError(`Your role does not include the ${panel} section`));
      return;
    }

    const action: ActionKey =
      req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
        ? 'view'
        : req.method === 'DELETE'
          ? 'delete'
          : 'edit';
    if (user.actions[action] !== true) {
      next(forbiddenError(`Your role may not ${action} here`));
      return;
    }

    next();
  };
}
