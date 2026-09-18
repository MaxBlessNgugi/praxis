import React, { useEffect, useState } from 'react';
import { CustomizationSettings } from '../../../../types';
import { settingsApi } from '../../../../lib/api';
import { errorMessage, usePreference } from '../../../../hooks/useApi';
import { usePermissions } from '../../../../lib/permissions';
import { ErrorBlock, LoadingBlock } from '../../DataState';
import { interactiveCard } from '../../interactiveCard';

const DEFAULTS: CustomizationSettings = {
  themeColor: '#C2410C',
  memberTerminology: 'Members',
  leadershipTerminology: 'Church Council',
  givingTerminology: 'Tithes & Offerings',
  currencySymbol: 'KSh',
  dateFormat: 'MMM D, YYYY',
  compactMode: false,
};

/**
 * Terminology and interface preferences, stored under the `customization` preference key.
 *
 * What each field honestly does: the three terminology picks and the currency symbol are the words
 * the office wants to see, saved per church; the date format and density are recorded for the
 * console to honour as screens adopt them; and the theme colour is a stored preference only — the
 * console renders Warm Ember, and a palette that lied about changing itself would be worse than an
 * honest one that says it cannot.
 */
export const CustomizationSettingsPanel: React.FC = () => {
  const preference = usePreference('customization');
  const { canEdit } = usePermissions();
  const canWrite = canEdit('settings');

  const [settings, setSettings] = useState<CustomizationSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!preference.loading && !preference.error) {
      setSettings({ ...DEFAULTS, ...(preference.value as Partial<CustomizationSettings>) });
    }
  }, [preference.loading, preference.error, preference.value]);

  const update = (patch: Partial<CustomizationSettings>) => {
    setSettings((previous) => ({ ...previous, ...patch }));
    setSaved(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await settingsApi.updatePreference('customization', settings as unknown as Record<string, unknown>);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3500);
      await preference.refetch();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  if (preference.loading && !preference.value) {
    return <LoadingBlock label="Reading the customisation preferences…" />;
  }
  if (preference.error) {
    return <ErrorBlock message={preference.error} onRetry={() => void preference.refetch()} />;
  }

  const themeColors = [
    { id: '#C2410C', label: 'Warm Ember (official default)', bg: 'bg-[#C2410C]' },
  ];

  return (
    <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4]">
        <div>
          <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">palette</span>
            Terminology &amp; Interface Preferences
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            The words this church uses for its people, its council and its giving — saved to the church&apos;s own record, so every administrator sees the same.
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
        {/* Accent */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Appearance
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {themeColors.map((theme) => {
              const isSelected = settings.themeColor === theme.id;
              return (
                <div
                  key={theme.id}
                  {...interactiveCard(() => update({ themeColor: theme.id }))}
                  className={`p-3.5 rounded-[12px] border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#FDF8F3] border-[#C2410C] ring-2 ring-[#C2410C]/20 shadow-xs'
                      : 'bg-[#FFFFFF] border-[#E7E5E4] hover:bg-[#FDF8F3]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full ${theme.bg} shadow-xs`} />
                    <span className="text-xs font-bold text-[#1C1917]">{theme.label}</span>
                  </div>

                  {isSelected && (
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#C2410C]">check_circle</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Terminology */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Denominational vocabulary
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="terminology-congregant" className="block text-xs font-bold text-[#1C1917] mb-1">
                Congregants are called
              </label>
              <select id="terminology-congregant" aria-label="Congregants are called"
                value={settings.memberTerminology}
                onChange={(e) => update({ memberTerminology: e.target.value })}
                disabled={!canWrite}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              >
                <option value="Members">Members</option>
                <option value="Parishioners">Parishioners</option>
                <option value="Communicants">Communicants</option>
              </select>
            </div>

            <div>
              <label htmlFor="terminology-council" className="block text-xs font-bold text-[#1C1917] mb-1">
                The council is called
              </label>
              <select id="terminology-council" aria-label="The council is called"
                value={settings.leadershipTerminology}
                onChange={(e) => update({ leadershipTerminology: e.target.value })}
                disabled={!canWrite}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              >
                <option value="Church Council">Church Council</option>
                <option value="Board of Deacons">Board of Deacons</option>
                <option value="Vestry">Vestry / Wardens</option>
                <option value="Council of Stewards">Council of Stewards</option>
              </select>
            </div>

            <div>
              <label htmlFor="terminology-stewardship" className="block text-xs font-bold text-[#1C1917] mb-1">
                Giving is called
              </label>
              <select id="terminology-stewardship" aria-label="Giving is called"
                value={settings.givingTerminology}
                onChange={(e) => update({ givingTerminology: e.target.value })}
                disabled={!canWrite}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              >
                <option value="Tithes & Offerings">Tithes &amp; Offerings</option>
                <option value="Contributions">Contributions</option>
                <option value="Pledges & Stewardship">Pledges &amp; Stewardship</option>
                <option value="Kingdom Giving">Kingdom Giving</option>
              </select>
            </div>
          </div>
        </div>

        {/* Formatting */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Locale &amp; interface
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-currency-code" className="block text-xs font-bold text-[#1C1917] mb-1">Currency symbol</label>
              <input id="settings-currency-code" aria-label="Currency symbol"
                type="text"
                maxLength={4}
                value={settings.currencySymbol}
                onChange={(e) => update({ currencySymbol: e.target.value })}
                disabled={!canWrite}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
              />
              <p className="mt-1 text-[10px] text-[#57534E]">The ledgers themselves are kept in KES; this is the symbol the office prefers to read.</p>
            </div>

            <div>
              <label htmlFor="settings-date-format" className="block text-xs font-bold text-[#1C1917] mb-1">Date display format</label>
              <select id="settings-date-format" aria-label="Date display format"
                value={settings.dateFormat}
                onChange={(e) => update({ dateFormat: e.target.value })}
                disabled={!canWrite}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              >
                <option value="MMM D, YYYY">MMM D, YYYY (Oct 14, 2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2026-10-14)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (14/10/2026)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="compactToggle"
              checked={settings.compactMode}
              onChange={(e) => update({ compactMode: e.target.checked })}
              disabled={!canWrite}
              className="rounded text-[#C2410C] focus:ring-[#C2410C]"
            />
            <label htmlFor="compactToggle" className="text-xs font-bold text-[#1C1917] cursor-pointer">
              Prefer high-density tables (administrative laptops)
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
            {saving ? 'Saving…' : 'Save Customisations'}
          </button>
        </div>
      </form>
    </div>
  );
};
