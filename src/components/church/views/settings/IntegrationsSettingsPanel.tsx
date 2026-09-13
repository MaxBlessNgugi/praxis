import React, { useState } from 'react';
import { ThirdPartyIntegration } from '../../../../types';
import { INITIAL_INTEGRATIONS } from '../../../../data/churchMockData';

export const IntegrationsSettingsPanel: React.FC = () => {
  const [integrations, setIntegrations] = useState<ThirdPartyIntegration[]>(INITIAL_INTEGRATIONS);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleToggleConnect = (id: string) => {
    setIntegrations(
      integrations.map((item) => {
        if (item.id === id) {
          const newStatus = item.status === 'connected' ? 'disconnected' : 'connected';
          return {
            ...item,
            status: newStatus,
            lastSync: newStatus === 'connected' ? 'Just now' : item.lastSync,
          };
        }
        return item;
      })
    );
  };

  const handleSyncNow = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setIntegrations(
        integrations.map((item) =>
          item.id === id ? { ...item, lastSync: 'Just now', status: 'connected' } : item
        )
      );
      setSyncingId(null);
    }, 1200);
  };

  return (
    <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4]">
        <div>
          <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#C2410C]">hub</span>
            Ecclesiastical Integrations & Third-Party Bridges
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            Connect merchant giving processors, sanctuary presentation software, financial ledgers, and SMS telecom relays.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-[8px] bg-[#059669]/10 text-[#059669] text-xs font-bold border border-[#059669]/20 flex items-center gap-1.5 self-start sm:self-auto">
          <span className="material-symbols-outlined text-[16px]">verified_user</span>
          PCI-DSS Tier 1 Compliant
        </span>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((item) => {
          const isConnected = item.status === 'connected';
          const isSyncing = syncingId === item.id;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-[12px] border transition-all flex flex-col justify-between ${
                isConnected
                  ? 'bg-[#FDF8F3] border-[#C2410C]/30 shadow-xs'
                  : 'bg-[#FFFFFF] border-[#E7E5E4] opacity-85'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-[8px] bg-[#F8F1E9] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    </span>
                    <div>
                      <h4 className="font-headline text-xs font-bold text-[#1C1917]">
                        {item.name}
                      </h4>
                      <span className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isConnected
                        ? 'bg-[#059669]/10 text-[#059669]'
                        : item.status === 'error'
                        ? 'bg-[#DC2626]/10 text-[#DC2626]'
                        : 'bg-[#57534E]/10 text-[#57534E]'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-[#57534E] leading-relaxed mb-3">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E7E5E4]/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#A8A29E]">
                  Last synced: <strong className="text-[#1C1917] font-medium">{item.lastSync || 'Never'}</strong>
                </span>

                <div className="flex items-center gap-2">
                  {isConnected && (
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => handleSyncNow(item.id)}
                      className="p-1.5 rounded-[6px] bg-[#FFFFFF] hover:bg-[#E7E5E4] text-[#1C1917] border border-[#E7E5E4] transition-all cursor-pointer"
                      title="Sync Now"
                    >
                      <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
                        sync
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleConnect(item.id)}
                    className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all cursor-pointer ${
                      isConnected
                        ? 'bg-[#F8F1E9] hover:bg-[#FEE2E2] hover:text-[#DC2626] text-[#57534E] border border-[#E7E5E4]'
                        : 'bg-[#C2410C] hover:bg-[#EA580C] text-white shadow-xs'
                    }`}
                  >
                    {isConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
