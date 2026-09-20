import type { DocumentKind, MeetingKind, MeetingStatus, ResolutionStage } from '../../../../lib/api';

/**
 * What the sittings log, the docket and the library say the same way.
 *
 * The API's vocabulary is lowercase keys; a minute is read by people. Keeping the translation in one
 * place is what stops the docket calling a resolution "Voted & approved" while the minute beside it
 * calls the same stage something else.
 *
 * The quorum sentence is here for a sharper reason: whether a sitting was quorate was counted by the
 * server and stamped on the record, so the console's only job is to report it. Two screens wording it
 * differently would make one fact look like two.
 */

export const FIELD =
  'w-full px-3.5 py-2.5 text-sm rounded-[9px] border border-[#D6D3D1] bg-[#FDF8F3] text-[#1C1917] placeholder-[#A8A29E] transition-all focus:outline-none focus:border-[#C2410C] focus:ring-4 focus:ring-[#C2410C]/15';
export const LABEL = 'block text-xs font-bold text-[#1C1917] mb-1.5';

export const MEETING_KIND_ORDER: MeetingKind[] = ['stated', 'executive', 'emergency'];

export const MEETING_KIND_LABELS: Record<MeetingKind, string> = {
  stated: 'Stated',
  executive: 'Executive',
  emergency: 'Emergency',
};

export const MEETING_STATUS_ORDER: MeetingStatus[] = ['scheduled', 'held', 'cancelled'];

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: 'Scheduled',
  held: 'Held',
  cancelled: 'Called off',
};

export const STAGE_ORDER: ResolutionStage[] = ['proposed', 'voted_approved', 'implementing', 'closed'];

export const STAGE_LABELS: Record<ResolutionStage, string> = {
  proposed: 'Proposed',
  voted_approved: 'Voted & approved',
  implementing: 'Being implemented',
  closed: 'Closed',
};

/**
 * The step that follows each stage, and the words the button carries.
 *
 * The server enforces the order and records each step as its own act; the console only has to name
 * the next one rather than offer a stage to set. `null` means the docket is finished with it.
 */
export const NEXT_DECISION: Record<ResolutionStage, { to: ResolutionStage; action: string } | null> = {
  proposed: { to: 'voted_approved', action: 'Record the vote' },
  voted_approved: { to: 'implementing', action: 'Put it into effect' },
  implementing: { to: 'closed', action: 'Close it' },
  closed: null,
};

export const DOCUMENT_KINDS: DocumentKind[] = ['constitution', 'bylaw', 'policy', 'minutes', 'certificate', 'other'];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  constitution: 'Constitution',
  bylaw: 'By-laws',
  policy: 'Policies',
  minutes: 'Minutes',
  certificate: 'Certificates',
  other: 'Other',
};

export const dayOf = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const whenOf = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

export const timeOf = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** A `datetime-local` field's value for an instant, and the instant a field's value means. */
export const toLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export const instantFromLocalInput = (value: string): string => new Date(value).toISOString();

/**
 * The rule, in one sentence, for the screen that reports it.
 *
 * The calculation itself lives in the API (`src/lib/quorum` at the backend) and is not repeated here:
 * a console that recomputed a quorum would be a second opinion on whether a sitting counted.
 */
export const QUORUM_RULE_HINT =
  'A quorum is a majority of the council roll — the people who hold a named office in Ministries. The figure each sitting needed is stamped on it when it is saved, so a minute keeps the number that applied that day.';

export interface QuorumStanding {
  /** Whether the register was judged, and how it came out. */
  tone: 'met' | 'short' | 'pending' | 'unknown';
  text: string;
}

/**
 * The state of a sitting's quorum, in the API's terms.
 *
 * `quorumRequired` is counted from the council roll by the server, and `quorumMet` is its verdict on
 * the attendance. `null` means nobody has been counted yet, which is not the same as a sitting that
 * failed to reach the figure.
 */
export function quorumStanding(meeting: {
  attendees: number | null;
  quorumRequired: number | null;
  quorumMet: boolean | null;
}): QuorumStanding {
  if (meeting.quorumRequired === null) {
    return {
      tone: 'unknown',
      text: 'No council roll is recorded yet, so there is no quorum figure. Record who holds an office in Ministries and the figure follows.',
    };
  }
  const needed = `${meeting.quorumRequired} needed for a quorum`;
  if (meeting.attendees === null || meeting.quorumMet === null) {
    return { tone: 'pending', text: `${needed}. The register is counted when the sitting is held.` };
  }
  const present = `${meeting.attendees} present, ${needed}`;
  return meeting.quorumMet
    ? { tone: 'met', text: `${present} — quorate.` }
    : { tone: 'short', text: `${present} — not quorate.` };
}

export const QUORUM_CHIP: Record<QuorumStanding['tone'], string> = {
  met: 'text-[#047857] bg-[#ECFDF5] border-[#A7F3D0]',
  short: 'text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]',
  pending: 'text-[#57534E] bg-[#FDF8F3] border-[#E7E5E4]',
  unknown: 'text-[#57534E] bg-[#FDF8F3] border-[#E7E5E4]',
};

/** Why a sitting came off the register. The API takes this vocabulary, so the options are its words. */
export const SITTING_RETIRE_REASONS = [
  { id: 'cancelled', label: 'Called off', detail: 'The sitting did not go ahead.' },
  { id: 'postponed', label: 'Postponed', detail: 'It moved; record the new date as its own sitting.' },
  { id: 'duplicate', label: 'Duplicate entry', detail: 'The same sitting was logged twice; this is the copy.' },
  { id: 'wrong_entry', label: 'Wrong entry', detail: 'The date, the venue or the kind was entered wrongly.' },
  { id: 'other', label: 'Other', detail: 'Anything the categories above do not describe — say what.' },
];

/** …and why a resolution or a document left the library. */
export const RECORD_RETIRE_REASONS = [
  { id: 'duplicate', label: 'Duplicate entry', detail: 'The same record was filed twice; this is the copy.' },
  { id: 'wrong_entry', label: 'Wrong entry', detail: 'Something about it was entered wrongly.' },
  { id: 'other', label: 'Other', detail: 'Anything the categories above do not describe — say what.' },
];
