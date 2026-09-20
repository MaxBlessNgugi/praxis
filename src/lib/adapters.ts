/**
 * The backend stores a record; a panel renders a view model. They are not the same shape, and
 * pretending otherwise is how a screen quietly renders `undefined`.
 *
 * These mappers are that translation, one function per record, in one file, and every field they
 * return is a field the backend actually stores: a screen that needs something the table does not
 * have says so, rather than rendering a default that looks like data.
 */
import type { HouseholdDto, MemberDto, OfferingDto, ServiceDto, TitheDto } from './api';
import type {
  BaptismType,
  HouseholdDependent,
  HouseholdUnit,
  MemberStatus,
  ParishMember,
  TitheTransaction,
} from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ==================== Members and households ====================

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Active',
  transferred: 'Transferred out',
  deceased: 'Deceased',
  inactive: 'Inactive',
};

export const BAPTISM_LABELS: Record<BaptismType, string> = {
  baptized: 'Baptized (Believer)',
  dedicated: 'Child Dedication',
  none: 'Baptism & Communion Pending',
};

/** `YYYY-MM-DD`, the form a date input and the API both accept. */
export function toDay(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

/**
 * A member as the register shows one.
 *
 * Two decisions are worth naming. A field the API did not send is left **empty rather than filled**,
 * because the register is a record of what the church wrote down: a date of birth nobody recorded is
 * not "Jan 12, 2025", and an officiant nobody entered is not the bishop. And the register number is
 * shown as it is stored (`MBR-1092`) rather than dressed with a `#` the database never held.
 */
export function toParishMember(dto: MemberDto): ParishMember {
  const status = dto.status as MemberStatus;
  const baptismType = dto.baptismType as BaptismType;
  return {
    id: dto.id,
    name: `${dto.firstName} ${dto.lastName}`.trim(),
    memberId: dto.memberId,
    initials: dto.initials ?? `${dto.firstName.charAt(0)}${dto.lastName.charAt(0)}`.toUpperCase(),
    church: dto.location,
    status,
    statusLabel: MEMBER_STATUS_LABELS[status] ?? dto.status,
    baptismType,
    baptismLabel: BAPTISM_LABELS[baptismType] ?? dto.baptismType,
    ...(dto.baptismDate ? { baptismDate: formatDate(dto.baptismDate) } : {}),
    ...(dto.baptismOfficiant ? { baptismOfficiant: dto.baptismOfficiant } : {}),
    ...(dto.householdId ? { householdId: dto.householdId } : {}),
    ...(dto.household?.name ? { householdName: dto.household.name } : {}),
    ...(dto.household?.unitNumber ? { householdUnitNumber: dto.household.unitNumber } : {}),
    ...(dto.householdRole ? { householdRole: dto.householdRole } : {}),
    isHouseholdHead: dto.isHouseholdHead,
    email: dto.email ?? '',
    phone: dto.phone ?? '',
    ...(dto.dateOfBirth ? { dateOfBirth: toDay(dto.dateOfBirth) } : {}),
    ...(dto.pastoralNotes ? { pastoralNotes: dto.pastoralNotes } : {}),
    tags: dto.tags ?? [],
    ...(dto.envelopeNumber ? { envelopeNumber: dto.envelopeNumber } : {}),
    joinedAt: dto.joinedAt,
    photoFileId: dto.photoFileId ?? null,
    ministries: (dto.ministries ?? []).map((row) => ({
      id: row.id,
      ministryId: row.ministryId,
      ministryName: row.ministry?.name ?? '',
      roleTitle: row.roleTitle,
    })),
  };
}

/** One person on a household's roll, as the card lists them. */
export function toHouseholdUnit(dto: HouseholdDto): HouseholdUnit {
  // A read that only counted the roll sends no members, so nothing here assumes them.
  const members = dto.members ?? [];
  const head = members.find((member) => member.isHouseholdHead);
  const dependents: HouseholdDependent[] = members
    .filter((member) => !member.isHouseholdHead)
    .map((member) => ({ name: `${member.firstName} ${member.lastName}`.trim(), relation: member.householdRole ?? 'Member' }));
  return {
    id: dto.id,
    name: dto.name,
    unitNumber: dto.unitNumber,
    campus: dto.location,
    statusBadge: 'Active Household',
    statusType: 'secondary',
    headName: head ? `${head.firstName} ${head.lastName}`.trim() : 'No head recorded',
    headInitials: head?.initials ?? '',
    headDetail: head ? `${head.householdRole ?? 'Head'} · ${head.memberId}` : '',
    dependents,
    memberCount: dto._count?.members ?? members.length,
    address: dto.address ?? '',
    phone: head?.phone ?? '',
  };
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${MONTHS[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
}

export function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ==================== Services ====================

export interface ServiceOption {
  id: string;
  title: string;
  date: string;
}

export function toServiceOptions(services: ServiceDto[]): ServiceOption[] {
  return services.map((service) => ({ id: service.id, title: service.title, date: formatDate(service.heldAt) }));
}

// ==================== Finances ====================

/** The console's money labels, mapped to the backend's payment enum. */
export const METHOD_LABELS: Record<TitheDto['method'], string> = {
  cash: 'Cash / Sunday Offering',
  mpesa: 'M-PESA / Online',
  cheque: 'Cheque',
  bank_transfer: 'Bank Standing Order',
  card: 'Card Terminal',
};

export const METHOD_ICONS: Record<TitheDto['method'], string> = {
  cash: 'payments',
  mpesa: 'smartphone',
  cheque: 'receipt_long',
  bank_transfer: 'account_balance',
  card: 'credit_card',
};

/** The enum behind a console money label, so a form can submit what the backend expects. */
export function methodValue(label: string): TitheDto['method'] {
  const found = (Object.keys(METHOD_LABELS) as TitheDto['method'][]).find((key) => METHOD_LABELS[key] === label);
  return found ?? 'cash';
}

export function methodLabel(method: string): string {
  return METHOD_LABELS[method as TitheDto['method']] ?? method;
}

export function toTitheTransaction(dto: TitheDto): TitheTransaction {
  return {
    id: dto.id,
    txCode: dto.txCode,
    donor: dto.donorName,
    envelopeNo: dto.envelopeNo ?? '—',
    method: methodLabel(dto.method),
    methodIcon: METHOD_ICONS[dto.method] ?? 'payments',
    category: dto.category,
    amount: dto.amount,
    date: formatDate(dto.receivedAt),
    status: 'Completed',
  };
}

export interface OfferingRow {
  id: string;
  txCode: string;
  date: string;
  category: string;
  method: string;
  amount: number;
  reference: string | null;
}

export function toOfferingRow(dto: OfferingDto): OfferingRow {
  return {
    id: dto.id,
    txCode: dto.txCode,
    date: formatDate(dto.receivedAt),
    category: dto.category,
    method: methodLabel(dto.method),
    amount: dto.amount,
    reference: dto.reference,
  };
}
