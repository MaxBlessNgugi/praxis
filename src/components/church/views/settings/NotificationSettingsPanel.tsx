import React, { useState } from 'react';
import { NotificationSettings } from '../../../../types';
import { INITIAL_NOTIFICATION_SETTINGS } from '../../../../data/churchMockData';

export const NotificationSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>(INITIAL_NOTIFICATION_SETTINGS);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  return (
    <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4]">
        <div>
          <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#C2410C]">notifications_active</span>
            Notification & Automated Alerts Policy
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            Configure broadcast gateways, volunteer automated roster SMS, and session executive digests.
          </p>
        </div>

        {isSaved && (
          <div className="px-3 py-1 rounded-[8px] bg-[#059669]/10 border border-[#059669]/30 text-[#059669] text-xs font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Preferences Saved
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SMS Gateways */}
        <div className="p-4 rounded-[12px] bg-[#FDF8F3] border border-[#E7E5E4] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#C2410C]">sms</span>
              <div>
                <h4 className="font-bold text-xs text-[#1C1917]">SMS Text Message Carrier Gateway</h4>
                <p className="text-[11px] text-[#57534E]">Send instant mobile SMS to volunteers and prayer partners.</p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={settings.smsAlertsEnabled}
              onChange={(e) => setSettings({ ...settings, smsAlertsEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-[#C2410C] focus:ring-[#C2410C]"
            />
          </div>

          {settings.smsAlertsEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E7E5E4]/80">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">SMS Sender ID</label>
                <input
                  type="text"
                  value={settings.smsSenderId}
                  onChange={(e) => setSettings({ ...settings, smsSenderId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FFFFFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Carrier Provider</label>
                <select
                  value={settings.smsProvider}
                  onChange={(e) => setSettings({ ...settings, smsProvider: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FFFFFF]"
                >
                  <option value="Twilio Carrier">Twilio High-Volume Carrier</option>
                  <option value="AWS SNS">AWS Simple Notification Service</option>
                  <option value="Vonage">Vonage Global Gateway</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Email Digest Frequency */}
        <div className="p-4 rounded-[12px] bg-[#FDF8F3] border border-[#E7E5E4] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#2563EB]">mail</span>
              <div>
                <h4 className="font-bold text-xs text-[#1C1917]">Email Broadcast Engine</h4>
                <p className="text-[11px] text-[#57534E]">Manage delivery intervals and SMTP relay service.</p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={settings.emailDigestEnabled}
              onChange={(e) => setSettings({ ...settings, emailDigestEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-[#C2410C] focus:ring-[#C2410C]"
            />
          </div>

          {settings.emailDigestEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E7E5E4]/80">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Digest Frequency</label>
                <select
                  value={settings.emailFrequency}
                  onChange={(e) => setSettings({ ...settings, emailFrequency: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FFFFFF]"
                >
                  <option value="instant">Real-time / Instant dispatch</option>
                  <option value="daily">Daily Summary at 6:00 AM</option>
                  <option value="weekly">Weekly Friday Pastoral Review</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Email Relay Provider</label>
                <select
                  value={settings.emailProvider}
                  onChange={(e) => setSettings({ ...settings, emailProvider: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FFFFFF]"
                >
                  <option value="SendGrid SMTP">SendGrid Dedicated IP</option>
                  <option value="Postmark">Postmark Pastoral Engine</option>
                  <option value="Mailgun">Mailgun Transactional</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Automated System Triggers */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Automated Ministry Triggers
          </h4>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] cursor-pointer hover:bg-[#F5EDE4]/50">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#059669]">paid</span>
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">Automated Tithe & Offering Tax Receipts</div>
                  <div className="text-[11px] text-[#57534E]">Immediately email canonical PDF receipt upon recording contributions.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSendReceiptsOnGiving}
                onChange={(e) => setSettings({ ...settings, autoSendReceiptsOnGiving: e.target.checked })}
                className="w-4 h-4 rounded text-[#C2410C] focus:ring-[#C2410C]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] cursor-pointer hover:bg-[#F5EDE4]/50">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#D97706]">alarm</span>
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">Volunteer 24-Hour Roster SMS Reminders</div>
                  <div className="text-[11px] text-[#57534E]">Send call-time notifications to confirmed duty roster volunteers.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.volunteerReminderHoursBefore === 24}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    volunteerReminderHoursBefore: e.target.checked ? 24 : 0,
                  })
                }
                className="w-4 h-4 rounded text-[#C2410C] focus:ring-[#C2410C]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] cursor-pointer hover:bg-[#F5EDE4]/50">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#C2410C]">volunteer_activism</span>
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">Urgent Prayer Chain Broadcasts</div>
                  <div className="text-[11px] text-[#57534E]">Dispatch instant push and SMS alerts for urgent/bereavement petitions.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.prayerChainAlerts}
                onChange={(e) => setSettings({ ...settings, prayerChainAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-[#C2410C] focus:ring-[#C2410C]"
              />
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E7E5E4] flex items-center justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Save Notification Triggers
          </button>
        </div>
      </form>
    </div>
  );
};
