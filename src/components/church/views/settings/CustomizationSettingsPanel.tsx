import React, { useState } from 'react';
import { CustomizationSettings } from '../../../../types';
import { INITIAL_CUSTOMIZATION_SETTINGS } from '../../../../data/churchMockData';
import { interactiveCard } from '../../interactiveCard';

export const CustomizationSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<CustomizationSettings>(INITIAL_CUSTOMIZATION_SETTINGS);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  const themeColors = [
    { id: '#C2410C', label: 'Warm Ember (Official Default)', bg: 'bg-[#C2410C]' },
    { id: '#881337', label: 'Westminster Crimson', bg: 'bg-[#881337]' },
    { id: '#1E3A8A', label: 'Genevan Navy', bg: 'bg-[#1E3A8A]' },
    { id: '#14532D', label: 'Cedars Olive', bg: 'bg-[#14532D]' },
  ];

  return (
    <div className="bg-[#FFFFFF] rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4]">
        <div>
          <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">palette</span>
            Church Nomenclature & Visual Customization
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            Adapt terminology to your tradition (Presbyterian, Anglican, Baptist, Reformed) and customize interface density.
          </p>
        </div>

        {isSaved && (
          <div className="px-3 py-1 rounded-[8px] bg-[#059669]/10 border border-[#059669]/30 text-[#059669] text-xs font-bold flex items-center gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
            Preferences Saved
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Color Theme Selector */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Service Theme & Accent Palette
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {themeColors.map((theme) => {
              const isSelected = settings.themeColor === theme.id;
              return (
                <div
                  key={theme.id}
                  {...interactiveCard(() => setSettings({ ...settings, themeColor: theme.id }))}
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

        {/* Denominational Vocabulary Configuration */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Denominational Nomenclature & Terminology
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="terminology-congregant" className="block text-xs font-bold text-[#1C1917] mb-1">
                Congregant Terminology
              </label>
              <select id="terminology-congregant" aria-label="Congregant Terminology"
                value={settings.memberTerminology}
                onChange={(e) => setSettings({ ...settings, memberTerminology: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              >
                <option value="Members">Members (Reformed/Presbyterian)</option>
                <option value="Parishioners">Parishioners (Anglican/Episcopal)</option>
                <option value="Members">Members (General Evangelical)</option>
                <option value="Communicants">Communicants (Historic Liturgical)</option>
              </select>
            </div>

            <div>
              <label htmlFor="terminology-council" className="block text-xs font-bold text-[#1C1917] mb-1">
                Church Council Body
              </label>
              <select id="terminology-council" aria-label="Church Council Body"
                value={settings.leadershipTerminology}
                onChange={(e) => setSettings({ ...settings, leadershipTerminology: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              >
                <option value="Church Council">Church Council (Presbyterian)</option>
                <option value="Board of Deacons">Board of Deacons (Baptist)</option>
                <option value="Vestry">Vestry / Wardens (Anglican)</option>
                <option value="Council of Stewards">Council of Stewards (Methodist)</option>
              </select>
            </div>

            <div>
              <label htmlFor="terminology-stewardship" className="block text-xs font-bold text-[#1C1917] mb-1">
                Stewardship Terminology
              </label>
              <select id="terminology-stewardship" aria-label="Stewardship Terminology"
                value={settings.givingTerminology}
                onChange={(e) => setSettings({ ...settings, givingTerminology: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              >
                <option value="Tithes & Offerings">Tithes & Offerings (Traditional)</option>
                <option value="Contributions">Contributions (General)</option>
                <option value="Pledges & Stewardship">Pledges & Stewardship (Liturgical)</option>
                <option value="Kingdom Giving">Kingdom Giving (Contemporary)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Formatting & UI Density */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Locale & Interface Preferences
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-currency-code" className="block text-xs font-bold text-[#1C1917] mb-1">Currency Code</label>
              <input id="settings-currency-code" aria-label="Currency Code"
                type="text"
                value={settings.currencySymbol}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
              />
            </div>

            <div>
              <label htmlFor="settings-date-format" className="block text-xs font-bold text-[#1C1917] mb-1">Date Display Format</label>
              <select id="settings-date-format" aria-label="Date Display Format"
                value={settings.dateFormat}
                onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              >
                <option value="MMM D, YYYY">MMM D, YYYY (Oct 14, 2025)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2025-10-14)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (14/10/2025)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="compactToggle"
              checked={settings.compactMode}
              onChange={(e) => setSettings({ ...settings, compactMode: e.target.checked })}
              className="rounded text-[#C2410C] focus:ring-[#C2410C]"
            />
            <label htmlFor="compactToggle" className="text-xs font-bold text-[#1C1917] cursor-pointer">
              Enable high-density census tables (Optimized for administrative laptops)
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E7E5E4] flex items-center justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">save</span>
            Save Customizations
          </button>
        </div>
      </form>
    </div>
  );
};
