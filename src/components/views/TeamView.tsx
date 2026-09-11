import React, { useState } from 'react';
import { Users, UserPlus, Shield, Check, X, Mail, MoreHorizontal, KeyRound } from 'lucide-react';
import { TeamMember } from '../../types';

interface TeamViewProps {
  members: TeamMember[];
  onAddMember: (member: TeamMember) => void;
  onUpdateRole: (id: string, newRole: TeamMember['role']) => void;
  onRemoveMember: (id: string) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  members,
  onAddMember,
  onUpdateRole,
  onRemoveMember,
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('DevOps Engineer');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    const newMember: TeamMember = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      status: 'invited',
      twoFactorEnabled: false,
      lastActive: 'Invitation sent',
    };

    onAddMember(newMember);
    setName('');
    setEmail('');
    setShowInviteModal(false);
  };

  const rolesList: TeamMember['role'][] = [
    'Owner',
    'Admin',
    'DevOps Engineer',
    'Security Auditor',
    'Viewer',
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Access Control & Team Permissions (RBAC)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Role-based authorization policies, session security, and hardware token authentication
          </p>
        </div>

        <button
          id="invite-member-trigger-btn"
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white rounded-lg shadow-md shadow-indigo-950 transition-all cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Role Policy Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block mb-1">
            Enforced Policy
          </span>
          <h4 className="text-sm font-bold text-slate-200">Mandatory 2FA Enabled</h4>
          <p className="text-xs text-slate-400 mt-1">4 of 5 active operators have biometric/U2F keys configured.</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block mb-1">
            Least Privilege
          </span>
          <h4 className="text-sm font-bold text-slate-200">Strict Production Guardrails</h4>
          <p className="text-xs text-slate-400 mt-1">Direct production cluster deployments require 2 approvals.</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block mb-1">
            Audit Retention
          </span>
          <h4 className="text-sm font-bold text-slate-200">90-Day Cloud Trail</h4>
          <p className="text-xs text-slate-400 mt-1">All mutations and API token calls signed into tamper-proof logs.</p>
        </div>
      </div>

      {/* Members Roster Table */}
      <div className="bg-[#0e1628] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-200">Active Operators & Collaborators ({members.length})</span>
          <span className="text-xs text-slate-400 font-mono">Organization ID: org_nexus_998a</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-5">Member</th>
                <th className="py-3 px-5">Role Scope</th>
                <th className="py-3 px-5">2FA Auth</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Last Active</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-5 flex items-center gap-3">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                    />
                    <div>
                      <span className="font-semibold text-slate-100 block">{member.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{member.email}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-5">
                    <select
                      value={member.role}
                      onChange={(e) => onUpdateRole(member.id, e.target.value as any)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-indigo-300 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {rolesList.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-3.5 px-5">
                    {member.twoFactorEnabled ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40 font-mono">
                        <Check className="w-3 h-3" /> Hardware U2F
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/40 font-mono">
                        Not Enrolled
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-5">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        member.status === 'active'
                          ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-5 font-mono text-[11px] text-slate-400">
                    {member.lastActive}
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    {member.role !== 'Owner' ? (
                      <button
                        onClick={() => onRemoveMember(member.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">Root Account</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowInviteModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0e1628] border border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-100 mb-1">Invite Team Operator</h3>
            <p className="text-xs text-slate-400 mb-4">Send an encrypted invite with role-based permissions.</p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rachel Zane"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="rachel.z@nexus.cloud"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role Assignment</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
                >
                  {rolesList.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg shadow-md shadow-indigo-950 transition-all cursor-pointer"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
