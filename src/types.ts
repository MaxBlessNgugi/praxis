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

export type MinistriesSubTab = 'ministries-departmental' | 'ministries-leadership' | 'ministries-volunteers' | 'ministries-groups';

export type FinancesSubTab = 'tithes' | 'offerings' | 'project-funding' | 'welfare' | 'charity';

export type AdminSubTab = 'users-rights' | 'trash' | 'audit-log' | 'finance-audit' | 'churches';

export type ReportsSubTab = 'finance-reports' | 'certificates' | 'agm-dossier';

export type GovernanceSubTab = 'meeting-logs' | 'legislative-tracker' | 'bylaws-hub';

export type ServicesSubTab = 'service-planner' | 'attendance' | 'volunteer-roster' | 'service-reports';

export type CommunicationsSubTab = 'announcements' | 'broadcasts' | 'events-calendar' | 'prayer-requests' | 'birthdays-anniversaries';

export type SettingsSubTab = 'org-profile' | 'subscription' | 'notifications' | 'integrations' | 'data-backup' | 'customization';

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

/** How a member stands on the register, in the register's own words. */
export type MemberStatus = 'active' | 'transferred' | 'deceased' | 'inactive';

/** What has been recorded for a member: believer's baptism, a child dedication, or neither yet. */
export type BaptismType = 'baptized' | 'dedicated' | 'none';

/**
 * A member as a screen renders one.
 *
 * This is the view model, and it is deliberately the API's vocabulary rather than the mockup's: the
 * fields are exactly what the register stores, translated once in `lib/adapters.ts`. The earlier
 * shape carried four fields nothing in the database held — a membership tier, a pastoral status, a
 * role description, a church name — and a screen reading one of them rendered the blank the API had
 * actually sent. A field with no column behind it is a field the UI promises and cannot keep.
 */
export interface ParishMember {
  id: string;
  /** First and last name joined, which is how every screen shows it. */
  name: string;
  /** The register number the church issues, e.g. `MBR-1092`. */
  memberId: string;
  initials: string;
  /** The congregation this member belongs to, which is what the register groups by. */
  church: string;
  status: MemberStatus;
  /** The label for `status`, so no screen writes its own. */
  statusLabel: string;
  baptismType: BaptismType;
  /** The label for `baptismType`. */
  baptismLabel: string;
  baptismDate?: string;
  baptismOfficiant?: string;
  /** The household the member belongs to, when they belong to one. */
  householdId?: string;
  householdName?: string;
  /** The household's own number, e.g. `#108`: what the register prints beside the name. */
  householdUnitNumber?: string;
  householdRole?: string; // Head, Co-Head, Son, Daughter, etc.
  isHouseholdHead: boolean;
  email: string;
  phone: string;
  dateOfBirth?: string;
  pastoralNotes?: string;
  tags: string[];
  envelopeNumber?: string;
  /** When they were enrolled, as the register records it. */
  joinedAt: string;
  /// The member's photograph, held as a file id: uploaded once, served by the API behind the same
  /// sign-in as the rest of the register. Optional, because a register that demands a picture of
  /// somebody before it will save them is a register nobody fills in.
  photoFileId?: string | null;
  /** Present on a single-record read: the ministries this member serves on. */
  ministries: MemberMinistry[];
}

/** One ministry a member serves on, with the title they hold on it. */
export interface MemberMinistry {
  /** The membership row's own id, which is what a removal addresses. */
  id: string;
  ministryId: string;
  ministryName: string;
  roleTitle: string;
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
  unitNumber: string; // H-01
  /** The congregation the unit belongs to. */
  campus: string;
  statusBadge: string;
  statusType: 'secondary' | 'tertiary' | 'neutral' | 'error';
  /** The head of the household, or the fact that none has been recorded. */
  headName: string;
  headInitials: string;
  /** The head's role and register number, under their name on the card. */
  headDetail: string;
  dependents: HouseholdDependent[];
  /** How many people the unit holds, including its head. */
  memberCount: number;
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
  /** Every church this account serves, with the role it holds in each. One entry is the norm. */
  organizations: Array<ActiveOrganization & { roleKey: string | null; isDefault: boolean }>;
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
