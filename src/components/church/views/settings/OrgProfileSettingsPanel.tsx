import React, { useState } from 'react';
import { ChurchOrgProfile } from '../../../../types';
import { INITIAL_ORG_PROFILE } from '../../../../data/churchMockData';

export const OrgProfileSettingsPanel: React.FC = () => {
  const [profile, setProfile] = useState<ChurchOrgProfile>(INITIAL_ORG_PROFILE);
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
            <span className="material-symbols-outlined text-[20px] text-[#C2410C]">church</span>
            Organization & Parish Identity
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            Configure canonical parish profile, tax exemptions, legal incorporation, and campus service times.
          </p>
        </div>

        {isSaved && (
          <div className="px-3 py-1 rounded-[8px] bg-[#059669]/10 border border-[#059669]/30 text-[#059669] text-xs font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Settings Saved
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Parish Details */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            General Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Church Name *</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-bold text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Denomination / Presbytery</label>
              <input
                type="text"
                value={profile.denomination}
                onChange={(e) => setProfile({ ...profile, denomination: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Established Year</label>
              <input
                type="number"
                value={profile.establishedYear}
                onChange={(e) => setProfile({ ...profile, establishedYear: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Tax ID / EIN</label>
              <input
                type="text"
                value={profile.taxId}
                onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Nonprofit Classification</label>
              <input
                type="text"
                value={profile.nonprofitStatus}
                onChange={(e) => setProfile({ ...profile, nonprofitStatus: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>
          </div>
        </div>

        {/* Contact & Physical Address */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Physical Campus & Communication Channels
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Street Address</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">City</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">State</label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Zip Code</label>
                <input
                  type="text"
                  value={profile.zipCode}
                  onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Primary Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Office Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Parish Website</label>
              <input
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>
          </div>
        </div>

        {/* Pastoral Leadership */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Senior Pastoral Leadership
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Senior Pastor / Rector</label>
              <input
                type="text"
                value={profile.seniorPastor}
                onChange={(e) => setProfile({ ...profile, seniorPastor: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Parish Administrator / Clerk</label>
              <input
                type="text"
                value={profile.administrator}
                onChange={(e) => setProfile({ ...profile, administrator: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-[#E7E5E4] flex items-center justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Save Organization Profile
          </button>
        </div>
      </form>
    </div>
  );
};
