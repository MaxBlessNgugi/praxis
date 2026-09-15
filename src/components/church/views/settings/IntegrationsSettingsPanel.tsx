import React from 'react';
import { useChannels, useOrgProfile } from '../../../../hooks/useApi';
import { ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * What this installation can actually do, and what is missing.
 *
 * WhatsApp-shaped integrations lists are easy to draw and dangerous to believe: a green "connected"
 * badge tells an office that a funeral notice will go out, and the only place that turns out to be
 * untrue is a telephone call from a family who never heard. So this screen shows the *drivers the
 * server is running*, read from the API, and — for anything switched off — the exact settings that
 * turn it on. There is nothing to toggle here on purpose: providers are credentials, and credentials
 * belong in the deployment's environment rather than in a browser.
 */

interface Row {
  key: string;
  icon: string;
  title: string;
  /** What this is for, in the church's terms. */
  purpose: string;
  ready: boolean;
  detail: string;
  /** What has to be set to turn it on, when it is off. */
  remedy: string;
}

export const IntegrationsSettingsPanel: React.FC = () => {
  const { channels, loading, error, refetch } = useChannels();
  const profile = useOrgProfile();

  if (loading) return <LoadingBlock label="Checking the delivery gateways…" />;
  if (error) return <ErrorBlock message={error} onRetry={() => void refetch()} />;

  const rows: Row[] = [
    {
      key: 'email',
      icon: 'mail',
      title: 'Email delivery',
      purpose: 'Broadcasts, notices and the welcome message a new church administrator receives.',
      ready: Boolean(channels?.email.configured),
      detail: channels?.email.configured
        ? `Sending through ${channels.email.driver} as ${channels.email.from}`
        : `Driver "${channels?.email.driver ?? 'unknown'}" sends nothing`,
      remedy: 'Set EMAIL_DRIVER=resend and RESEND_API_KEY, with EMAIL_FROM on a verified domain.',
    },
    {
      key: 'sms',
      icon: 'sms',
      title: 'SMS delivery',
      purpose: 'Broadcasts to phone numbers on the register, where a message has to arrive today.',
      ready: Boolean(channels?.sms.configured),
      detail: channels?.sms.configured
        ? `Sending through ${channels.sms.driver}${channels.sms.from ? ` from ${channels.sms.from}` : ' (provider default sender)'}`
        : `Driver "${channels?.sms.driver ?? 'unknown'}" sends nothing`,
      remedy:
        'Set SMS_DRIVER=africastalking with AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY, plus ' +
        'AFRICASTALKING_SENDER_ID once the sender ID is registered.',
    },
    {
      key: 'storage',
      icon: 'folder_managed',
      title: 'File storage',
      purpose: 'The church logo, member photographs, scanned minutes and certificate templates.',
      // Files are held in the church's own database by default, so this one is always ready; the row
      // exists to say *where* they are, which is the question asked during a restore.
      ready: true,
      detail: profile.data?.data.logoFileId
        ? 'Held with the church’s records, and a logo is set for printing'
        : 'Held with the church’s records (no logo uploaded yet)',
      remedy: '',
    },
    {
      key: 'documents',
      icon: 'description',
      title: 'Certificates & reports',
      purpose: 'Baptism and dedication certificates, the treasury summary, and the register export.',
      ready: true,
      detail: 'Produced on this machine and printed or saved as PDF by the browser',
      remedy: '',
    },
  ];

  const readyCount = rows.filter((row) => row.ready).length;

  return (
    <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4]">
        <div>
          <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">
              hub
            </span>
            Delivery & storage
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            What this installation can actually send, where the church’s files live, and what to set if something is
            switched off.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-[8px] bg-[#F8F1E9] text-[#59413A] text-xs font-bold border border-[#E7E5E4] self-start sm:self-auto">
          {readyCount} of {rows.length} ready
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((row) => (
          <div
            key={row.key}
            className={`p-4 rounded-[12px] border flex flex-col justify-between ${
              row.ready ? 'bg-[#FDF8F3] border-[#C2410C]/20' : 'bg-[#FFFBEB] border-[#FDE68A]'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-[8px] bg-[#F8F1E9] border border-[#E7E5E4] flex items-center justify-center text-[#C2410C]">
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                      {row.icon}
                    </span>
                  </span>
                  <h4 className="font-headline text-xs font-bold text-[#1C1917]">{row.title}</h4>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    row.ready ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#D97706]/10 text-[#B45309]'
                  }`}
                >
                  {row.ready ? 'ready' : 'not configured'}
                </span>
              </div>

              <p className="text-xs text-[#57534E] leading-relaxed">{row.purpose}</p>
              <p className="text-[11px] mt-2 text-[#1C1917] font-medium">{row.detail}</p>
            </div>

            {!row.ready && row.remedy && (
              <p className="text-[11px] text-[#B45309] mt-3 pt-3 border-t border-[#FDE68A] leading-relaxed">
                <strong>To turn it on:</strong> {row.remedy}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#57534E] leading-relaxed border-t border-[#E7E5E4] pt-4">
        Sends are refused when a provider is not configured, rather than recorded as delivered — a campaign the church
        believes went out and did not is the one failure this console must never report as success.
      </p>
    </div>
  );
};
