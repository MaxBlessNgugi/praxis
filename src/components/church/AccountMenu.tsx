import React from 'react';
import { useAuth } from '../../lib/auth';

/**
 * The one account menu, rendered wherever an account control opens.
 *
 * The header's avatar and the sidebar's bottom control were specified as two surfaces, but they are
 * one idea: the person signed in, the church the session is acting for, and the three things that
 * follow from it. Drawing them separately is how the two grow to disagree about what signing out
 * means — so both mount this, and both sign out through the same `logout()`.
 *
 * Switching churches is listed rather than a promise: an account serving one church has nothing to
 * switch to, and pretending otherwise only offers a control that can do nothing. The targets come
 * from the session's membership list, which the server resolved at sign-in; choosing one exchanges
 * the token through `switchOrganization`, whose endpoint re-checks the membership itself — the list
 * is a shortcut, never the authority.
 */

const ITEM =
  'w-full px-2.5 py-2 rounded-[9px] flex items-center gap-2 text-left font-headline text-[12px] font-bold text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

export const AccountMenuBody: React.FC<{
  /** Closes whichever popover opened the menu. */
  onDismiss: () => void;
  /** Opens the change-password dialog, which lives in the shell that mounts the control. */
  onOpenSecurity: () => void;
  /** Opens the profile dialog, same ownership as the security one. */
  onOpenProfile: () => void;
}> = ({ onDismiss, onOpenSecurity, onOpenProfile }) => {
  const { user, organization, logout, switchOrganization } = useAuth();
  const [switchingTo, setSwitchingTo] = React.useState<string | null>(null);
  const [switchError, setSwitchError] = React.useState<string | null>(null);

  if (!user) return null;
  // Only the churches this account actually serves, minus the one it is acting for. The server
  // resolved this list from the memberships; it is who the session may become.
  const otherChurches = (user.organizations ?? []).filter((it) => it.id !== organization?.id);

  const signOut = () => {
    onDismiss();
    void logout();
  };

  return (
    <div
      role="menu"
      aria-label="Account menu"
      className="p-1.5 rounded-[12px] bg-[#FFFFFF] border border-[#E7E5E4] shadow-[0_8px_24px_rgba(87,83,78,0.14)]"
    >
      <div className="px-2.5 py-2 border-b border-[#E7E5E4]/70">
        <p className="font-headline text-[12px] font-bold text-[#1C1917] truncate">{user.name}</p>
        <p className="text-[11px] text-[#57534E] truncate">{user.email}</p>
        {organization && (
          <p className="text-[10px] text-[#A8A29E] truncate mt-0.5">Acting for {organization.name}</p>
        )}
      </div>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onDismiss();
          onOpenProfile();
        }}
        className={`mt-1 ${ITEM}`}
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">person</span>
        My profile
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onDismiss();
          onOpenSecurity();
        }}
        className={ITEM}
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">password</span>
        Account &amp; security
      </button>

      {otherChurches.length > 0 && (
        <div className="mt-1 px-2.5 pt-2 border-t border-[#E7E5E4]/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-1">
            Switch church
          </p>
          {switchError && (
            <p role="alert" className="mb-1 rounded-[7px] bg-[#FEF2F2] px-2 py-1 text-[10px] font-semibold text-[#B91C1C]">
              {switchError}
            </p>
          )}
          {otherChurches.map((church) => (
            <button
              key={church.id}
              type="button"
              role="menuitem"
              disabled={switchingTo !== null}
              onClick={async () => {
                setSwitchingTo(church.id);
                setSwitchError(null);
                try {
                  // The endpoint re-checks the membership and answers with a token for the target
                  // church; the context swap re-renders every panel against it.
                  await switchOrganization(church.id);
                  onDismiss();
                } catch (err) {
                  setSwitchError(err instanceof Error ? err.message : 'The switch was refused');
                } finally {
                  setSwitchingTo(null);
                }
              }}
              className={ITEM}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">swap_horiz</span>
              <span className="truncate">{switchingTo === church.id ? 'Switching…' : church.name}</span>
            </button>
          ))}
        </div>
      )}

      <button type="button" role="menuitem" onClick={signOut} className={`mt-1 border-t border-[#E7E5E4]/70 pt-1 ${ITEM}`}>
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">logout</span>
        Sign out
      </button>
    </div>
  );
};

/**
 * Outside-click and Escape dismissal for a mounted account menu.
 *
 * Shared for the same reason as the menu body: two controls dismissing by different rules is two
 * experiences of one thing.
 */
export function useDismissableMenu(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, close, ref]);
}
