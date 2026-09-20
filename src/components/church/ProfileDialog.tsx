import React, { useState } from 'react';
import { errorMessage } from '../../hooks/useApi';
import { useAuth } from '../../lib/auth';
import { useDialog } from './dialog';

/**
 * The signed-in account's own profile.
 *
 * What it edits is deliberately narrow: the display name, and nothing else. The email address is the
 * account's identity across every church it serves and the address its password mail goes to, so it
 * changes through the accounts screen where an administrator is accountable for it — not through a
 * dialog any borrowed session could reach. Everything else on this screen is shown, not offered:
 * role, church context and sign-in history are facts about the session, not preferences.
 */
export const ProfileDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, organization, renameSelf } = useAuth();
  const dialog = useDialog(onClose, 'My profile');

  const [name, setName] = useState(user?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Through the context, which both the API call and the name every surface prints own.
      await renameSelf(name.trim());
      setSaved(`Now signing in as ${name.trim()}.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1C1917]/45 p-4" {...dialog}>
      <div className="w-full max-w-[440px] rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-headline text-base font-bold text-[#1C1917]">My profile</h2>
            <p className="mt-0.5 text-xs text-[#57534E]">
              {organization ? `Acting for ${organization.name}` : 'Your account'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[#57534E] hover:bg-[#F5EDE4] hover:text-[#1C1917] cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[19px]">close</span>
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-bold text-[#1C1917] mb-1.5">
              Name
            </label>
            <input
              id="profile-name"
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="block text-xs font-bold text-[#1C1917] mb-1.5">
              Email
            </label>
            <input
              id="profile-email"
              value={user?.email ?? ''}
              disabled
              aria-describedby="profile-email-why"
              className="w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#E7E5E4] bg-[#F8F1E9] text-[#57534E] cursor-not-allowed"
            />
            <p id="profile-email-why" className="mt-1 text-[11px] text-[#57534E]">
              The account's identity across every church it serves. Ask an administrator to change it.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-2 rounded-[9px] bg-[#FDF8F3] border border-[#E7E5E4] p-3 text-[11px]">
            <dt className="font-bold text-[#1C1917]">Role here</dt>
            <dd className="text-[#57534E]">{user?.roleName ?? '—'}</dd>
            <dt className="font-bold text-[#1C1917]">Last signed in</dt>
            <dd className="text-[#57534E]">This session</dd>
          </dl>

          {saved && (
            <p role="status" className="rounded-[9px] border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-xs font-semibold text-[#047857]">
              {saved}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-[9px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B91C1C]">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-[#57534E]">For a new password, use Account &amp; security.</p>
            <button
              type="submit"
              disabled={busy || name.trim() === user?.name}
              className="shrink-0 rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
