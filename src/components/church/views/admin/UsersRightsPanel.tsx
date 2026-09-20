import React, { useEffect, useState } from 'react';
import { usersApi, type AdminUserDto } from '../../../../lib/api';
import { errorMessage, useMemberOptions, useRoles, useUsers } from '../../../../hooks/useApi';
import { useAuth } from '../../../../lib/auth';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../DataState';
import { useDialog } from '../../dialog';

/**
 * Accounts, and what each role may do.
 *
 * This screen replaced one that counted thirty-four staff, claimed every account had MFA, and showed
 * a permission matrix assembled in the browser. All of it was invented, and all of it was the sort of
 * claim an administrator acts on. Everything here is either read from the API or absent.
 *
 * Three rules of the API show up in the UI, because a console that offers an action the server will
 * refuse is worse than one that explains why it is not offered:
 *
 *   - You cannot retire your own account, or the last super administrator of this church.
 *   - An administrator may reset anyone's password *except* another super administrator's — otherwise
 *     an administrator could sign in as the pastor.
 *   - Retiring is not deleting. The account keeps its name in the audit trail, which is the point of
 *     retiring rather than removing.
 */

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super administrator',
  admin: 'Administrator',
  staff: 'Church staff',
  viewer: 'Viewer',
};

const ROLE_HINT: Record<string, string> = {
  super_admin: 'Everything, including accounts and rights',
  admin: 'Everything except changing rights',
  staff: 'The office, but cannot delete anything',
  viewer: 'Reads four panels and writes nothing',
};

const PANEL_LABELS: Record<string, string> = {
  home: 'Home',
  members: 'Members',
  services: 'Services',
  council: 'Council',
  giving: 'Giving',
  inventory: 'Inventory',
  groups: 'Groups',
  reports: 'Reports',
  communications: 'Communications',
  settings: 'Settings',
  admin: 'Admin',
};

const FIELD =
  'w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1.5';

const formatWhen = (iso: string | null): string => {
  if (!iso) return 'Never';
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const UsersRightsPanel: React.FC = () => {
  const { user: signedIn, organization } = useAuth();

  // The filters the list endpoint actually takes. Search is debounced because it is a network
  // request per keystroke otherwise, and nobody types their final query in one keypress.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const accounts = useUsers({ q: search || undefined, roleKey: roleFilter || undefined });
  const roles = useRoles();
  // The register's own people, for linking an account to the member it belongs to. A volunteer who
  // signs in as themselves can ask for cover on their own duty; an account with no member behind it
  // can only ever act as the office.
  const memberOptions = useMemberOptions();

  const [isCreating, setIsCreating] = useState(false);
  const createDialog = useDialog(() => setIsCreating(false), 'Add an account');
  const [isInviting, setIsInviting] = useState(false);
  const inviteDialog = useDialog(() => setIsInviting(false), 'Invite by email');
  const [passwordFor, setPasswordFor] = useState<AdminUserDto | null>(null);
  const passwordDialog = useDialog(() => setPasswordFor(null), 'Set a new password');

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [draft, setDraft] = useState({ name: '', email: '', password: '', roleKey: 'staff' });
  const [inviteDraft, setInviteDraft] = useState({ name: '', email: '', roleKey: 'staff', memberId: '' });
  const [inviteResult, setInviteResult] = useState<{ name: string; canSendEmail: boolean; devLink?: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const act = async (id: string, run: () => Promise<unknown>, done: string) => {
    setBusyId(id);
    setError(null);
    try {
      await run();
      setNotice(done);
      await accounts.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyId('create');
    setError(null);
    try {
      await usersApi.create({
        name: draft.name.trim(),
        email: draft.email.trim(),
        password: draft.password,
        roleKey: draft.roleKey,
      });
      setNotice(`${draft.name.trim()} can now sign in. Tell them the password — it is not emailed.`);
      setDraft({ name: '', email: '', password: '', roleKey: 'staff' });
      setIsCreating(false);
      await accounts.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const submitInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyId('invite');
    setError(null);
    try {
      const { data } = await usersApi.invite({
        name: inviteDraft.name.trim(),
        email: inviteDraft.email.trim(),
        roleKey: inviteDraft.roleKey,
        ...(inviteDraft.memberId ? { memberId: inviteDraft.memberId } : {}),
      });
      setInviteResult({ name: data.user.name, canSendEmail: data.canSendEmail, devLink: data.devLink });
      setInviteDraft({ name: '', email: '', roleKey: 'staff', memberId: '' });
      await accounts.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordFor) return;
    setBusyId(passwordFor.id);
    setError(null);
    try {
      await usersApi.setPassword(passwordFor.id, newPassword);
      setNotice(`${passwordFor.name} has a new password. Tell them what you set.`);
      setNewPassword('');
      setPasswordFor(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const items = accounts.items;
  const active = items.filter((row) => row.isActive).length;
  const lastSignIn = items
    .map((row) => row.lastLoginAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-[9px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#B91C1C]">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-[9px] border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-xs font-semibold text-[#047857]">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Accounts in this church', value: String(items.length), icon: 'manage_accounts', hint: `${active} active` },
          { label: 'Roles configured', value: String(roles.roles.length), icon: 'badge', hint: 'Set by the platform' },
          {
            label: 'Last sign-in',
            value: lastSignIn ? formatWhen(lastSignIn) : '—',
            icon: 'login',
            hint: 'Across every account here',
          },
        ].map((card) => (
          <div key={card.label} className="flex items-center gap-3.5 rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-4 shadow-warm-card">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] bg-[#F8F1E9] text-[#C2410C]">
              <span aria-hidden="true" className="material-symbols-outlined text-[22px]">{card.icon}</span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs text-[#57534E]">{card.label}</span>
              <span className="font-headline text-xl font-bold text-[#1C1917]">{card.value}</span>
              <span className="text-[10px] text-[#57534E]">{card.hint}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <div className="flex flex-col gap-3 border-b border-[#E7E5E4] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">group</span>
              Accounts
            </h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              One account per person. The audit log can only name somebody if everybody signs in as themselves.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="users-q">Search accounts</label>
            <input
              id="users-q"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search a name or an email"
              className="w-full rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] px-3 py-2 text-xs text-[#1C1917] placeholder-[#A8A29E] focus:border-[#C2410C] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/15 sm:w-52"
            />
            <label className="sr-only" htmlFor="users-role">Filter by role</label>
            <select
              id="users-role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] px-2.5 py-2 text-xs font-semibold text-[#1C1917] cursor-pointer"
            >
              <option value="">Every role</option>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void accounts.refetch()}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#E7E5E4] bg-[#F8F1E9] px-3 py-2 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">refresh</span>
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                setInviteResult(null);
                setIsInviting(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#C2410C] bg-[#FFFFFF] px-3.5 py-2 text-xs font-bold text-[#C2410C] transition-colors hover:bg-[#FDF8F3] cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">mail</span>
              Invite by email
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#C2410C] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#EA580C] cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">person_add</span>
              Add account
            </button>
          </div>
        </div>

        <div className="pt-4">
          {accounts.loading && <LoadingBlock label="Reading this church's accounts…" />}
          {accounts.error && <ErrorBlock message={accounts.error} onRetry={() => void accounts.refetch()} />}
          {!accounts.loading && !accounts.error && items.length === 0 && (
            <EmptyBlock
              icon="group"
              title="Only your account so far"
              hint="Give the secretary and the treasurer their own accounts, each with the smallest role that does their job."
            />
          )}
          {items.length > 0 && (
            <ul className="divide-y divide-[#E7E5E4]">
              {items.map((row) => {
                const isSelf = row.id === signedIn?.id;
                return (
                  <li key={row.id} className="flex flex-col gap-3 py-3.5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#1C1917]">{row.name}</span>
                        {isSelf && (
                          <span className="rounded-[6px] bg-[#F8F1E9] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#57534E]">You</span>
                        )}
                        {!row.isActive && (
                          <span className="rounded-[6px] bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#B91C1C]">Disabled</span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#57534E]">
                        {row.email} · last signed in {formatWhen(row.lastLoginAt)}
                      </p>
                      {row.churches.length > 1 && (
                        <p className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-[#A8A29E]">Serves</span>
                          {row.churches.map((church) => (
                            <span
                              key={church.id}
                              className={`rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold ${
                                church.id === organization?.id
                                  ? 'bg-[#FDE8D7] text-[#9A3412]'
                                  : 'bg-[#F8F1E9] text-[#57534E]'
                              }`}
                              title={`${church.name} — ${ROLE_LABELS[church.roleKey ?? ''] ?? 'no role'}`}
                            >
                              {church.name}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`role-${row.id}`}>
                        Role for {row.name}
                      </label>
                      <select
                        id={`role-${row.id}`}
                        value={row.roleKey ?? ''}
                        disabled={busyId === row.id || !row.roleKey}
                        onChange={(event) =>
                          void act(row.id, () => usersApi.assignRole(row.id, event.target.value), `${row.name} is now ${ROLE_LABELS[event.target.value] ?? event.target.value}.`)
                        }
                        className="rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] px-2.5 py-1.5 text-xs font-semibold text-[#1C1917] cursor-pointer"
                      >
                        {Object.entries(ROLE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setNewPassword('');
                          setPasswordFor(row);
                        }}
                        className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] cursor-pointer"
                      >
                        Set password
                      </button>

                      {row.isInvited && (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() =>
                            void act(
                              row.id,
                              () => usersApi.reinvite(row.id),
                              `A new activation link was issued for ${row.name}.`,
                            )
                          }
                          className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        >
                          Re-issue invitation
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busyId === row.id || isSelf}
                        title={isSelf ? 'You cannot disable your own account' : undefined}
                        onClick={() =>
                          void act(
                            row.id,
                            () => usersApi.update(row.id, { isActive: !row.isActive }),
                            row.isActive ? `${row.name} can no longer sign in.` : `${row.name} can sign in again.`,
                          )
                        }
                        className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-bold text-[#1C1917] transition-colors hover:bg-[#F5EDE4] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        {row.isActive ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        type="button"
                        disabled={busyId === row.id || isSelf}
                        title={isSelf ? 'You cannot retire your own account' : undefined}
                        onClick={() =>
                          void act(
                            row.id,
                            () => usersApi.remove(row.id, { reason: 'account', reasonLabel: 'Retired from the accounts screen' }),
                            `${row.name}'s account was retired. It is in the Trash if that was a mistake.`,
                          )
                        }
                        className="rounded-[9px] border border-[#FECACA] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-bold text-[#B91C1C] transition-colors hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        Retire
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card">
        <h3 className="flex items-center gap-2 font-headline text-base font-bold text-[#1C1917]">
          <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">key</span>
          What each role may do
        </h3>
        <p className="mt-0.5 text-xs text-[#57534E]">
          Read from the privileges the server is actually enforcing, not from a list kept here. The server refuses
          the request whether or not the button was drawn.
        </p>

        <div className="mt-4">
          {roles.loading && <LoadingBlock label="Reading the roles…" />}
          {roles.error && <ErrorBlock message={roles.error} onRetry={() => void roles.refetch()} />}
          {roles.roles.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {roles.roles.map((role) => {
                const panels = Object.entries(role.panels).filter(([, allowed]) => allowed).map(([key]) => PANEL_LABELS[key] ?? key);
                const held = role.actions ?? {};
                return (
                  <div key={role.id} className="rounded-[14px] border border-[#E7E5E4] bg-[#FDF8F3] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#1C1917]">{role.name}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#57534E]">
                        {role.users} {role.users === 1 ? 'account' : 'accounts'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#57534E]">{ROLE_HINT[role.key] ?? 'A custom role'}</p>
                    <dl className="mt-2 space-y-1 text-[11px] text-[#57534E]">
                      <div className="flex gap-1.5">
                        <dt className="font-bold text-[#1C1917]">Panels:</dt>
                        <dd>{panels.length === 0 ? 'None' : panels.join(', ')}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="font-bold text-[#1C1917]">Records:</dt>
                        <dd>
                          {held.view ? 'read' : 'no access'}
                          {held.edit ? ', write' : ''}
                          {held.delete ? ', delete' : ' (cannot delete)'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-[11px] text-[#57534E]">
            Roles are templates the platform ships rather than something each church invents, so that two parishes
            mean the same thing by &ldquo;treasurer&rdquo;. Pick the narrowest one that does the job.
          </p>
        </div>
      </div>

      {isInviting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...inviteDialog}>
          <form onSubmit={submitInvite} className="w-full max-w-[440px] rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">Invite by email</h3>
            {inviteResult ? (
              <>
                <div className="mt-4 space-y-3">
                  <p role="status" className="rounded-[9px] border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2.5 text-xs font-semibold text-[#047857]">
                    {inviteResult.name}&apos;s account exists. {inviteResult.canSendEmail ? 'An activation link has been emailed — it works once and expires in two days.' : 'No email provider is configured, so the link could not be sent.'}
                  </p>
                  {!inviteResult.canSendEmail && (
                    <p className="rounded-[9px] border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5 text-[11px] text-[#78350F]">
                      In production the link is emailed. On this installation, hand the address over in person:
                      they choose their own password through it, and until then the account cannot sign in.
                    </p>
                  )}
                  {inviteResult.devLink && (
                    <div>
                      <label className={LABEL} htmlFor="invite-dev-link">Development handover link</label>
                      <input id="invite-dev-link" readOnly value={inviteResult.devLink} onFocus={(e) => e.target.select()} className={`${FIELD} font-mono text-[11px]`} />
                    </div>
                  )}
                  <p className="text-[11px] text-[#57534E]">
                    The account appears in the list above now, and the audit log records the invitation. Set a
                    password yourself only if the link is lost — that ends whatever the holder was mid-way through.
                  </p>
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsInviting(false)}
                    className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-xs text-[#57534E]">
                  The account is created now, but it cannot sign in until its owner chooses a password through the
                  emailed link — nobody invents a password for somebody else.
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className={LABEL} htmlFor="invite-name">Name</label>
                    <input id="invite-name" required value={inviteDraft.name} onChange={(e) => setInviteDraft((previous) => ({ ...previous, name: e.target.value }))} className={FIELD} />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="invite-email">Email</label>
                    <input id="invite-email" type="email" required autoComplete="off" value={inviteDraft.email} onChange={(e) => setInviteDraft((previous) => ({ ...previous, email: e.target.value }))} className={FIELD} />
                    <p className="mt-1 text-[11px] text-[#57534E]">The link and every future sign-in use this address.</p>
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="invite-role">Role</label>
                    <select id="invite-role" value={inviteDraft.roleKey} onChange={(e) => setInviteDraft((previous) => ({ ...previous, roleKey: e.target.value }))} className={FIELD}>
                      <option value="staff">Church staff — the office, no deleting</option>
                      <option value="viewer">Viewer — reads only</option>
                      <option value="admin">Administrator — everything but rights</option>
                      <option value="super_admin">Super administrator — everything</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="invite-member">On the register as (optional)</label>
                    <select
                      id="invite-member"
                      value={inviteDraft.memberId}
                      onChange={(e) => setInviteDraft((previous) => ({ ...previous, memberId: e.target.value }))}
                      className={FIELD}
                    >
                      <option value="">Not on the register</option>
                      {memberOptions.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-[#57534E]">
                      Link the account to the person on the register, so a volunteer can act as themselves.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsInviting(false)} className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] hover:bg-[#F5EDE4] cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={busyId === 'invite'} className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer">
                    {busyId === 'invite' ? 'Inviting…' : 'Send the invitation'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {isCreating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...createDialog}>
          <form onSubmit={submitCreate} className="w-full max-w-[440px] rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">Add an account</h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              They sign in with the password you set. Nothing is emailed — hand it over in person.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className={LABEL} htmlFor="new-name">Name</label>
                <input id="new-name" required value={draft.name} onChange={(e) => setDraft((previous) => ({ ...previous, name: e.target.value }))} className={FIELD} />
              </div>
              <div>
                <label className={LABEL} htmlFor="new-email">Email</label>
                <input id="new-email" type="email" required autoComplete="off" value={draft.email} onChange={(e) => setDraft((previous) => ({ ...previous, email: e.target.value }))} className={FIELD} />
              </div>
              <div>
                <label className={LABEL} htmlFor="new-password">Password</label>
                <input id="new-password" type="text" required autoComplete="new-password" value={draft.password} onChange={(e) => setDraft((previous) => ({ ...previous, password: e.target.value }))} className={FIELD} />
                <p className="mt-1 text-[11px] text-[#57534E]">At least 8 characters, and not one of the passwords everybody tries.</p>
              </div>
              <div>
                <label className={LABEL} htmlFor="new-role">Role</label>
                <select id="new-role" value={draft.roleKey} onChange={(e) => setDraft((previous) => ({ ...previous, roleKey: e.target.value }))} className={FIELD}>
                  <option value="staff">Church staff — the office, no deleting</option>
                  <option value="viewer">Viewer — reads only</option>
                  <option value="admin">Administrator — everything but rights</option>
                  <option value="super_admin">Super administrator — everything</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreating(false)} className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] hover:bg-[#F5EDE4] cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busyId === 'create'} className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer">
                {busyId === 'create' ? 'Creating…' : 'Create the account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {passwordFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1C1917]/45 p-4" {...passwordDialog}>
          <form onSubmit={submitPassword} className="w-full max-w-[420px] rounded-[14px] border border-[#E7E5E4] bg-[#FFFFFF] p-6 shadow-warm-card-hover">
            <h3 className="font-headline text-base font-bold text-[#1C1917]">A new password for {passwordFor.name}</h3>
            <p className="mt-0.5 text-xs text-[#57534E]">
              For the ordinary case: somebody has forgotten theirs and there is nobody else to ask. Any lockout on the
              account is lifted at the same time.
            </p>
            {passwordFor.roleKey === 'super_admin' && (
              <p className="mt-3 rounded-[9px] border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[11px] text-[#78350F]">
                A super administrator&apos;s password can only be reset by another super administrator, or the server
                will refuse this.
              </p>
            )}
            <div className="mt-4">
              <label className={LABEL} htmlFor="reset-password">New password</label>
              <input
                id="reset-password"
                type="text"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={FIELD}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPasswordFor(null)} className="rounded-[9px] border border-[#E7E5E4] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1C1917] hover:bg-[#F5EDE4] cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busyId === passwordFor.id} className="rounded-[9px] bg-[#C2410C] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] disabled:opacity-60 cursor-pointer">
                {busyId === passwordFor.id ? 'Setting…' : 'Set the password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
