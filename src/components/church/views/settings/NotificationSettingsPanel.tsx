import React, { useEffect, useState } from 'react';
import { NotificationSettings } from '../../../../types';
import { settingsApi } from '../../../../lib/api';
import { errorMessage, usePreference } from '../../../../hooks/useApi';
import { usePermissions } from '../../../../lib/permissions';
import { ErrorBlock, LoadingBlock } from '../../DataState';

/**
 * Notification & alert policy, stored under the `notifications` preference key.
 *
 * Every field here is a record the server keeps per church — the same document the welcome wizard
 * could pre-seed and a second administrator would read back — so a toggle is a PUT and a reload,
 * not a useState that forgets itself on the next visit. The provider names are display-only
 * labels: which gateway actually carries the traffic is the deployment's environment (see the
 * Integrations panel), not a value a browser can set.
 */
export const NotificationSettingsPanel: React.FC = () => {
  const preference = usePreference('notifications');
  const { canEdit } = usePermissions();
  const canWrite = canEdit('settings');

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!preference.loading && !preference.error) {
      setSettings(preference.value as NotificationSettings);
    }
  }, [preference.loading, preference.error, preference.value]);

  const update = (patch: Partial<NotificationSettings>) => {
    setSettings((previous) => ({ ...(previous ?? {}), ...patch }));
    setSaved(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      await settingsApi.updatePreference('notifications', settings as Record<string, unknown>);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3500);
      await preference.refetch();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  if (preference.loading && !settings) {
    return <LoadingBlock label="Reading the notification policy…" />;
  }
  if (preference.error) {
    return <ErrorBlock message={preference.error} onRetry={() => void preference.refetch()} />;
  }
  if (!settings) return null;

  return (
    <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4]">
        <div>
          <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">notifications_active</span>
            Notification &amp; Automated Alerts Policy
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            Which automated messages this church wants the platform to send, and when. Gateways themselves are configured by the operator — see Integrations.
          </p>
        </div>

        {saved && (
          <div role="status" className="px-3 py-1 rounded-[8px] bg-[#059669]/10 border border-[#059669]/30 text-[#059669] text-xs font-bold flex items-center gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
            Preferences Saved
          </div>
        )}
      </div>

      {error && <ErrorBlock message={error} />}

      <form onSubmit={handleSave} className="space-y-6">
        {/* SMS */}
        <div className="p-4 rounded-[12px] bg-[#FDF8F3] border border-[#E7E5E4] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">sms</span>
              <div>
                <h4 className="font-bold text-xs text-[#1C1917]">SMS alerts</h4>
                <p className="text-[11px] text-[#57534E]">Send instant mobile SMS to volunteers and prayer partners.</p>
              </div>
            </div>

            <input aria-label="SMS alerts"
              type="checkbox"
              checked={Boolean(settings.smsAlertsEnabled)}
              disabled={!canWrite}
              onChange={(e) => update({ smsAlertsEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-[#C2410C]"
            />
          </div>

          {settings.smsAlertsEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E7E5E4]/80">
              <div>
                <label htmlFor="notifications-sms-sender" className="block text-xs font-bold text-[#1C1917] mb-1">Preferred sender name</label>
                <input id="notifications-sms-sender" aria-label="Preferred sender name"
                  type="text"
                  value={settings.smsSenderId ?? ''}
                  onChange={(e) => update({ smsSenderId: e.target.value })}
                  disabled={!canWrite}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FFFFFF]"
                />
                <p className="mt-1 text-[10px] text-[#57534E]">What messages say they are from, if the provider supports it.</p>
              </div>

              <div>
                <label htmlFor="notifications-sms-provider" className="block text-xs font-bold text-[#1C1917] mb-1">Which gateway you expect SMS to travel by</label>
                <select id="notifications-sms-provider" aria-label="Which gateway you expect SMS to travel by"
                  value={settings.smsProvider ?? ''}
                  onChange={(e) => update({ smsProvider: e.target.value })}
                  disabled={!canWrite}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FFFFFF]"
                >
                  <option value="">Not chosen</option>
                  <option value="africastalking">Africa&apos;s Talking</option>
                  <option value="twilio">Twilio</option>
                </select>
                <p className="mt-1 text-[10px] text-[#57534E]">A record of the office&apos;s expectation — the active driver is set on the server.</p>
              </div>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="p-4 rounded-[12px] bg-[#FDF8F3] border border-[#E7E5E4] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#2563EB]">mail</span>
              <div>
                <h4 className="font-bold text-xs text-[#1C1917]">Email digests</h4>
                <p className="text-[11px] text-[#57534E]">How often the platform gathers news into an email, and whether receipts go out at all.</p>
              </div>
            </div>

            <input aria-label="Email digests"
              type="checkbox"
              checked={Boolean(settings.emailDigestEnabled)}
              disabled={!canWrite}
              onChange={(e) => update({ emailDigestEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-[#C2410C]"
            />
          </div>

          {settings.emailDigestEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E7E5E4]/80">
              <div>
                <label htmlFor="notifications-email-frequency" className="block text-xs font-bold text-[#1C1917] mb-1">Digest frequency</label>
                <select id="notifications-email-frequency" aria-label="Digest frequency"
                  value={settings.emailFrequency ?? 'daily'}
                  onChange={(e) => update({ emailFrequency: e.target.value as 'instant' | 'daily' | 'weekly' })}
                  disabled={!canWrite}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FFFFFF]"
                >
                  <option value="instant">Real-time / Instant dispatch</option>
                  <option value="daily">Daily summary</option>
                  <option value="weekly">Weekly review</option>
                </select>
              </div>

              <div>
                <label htmlFor="notifications-email-provider" className="block text-xs font-bold text-[#1C1917] mb-1">Which relay you expect email to travel by</label>
                <select id="notifications-email-provider" aria-label="Which relay you expect email to travel by"
                  value={settings.emailProvider ?? ''}
                  onChange={(e) => update({ emailProvider: e.target.value })}
                  disabled={!canWrite}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FFFFFF]"
                >
                  <option value="">Not chosen</option>
                  <option value="resend">Resend</option>
                  <option value="postmark">Postmark</option>
                  <option value="sendgrid">SendGrid</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Automated triggers */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Automated ministry triggers
          </h4>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] cursor-pointer hover:bg-[#F5EDE4]/50">
              <div className="flex items-center gap-2.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#059669]">paid</span>
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">Automated giving receipts</div>
                  <div className="text-[11px] text-[#57534E]">Email a receipt when a gift is recorded — only while an email gateway is configured.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.autoSendReceiptsOnGiving)}
                disabled={!canWrite}
                onChange={(e) => update({ autoSendReceiptsOnGiving: e.target.checked })}
                className="w-4 h-4 rounded text-[#C2410C]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] cursor-pointer hover:bg-[#F5EDE4]/50">
              <div className="flex items-center gap-2.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#D97706]">alarm</span>
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">Volunteer roster reminders</div>
                  <div className="text-[11px] text-[#57534E]">Call-time notifications to confirmed duty roster volunteers, 24 hours ahead.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.volunteerReminderHoursBefore === 24}
                disabled={!canWrite}
                onChange={(e) => update({ volunteerReminderHoursBefore: e.target.checked ? 24 : 0 })}
                className="w-4 h-4 rounded text-[#C2410C] focus:ring-[#C2410C]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4] cursor-pointer hover:bg-[#F5EDE4]/50">
              <div className="flex items-center gap-2.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#C2410C]">volunteer_activism</span>
                <div>
                  <div className="text-xs font-bold text-[#1C1917]">Urgent prayer chain alerts</div>
                  <div className="text-[11px] text-[#57534E]">Instant alerts for urgent and bereavement petitions, as SMS and email.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.prayerChainAlerts)}
                disabled={!canWrite}
                onChange={(e) => update({ prayerChainAlerts: e.target.checked })}
                className="w-4 h-4 rounded text-[#C2410C]"
              />
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E7E5E4] flex items-center justify-end">
          <button
            type="submit"
            disabled={saving || !canWrite}
            className="px-5 py-2.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">save</span>
            {saving ? 'Saving…' : 'Save Notification Triggers'}
          </button>
        </div>
      </form>
    </div>
  );
};
