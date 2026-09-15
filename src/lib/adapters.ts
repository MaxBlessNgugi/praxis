/**
 * The backend stores a record; a panel renders a view model. They are not the same shape, and
 * pretending otherwise is how a screen quietly renders `undefined`.
 *
 * These mappers are that translation, one function per record, in one file. A panel imports the
 * mapper it needs and keeps rendering exactly the types it did before Phase 2 — so connecting to the
 * API changed where the data comes from, not what the UI is.
 *
 * Where the console shows a field the backend does not store (an announcement's *priority*, for
 * instance), the mapper supplies a documented default rather than inventing persistence. Those gaps
 * are the honest limit of "connect the panel to the API" and are listed in the Phase 2 notes.
 */
import type { AnnouncementDto, CelebrationDto, EventDto, OfferingDto, PrayerRequestDto, ServiceDto, TitheDto } from './api';
import type {
  AnnouncementAudience,
  AnnouncementItem,
  BirthdayAnniversaryItem,
  ChurchEventItem,
  PrayerPrivacyLevel,
  PrayerRequestItem,
  TitheTransaction,
} from '../types';
import { DEFAULT_LOCATION } from '../data/churchDomain';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

// ==================== Announcements ====================

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  everyone: 'All Members & Guests',
  'members-only': 'Members & Baptized Believers',
  'ministry-leaders': 'Group Leaders & Deacons',
  'youth-roll': 'Youth & Discipleship Class',
  'church-council': 'Church Council Only',
};

const AUDIENCES = Object.keys(AUDIENCE_LABELS) as AnnouncementAudience[];

export function asAudience(value: string): AnnouncementAudience {
  return (AUDIENCES as string[]).includes(value) ? (value as AnnouncementAudience) : 'everyone';
}

export function audienceLabel(audience: AnnouncementAudience): string {
  return AUDIENCE_LABELS[audience];
}

export function toAnnouncementItem(dto: AnnouncementDto): AnnouncementItem {
  const now = Date.now();
  const published = new Date(dto.publishedAt).getTime();
  const expires = dto.expiresAt ? new Date(dto.expiresAt).getTime() : null;
  const audience = asAudience(dto.audience);
  return {
    id: dto.id,
    title: dto.title,
    content: dto.body,
    audience,
    audienceLabel: AUDIENCE_LABELS[audience],
    isPinned: dto.isPinned,
    // The backend stores no priority or category; the console keeps its columns and shows defaults.
    priority: 'normal',
    publishDate: formatDate(dto.publishedAt),
    expiryDate: dto.expiresAt ? formatDate(dto.expiresAt) : '—',
    author: dto.author?.name ?? 'Church Office',
    category: 'worship',
    status: expires !== null && expires < now ? 'expired' : published > now ? 'scheduled' : 'active',
  };
}

// ==================== Events ====================

/** The console's categories are finer than the four kinds the events table stores, so scheduling a
 *  fellowship or a youth class has to land on one of them. */
export const EVENT_KIND: Record<ChurchEventItem['category'], EventDto['kind']> = {
  worship: 'service',
  fellowship: 'service',
  youth: 'service',
  outreach: 'outreach',
  governance: 'meeting',
  training: 'conference',
};

const EVENT_CATEGORY: Record<EventDto['kind'], ChurchEventItem['category']> = {
  service: 'worship',
  conference: 'training',
  meeting: 'governance',
  outreach: 'outreach',
};

const EVENT_COLOR: Record<EventDto['kind'], string> = {
  service: '#C2410C',
  conference: '#0891B2',
  meeting: '#059669',
  outreach: '#2563EB',
};

/** The card composes its own day range, so an event carries a plain `YYYY-MM-DD` day, in the same
 *  local calendar the event was scheduled in. */
function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
}

export function toChurchEventItem(dto: EventDto): ChurchEventItem {
  const spansDays = new Date(dto.startsAt).toDateString() !== new Date(dto.endsAt).toDateString();
  return {
    id: dto.id,
    title: dto.title,
    category: EVENT_CATEGORY[dto.kind] ?? 'worship',
    date: formatDay(dto.startsAt),
    ...(spansDays ? { endDate: formatDay(dto.endsAt) } : {}),
    startTime: formatClock(dto.startsAt),
    endTime: formatClock(dto.endsAt),
    location: dto.venue,
    description: dto.description ?? '',
    colorTag: EVENT_COLOR[dto.kind] ?? EVENT_COLOR.service,
  };
}

// ==================== Prayer requests ====================

function prayerPrivacy(isPrivate: boolean): PrayerPrivacyLevel {
  return isPrivate ? 'pastoral-private' : 'public';
}

export function toPrayerRequestItem(dto: PrayerRequestDto): PrayerRequestItem {
  const requestedBy = dto.requesterName ?? (dto.member ? `${dto.member.firstName} ${dto.member.lastName}` : undefined);
  return {
    id: dto.id,
    title: dto.request.length > 60 ? `${dto.request.slice(0, 57)}…` : dto.request,
    requestedBy,
    requesterName: requestedBy,
    isAnonymous: !requestedBy,
    // No category column on the backend; the console's grouping falls back to `guidance`.
    category: 'guidance',
    details: dto.request,
    privacyLevel: prayerPrivacy(dto.isPrivate),
    submittedDate: formatDate(dto.submittedAt),
    dateSubmitted: formatDate(dto.submittedAt),
    status: dto.status === 'answered' ? 'answered' : 'active',
    prayerCount: 0,
    intercessorCount: 0,
    isAnswered: dto.status === 'answered',
    answerDate: dto.answeredAt ? formatDate(dto.answeredAt) : undefined,
  };
}

// ==================== Celebrations ====================

export function toBirthdayAnniversaryItem(dto: CelebrationDto): BirthdayAnniversaryItem {
  return {
    id: `${dto.type}-${dto.memberId}-${dto.date}`,
    type: dto.type,
    memberName: dto.memberName,
    // The backend returns no household for a celebration; the card shows the church default.
    householdName: '—',
    date: formatDate(dto.date),
    yearsCount: dto.yearsCount ?? undefined,
    phone: dto.phone ?? '',
    email: '',
    greetingSent: false,
  };
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
