export type StudioViewMode = 'prototype' | 'figma-canvas' | 'design-system' | 'inspect-mode';

export type ParishNavTab = 
  | 'home' 
  | 'find-christian' 
  | 'add-new-christian' 
  | 'delete-christian' 
  | 'family-unit' 
  | 'services-worship' 
  | 'governance' 
  | 'giving-stewardship' 
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

export type MembershipTier = 'covenant' | 'communicant' | 'inquirer' | 'youth' | 'adherent';

export type BaptismType = 'baptized' | 'dedicated' | 'awaiting' | 'transfer';

export interface ParishMember {
  id: string;
  name: string;
  memberId: string; // e.g. #MBR-1092
  initials: string;
  parish: string;
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
  pastoralStatus: 'active-regular' | 'active-officer' | 'active-mercy' | 'homebound' | 'active-honored' | 'youth-confirmand' | 'pastoral-staff';
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
  name: string; // e.g. The Vance Household
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

export interface CanvasComment {
  id: string;
  x: number;
  y: number;
  frame: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
  resolved: boolean;
}

export interface InspectedElementInfo {
  id: string;
  name: string;
  category: string;
  tailwindClasses: string;
  cssProps: {
    display: string;
    padding: string;
    margin: string;
    borderRadius: string;
    backgroundColor: string;
    border: string;
    color: string;
    fontFamily: string;
    fontSize: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
}

// Legacy Compatibility Types (for previous sandbox mock components)
export type SystemTab = 'dashboard' | 'services' | 'clusters' | 'deployments' | 'security' | 'team' | 'logs' | 'settings';

export interface Microservice {
  id: string;
  name: string;
  slug?: string;
  category: string;
  status: 'healthy' | 'degraded' | 'error' | 'deploying';
  region: string;
  instances?: number;
  replicas?: number;
  cpuUsage: number;
  memoryUsage?: number;
  memUsage?: number;
  latencyMs?: number;
  version: string;
  uptime: string;
  port?: number;
  lastDeployed?: string;
  environment?: string;
}

export interface TelemetryPoint {
  time: string;
  cpu?: number;
  memory?: number;
  requests: number;
  latency: number;
  errors?: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user?: any;
  actor?: any;
  avatar?: string;
  action: string;
  resource?: string;
  target?: string;
  severity?: string;
  status?: 'success' | 'warning' | 'error';
  ipAddress?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'active' | 'away' | 'offline' | 'invited';
  lastActive: string;
  mfaEnabled?: boolean;
  twoFactorEnabled?: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix?: string;
  prefix?: string;
  scopes?: string[];
  environment?: string;
  created: string;
  lastUsed: string;
  expires: string;
  status?: 'active' | 'revoked';
}
