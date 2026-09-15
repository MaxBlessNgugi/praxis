import React, { useState } from 'react';
import { authApi } from '../../lib/api';
import { errorMessage } from '../../hooks/useApi';
import { useAuth } from '../../lib/auth';
import { useDialog } from './dialog';

/**
 * Changing your own password.
 *
 * It exists because until now it did not: the seeded administrator's password was documented in the
 * README and there was no way in the console to change it. A system whose only account can keep a
 * password printed in a file is not one to hand to a church.
 *
 * Two facts are stated rather than glossed. The current password is asked for even though the session
 * is already signed in, because the thing being defended against is a copied token. And signing out
 * does not revoke a token that has already been copied — that is a property of the token design, and
 * the person changing their password is exactly the person who should know it.
 */

const FIELD =
  'w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1.5';

export const AccountSecurityDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const dialog = useDialog(onClose, 'Change your password');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setDone(true);
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
            <h2 className="font-headline text-base font-bold text-[#1C1917]">Your password</h2>
            <p className="mt-0.5 text-xs text-[#57534E]">
              {user?.name ?? 'Signed in'} · {user?.email ?? ''}
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

        {done ? (
          <div className="mt-4">
            <p role="status" className="rounded-[9px] border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2.5 text-xs font-semibold text-[#047857]">
              Your password is changed, and any lockout on the account is lifted.
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-[#57534E]">
              You stay signed in on this machine. If somebody else knows the old password, they cannot use it again —
              and if you think a session was already copied off a shared computer, tell the operator, because a token
              that has been copied stays valid until it expires.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <label className={LABEL} htmlFor="current-password">Your current password</label>
              <input
                id="current-password"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="change-new-password">New password</label>
              <input
                id="change-new-password"
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={FIELD}
              />
              <p className="mt-1 text-[11px] text-[#57534E]">
                At least 8 characters, and not one of the passwords everybody tries.
              </p>
            </div>
            <div>
              <label className={LABEL} htmlFor="confirm-password">New password again</label>
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={FIELD}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-[9px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#B91C1C]">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-[#57534E]">
                Changing it does not sign out other machines. Ask the operator if you need that.
              </p>
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer"
              >
                {busy ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
