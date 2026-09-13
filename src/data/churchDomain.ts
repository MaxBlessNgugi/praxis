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
  nonprofitStatus: 'Faith-based non-profit (Kenya)',
  phone: '+254 721 338 928',
  email: 'sachemwa@yahoo.com',
  website: 'https://destinysanctuary.co.ke',
  givingUrl: 'https://destinysanctuary.co.ke/give.html',
  street: "Destiny Sanctuary Int'L, Nyahururu, Laikipia, Kenya",
  city: 'Nyahururu',
  county: 'Laikipia County',
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
  { type: 'worship-praise', title: 'Praise & Worship', durationMinutes: 60, leader: 'Caleb Timothy Vance', notes: '10:00 AM – 11:00 AM' },
  { type: 'announcements', title: 'Presentation / Visitors', durationMinutes: 30, leader: 'Marcus Jenkins', notes: '11:00 AM – 11:30 AM' },
  { type: 'sermon', title: 'Sermon / Word Ministry', durationMinutes: 75, leader: CHURCH.visionaryLeader, notes: '11:30 AM – 12:45 PM' },
  { type: 'benediction', title: 'Congregation Dismissed', durationMinutes: 5, leader: CHURCH.visionaryLeader, notes: '12:50 PM' },
  { type: 'fellowship', title: 'Groups Meetings & Fellowship', durationMinutes: 30, leader: CHURCH.administrator, notes: '1:30 PM – 2:00 PM' },
];

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
