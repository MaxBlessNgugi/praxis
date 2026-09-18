import React, { useCallback, useEffect, useState } from 'react';
import type { HouseholdUnit, ParishMember } from '../../../types';
import { useDialog } from '../dialog';
import { useMembers, type UpdateMemberInput } from '../../../lib/hooks/useMembers';
import { useChurchIdentity } from '../../../hooks/useChurchIdentity';
import { errorMessage } from '../../../hooks/useApi';
import { certificatesApi, ministriesApi, type MinistryDto } from '../../../lib/api';
import { FileUpload } from '../FileUpload';
import { buildBaptismCertificate, buildDedicationCertificate, printDocument } from '../../../lib/documents';

/** The register's own words for what a member may be recorded as. */
const STATUSES: { value: NonNullable<UpdateMemberInput['status']>; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'transferred', label: 'Transferred out' },
  { value: 'deceased', label: 'Deceased' },
];

const BAPTISMS: { value: NonNullable<UpdateMemberInput['baptismType']>; label: string }[] = [
  { value: 'baptized', label: 'Baptized (Believer)' },
  { value: 'dedicated', label: 'Child Dedication' },
  { value: 'none', label: 'Waiting on a record' },
];

const FIELD =
  'w-full h-10 px-3 rounded-lg bg-[#faf2ee] font-body text-sm text-[#1e1b19] focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20';
const LABEL = 'font-headline text-xs font-semibold text-[#59413a] uppercase tracking-wider';

/** What the record's own form holds; the rest of the member is read, not typed. */
const blankDraft = (member: ParishMember) => ({
  firstName: member.name.split(' ')[0] ?? '',
  lastName: member.name.split(' ').slice(1).join(' '),
  phone: member.phone,
  email: member.email,
  status: member.status,
  baptismType: member.baptismType,
  baptismDate: member.baptismDate ?? '',
  baptismOfficiant: member.baptismOfficiant ?? '',
  envelopeNumber: member.envelopeNumber ?? '',
  pastoralNotes: member.pastoralNotes ?? '',
});

/**
 * One member's whole record, and the things a clerk files against it: their details, their
 * household, their ministries, their photograph, and their certificate.
 *
 * These are five endpoints behind one surface on purpose — they are one act of filing, and a clerk
 * who has to leave the record to correct an envelope number will simply not correct it. Household
 * and ministry changes are written as they are made rather than waiting on Save, because both are
 * lists the server owns (a household has one head, a person may serve several ministries) and the
 * record that comes back is the truth.
 */
interface MemberRecordDialogProps {
  member: ParishMember;
  onClose: () => void;
  /** Called after a write, so the register behind the dialog shows what was just filed. */
  onSaved: (member: ParishMember) => void;
}

export const MemberRecordDialog: React.FC<MemberRecordDialogProps> = ({ member, onClose, onSaved }) => {
  const dialog = useDialog(onClose, `Member record: ${member.name}`);
  const { church } = useChurchIdentity();
  const { getMember, updateMember, listAllHouseholds, linkMember, setHead, unlinkMember } = useMembers();

  const [record, setRecord] = useState(member);
  const [draft, setDraft] = useState(() => blankDraft(member));
  const [households, setHouseholds] = useState<HouseholdUnit[]>([]);
  const [allMinistries, setAllMinistries] = useState<MinistryDto[]>([]);
  const [householdChoice, setHouseholdChoice] = useState(member.householdId ?? '');
  const [householdRole, setHouseholdRole] = useState(member.householdRole ?? 'Member');
  const [ministryChoice, setMinistryChoice] = useState('');
  const [ministryRole, setMinistryRole] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Re-read the record itself, which is the only read that carries the member's ministries. */
  const load = useCallback(async () => {
    const [fresh, householdOptions, ministryPage] = await Promise.all([
      getMember(member.id),
      listAllHouseholds(),
      ministriesApi.list({ pageSize: 100, isActive: true }),
    ]);
    setRecord(fresh);
    setHouseholds(householdOptions);
    setAllMinistries(ministryPage.data);
    setHouseholdChoice(fresh.householdId ?? '');
    setHouseholdRole(fresh.householdRole ?? 'Member');
    onSaved(fresh);
  }, [getMember, listAllHouseholds, member.id, onSaved]);

  useEffect(() => {
    load().catch((cause) => setError(errorMessage(cause)));
  }, [load]);

  /** Every write goes through here, so a failure always surfaces in the same place. */
  const run = async (what: string, action: () => Promise<unknown>, done?: string) => {
    setBusy(what);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (done) setNotice(done);
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setBusy(null);
    }
  };

  /** Only what the clerk actually changed is sent, so a form left alone writes nothing. */
  const handleSaveDetails = async () => {
    const current = blankDraft(record);
    const patch: UpdateMemberInput = {};
    for (const [key, value] of Object.entries(draft) as [keyof typeof draft, string][]) {
      if (value !== current[key]) Object.assign(patch, { [key]: value.trim() });
    }
    if (Object.keys(patch).length === 0) {
      setError('Nothing has changed yet.');
      return;
    }
    const ok = await run('details', () => updateMember(record.id, patch), 'Details saved.');
    if (ok) {
      const fresh = await getMember(record.id);
      setRecord(fresh);
      setDraft(blankDraft(fresh));
      onSaved(fresh);
    }
  };

  /**
   * Moving a member between households is two writes the server cannot join into one (they are
   * different households), so the unlink goes first: leaving them on both rolls until the second
   * call lands would be a worse state than leaving them on none.
   */
  const handleLinkHousehold = async () => {
    if (!householdChoice) return;
    const moved = record.householdId && record.householdId !== householdChoice;
    const ok = await run('household', async () => {
      if (moved) await unlinkMember(record.householdId as string, record.id);
      await linkMember(householdChoice, { memberId: record.id, householdRole: householdRole.trim() || 'Member' });
    });
    if (ok) await load();
  };

  const handleUnlinkHousehold = async () => {
    if (!record.householdId) return;
    const ok = await run('household', () => unlinkMember(record.householdId as string, record.id), 'Left the household.');
    if (ok) await load();
  };

  const handleSetHead = async () => {
    const householdId = householdChoice || record.householdId;
    if (!householdId) return;
    const ok = await run('head', () => setHead(householdId, { memberId: record.id }), 'Recorded as head of the household.');
    if (ok) await load();
  };

  const handleAddMinistry = async () => {
    if (!ministryChoice) return;
    const ministryName = allMinistries.find((row) => row.id === ministryChoice)?.name ?? 'the ministry';
    const ok = await run(
      'ministry',
      () => ministriesApi.addMember(ministryChoice, { memberId: record.id, roleTitle: ministryRole.trim() || 'Member' }),
      `Added to ${ministryName}.`,
    );
    if (ok) {
      setMinistryChoice('');
      setMinistryRole('');
      await load();
    }
  };

  const handleRemoveMinistry = async (rowId: string, name: string) => {
    const ok = await run('ministry', () => ministriesApi.removeMember(rowId), `Removed from ${name}.`);
    if (ok) await load();
  };

  const handlePhoto = async (fileId: string) => {
    const fresh = await updateMember(record.id, { photoFileId: fileId });
    setRecord(fresh);
    setNotice('Photograph saved to this member’s record.');
    onSaved(fresh);
  };

  /** Removing the file and clearing the record's pointer are two acts, and both are recorded. */
  const handlePhotoRemoved = async () => {
    if (!record.photoFileId) return;
    const fresh = await updateMember(record.id, { photoFileId: null });
    setRecord(fresh);
    setNotice('Photograph removed. The file is in the Trash for thirty days.');
    onSaved(fresh);
  };

  const handlePrintCertificate = async () => {
    const ok = await run('certificate', async () => {
      // Issued into the register first, so the printed page cites a serial the church can trace.
      const issued = await certificatesApi.issue({
        kind: record.baptismType === 'dedicated' ? 'dedication' : 'baptism',
        fullName: record.name,
        memberId: record.id,
        memberNumber: record.memberId.replace(/^#/, ''),
        ...(record.baptismType === 'dedicated' ? { parents: record.householdName || 'the parents' } : {}),
        ...(record.baptismDate ? { ceremonyDate: record.baptismDate } : { ceremonyDate: new Date().toISOString() }),
        ...(record.baptismOfficiant ? { officiant: record.baptismOfficiant } : {}),
      });
      const serial = issued.data.serial;

      await printDocument(
        record.baptismType === 'dedicated'
          ? buildDedicationCertificate({
              church,
              childName: record.name,
              parents: record.householdName || 'the parents',
              dedicationDate: record.baptismDate ?? null,
              officiant: record.baptismOfficiant ?? null,
              memberNumber: record.memberId.replace(/^#/, ''),
              location: church.location,
              serial,
            })
          : buildBaptismCertificate({
              church,
              fullName: record.name,
              baptismDate: record.baptismDate ?? null,
              officiant: record.baptismOfficiant ?? null,
              memberNumber: record.memberId.replace(/^#/, ''),
              location: church.location,
              serial,
            }),
      );
      return serial;
    }, `Certificate recorded in the register and handed to the printer.`);
    if (ok) setNotice(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs" {...dialog}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-[#EAE1D7]">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[#EAE1D7] sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#ffdbd0] text-[#390c00] flex items-center justify-center font-bold shadow-sm">
              {record.initials}
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-[#1e1b19]">{record.name}</h2>
              <span className="text-xs text-[#59413a] font-mono">
                {record.memberId} · {record.church}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[#f4ece8] cursor-pointer" aria-label="Close">
            <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#59413a]">close</span>
          </button>
        </div>

        {(error || notice) && (
          <p
            role={error ? 'alert' : 'status'}
            className={`mx-5 mt-4 rounded-lg px-3 py-2 font-body text-xs ${
              error ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-[#006243]/10 text-[#006243]'
            }`}
          >
            {error ?? notice}
          </p>
        )}

        <div className="p-5 flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h3 className={LABEL}>Details</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {(
                [
                  ['firstName', 'First name'],
                  ['lastName', 'Last name'],
                  ['phone', 'Phone'],
                  ['email', 'Email'],
                  ['envelopeNumber', 'Envelope number'],
                  ['baptismOfficiant', 'Baptised / dedicated by'],
                ] as const
              ).map(([key, text]) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className={LABEL}>{text}</span>
                  <input className={FIELD} value={draft[key]} onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))} />
                </label>
              ))}
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Standing</span>
                <select
                  className={FIELD}
                  value={draft.status}
                  onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as ParishMember['status'] }))}
                >
                  {STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Baptism / dedication</span>
                <select
                  className={FIELD}
                  value={draft.baptismType}
                  onChange={(e) => setDraft((p) => ({ ...p, baptismType: e.target.value as ParishMember['baptismType'] }))}
                >
                  {BAPTISMS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Date of the record</span>
                <input
                  type="date"
                  className={FIELD}
                  value={draft.baptismDate}
                  onChange={(e) => setDraft((p) => ({ ...p, baptismDate: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className={LABEL}>Pastoral notes</span>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#faf2ee] font-body text-sm text-[#1e1b19] focus:outline-none focus:ring-2 focus:ring-[#9b2f00]/20"
                  value={draft.pastoralNotes}
                  onChange={(e) => setDraft((p) => ({ ...p, pastoralNotes: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSaveDetails()}
                disabled={busy !== null}
                className="px-4 py-2 rounded-lg bg-[#9b2f00] hover:bg-[#c2410c] disabled:opacity-60 text-white font-headline text-xs font-bold cursor-pointer"
              >
                {busy === 'details' ? 'Saving…' : 'Save details'}
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t border-[#EAE1D7] pt-5">
            <h3 className={LABEL}>Household</h3>
            <p className="font-body text-xs text-[#59413a]">
              {record.householdName
                ? `In ${record.householdName}${record.householdUnitNumber ? ` (${record.householdUnitNumber})` : ''} as ${record.householdRole ?? 'Member'}.`
                : 'Not in a household yet. Choose one below to file this member under it.'}
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <span className={LABEL}>Household</span>
                <select className={FIELD} value={householdChoice} onChange={(e) => setHouseholdChoice(e.target.value)}>
                  <option value="">Select a household</option>
                  {households.map((household) => (
                    <option key={household.id} value={household.id}>
                      {household.name} ({household.unitNumber})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 w-40">
                <span className={LABEL}>Their role</span>
                <input className={FIELD} value={householdRole} onChange={(e) => setHouseholdRole(e.target.value)} />
              </label>
              <button
                type="button"
                onClick={() => void handleLinkHousehold()}
                disabled={!householdChoice || householdChoice === record.householdId || busy !== null}
                className="px-3 py-2 rounded-lg bg-[#faf2ee] hover:bg-[#f4ece8] disabled:opacity-50 border border-[#e1bfb5]/50 font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer"
              >
                {busy === 'household' ? 'Filing…' : 'Move to this household'}
              </button>
              <button
                type="button"
                onClick={() => void handleSetHead()}
                disabled={(!householdChoice && !record.householdId) || busy !== null}
                className="px-3 py-2 rounded-lg bg-[#faf2ee] hover:bg-[#f4ece8] disabled:opacity-50 border border-[#e1bfb5]/50 font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer"
              >
                Make head
              </button>
              {record.householdId && (
                <button
                  type="button"
                  onClick={() => void handleUnlinkHousehold()}
                  disabled={busy !== null}
                  className="px-3 py-2 rounded-lg font-headline text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 cursor-pointer"
                >
                  Remove from household
                </button>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t border-[#EAE1D7] pt-5">
            <h3 className={LABEL}>Ministries</h3>
            {record.ministries.length === 0 ? (
              <p className="font-body text-xs text-[#59413a]">Serving on no ministry yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-[#f4ece8]">
                {record.ministries.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="font-headline text-xs font-bold text-[#1e1b19]">
                      {row.ministryName || 'Ministry'}
                      <span className="font-body font-normal text-[#59413a]"> · {row.roleTitle}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleRemoveMinistry(row.id, row.ministryName || 'the ministry')}
                      disabled={busy !== null}
                      className="px-2 py-1 rounded font-headline text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 cursor-pointer"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <span className={LABEL}>Add to a ministry</span>
                <select className={FIELD} value={ministryChoice} onChange={(e) => setMinistryChoice(e.target.value)}>
                  <option value="">Select a ministry</option>
                  {allMinistries.map((ministry) => (
                    <option key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 w-40">
                <span className={LABEL}>Title held</span>
                <input
                  className={FIELD}
                  value={ministryRole}
                  onChange={(e) => setMinistryRole(e.target.value)}
                  placeholder="Member"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleAddMinistry()}
                disabled={!ministryChoice || busy !== null}
                className="px-3 py-2 rounded-lg bg-[#faf2ee] hover:bg-[#f4ece8] disabled:opacity-50 border border-[#e1bfb5]/50 font-headline text-xs font-semibold text-[#1e1b19] cursor-pointer"
              >
                {busy === 'ministry' ? 'Filing…' : 'Add to ministry'}
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t border-[#EAE1D7] pt-5">
            <h3 className={LABEL}>Photograph</h3>
            <FileUpload
              purpose="member_photo"
              label="Portrait"
              hint="Optional, and personal data: an usher checking who is at the door is the reason it exists. PNG, JPEG or WebP."
              currentFileId={record.photoFileId ?? null}
              onUploaded={(file) => handlePhoto(file.id)}
              onRemoved={record.photoFileId ? handlePhotoRemoved : undefined}
            />
          </section>

          <section className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EAE1D7] pt-5">
            <button
              type="button"
              onClick={() => void handlePrintCertificate()}
              disabled={busy !== null}
              className="px-4 py-2 rounded-lg border border-[#EAE1D7] bg-[#faf2ee] hover:bg-[#f4ece8] text-[#9b2f00] font-headline text-xs font-bold shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-wait"
            >
              {busy === 'certificate'
                ? 'Preparing…'
                : record.baptismType === 'dedicated'
                  ? 'Print Dedication Certificate'
                  : 'Print Baptism Certificate'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#9b2f00] text-white font-headline text-xs font-bold shadow-sm cursor-pointer"
            >
              Close record
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
