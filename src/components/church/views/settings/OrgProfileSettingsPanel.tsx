import React from 'react';
import { useOrgProfile } from '../../../../hooks/useApi';
import { ChurchIdentityPanel } from './ChurchIdentityPanel';
import { ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * The organization profile tab.
 *
 * The editable half is `ChurchIdentityPanel` above — name, contacts, vision and the logo, saved to
 * the server. What sits below it is the rest of the same server record rendered for reading: the
 * service running order, the social channels, and the values the church publishes. They are shown
 * from the API response rather than being editable here twice, because a fact with two editing
 * surfaces is a fact that can disagree with itself.
 */
export const OrgProfileSettingsPanel: React.FC = () => {
  const profile = useOrgProfile();
  const record = profile.data?.data ?? null;

  const serviceTimes = record?.serviceTimes ?? null;
  const socialEntries = Object.entries(record?.socials ?? {});

  return (
    <div className="flex flex-col gap-6">
      <ChurchIdentityPanel />

      {profile.loading && !record && (
        <div className="bg-white rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card">
          <LoadingBlock label="Reading the church profile…" />
        </div>
      )}
      {profile.error && (
        <div className="bg-white rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card">
          <ErrorBlock message={profile.error} onRetry={() => void profile.refetch()} />
        </div>
      )}

      {record && (
        <div className="bg-white rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-6">
          <div className="pb-4 border-b border-[#E7E5E4]">
            <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">church</span>
              Published Profile
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              The rest of the church&apos;s own record, as the server holds it. Service times are also what the
              welcome wizard seeds for the planner.
            </p>
          </div>

          {/* Service times */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
              Service times
            </h4>
            {serviceTimes && Object.keys(serviceTimes).length > 0 ? (
              <div className="rounded-[10px] border border-[#E7E5E4] overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#FDF8F3] text-[#57534E]">
                    <tr>
                      <th className="text-left font-bold px-3 py-2">Gathering</th>
                      <th className="text-left font-bold px-3 py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(serviceTimes).map(([name, time]) => (
                      <tr key={name} className="border-t border-[#E7E5E4]/70">
                        <td className="px-3 py-2 font-medium text-[#1C1917]">{name}</td>
                        <td className="px-3 py-2 text-[#57534E]">{time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[#57534E]">No service times recorded yet — they are set through the welcome wizard or an administrator.</p>
            )}
          </div>

          {/* Social channels */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
              Social channels
            </h4>
            {socialEntries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {socialEntries.map(([platform, url]) => (
                  <div key={platform} className="flex items-center justify-between gap-3 px-3 py-2 rounded-[8px] border border-[#E7E5E4] bg-[#FDF8F3]">
                    <span className="text-xs font-bold text-[#1C1917]">{platform}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-[#C2410C] shrink-0 hover:underline truncate max-w-[60%]"
                    >
                      {String(url).replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#57534E]">No social channels recorded yet.</p>
            )}
          </div>

          {/* Core values */}
          {record.coreValues.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
                Core values
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {record.coreValues.map((value, index) => (
                  <div key={value} className="flex gap-3 p-3 rounded-[10px] border border-[#E7E5E4] bg-white">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-[#C2410C]/10 text-[#C2410C] text-[11px] font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-[#1C1917]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
