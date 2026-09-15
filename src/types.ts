export type ParishNavTab = 
  | 'home' 
  | 'find-christian' 
  | 'add-new-christian' 
  | 'delete-christian' 
  | 'family-unit' 
  | 'services-worship' 
  | 'governance' 
  | 'giving-stewardship' 
  | 'inventory-assets' 
  | 'ministries-groups' 
  | 'reports-certs' 
  | 'communications' 
  | 'settings-profile' 
  | 'admin-portal';

export type MembersSubTab = 'add-new-christian' | 'find-christian' | 'delete-christian' | 'family-unit';

export type MinistriesSubTab = 'ministries-departmental' | 'ministries-leadership' | 'ministries-volunteers';

export type FinancesSubTab = 'tithes' | 'offerings' | 'project-funding' | 'welfare' | 'charity';

export type AdminSubTab = 'users-rights' | 'trash' | 'audit-log' | 'finance-audit' | 'churches';

export type ReportsSubTab = 'finance-reports' | 'certificates' | 'agm-dossier';

export type GovernanceSubTab = 'meeting-logs' | 'legislative-tracker' | 'bylaws-hub';

export type ServicesSubTab = 'service-planner' | 'attendance' | 'volunteer-roster' | 'service-reports';

export type CommunicationsSubTab = 'announcements' | 'broadcasts' | 'events-calendar' | 'prayer-requests' | 'birthdays-anniversaries';

export type SettingsSubTab = 'org-profile' | 'subscription' | 'notifications' | 'integrations' | 'data-backup' | 'customization';

// ==================== COMMUNICATIONS TYPES ====================

export type AnnouncementAudience = 'everyone' | 'members-only' | 'ministry-leaders' | 'youth-roll' | 'church-council';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  audienceLabel: string;
  isPinned: boolean;
  priority: 'normal' | 'high' | 'urgent';
  publishDate: string;
  expiryDate: string;
  author: string;
  category: 'worship' | 'ministry' | 'stewardship' | 'community' | 'pastoral' | 'governance';
  status: 'active' | 'scheduled' | 'expired' | 'draft';
}

export interface ChurchEventItem {
  id: string;
  title: string;
  category: 'worship' | 'fellowship' | 'youth' | 'outreach' | 'governance' | 'training';
  /** `YYYY-MM-DD`, in the same local calendar the event was scheduled in. */
  date: string;
  /** Last day of a multi-day conference; the card renders the published range from the two. */
  endDate?: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  colorTag: string;
}

export type PrayerPrivacyLevel = 'public' | 'leaders-only' | 'pastoral-private';

export interface PrayerRequestItem {
  id: string;
  title?: string;
  requestedBy?: string;
  requesterName?: string;
  isAnonymous: boolean;
  category: 'healing' | 'family' | 'guidance' | 'provision' | 'bereavement' | 'praise' | 'salvation';
  details: string;
  privacyLevel: PrayerPrivacyLevel;
  submittedDate?: string;
  dateSubmitted?: string;
  status: 'active' | 'answered' | 'active-chain';
  prayerCount?: number;
  intercessorCount?: number;
  isAnswered?: boolean;
  praiseReport?: string;
  answerNote?: string;
  answerDate?: string;
}

export interface CelebrationItem {
  id: string;
  memberId: string;
  memberName: string;
  type: 'birthday' | 'anniversary';
  date: string; // e.g. "Oct 14"
  fullDate: string;
  milestoneYears?: number; // e.g. 50 (50th Birthday), 25 (25th Anniversary)
  householdName: string;
  phone: string;
  email: string;
  avatarInitials: string;
  status: 'upcoming-this-week' | 'this-month' | 'upcoming-quarter';
}

export interface BirthdayAnniversaryItem {
  id: string;
  type: 'birthday' | 'anniversary';
  memberName: string;
  householdName: string;
  date: string;
  yearsCount?: number;
  phone: string;
  email: string;
  greetingSent: boolean;
}

// ==================== SETTINGS TYPES ====================

/**
 * One field per fact. The church's identity, contact, location, leadership and
 * service-time facts are **not** stored again here: they live once in
 * `src/data/churchDomain.ts` (`CHURCH`, `SUNDAY_ORDER` / `SERVICE_TIMES`) and the Church
 * Profile form reads them from that record. What is left is the content no other screen
 * reads, so every fact has exactly one home to drift from.
 */
export interface ChurchOrgProfile {
  establishedYear?: number;
  socials: { platform: string; handle: string; url: string }[];
  vision: string;
  mission: string[];
  coreValues: { title: string; description: string }[];
  teamValues: { title: string; points: string[] }[];
  yearTheme: { year: string; title: string; declaration: string };
}

export interface NotificationCategoryPref {
  id: string;
  category: string;
  description: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
}

export interface NotificationSettings {
  smsAlertsEnabled?: boolean;
  smsSenderId?: string;
  smsProvider?: string;
  emailDigestEnabled?: boolean;
  emailFrequency?: 'instant' | 'daily' | 'weekly';
  emailProvider?: string;
  autoSendReceiptsOnGiving?: boolean;
  volunteerReminderHoursBefore?: number;
  prayerChainAlerts?: boolean;
  globalEmail?: boolean;
  globalSms?: boolean;
  globalPush?: boolean;
  digestFrequency?: 'instant' | 'daily' | 'weekly';
  categories?: NotificationCategoryPref[];
}

export interface CustomizationSettings {
  themeColor: string;
  memberTerminology: string;
  leadershipTerminology: string;
  givingTerminology: string;
  currencySymbol: string;
  dateFormat: string;
  compactMode: boolean;
}

export interface IntegrationConfig {
  smsProvider: {
    provider: 'twilio' | 'messagebird' | 'aws-sns';
    accountSid: string;
    apiKey: string;
    senderId: string;
    connected: boolean;
    lastTested?: string;
  };
  emailProvider: {
    provider: 'sendgrid' | 'postmark' | 'resend' | 'aws-ses';
    apiKey: string;
    fromEmail: string;
    fromName: string;
    connected: boolean;
    dkimStatus: 'verified' | 'pending' | 'unconfigured';
  };
  plannedIntegrations: {
    name: string;
    category: string;
    description: string;
    icon: string;
    status: 'coming-soon' | 'beta-preview';
  }[];
}

export interface CustomFieldDefinition {
  id: string;
  fieldName: string;
  fieldKey: string;
  fieldType: 'text' | 'select' | 'date' | 'checkbox' | 'tag-list';
  required: boolean;
  options?: string[];
  appliedTo: 'all-members' | 'member-only' | 'officers-only';
}

export interface MembershipTierConfig {
  id: string;
  code: MembershipTier;
  name: string;
  description: string;
  votingRights: boolean;
  communionAccess: 'full' | 'baptized-only' | 'first-timer-supervised';
  colorBadge: string;
  activeMembersCount: number;
}

export type MembershipTier = 'member' | 'active-member' | 'first-timer' | 'youth' | 'visitor';

export type BaptismType = 'baptized' | 'dedicated' | 'awaiting' | 'transfer';

export interface ParishMember {
  id: string;
  name: string;
  memberId: string; // e.g. #MBR-1092
  initials: string;
  church: string;
  roleDescription?: string;
  membershipTier: MembershipTier;
  baptismType: BaptismType;
  baptismDate?: string;
  baptismOfficiant?: string;
  householdName: string;
  householdId: string;
  householdRole: string; // Head, Co-Head, Son, Daughter, etc.
  email: string;
  phone: string;
  residentialAddress?: string;
  pastoralStatus: 'active-regular' | 'active-officer' | 'active-mercy' | 'homebound' | 'active-honored' | 'youth-discipleship' | 'pastoral-staff';
  statusLabel: string;
  dateOfBirth?: string;
  pastoralNotes?: string;
  tags?: string[];
  envelopeNumber?: string;
  /// The member's photograph, held as a file id: uploaded once, served by the API behind the same
  /// sign-in as the rest of the register. Optional, because a register that demands a picture of
  /// somebody before it will save them is a register nobody fills in.
  photoFileId?: string | null;
}

export interface HouseholdDependent {
  name: string;
  relation: string;
  badge?: string;
  badgeType?: 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'accent' | 'error';
  dotColor?: string;
}

export interface HouseholdUnit {
  id: string;
  name: string; // e.g. The Mwangi Household
  unitNumber: string; // #108
  campus: string;
  statusBadge: string;
  statusType: 'secondary' | 'tertiary' | 'neutral' | 'error';
  headName: string;
  headInitials: string;
  headDob: string;
  headTitle: string;
  dependents: HouseholdDependent[];
  address: string;
  phone: string;
}

export interface SoftDeleteRecord {
  id: string;
  name: string;
  memberId: string;
  initials: string;
  dismissalDate: string;
  daysLeft: number;
  reason: 'transfer' | 'memorial' | 'inactive' | 'admin';
  reasonLabel: string;
  authorizedBy: string;
  destinationParish?: string;
  destinationPastor?: string;
  rationale: string;
  isUrgent?: boolean;
}

/** One row of the tithe ledger the Giving & Stewardship screens read. */
/**
 * A tracked asset or stock line — the sanctuary's sound desk, the bookshop's stock, the kitchen's
 * gas. Field names follow ECCLESIA's `InventoryItem` (sku, cost, price, stock, reorder) so this
 * maps onto the real API without a translation layer; `location` and `lastCounted` are the
 * mockup's own, and stand in for ECCLESIA's separate stock-take records.
 */
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  location: string;
  /** What the books say is on hand — the figure a physical count is checked against. */
  stock: number;
  /** At or below this the item is flagged for restocking. */
  reorder: number;
  cost: number;
  price: number;
  /** When the shelf was last counted by hand, and by whom. */
  lastCounted: string;
}

export interface TitheTransaction {
  id: string;
  txCode: string;
  donor: string;
  envelopeNo: string;
  method: string;
  methodIcon: string;
  category: string;
  amount: number;
  date: string;
  status: 'Completed' | 'Cleared' | 'Pending';
}

export interface ProjectFunding {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  status: 'planned' | 'active' | 'completed' | 'paused';
  startDate: string;
  endDate: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleKey: 'super_admin' | 'admin' | 'staff' | 'viewer';
  /** The role's own title as the church named it, for labelling the person on screen. */
  roleName: string | null;
  /** A Praxis employee, which is what shows the vendor screens. */
  isPlatformAdmin: boolean;
  memberId: string | null;
  panels: Record<string, boolean>;
  actions: Record<string, boolean>;
}

/**
 * The church a session is acting for.
 *
 * Tenancy is the API's job — the token names the church and every query the service makes is scoped
 * to it, so the console never sends one. It is held here for the one thing the API cannot do: let a
 * screen say *which* church it is showing, instead of implying there is only one.
 */
export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  /** Null on a church that signed itself up and has not been through the welcome wizard. */
  onboardedAt: string | null;
}

export interface AuthState {
  user: User | null;
  /** The church this session acts for. Null before sign-in. */
  organization: ActiveOrganization | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
