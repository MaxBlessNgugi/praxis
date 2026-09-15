import React, { useEffect, useState } from 'react';
import { useMutation, useOrgProfile } from '../../../../hooks/useApi';
import { settingsApi, type ProfileBody } from '../../../../lib/api';
import { usePermissions } from '../../../../lib/permissions';
import { useAuth } from '../../../../lib/auth';
import { ErrorBlock, LoadingBlock } from '../../DataState';
import { FileUpload } from '../../FileUpload';

/**
 * The church's own identity: its name, where it meets, and its mark.
 *
 * This is the one screen every other screen reads from, so it is the one that most needs to be real.
 * The logo is a file id rather than a data URL — the artwork lives in one place, is served behind the
 * same auth as everything else, and printing a certificate reuses the same upload rather than asking
 * the operator to find the PNG again.
 *
 * Fields save together, and only the ones the office actually edits: the backend rejects a payload
 * that changes nothing, so an untouched form is not sent at all.
 */

interface Draft {
  name: string;
  tagline: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  vision: string;
  mission: string;
}

const EMPTY: Draft = { name: '', tagline: '', location: '', address: '', phone: '', email: '', website: '', vision: '', mission: '' };

export const ChurchIdentityPanel: React.FC = () => {
  const profile = useOrgProfile();
  const saveProfile = useMutation(settingsApi.updateProfile);
  const attachLogo = useMutation(settingsApi.updateProfile);
  const { canEdit } = usePermissions();
  const { organization } = useAuth();
  const canWrite = canEdit('settings');

  const record = profile.data?.data ?? null;
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // The server is the source of truth: re-seed the form whenever a fresh record arrives, so a save
  // (or a logo upload) cannot leave the form showing stale values.
  useEffect(() => {
    if (!record) return;
    setDraft({
      name: record.name ?? '',
      tagline: record.tagline ?? '',
      location: record.location ?? '',
      address: record.address ?? '',
      phone: record.phone ?? '',
      email: record.email ?? '',
      website: record.website ?? '',
      vision: record.vision ?? '',
      mission: record.mission ?? '',
    });
  }, [record]);

  const update = (key: keyof Draft, value: string) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  /** Validate where the backend would reject, so the operator is told before the round trip. */
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!draft.name.trim()) errors.name = 'The church needs a name.';
    if (!draft.location.trim()) errors.location = 'Say where the church meets.';
    if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (draft.website.trim() && !/^https?:\/\/.+/i.test(draft.website.trim())) {
      errors.website = 'Enter a full web address, including https://';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const body: ProfileBody = {
      name: draft.name.trim(),
      location: draft.location.trim(),
      tagline: draft.tagline.trim() || undefined,
      address: draft.address.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      email: draft.email.trim() || undefined,
      website: draft.website.trim() || undefined,
      vision: draft.vision.trim() || undefined,
      mission: draft.mission.trim() || undefined,
    };

    try {
      await saveProfile.run(body);
      await profile.refetch();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3500);
    } catch {
      // saveProfile.error is rendered below.
    }
  };

  const handleLogoUploaded = async (file: { id: string }) => {
    try {
      await attachLogo.run({ logoFileId: file.id });
      await profile.refetch();
    } catch {
      // attachLogo.error is rendered below.
    }
  };

  if (profile.loading && !record) {
    return (
      <div className="bg-white rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card">
        <LoadingBlock label="Loading the church profile…" />
      </div>
    );
  }

  if (profile.error) {
    return (
      <div className="bg-white rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card">
        <ErrorBlock message={profile.error} onRetry={() => void profile.refetch()} />
      </div>
    );
  }

  const writeError = saveProfile.error ?? attachLogo.error;

  return (
    <div className="bg-white rounded-[14px] p-6 border border-[#E7E5E4] shadow-warm-card space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E5E4]">
        <div>
          <h3 className="font-headline text-base font-bold text-[#1C1917] flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#C2410C]">badge</span>
            Church Identity &amp; Logo
          </h3>
          <p className="text-xs text-[#57534E] mt-0.5">
            The name, address and mark every screen and every printed certificate reads from — for{' '}
            <span className="font-semibold text-[#1C1917]">{organization?.name ?? 'this church'}</span> only. A
            second church on the same system keeps its own.
          </p>
        </div>
        {saved && (
          <div
            role="status"
            className="px-3 py-1 rounded-[8px] bg-[#059669]/10 border border-[#059669]/30 text-[#059669] text-xs font-bold flex items-center gap-1.5"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
            Saved to the server
          </div>
        )}
      </div>

      <FileUpload
        purpose="logo"
        label="Church logo"
        hint="PNG, JPEG, WebP or GIF. Shown in the console and printed on every certificate."
        accept="image/png,image/jpeg,image/webp,image/gif"
        currentFileId={record?.logoFileId ?? null}
        disabled={!canWrite || attachLogo.pending}
        onUploaded={handleLogoUploaded}
      />

      {writeError && <ErrorBlock message={writeError} onRetry={() => void profile.refetch()} />}

      <form onSubmit={handleSave} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="identity-name" className="block text-xs font-bold text-[#1C1917] mb-1">
              Church Name *
            </label>
            <input
              id="identity-name"
              aria-label="Church Name"
              type="text"
              value={draft.name}
              onChange={(event) => update('name', event.target.value)}
              disabled={!canWrite}
              aria-invalid={Boolean(fieldErrors.name)}
              className="w-full h-9 px-3 text-xs rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] focus:outline-none focus:border-[#C2410C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C] disabled:opacity-60"
            />
            {fieldErrors.name && (
              <p role="alert" className="text-[11px] font-semibold text-[#B91C1C] mt-1">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="identity-location" className="block text-xs font-bold text-[#1C1917] mb-1">
              Where the Church Meets *
            </label>
            <input
              id="identity-location"
              aria-label="Where the Church Meets"
              type="text"
              value={draft.location}
              onChange={(event) => update('location', event.target.value)}
              disabled={!canWrite}
              aria-invalid={Boolean(fieldErrors.location)}
              className="w-full h-9 px-3 text-xs rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] focus:outline-none focus:border-[#C2410C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C] disabled:opacity-60"
            />
            {fieldErrors.location && (
              <p role="alert" className="text-[11px] font-semibold text-[#B91C1C] mt-1">{fieldErrors.location}</p>
            )}
          </div>

          <div>
            <label htmlFor="identity-tagline" className="block text-xs font-bold text-[#1C1917] mb-1">Tagline</label>
            <input
              id="identity-tagline"
              aria-label="Tagline"
              type="text"
              value={draft.tagline}
              onChange={(event) => update('tagline', event.target.value)}
              disabled={!canWrite}
              className="w-full h-9 px-3 text-xs rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] focus:outline-none focus:border-[#C2410C] disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="identity-address" className="block text-xs font-bold text-[#1C1917] mb-1">Postal Address</label>
            <input
              id="identity-address"
              aria-label="Postal Address"
              type="text"
              value={draft.address}
              onChange={(event) => update('address', event.target.value)}
              disabled={!canWrite}
              className="w-full h-9 px-3 text-xs rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] focus:outline-none focus:border-[#C2410C] disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="identity-phone" className="block text-xs font-bold text-[#1C1917] mb-1">Phone</label>
            <input
              id="identity-phone"
              aria-label="Phone"
              type="tel"
              value={draft.phone}
              onChange={(event) => update('phone', event.target.value)}
              disabled={!canWrite}
              className="w-full h-9 px-3 text-xs rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] focus:outline-none focus:border-[#C2410C] disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="identity-email" className="block text-xs font-bold text-[#1C1917] mb-1">Email</label>
            <input
              id="identity-email"
              aria-label="Email"
              type="email"
              value={draft.email}
              onChange={(event) => update('email', event.target.value)}
              disabled={!canWrite}
              aria-invalid={Boolean(fieldErrors.email)}
              className="w-full h-9 px-3 text-xs rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] focus:outline-none focus:border-[#C2410C] disabled:opacity-60"
            />
            {fieldErrors.email && (
              <p role="alert" className="text-[11px] font-semibold text-[#B91C1C] mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="identity-website" className="block text-xs font-bold text-[#1C1917] mb-1">Website</label>
            <input
              id="identity-website"
              aria-label="Website"
              type="url"
              value={draft.website}
              onChange={(event) => update('website', event.target.value)}
              disabled={!canWrite}
              placeholder="https://"
              aria-invalid={Boolean(fieldErrors.website)}
              className="w-full h-9 px-3 text-xs rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] focus:outline-none focus:border-[#C2410C] disabled:opacity-60"
            />
            {fieldErrors.website && (
              <p role="alert" className="text-[11px] font-semibold text-[#B91C1C] mt-1">{fieldErrors.website}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="identity-vision" className="block text-xs font-bold text-[#1C1917] mb-1">Vision</label>
            <textarea
              id="identity-vision"
              aria-label="Vision"
              rows={2}
              value={draft.vision}
              onChange={(event) => update('vision', event.target.value)}
              disabled={!canWrite}
              className="w-full p-3 text-xs rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] focus:outline-none focus:border-[#C2410C] disabled:opacity-60"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="identity-mission" className="block text-xs font-bold text-[#1C1917] mb-1">Mission</label>
            <textarea
              id="identity-mission"
              aria-label="Mission"
              rows={2}
              value={draft.mission}
              onChange={(event) => update('mission', event.target.value)}
              disabled={!canWrite}
              className="w-full p-3 text-xs rounded-[9px] border border-[#E7E5E4] bg-[#FDF8F3] focus:outline-none focus:border-[#C2410C] disabled:opacity-60"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E7E5E4]">
          <p className="text-[11px] text-[#A8A29E]">
            {canWrite
              ? 'Saved to the server, and read by every screen.'
              : 'Your role can view this page but not change it.'}
          </p>
          <button
            type="submit"
            disabled={!canWrite || saveProfile.pending}
            className="px-4 py-2 rounded-[10px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-70 disabled:cursor-wait cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
          >
            {saveProfile.pending ? 'Saving…' : 'Save Identity'}
          </button>
        </div>
      </form>
    </div>
  );
};
