import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ParishMember, SoftDeleteRecord, TitheTransaction } from '../types';
import { INITIAL_CHURCH_MEMBERS, INITIAL_SOFT_DELETE_RECORDS, INITIAL_TITHES } from './churchMockData';
import { DEFAULT_LOCATION, DEMO_TODAY } from './churchDomain';
import { ROLES, type DemoRole } from '../lib/permissions';

/**
 * The demo's editable data, in one place.
 *
 * Until now every screen carried its own copy of these numbers: the ledger was a module
 * constant beside its panel, the Home dashboard had its own member count and monthly
 * tithe total, and the members register lived in the shell while the trash queue lived
 * inside the Delete screen — so archiving a member took her off one list and left her on
 * the other. Nothing a visitor typed survived the dialog either.
 *
 * Everything here derives from these three arrays. A count, a ratio or a KPI that
 * disagrees with them is a bug, not a design choice: fix the derivation, never the
 * literal.
 *
 * It persists to `localStorage`, so a visitor's edits are still there when they come
 * back — and `resetDemo()` in the header puts the original data back.
 */

const STORAGE_KEY = 'praxis-demo-v1';

/** Standing orders and paybill gifts are the automated ones; the rest are one-time. */
const RECURRING_METHODS = ['Bank Standing Order', 'M-PESA Standing Order', 'M-PESA Paybill'];

const METHOD_ICONS: Record<string, string> = {
  Cheque: 'receipt_long',
  'Cash Envelope': 'payments',
  'Bank Transfer': 'account_balance',
};

export interface ArchiveDetail {
  reason: SoftDeleteRecord['reason'];
  reasonLabel: string;
  destinationParish?: string;
  destinationPastor?: string;
  rationale: string;
  authorizedBy: string;
}

export interface TitheInput {
  /** What the visitor typed — a member's name or member ID, or a walk-in giver. */
  donor: string;
  amount: number;
  method: string;
  /** The ledger's Designation column; the envelope dialog leaves it at the default. */
  category?: string;
  reference?: string;
}

interface DemoSnapshot {
  members: ParishMember[];
  trash: SoftDeleteRecord[];
  tithes: TitheTransaction[];
  /** The role the console is being viewed as — it decides what the permission gates allow. */
  role: DemoRole;
  /** Members a visitor enrolled in this browser, so the dashboard can say so. */
  enrolledIds: string[];
  /** The full record of anyone archived from the roll, so restoring returns *them*. */
  archived: Record<string, ParishMember>;
}

const freshSnapshot = (): DemoSnapshot => ({
  members: INITIAL_CHURCH_MEMBERS,
  trash: INITIAL_SOFT_DELETE_RECORDS,
  tithes: INITIAL_TITHES,
  role: 'super_admin',
  enrolledIds: [],
  archived: {},
});

/** Anything unreadable in storage falls back to the seed rather than an empty console. */
function loadSnapshot(): DemoSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshSnapshot();
    const saved = JSON.parse(raw) as Partial<DemoSnapshot>;
    const seed = freshSnapshot();
    return {
      members: Array.isArray(saved.members) ? saved.members : seed.members,
      trash: Array.isArray(saved.trash) ? saved.trash : seed.trash,
      tithes: Array.isArray(saved.tithes) ? saved.tithes : seed.tithes,
      role: ROLES.includes(saved.role as DemoRole) ? (saved.role as DemoRole) : seed.role,
      enrolledIds: Array.isArray(saved.enrolledIds) ? saved.enrolledIds : [],
      archived: saved.archived && typeof saved.archived === 'object' ? saved.archived : {},
    };
  } catch {
    return freshSnapshot();
  }
}

/* ------------------------------------------------------------------ selectors */

/** Everything the register screens count, computed from the roll itself. */
export function memberStats(members: ParishMember[]) {
  const voting = members.filter((m) => m.membershipTier === 'member' || m.membershipTier === 'active-member');
  const inquirers = members.filter((m) => m.membershipTier === 'first-timer' || m.membershipTier === 'visitor');
  const youth = members.filter((m) => m.membershipTier === 'youth');
  const share = (n: number) => (members.length === 0 ? 0 : Math.round((n / members.length) * 100));
  return {
    total: members.length,
    voting: voting.length,
    inquirers: inquirers.length,
    youth: youth.length,
    votingRatio: share(voting.length),
    inquirerRatio: share(inquirers.length),
    youthRatio: share(youth.length),
    /** A record is "verified" once a baptism, dedication or transfer is on file. */
    baptized: members.filter((m) => m.baptismType !== 'awaiting').length,
    households: new Set(members.map((m) => m.householdName)).size,
  };
}

/** Everything the ledger screens total, computed from the rows themselves. */
export function titheStats(tithes: TitheTransaction[]) {
  const recurring = tithes.filter((t) => RECURRING_METHODS.includes(t.method));
  const oneTime = tithes.filter((t) => !RECURRING_METHODS.includes(t.method));
  const sum = (rows: TitheTransaction[]) => rows.reduce((total, row) => total + row.amount, 0);
  const total = sum(tithes);
  const oneTimeTotal = sum(oneTime);
  return {
    total,
    count: tithes.length,
    recurringTotal: sum(recurring),
    recurringCount: recurring.length,
    recurringShare: total === 0 ? 0 : Math.round((sum(recurring) / total) * 100),
    oneTimeTotal,
    oneTimeCount: oneTime.length,
    averageGift: oneTime.length === 0 ? 0 : oneTimeTotal / oneTime.length,
    largestGift: tithes.reduce((largest, row) => Math.max(largest, row.amount), 0),
    designations: new Set(tithes.map((t) => t.category)).size,
    envelopes: new Set(tithes.map((t) => t.envelopeNo)).size,
    /** The month the ledger is reporting on, for labels like "Total Tithes MTD". */
    month: 'February 2025',
  };
}

/* -------------------------------------------------------------------- store */

interface DemoData extends DemoSnapshot {
  memberStats: ReturnType<typeof memberStats>;
  titheStats: ReturnType<typeof titheStats>;
  addMember: (input: Partial<ParishMember>) => ParishMember;
  archiveMember: (member: ParishMember, detail: ArchiveDetail) => SoftDeleteRecord;
  restoreMember: (recordId: string) => void;
  recordTithe: (input: TitheInput) => TitheTransaction;
  voidTithe: (id: string) => void;
  setRole: (role: DemoRole) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoData | null>(null);

/** The console's clock, as a timestamp for a record written right now. */
function stampNow(): string {
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${DEMO_TODAY.short} · ${time}`;
}

function nextTxCode(tithes: TitheTransaction[]): string {
  const highest = tithes.reduce((max, row) => Math.max(max, Number(row.txCode.replace(/\D/g, '')) || 0), 98415);
  return `#TX-${highest + 1}`;
}

export const DemoDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<DemoSnapshot>(loadSnapshot);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // A full or blocked store must not break the console — the session still works.
    }
  }, [snapshot]);

  const addMember = useCallback((input: Partial<ParishMember>) => {
    const name = input.name?.trim() || 'New Member';
    const member: ParishMember = {
      id: `mbr-${Date.now()}`,
      name,
      memberId: input.memberId || `#MBR-${Math.floor(1100 + Math.random() * 500)}`,
      initials:
        input.initials ||
        name
          .split(' ')
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join(''),
      church: input.church || DEFAULT_LOCATION,
      roleDescription: input.roleDescription || 'Member',
      membershipTier: input.membershipTier || 'member',
      baptismType: input.baptismType || 'baptized',
      baptismDate: input.baptismDate || DEMO_TODAY.short,
      baptismOfficiant: input.baptismOfficiant || 'Bishop Sammy',
      householdName: input.householdName || `The ${name.split(' ').slice(-1)[0]} Household`,
      householdId: input.householdId || `#${Math.floor(100 + Math.random() * 899)}`,
      householdRole: input.householdRole || 'Head',
      email: input.email || `${name.toLowerCase().replace(/\s+/g, '.')}@destinysanctuary.co.ke`,
      phone: input.phone || '+254 700 000 000',
      residentialAddress: input.residentialAddress || 'Nyahururu',
      pastoralStatus: input.pastoralStatus || 'active-regular',
      statusLabel: input.statusLabel || 'Active Regular',
      dateOfBirth: input.dateOfBirth || '1990-01-01',
      pastoralNotes: input.pastoralNotes || '',
      tags: input.tags || [],
      envelopeNumber: input.envelopeNumber || `ENV-${Math.floor(1400 + Math.random() * 200)}`,
    };
    setSnapshot((prev) => ({
      ...prev,
      members: [member, ...prev.members],
      enrolledIds: [...prev.enrolledIds, member.id],
    }));
    return member;
  }, []);

  const archiveMember = useCallback((member: ParishMember, detail: ArchiveDetail) => {
    const record: SoftDeleteRecord = {
      id: `sd-${Date.now()}`,
      name: member.name,
      memberId: member.memberId,
      initials: member.initials,
      dismissalDate: DEMO_TODAY.short,
      daysLeft: 30,
      reason: detail.reason,
      reasonLabel: detail.reasonLabel,
      authorizedBy: detail.authorizedBy,
      destinationParish: detail.destinationParish,
      destinationPastor: detail.destinationPastor,
      rationale: detail.rationale,
    };
    setSnapshot((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== member.id),
      trash: [record, ...prev.trash],
      archived: { ...prev.archived, [record.id]: member },
    }));
    return record;
  }, []);

  const restoreMember = useCallback((recordId: string) => {
    setSnapshot((prev) => {
      const record = prev.trash.find((r) => r.id === recordId);
      if (!record) return prev;
      const stored = prev.archived[recordId];
      // Trash rows that predate this session were never on the roll: rebuild a member
      // from what the record itself carries rather than dropping the restore.
      const member: ParishMember =
        stored ??
        ({
          id: `restored-${record.id}`,
          name: record.name,
          memberId: record.memberId,
          initials: record.initials,
          church: DEFAULT_LOCATION,
          roleDescription: 'Member',
          membershipTier: 'member',
          baptismType: 'baptized',
          baptismDate: DEMO_TODAY.short,
          householdName: `${record.name.split(' ').slice(-1)[0]} Household`,
          householdId: '#108',
          householdRole: 'Member',
          email: `${record.name.toLowerCase().replace(/\s+/g, '.')}@destinysanctuary.co.ke`,
          phone: '+254 753 008 800',
          pastoralStatus: 'active-regular',
          statusLabel: 'Restored from Trash',
          pastoralNotes: record.rationale,
        } as ParishMember);
      const { [recordId]: _restored, ...remaining } = prev.archived;
      return {
        ...prev,
        members: [member, ...prev.members],
        trash: prev.trash.filter((r) => r.id !== recordId),
        archived: remaining,
      };
    });
  }, []);

  const recordTithe = useCallback((input: TitheInput) => {
    const donor = input.donor.trim() || 'Anonymous Giver';
    let row!: TitheTransaction;
    setSnapshot((prev) => {
      // A gift from someone on the roll keeps their name and envelope number, which is
      // what ties the ledger back to the register.
      const onRoll = prev.members.find(
        (m) => m.name.toLowerCase() === donor.toLowerCase() || m.memberId.toLowerCase() === donor.toLowerCase(),
      );
      row = {
        id: `tx-${Date.now()}`,
        txCode: nextTxCode(prev.tithes),
        donor: onRoll?.name || donor,
        envelopeNo: onRoll?.envelopeNumber ? `#${onRoll.envelopeNumber}` : input.reference || '—',
        method: input.method,
        methodIcon: METHOD_ICONS[input.method] ?? 'receipt_long',
        category: input.category || 'General Tithe',
        amount: input.amount,
        date: stampNow(),
        status: input.method === 'Cheque' ? 'Pending' : 'Completed',
      };
      return { ...prev, tithes: [row, ...prev.tithes] };
    });
    return row;
  }, []);

  const voidTithe = useCallback((id: string) => {
    setSnapshot((prev) => ({ ...prev, tithes: prev.tithes.filter((t) => t.id !== id) }));
  }, []);

  const setRole = useCallback((role: DemoRole) => {
    setSnapshot((prev) => ({ ...prev, role }));
  }, []);

  const resetDemo = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear; the state reset below is what matters.
    }
    setSnapshot(freshSnapshot());
  }, []);

  const value = useMemo<DemoData>(
    () => ({
      ...snapshot,
      memberStats: memberStats(snapshot.members),
      titheStats: titheStats(snapshot.tithes),
      addMember,
      archiveMember,
      restoreMember,
      recordTithe,
      voidTithe,
      setRole,
      resetDemo,
    }),
    [snapshot, addMember, archiveMember, restoreMember, recordTithe, voidTithe, setRole, resetDemo],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

export function useDemoData(): DemoData {
  const data = useContext(DemoContext);
  if (!data) throw new Error('useDemoData must be used inside <DemoDataProvider>');
  return data;
}
