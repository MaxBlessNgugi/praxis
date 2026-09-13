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
            <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">church</span>
            Organization & Church Identity
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            Configure official church profile, tax exemptions, legal incorporation, and campus service times.
          </p>
        </div>

        {isSaved && (
          <div className="px-3 py-1 rounded-[8px] bg-[#059669]/10 border border-[#059669]/30 text-[#059669] text-xs font-bold flex items-center gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
            Settings Saved
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Church Details */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            General Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Church Name *</label>
              <input aria-label="Church Name"
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-bold text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Denomination / Affiliation</label>
              <input aria-label="Denomination / Affiliation"
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
              <input aria-label="Established Year"
                type="number"
                value={profile.establishedYear}
                onChange={(e) => setProfile({ ...profile, establishedYear: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Tax ID / EIN</label>
              <input aria-label="Tax ID / EIN"
                type="text"
                value={profile.taxId}
                onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Nonprofit Classification</label>
              <input aria-label="Nonprofit Classification"
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
              <input aria-label="Street Address"
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">City</label>
                <input aria-label="City"
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">State</label>
                <input aria-label="State"
                  type="text"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Zip Code</label>
                <input aria-label="Zip Code"
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
              <input aria-label="Primary Phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Office Email</label>
              <input aria-label="Office Email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Church Website</label>
              <input aria-label="Church Website"
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
            Visionary Leadership
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Bishop / Visionary Leader</label>
              <input aria-label="Bishop / Visionary Leader"
                type="text"
                value={profile.seniorPastor}
                onChange={(e) => setProfile({ ...profile, seniorPastor: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1">Church Administrator</label>
              <input aria-label="Church Administrator"
                type="text"
                value={profile.administrator}
                onChange={(e) => setProfile({ ...profile, administrator: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#E7E5E4] focus:outline-none focus:border-[#C2410C] bg-[#FDF8F3]"
              />
            </div>
          </div>
        </div>

        {/* Service Times & Office Hours */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Service Times & Office Hours
          </h4>
          <p className="text-[11px] text-[#57534E]">
            Office open {profile.officeHours} · {profile.address}
          </p>
          <div className="rounded-[10px] border border-[#E7E5E4] overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#FDF8F3] text-[#57534E]">
                <tr>
                  <th className="text-left font-bold px-3 py-2">Service</th>
                  <th className="text-left font-bold px-3 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {profile.serviceTimes.map((slot) => (
                  <tr key={slot.name} className="border-t border-[#E7E5E4]/70">
                    <td className="px-3 py-2 font-medium text-[#1C1917]">{slot.name}</td>
                    <td className="px-3 py-2 text-[#57534E]">{slot.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Social Channels */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Social Channels & Broadcast
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.socials.map((channel) => (
              <div
                key={channel.platform}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-[8px] border border-[#E7E5E4] bg-[#FDF8F3]"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[#1C1917]">{channel.platform}</span>
                  <span className="text-[11px] text-[#57534E] truncate">{channel.handle}</span>
                </div>
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-[#C2410C] shrink-0 hover:underline"
                >
                  Open
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Vision & Mission
          </h4>
          <div className="space-y-3">
            <div className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4]">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#C2410C] mb-1">
                Our Vision
              </span>
              <p className="text-xs text-[#1C1917] leading-relaxed">{profile.vision}</p>
            </div>
            <div className="p-3 rounded-[10px] bg-[#FDF8F3] border border-[#E7E5E4]">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#C2410C] mb-1">
                Our Mission
              </span>
              <ul className="space-y-1.5">
                {profile.mission.map((line) => (
                  <li key={line} className="flex gap-2 text-xs text-[#1C1917] leading-relaxed">
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-[#C2410C] shrink-0">
                      check_circle
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Theme of the Year */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Theme of the Year
          </h4>
          <div className="p-4 rounded-[10px] bg-[#C2410C]/5 border border-[#C2410C]/25">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#C2410C] mb-1">
              {profile.yearTheme.year} Theme
            </span>
            <div className="font-headline text-base font-extrabold text-[#1C1917]">
              {profile.yearTheme.title}
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed mt-2">{profile.yearTheme.declaration}</p>
          </div>
        </div>

        {/* Core Values */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Our Ten Core Values
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.coreValues.map((value, index) => (
              <div
                key={value.title}
                className="flex gap-3 p-3 rounded-[10px] border border-[#E7E5E4] bg-white"
              >
                <span className="w-6 h-6 shrink-0 rounded-full bg-[#C2410C]/10 text-[#C2410C] text-[11px] font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-bold text-[#1C1917]">{value.title}</span>
                  <span className="text-[11px] text-[#57534E] leading-relaxed">{value.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Values */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] border-b border-[#E7E5E4]/60 pb-1">
            Our Team Values
          </h4>
          <p className="text-[11px] text-[#57534E]">
            As a team, we value unity and oneness and will endeavor to:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.teamValues.map((value) => (
              <div key={value.title} className="p-3 rounded-[10px] border border-[#E7E5E4] bg-white">
                <span className="text-xs font-bold text-[#1C1917]">{value.title}</span>
                <ul className="mt-1.5 space-y-1">
                  {value.points.map((point) => (
                    <li key={point} className="flex gap-2 text-[11px] text-[#57534E] leading-relaxed">
                      <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-[#C2410C] shrink-0">
                        check_circle
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-[#E7E5E4] flex items-center justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">save</span>
            Save Church Profile
          </button>
        </div>
      </form>
    </div>
  );
};
