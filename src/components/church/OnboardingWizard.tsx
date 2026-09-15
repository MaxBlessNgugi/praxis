import React, { useEffect, useState } from 'react';
import logoMark from '../../assets/brand/praxis-icon.webp';
import { useAuth } from '../../lib/auth';
import { settingsApi, type ProfileBody } from '../../lib/api';
import { errorMessage } from '../../hooks/useApi';
import { LoadingBlock } from './DataState';
import { useOrgProfile } from '../../hooks/useApi';

/**
 * The short welcome wizard a church sees once, between signing up and its console.
 *
 * Three steps, and each asks for something the console will actually show somewhere: where the church
 * meets (the profile, the letterhead, every certificate), when it meets (the service planner's
 * defaults), and what it is for (the tagline on the dashboard).
 *
 * Why it exists at all rather than more fields on the signup form: a form that demands a vision
 * statement is a form nobody finishes, and an abandoned form is a church with no console. So signup
 * asks for six fields and this asks for six more, once the account already exists and the person can
 * see there is something behind it.
 *
 * It ends by stamping the *church* as onboarded, not the browser: the second administrator to sign in
 * is not asked to describe a church that has already described itself.
 */

const FIELD =
  'w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15';
const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1.5';

const STEPS = [
  { title: 'Your church', hint: 'What it is called, and where it meets.' },
  { title: 'When you meet', hint: 'The gatherings the service planner starts from.' },
  { title: 'What it is for', hint: 'One sentence you would say to a visitor.' },
];

/** The three gatherings nearly every church keeps, offered as rows to fill in or leave empty. */
const GATHERING_KEYS = ['Sunday Morning', 'Sunday Evening', 'Midweek Service'];

interface Draft {
  name: string;
  location: string;
  address: string;
  phone: string;
  serviceTimes: Record<string, string>;
  tagline: string;
  mission: string;
}

export const OnboardingWizard: React.FC = () => {
  const { organization, restoreSession } = useAuth();
  const profile = useOrgProfile();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    name: '',
    location: '',
    address: '',
    phone: '',
    serviceTimes: {},
    tagline: '',
    mission: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  // What the signup form already knew arrives here instead of being typed twice. Seeded once: after
  // that the draft is the person's, and a refetch must not overwrite what they are writing.
  const saved = profile.data?.data ?? null;
  useEffect(() => {
    if (seeded || !saved) return;
    setSeeded(true);
    setDraft((previous) => ({
      ...previous,
      name: saved.name ?? '',
      location: saved.location ?? '',
      address: saved.address ?? '',
      phone: saved.phone ?? '',
      serviceTimes: previous.serviceTimes ?? saved.serviceTimes ?? {},
      tagline: saved.tagline ?? '',
      mission: saved.mission ?? '',
    }));
  }, [seeded, saved]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setError(null);
  };

  const setGathering = (key: string, value: string) => {
    setDraft((previous) => ({ ...previous, serviceTimes: { ...previous.serviceTimes, [key]: value } }));
    setError(null);
  };

  /** Empty fields are left out rather than sent as empty strings, which the profile rejects. */
  const payload = (): ProfileBody => {
    const body: ProfileBody = {
      name: draft.name.trim(),
      location: draft.location.trim(),
    };
    if (draft.address.trim()) body.address = draft.address.trim();
    if (draft.phone.trim()) body.phone = draft.phone.trim();
    if (draft.tagline.trim()) body.tagline = draft.tagline.trim();
    if (draft.mission.trim()) body.mission = draft.mission.trim();
    const times: Record<string, string> = {};
    for (const [key, value] of Object.entries<string>(draft.serviceTimes)) {
      if (value.trim()) times[key] = value.trim();
    }
    if (Object.keys(times).length > 0) body.serviceTimes = times;
    return body;
  };

  const finish = async () => {
    if (isSaving) return;
    if (draft.location.trim().length < 2) {
      setStep(0);
      setError('Say where the church meets — it is the one thing a visitor always asks.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await settingsApi.completeOnboarding(payload());
      // `onboardedAt` lives on the session's organisation, so the console opens when the session is
      // re-read rather than when this promise resolves.
      await restoreSession();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const current = STEPS[step];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#FDF8F3] text-[#1C1917] px-6 py-10 overflow-y-auto">
      <div className="w-full max-w-[560px]">
        <div className="flex items-center gap-3 mb-5">
          <img src={logoMark} alt="" aria-hidden="true" className="h-10 w-auto" />
          <div>
            <p className="font-headline text-[15px] font-bold tracking-tight">
              {organization?.name ?? 'Your church'} is on Praxis
            </p>
            <p className="text-[11px] text-[#57534E]">
              Three short questions, then the console is yours. Every answer can be changed in Settings later.
            </p>
          </div>
        </div>

        {/* Where this step sits in the three, so nobody wonders how long the wizard is. */}
        <ol className="flex items-center gap-2 mb-4">
          {STEPS.map((item, index) => (
            <li key={item.title} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  index <= step ? 'bg-[#C2410C]' : 'bg-[#E7E5E4]'
                }`}
              />
              <span
                className={`mt-1.5 block text-[11px] font-bold ${
                  index === step ? 'text-[#C2410C]' : 'text-[#A8A29E]'
                }`}
              >
                {item.title}
              </span>
            </li>
          ))}
        </ol>

        <div className="bg-white rounded-[14px] border border-[#E7E5E4] shadow-warm-card p-7">
          <h1 className="font-headline text-[20px] font-bold tracking-tight">{current.title}</h1>
          <p className="text-[13px] text-[#57534E] mt-1 mb-5">{current.hint}</p>

          {profile.loading && !saved ? (
            <LoadingBlock label="Reading your church profile…" />
          ) : (
            <div className="space-y-4">
              {step === 0 && (
                <>
                  <div>
                    <label htmlFor="wizard-name" className={LABEL}>
                      Church name
                    </label>
                    <input
                      id="wizard-name"
                      aria-label="Church name"
                      type="text"
                      value={draft.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Destiny Sanctuary International"
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label htmlFor="wizard-location" className={LABEL}>
                      Where you meet
                    </label>
                    <input
                      id="wizard-location"
                      aria-label="Where you meet"
                      type="text"
                      required
                      value={draft.location}
                      onChange={(e) => update('location', e.target.value)}
                      placeholder="Nairobi, Kenya"
                      className={FIELD}
                    />
                    <p className="text-[11px] text-[#A8A29E] mt-1">
                      Town and country is enough. It appears on the letterhead and every certificate.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="wizard-address" className={LABEL}>
                        Street address <span className="font-normal text-[#A8A29E]">(optional)</span>
                      </label>
                      <input
                        id="wizard-address"
                        aria-label="Street address"
                        type="text"
                        value={draft.address}
                        onChange={(e) => update('address', e.target.value)}
                        placeholder="Haile Selassie Avenue"
                        className={FIELD}
                      />
                    </div>
                    <div>
                      <label htmlFor="wizard-phone" className={LABEL}>
                        Office phone <span className="font-normal text-[#A8A29E]">(optional)</span>
                      </label>
                      <input
                        id="wizard-phone"
                        aria-label="Office phone"
                        type="tel"
                        value={draft.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        placeholder="+254 7xx xxx xxx"
                        className={FIELD}
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  {GATHERING_KEYS.map((key) => (
                    <div key={key}>
                      <label htmlFor={`wizard-${key}`} className={LABEL}>
                        {key}
                      </label>
                      <input
                        id={`wizard-${key}`}
                        aria-label={key}
                        type="text"
                        value={draft.serviceTimes[key] ?? ''}
                        onChange={(e) => setGathering(key, e.target.value)}
                        placeholder="9:00 AM"
                        className={FIELD}
                      />
                    </div>
                  ))}
                  <p className="text-[11px] text-[#A8A29E]">
                    Leave any of these empty if the church does not keep that gathering. The service planner suggests
                    what is filled in here; it does not enforce it.
                  </p>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label htmlFor="wizard-tagline" className={LABEL}>
                      One line about your church <span className="font-normal text-[#A8A29E]">(optional)</span>
                    </label>
                    <input
                      id="wizard-tagline"
                      aria-label="One line about your church"
                      type="text"
                      value={draft.tagline}
                      onChange={(e) => update('tagline', e.target.value)}
                      placeholder="A family of faith in the heart of the city"
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label htmlFor="wizard-mission" className={LABEL}>
                      Your mission <span className="font-normal text-[#A8A29E]">(optional)</span>
                    </label>
                    <textarea
                      id="wizard-mission"
                      aria-label="Your mission"
                      rows={4}
                      value={draft.mission}
                      onChange={(e) => update('mission', e.target.value)}
                      placeholder="To make disciples of every household in our city."
                      className={`${FIELD} resize-none`}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 p-3 rounded-[7px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs"
            >
              {error}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#E7E5E4] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((previous) => Math.max(0, previous - 1))}
              disabled={step === 0}
              className="px-4 py-2.5 rounded-[9px] border border-[#E7E5E4] bg-white text-[#57534E] text-xs font-bold hover:bg-[#F5EDE4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((previous) => previous + 1)}
                className="px-5 py-2.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] text-white text-xs font-bold shadow-[0_2px_8px_rgba(194,65,12,0.25)] transition-colors cursor-pointer"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void finish()}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-[9px] bg-[#C2410C] hover:bg-[#EA580C] disabled:opacity-85 disabled:cursor-wait text-white text-xs font-bold shadow-[0_2px_8px_rgba(194,65,12,0.25)] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span aria-hidden="true" className={`material-symbols-outlined text-[18px] ${isSaving ? 'animate-spin' : ''}`}>
                  {isSaving ? 'progress_activity' : 'church'}
                </span>
                {isSaving ? 'Opening your console…' : 'Open my console'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
