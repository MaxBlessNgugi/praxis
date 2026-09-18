import React, { useState } from 'react';
import { DEFAULT_LOCATION, LOCATIONS } from '../../../data/churchDomain';
import { useMemberReport } from '../../../lib/hooks/useReports';
import { useMembers } from '../../../lib/hooks/useMembers';
import { ApiError } from '../../../lib/api';

/** The baptism states this form offers; the API records them as `baptismType`. */
type BaptismStatus = 'baptized' | 'dedicated' | 'awaiting' | 'transfer';

interface AddNewChristianViewProps {
  onNavigateToFind: () => void;
}

export const AddNewChristianView: React.FC<AddNewChristianViewProps> = ({
  onNavigateToFind,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [baptismStatus, setBaptismStatus] = useState<BaptismStatus>('baptized');
  const [notes, setNotes] = useState('');
  const [assignHousehold, setAssignHousehold] = useState(true);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The census cards report the roll itself, so enrolling someone moves them.
  const { data: register, refetch: refetchRegister } = useMemberReport();
  const [enrolledThisSession, setEnrolledThisSession] = useState(0);
  const rollTotal = register?.total ?? 0;
  const householdCount = register?.households.total ?? 0;
  const { createMember, isLoading: apiLoading } = useMembers();

  const handleAddTag = (tagText: string) => {
    setNotes((prev) => {
      if (prev.length > 0 && !prev.endsWith('\n')) {
        return `${prev}\n• ${tagText}`;
      }
      return `${prev}• ${tagText}`;
    });
  };

  const handleSubmit = async (clearAfter = false) => {
    if (!firstName.trim() || !lastName.trim()) {
      setSubmitError('Enter both a first name and a last name.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newMember = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        // Only what the clerk entered: a fabricated phone number, email or date of birth is a
        // fiction the parish would have to unpick one record at a time.
        phone: phone || undefined,
        email: email || undefined,
        dateOfBirth: dob || undefined,
        baptismType: baptismStatus === 'baptized' ? 'baptized' : baptismStatus === 'dedicated' ? 'dedicated' : 'none',
        pastoralNotes: notes,
        location,
        householdId: undefined,
        householdRole: assignHousehold ? 'Head' : undefined,
        isHouseholdHead: assignHousehold,
        // A letter of transfer is not a baptism state: the person arrives already baptized elsewhere.
        status: baptismStatus === 'transfer' ? ('transferred' as const) : ('active' as const),
        // No envelope number: the API issues the next one from the register, so two clerks cannot
        // both invent the same one on a column that has to be unique.
        tags: [],
      };

      await createMember(newMember);
      setEnrolledThisSession((count) => count + 1);
      void refetchRegister();

      setFeedbackToast(`Christian record for ${firstName} ${lastName} successfully saved to members register.`);
      setTimeout(() => setFeedbackToast(null), 4000);

      if (clearAfter) {
        setFirstName('');
        setLastName('');
        setPhone('');
        setLocation(DEFAULT_LOCATION);
        setEmail('');
        setAddress('');
        setDob('');
        setNotes('');
      } else {
        setTimeout(() => {
          onNavigateToFind();
        }, 1200);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to save member';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-6 pb-12">
      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Enrolled */}
        <div className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group border border-[#EAE1D7]/50">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#eee7e3]/40 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center justify-between relative z-10">
            <span className="font-headline text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Total Enrolled
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#f4ece8] flex items-center justify-center text-[#9b2f00]">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">group</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2 relative z-10">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold tracking-tight">
              {rollTotal}
            </span>
            {enrolledThisSession > 0 && (
              <span className="font-headline text-xs text-[#006243] font-semibold flex items-center gap-0.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">arrow_upward</span>
                +{enrolledThisSession} you enrolled
              </span>
            )}
          </div>
          <p className="mt-1 font-body text-xs text-[#59413a]/80">Members on the live register</p>
        </div>

        {/* Stat 2: New Baptisms */}
        <div className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group border border-[#EAE1D7]/50">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#ffdcc3]/30 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center justify-between relative z-10">
            <span className="font-headline text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              New Baptisms
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#ffdcc3]/60 flex items-center justify-center text-[#904d00]">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">water_drop</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2 relative z-10">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold tracking-tight">
              {register?.baptismsThisYear ?? 0}
            </span>
            <span className="font-headline text-xs text-[#904d00] font-medium">This year</span>
          </div>
          <p className="mt-1 font-body text-xs text-[#59413a]/80">Recorded baptism & communion records</p>
        </div>

        {/* Stat 3: Pending Verification */}
        <div className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group border border-[#EAE1D7]/50">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#ffdbd0]/40 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center justify-between relative z-10">
            <span className="font-headline text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Awaiting Baptism Record
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#ffdbd0] flex items-center justify-center text-[#9b2f00]">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">pending_actions</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2 relative z-10">
            <span className="font-headline text-3xl text-[#9b2f00] font-bold tracking-tight">
              {register?.byBaptismType.none ?? 0}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#c2410c]/15 text-[#9b2f00] font-headline text-xs font-semibold">
              Pastoral follow-up
            </span>
          </div>
          <p className="mt-1 font-body text-xs text-[#59413a]/80">Baptism letters & pastoral triage</p>
        </div>

        {/* Stat 4: Active Households */}
        <div className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group border border-[#EAE1D7]/50">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#85f8c4]/30 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center justify-between relative z-10">
            <span className="font-headline text-xs font-semibold text-[#59413a] uppercase tracking-wider">
              Active Households
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#85f8c4]/60 flex items-center justify-center text-[#006243]">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">cottage</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2 relative z-10">
            <span className="font-headline text-3xl text-[#1e1b19] font-bold tracking-tight">
              {householdCount}
            </span>
            <span className="font-headline text-xs text-[#006243] font-semibold flex items-center gap-0.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">family_restroom</span>
              {householdCount === 0
                ? 'none yet'
                : `${(rollTotal / householdCount).toFixed(1)} souls per unit`}
            </span>
          </div>
          <p className="mt-1 font-body text-xs text-[#59413a]/80">Family units registered</p>
        </div>
      </div>

      {/* Main Intake Form Card */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all relative overflow-hidden p-6 sm:p-8 border border-[#EAE1D7]/60">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#ffdbd0]/20 via-transparent to-transparent pointer-events-none"></div>

        {/* Card Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-[#f4ece8] mb-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#f4ece8] flex items-center justify-center text-[#9b2f00] shrink-0 shadow-sm">
              <span aria-hidden="true" className="material-symbols-outlined text-[26px]">person_add</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-xl font-bold text-[#1e1b19] tracking-tight">
                  New Believer Intake & Records
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffdcc3] text-[#2f1500] font-headline text-xs font-semibold">
                  Members Register
                </span>
              </div>
              <p className="font-body text-sm text-[#59413a] mt-1 max-w-2xl">
                Register an individual for pastoral oversight, formal church membership, official record keeping, and church fellowship.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#f4ece8] px-3 py-1.5 rounded-lg shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#006243] animate-pulse"></span>
            <span className="font-headline text-xs text-[#59413a] font-medium">
              Council Safe-Sync: Active
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} className="space-y-6 relative z-10">
          {submitError && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs" role="alert">
              {submitError}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column 1: Personal & Contact */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-headline text-xs text-[#9b2f00] uppercase tracking-wider font-bold">
                  1. Personal & Contact Details
                </span>
                <span className="font-mono text-xs text-[#59413a]/70">REF #GVF-2025-AUTO</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="member-first-name" className="block font-headline text-xs text-[#1e1b19] font-bold mb-1.5">
                    First Name <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input id="member-first-name" aria-label="First Name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Caleb"
                    className="w-full h-10 px-3.5 rounded-lg bg-white border border-[#e1bfb5]/70 text-[#1e1b19] font-body text-sm placeholder:text-[#59413a]/40 focus:outline-none focus:border-[#9b2f00] focus:ring-1 focus:ring-[#9b2f00] transition-colors shadow-inner"
                  />
                </div>
                <div>
                  <label htmlFor="member-last-name" className="block font-headline text-xs text-[#1e1b19] font-bold mb-1.5">
                    Last Name <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input id="member-last-name" aria-label="Last Name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Mwangi"
                    className="w-full h-10 px-3.5 rounded-lg bg-white border border-[#e1bfb5]/70 text-[#1e1b19] font-body text-sm placeholder:text-[#59413a]/40 focus:outline-none focus:border-[#9b2f00] focus:ring-1 focus:ring-[#9b2f00] transition-colors shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="member-phone" className="block font-headline text-xs text-[#1e1b19] font-bold mb-1.5">
                  Phone Number <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="flex rounded-lg overflow-hidden border border-[#e1bfb5]/70 bg-white">
                  <span className="inline-flex items-center px-3.5 bg-[#f4ece8] font-headline text-xs text-[#59413a] font-medium select-none border-r border-[#e1bfb5]/50">
                    🇰🇪 +254
                  </span>
                  <input id="member-phone" aria-label="Phone Number"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="700 000 000"
                    className="w-full h-10 px-3.5 bg-white text-[#1e1b19] font-body text-sm placeholder:text-[#59413a]/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="member-email" className="block font-headline text-xs text-[#1e1b19] font-bold mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#59413a]/60 text-[18px]">
                    alternate_email
                  </span>
                  <input id="member-email" aria-label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="caleb.vance@example.com"
                    className="w-full h-10 pl-10 pr-3.5 rounded-lg bg-white border border-[#e1bfb5]/70 text-[#1e1b19] font-body text-sm placeholder:text-[#59413a]/40 focus:outline-none focus:border-[#9b2f00] focus:ring-1 focus:ring-[#9b2f00]"
                  />
                </div>
                <p className="mt-1 font-body text-xs text-[#59413a]/70">
                  Used for pastoral notices, stewardship statements & group updates.
                </p>
              </div>

              <div>
                <label htmlFor="member-address" className="block font-headline text-xs text-[#1e1b19] font-bold mb-1.5">
                  Residential Address
                </label>
                <div className="relative">
                  <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-2.5 text-[#59413a]/60 text-[18px]">
                    home_pin
                  </span>
                  <textarea id="member-address" aria-label="Residential Address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street Address, Estate, Town"
                    className="w-full pl-10 pr-3.5 py-2 rounded-lg bg-white border border-[#e1bfb5]/70 text-[#1e1b19] font-body text-sm placeholder:text-[#59413a]/40 focus:outline-none focus:border-[#9b2f00] focus:ring-1 focus:ring-[#9b2f00] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Column 2: Church & Membership Records */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-headline text-xs text-[#9b2f00] uppercase tracking-wider font-bold">
                  2. Church & Membership Records
                </span>
                <span className="inline-flex items-center gap-1 font-headline text-xs text-[#006243] font-semibold">
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px]">verified_user</span> Official
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="member-dob" className="block font-headline text-xs text-[#1e1b19] font-bold mb-1.5">
                    Date of Birth
                  </label>
                  <input id="member-dob" aria-label="Date of Birth"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-lg bg-white border border-[#e1bfb5]/70 text-[#1e1b19] font-body text-sm focus:outline-none focus:border-[#9b2f00]"
                  />
                </div>
                <div>
                  <label htmlFor="member-location" className="block font-headline text-xs text-[#1e1b19] font-bold mb-1.5">
                    Congregation <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <select id="member-location" aria-label="Congregation"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#e1bfb5]/70 text-[#1e1b19] font-body text-sm focus:outline-none focus:border-[#9b2f00] cursor-pointer"
                  >
                    {LOCATIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label id="member-baptism-status-label" className="block font-headline text-xs text-[#1e1b19] font-bold mb-2">
                  Baptism Status <span className="text-[#ba1a1a]">*</span>
                </label>
                <div role="group" aria-labelledby="member-baptism-status-label" className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#f4ece8] p-1.5 rounded-xl border border-[#e1bfb5]/40">
                  {[
                    { id: 'baptized', label: 'Baptized (Affirmed)' },
                    { id: 'dedicated', label: 'Child Dedication' },
                    { id: 'awaiting', label: 'Awaiting Baptism' },
                    { id: 'transfer', label: 'Transfer Letter' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBaptismStatus(item.id as BaptismStatus)}
                      className={`py-2 px-2 rounded-lg text-center font-headline text-xs font-semibold truncate transition-all cursor-pointer ${
                        baptismStatus === item.id
                          ? 'bg-white text-[#9b2f00] shadow-sm font-bold'
                          : 'text-[#59413a] hover:text-[#1e1b19]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="member-notes" className="block font-headline text-xs text-[#1e1b19] font-bold">
                    Baptism & Membership Notes
                  </label>
                  <span className="font-headline text-xs text-[#59413a]/70">Confidential / Clergy Only</span>
                </div>
                <textarea id="member-notes" aria-label="Baptism &amp; Membership Notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mention confirmation history, previous church, ministry spiritual gifts, or initial pastoral intake assessment..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#e1bfb5]/70 text-[#1e1b19] font-body text-sm placeholder:text-[#59413a]/40 focus:outline-none focus:border-[#9b2f00] resize-none shadow-inner"
                />
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="font-headline text-xs text-[#59413a]/70 mr-1">Quick Tags:</span>
                  <button
                    type="button"
                    onClick={() => handleAddTag('Willing to serve in Worship Band')}
                    className="px-2.5 py-1 rounded-full bg-[#f4ece8] hover:bg-[#e9e1dd] text-[#59413a] hover:text-[#1e1b19] font-headline text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-[#e1bfb5]/40"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">add</span> Willing to serve in Worship Band
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTag('Prayer request on intake')}
                    className="px-2.5 py-1 rounded-full bg-[#f4ece8] hover:bg-[#e9e1dd] text-[#59413a] hover:text-[#1e1b19] font-headline text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-[#e1bfb5]/40"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">add</span> Prayer request on intake
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTag('Youth Ministry Interest')}
                    className="px-2.5 py-1 rounded-full bg-[#f4ece8] hover:bg-[#e9e1dd] text-[#59413a] hover:text-[#1e1b19] font-headline text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-[#e1bfb5]/40"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">add</span> Youth Ministry Interest
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="pt-6 mt-6 border-t border-[#f4ece8] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={assignHousehold}
                onChange={(e) => setAssignHousehold(e.target.checked)}
                className="w-4 h-4 rounded text-[#9b2f00] accent-[#c2410c] cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-headline text-xs text-[#1e1b19] font-bold">
                  Assign to existing household immediately
                </span>
                <span className="font-body text-xs text-[#59413a]">
                  Will launch household link prompt after saving
                </span>
              </div>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting || apiLoading}
                className="px-4 py-2.5 rounded-lg bg-[#f4ece8] hover:bg-[#eee7e3] text-[#1e1b19] font-headline text-xs font-bold transition-all shadow-sm cursor-pointer border border-[#e1bfb5]/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Saving…
                  </>
                ) : (
                  'Save & Add Another'
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting || apiLoading}
                className="px-5 py-2.5 rounded-lg bg-[#c2410c] hover:bg-[#9b2f00] text-white font-headline text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span aria-hidden="true" className={`material-symbols-outlined text-[18px] ${isSubmitting ? 'animate-spin' : ''}`}>
                  {isSubmitting ? 'progress_activity' : 'check_circle'}
                </span>
                <span>{isSubmitting ? 'Saving…' : 'Save Member'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center md:justify-start gap-2 text-[#59413a]/70 font-body text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-[#006243]">lock</span>
            <span>All membership and personal records are encrypted and protected under church confidentiality.</span>
          </div>
        </form>
      </div>

      {/* 3 Verification & Onboarding Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#EAE1D7]/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-headline text-xs uppercase tracking-wider text-[#59413a] font-semibold">
                Membership Verification Flow
              </span>
              <span aria-hidden="true" className="material-symbols-outlined text-[#9b2f00] text-[20px]">mark_email_read</span>
            </div>
            <h3 className="font-headline text-sm text-[#1e1b19] font-bold">
              Instant Baptism Certificate
            </h3>
            <p className="mt-1 font-body text-xs text-[#59413a] leading-relaxed">
              Generating this record produces an immutable PDF entry in the church ledger with secure church watermarks.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#f4ece8] flex items-center justify-between">
            <span className="font-mono text-xs text-[#59413a]">Auto-Dispatch enabled</span>
            <span className="font-headline text-xs text-[#9b2f00] font-bold hover:underline cursor-pointer">
              Config rules →
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#EAE1D7]/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-headline text-xs uppercase tracking-wider text-[#59413a] font-semibold">
                Pastoral Care Onboarding
              </span>
              <span aria-hidden="true" className="material-symbols-outlined text-[#904d00] text-[20px]">psychology_alt</span>
            </div>
            <h3 className="font-headline text-sm text-[#1e1b19] font-bold">
              First 30 Days Shepherd Assignment
            </h3>
            <p className="mt-1 font-body text-xs text-[#59413a] leading-relaxed">
              New members are automatically placed in the Welcome Team follow-up circle for welcome calls and communion follow-up scheduling.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#f4ece8] flex items-center justify-between">
            <span className="font-mono text-xs text-[#59413a]">Elder Circle #4</span>
            <span className="font-headline text-xs text-[#904d00] font-bold hover:underline cursor-pointer">
              View rotation →
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-[#EAE1D7]/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-headline text-xs uppercase tracking-wider text-[#59413a] font-semibold">
                Giving Envelope Mapping
              </span>
              <span aria-hidden="true" className="material-symbols-outlined text-[#006243] text-[20px]">volunteer_activism</span>
            </div>
            <h3 className="font-headline text-sm text-[#1e1b19] font-bold">
              Automated Stewardship ID
            </h3>
            <p className="mt-1 font-body text-xs text-[#59413a] leading-relaxed">
              A unique tax-deductible contribution envelope number is assigned sequentially to this profile upon confirmation.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#f4ece8] flex items-center justify-between">
            <span className="font-mono text-xs text-[#59413a]">Next ID: #ENV-1402</span>
            <span className="font-headline text-xs text-[#006243] font-bold hover:underline cursor-pointer">
              Manage ranges →
            </span>
          </div>
        </div>
      </div>

      {/* Floating Success Toast */}
      {feedbackToast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded-xl bg-[#33302d] text-[#f7efeb] shadow-2xl max-w-md animate-bounce">
          <div className="w-8 h-8 rounded-lg bg-[#c2410c] text-white flex items-center justify-center shrink-0">
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">check</span>
          </div>
          <span className="font-headline text-xs font-semibold flex-1">{feedbackToast}</span>
        </div>
      )}
    </div>
  );
};
