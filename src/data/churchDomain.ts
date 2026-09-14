import type { LiturgyItem } from '../types';

/**
 * The mock church's shared facts.
 *
 * Every screen reads identity, locations and the weekly running order from here
 * rather than repeating literals. That is what keeps one view from disagreeing
 * with another: the campus labels and the Sunday schedule each used to be
 * spelled out in a dozen places and drifted apart one rename at a time.
 */

export const CHURCH = {
  name: "Destiny Sanctuary Int'L",
  legalName: 'Destiny Sanctuary House of Worship',
  denomination: 'Bishop-led House of Worship',
  tagline: 'Raising a generation that demonstrates the raw Power of God',
  visionaryLeader: 'Bishop Sammy',
  administrator: 'Rev. Alice',
  registration: 'Registered religious organisation — Kenya',
  nonprofitStatus: 'Faith-based society (Kenya)',
  phone: '+254 721 338 928',
  email: 'sachemwa@yahoo.com',
  website: 'https://destinysanctuary.co.ke',
  givingUrl: 'https://destinysanctuary.co.ke/give.html',
  street: "Destiny Sanctuary Int'L, Nyahururu, Laikipia, Kenya",
  city: 'Nyahururu',
  county: 'Laikipia',
  postalCode: '20300',
  timezone: 'Africa/Nairobi (East Africa Time UTC+3)',
  currency: 'KES (KSh)',
  officeHours: 'Mon–Sun 8:30am – 4:30pm',
} as const;

/**
 * The only location values the app uses. Every `campus` and `church` field in
 * `churchMockData` is one of these, so location filters can compare exactly
 * instead of matching substrings.
 */
export const LOCATIONS = ['Nyahururu Main Church', 'Nyahururu Annex'] as const;
export type ChurchLocation = (typeof LOCATIONS)[number];
export const DEFAULT_LOCATION: ChurchLocation = LOCATIONS[0];

/** Their published Sunday running order (home page Service Schedule). */
export const SUNDAY_ORDER: ReadonlyArray<
  Pick<LiturgyItem, 'type' | 'title' | 'durationMinutes' | 'leader' | 'notes'>
> = [
  { type: 'call-to-worship', title: 'First Service', durationMinutes: 120, leader: CHURCH.visionaryLeader, notes: '8:00 AM – 10:00 AM' },
  { type: 'worship-praise', title: 'Praise & Worship', durationMinutes: 60, leader: 'Caleb Timothy Mwangi', notes: '10:00 AM – 11:00 AM' },
  { type: 'announcements', title: 'Presentation / Visitors', durationMinutes: 30, leader: 'Marcus Kamau', notes: '11:00 AM – 11:30 AM' },
  { type: 'sermon', title: 'Sermon / Word Ministry', durationMinutes: 75, leader: CHURCH.visionaryLeader, notes: '11:30 AM – 12:45 PM' },
  { type: 'benediction', title: 'Congregation Dismissed', durationMinutes: 5, leader: CHURCH.visionaryLeader, notes: '12:50 PM' },
  { type: 'fellowship', title: 'Groups Meetings & Fellowship', durationMinutes: 30, leader: CHURCH.administrator, notes: '1:30 PM – 2:00 PM' },
];

/**
 * The service-time table Settings → Organization Profile lists: the Sunday order above
 * plus their Wednesday block. Derived from `SUNDAY_ORDER` so a renamed element cannot
 * leave the settings screen listing the old title.
 */
export const SERVICE_TIMES: ReadonlyArray<{ name: string; time: string }> = [
  ...SUNDAY_ORDER.map(({ title, notes }) => ({ name: title, time: notes ?? '' })),
  { name: 'Wednesdays (Counseling, Prayers & Midweek Services)', time: '9:00 AM – 5:00 PM' },
];

/**
 * The mockup's clock: the day every screen pretends is now. `label` is what the
 * header chip shows and `short` is how dated records are written, so a record added
 * from a dialog lands on the same day the rest of the console is living in.
 */
export const DEMO_TODAY = {
  label: 'Sunday, Feb 09, 2025',
  short: 'Feb 09, 2025',
} as const;

/**
 * The initials an avatar shows for a person's name — "Bishop Sammy" reads as "BS". Derived from
 * the name itself so an avatar can never disagree with the name printed beside it.
 */
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Money as the console writes it — grouped thousands with the cents kept, so one gift reads alike
 * on the Home card, the ledger's KPI band and the ledger rows themselves.
 */
export const formatKes = (value: number) =>
  `KSh ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

/** The Sunday window the six elements add up to: 8:00 AM – 2:00 PM. */
export const SUNDAY_WINDOW = '8:00 AM – 2:00 PM';

/**
 * Builds one Sunday order of service, with per-element overrides keyed by
 * position (1-based) for the bits a given service changes — its scripture,
 * who preaches, how it was dismissed.
 */
export function sundayLiturgy(
  idPrefix: string,
  patch: Partial<Record<number, Partial<LiturgyItem>>> = {},
): LiturgyItem[] {
  return SUNDAY_ORDER.map((element, index) => ({
    ...element,
    id: `${idPrefix}${index + 1}`,
    order: index + 1,
    ...patch[index + 1],
  }));
}
