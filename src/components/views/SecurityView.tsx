import React, { useState } from 'react';
import { Shield, Key, Plus, Copy, Check, Trash2, AlertOctagon, Lock, Eye, EyeOff } from 'lucide-react';
import { ApiKey } from '../../types';

interface SecurityViewProps {
  apiKeys: ApiKey[];
  onAddApiKey: (key: ApiKey) => void;
  onRevokeApiKey: (id: string) => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({
  apiKeys,
  onAddApiKey,
  onRevokeApiKey,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createdSecretToken, setCreatedSecretToken] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    const rawSecret = `nex_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: keyName.trim(),
      prefix: `${rawSecret.substring(0, 12)}...${rawSecret.slice(-4)}`,
      scopes: ['read:telemetry', 'write:deployments'],
      created: 'Just now',
      lastUsed: 'Never',
      expires: 'In 90 days',
    };

    onAddApiKey(newKey);
    setCreatedSecretToken(rawSecret);
    setKeyName('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Security Vault, API Tokens & Secrets
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographic bearer tokens, zero-trust IP allowlists, and mutual TLS certificates
          </p>
        </div>

        <button
          id="create-api-key-btn"
          onClick={() => {
            setCreatedSecretToken(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white rounded-lg shadow-md shadow-indigo-950 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Generate API Token</span>
        </button>
      </div>

      {/* Security Summary Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Hardware mTLS Active</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Interservice communication is secured with automated mutual TLS 1.3 certificates rotated every 24 hours.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-950/80 border border-indigo-800/40 flex items-center justify-center text-indigo-400 shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Anomaly Detection Active</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Rate limiting prevents unauthorized token scraping. Requests exceeding 1,200 req/min will be blocked.
            </p>
          </div>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="bg-[#0e1628] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-200">Production Secret API Keys ({apiKeys.length})</span>
          <span className="text-xs text-slate-400 font-mono">Vault Status: Unlocked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-5">Key Identifier</th>
                <th className="py-3 px-5">Token Prefix</th>
                <th className="py-3 px-5">Access Scopes</th>
                <th className="py-3 px-5">Last Used</th>
                <th className="py-3 px-5">Expires</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-slate-100 flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    {key.name}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[11px] text-indigo-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {key.prefix}
                      </code>
                      <button
                        onClick={() => handleCopy(key.prefix, key.id)}
                        className="text-slate-500 hover:text-slate-300 p-1"
                        title="Copy key prefix"
                      >
                        {copiedId === key.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <span key={scope} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 font-mono text-[11px] text-slate-400">{key.lastUsed}</td>
                  <td className="py-3.5 px-5 font-mono text-[11px] text-slate-400">{key.expires}</td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => onRevokeApiKey(key.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0e1628] border border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-100 mb-1">Generate Service Secret Key</h3>
            <p className="text-xs text-slate-400 mb-4">Keys allow programmatic access to the Nexus mesh cluster API.</p>

            {createdSecretToken ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-xl text-emerald-300 text-xs">
                  <strong>Token generated!</strong> Please copy this secret key now. You will not be able to see it again.
                </div>

                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={createdSecretToken}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300 pr-10 select-all"
                  />
                  <button
                    onClick={() => handleCopy(createdSecretToken, 'modal')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    {copiedId === 'modal' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Token Name / Purpose</label>
                  <input
                    type="text"
                    placeholder="e.g. Terraform Production Runner"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg shadow-md shadow-indigo-950 transition-all cursor-pointer"
                  >
                    Generate Secret
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
