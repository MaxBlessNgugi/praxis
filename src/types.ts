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

export type AdminSubTab = 'users-rights' | 'trash' | 'finance-audit';

export type ReportsSubTab = 'finance-reports' | 'certificates' | 'agm-dossier';

export type GovernanceSubTab = 'meeting-logs' | 'legislative-tracker' | 'bylaws-hub';

export type ServicesSubTab = 'service-planner' | 'attendance' | 'volunteer-roster' | 'service-reports';

export type CommunicationsSubTab = 'announcements' | 'broadcasts' | 'events-calendar' | 'prayer-requests' | 'birthdays-anniversaries';

export type SettingsSubTab = 'org-profile' | 'notifications' | 'integrations' | 'data-backup' | 'customization';

// ==================== SERVICE & WORSHIP TYPES ====================

export type ServiceType = 'sunday-morning' | 'sunday-evening' | 'midweek-service' | 'communion-special' | 'youth-service' | 'festival';

export interface LiturgyItem {
  id: string;
  order: number;
  type: 'prelude' | 'call-to-worship' | 'worship-praise' | 'pastoral-prayer' | 'scripture-reading' | 'tithes-offering' | 'sermon' | 'communion' | 'benediction' | 'announcements' | 'fellowship';
  title: string;
  durationMinutes: number;
  leader: string;
  notes?: string;
  hymnOrSongTitle?: string;
  scriptureRef?: string;
}

export interface ServiceRoleAssignment {
  role: 'preacher' | 'worship-lead' | 'presiding-elder' | 'scripture-reader' | 'sound-av' | 'head-usher' | 'communion-steward';
  roleName: string;
  assignedMemberId: string;
  assignedMemberName: string;
  status: 'confirmed' | 'pending' | 'replacement';
}

export interface WorshipService {
  id: string;
  title: string;
  serviceType: ServiceType;
  date: string;
  time: string;
  campus: string;
  theme: string;
  scriptureFocus: string;
  preacher: string;
  worshipLeader: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'draft';
  liturgyOrder: LiturgyItem[];
  keyRoles: ServiceRoleAssignment[];
  expectedAttendance?: number;
}

export interface AttendanceRecord {
  id: string;
  serviceId: string;
  serviceTitle: string;
  date: string;
  campus: string;
  sanctuaryHeadcount: number;
  onlineStreams: number;
  kidsNurseryCount: number;
  firstTimeVisitors: number;
  totalAttendance: number;
  notes?: string;
  loggedBy: string;
  timestamp: string;
}

export interface FirstTimeVisitorLink {
  id: string;
  visitorName: string;
  serviceDate: string;
  phone: string;
  email: string;
  interestedMinistry: string;
  assignedFollowUpPastor: string;
  status: 'new-intake' | 'contacted' | 'first-timer-enrolled' | 'regular-attender';
  householdLinked?: boolean;
}

export interface VolunteerRosterDuty {
  id: string;
  serviceId: string;
  serviceDate: string;
  serviceTitle: string;
  department: 'ushers' | 'greeters' | 'kids' | 'media-sound' | 'worship-band' | 'hospitality' | 'parking';
  roleName: string;
  assignedMemberId: string;
  assignedMemberName: string;
  callTime: string;
  status: 'confirmed' | 'pending' | 'replacement' | 'swapped';
  phone: string;
  email: string;
  notes?: string;
}

export interface SwapRequest {
  id: string;
  dutyId: string;
  serviceDate: string;
  roleName: string;
  requestingVolunteer: string;
  replacementVolunteer: string;
  reason: string;
  status: 'pending-approval' | 'approved' | 'rejected';
  requestDate: string;
}

export interface ServiceReportItem {
  id: string;
  serviceId: string;
  serviceTitle: string;
  date: string;
  preacher: string;
  sermonTopic: string;
  attendanceTotal: number;
  firstTimeVisitors: number;
  salvationsAndDecisions: number;
  offeringCollected: number;
  testimoniesHighlights: string[];
  equipmentIncidents: string[];
  pastoralFollowUpNotes: string[];
  submittedBy: string;
  submissionDate: string;
}

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

export interface BroadcastTemplate {
  id: string;
  title: string;
  channel: 'sms' | 'email' | 'both';
  category: string;
  subject?: string;
  body: string;
}

export interface BroadcastItem {
  id: string;
  channel: 'sms' | 'email';
  subject?: string;
  messageBody: string;
  targetAudience: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  openRatePercent?: number;
  clickRatePercent?: number;
  sentAt: string;
  senderName: string;
  status: 'sent' | 'scheduled' | 'draft' | 'failed';
}

export interface ChurchEventItem {
  id: string;
  title: string;
  category: 'worship' | 'fellowship' | 'youth' | 'outreach' | 'governance' | 'training';
  ministry: string;
  date: string;
  /** Last day of a multi-day conference; the card renders the published range from the two. */
  endDate?: string;
  startTime: string;
  endTime: string;
  location: string;
  campus: string;
  description: string;
  rsvpRequired: boolean;
  capacity?: number;
  rsvpsCount: number;
  contactPerson: string;
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

export interface ThirdPartyIntegration {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
}

export interface DataBackupSnapshot {
  id: string;
  snapshotDate: string;
  fileSizeMb: number;
  recordsCount: number;
  backupType: 'automated-nightly' | 'manual';
  status: 'verified' | 'pending';
  description: string;
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
