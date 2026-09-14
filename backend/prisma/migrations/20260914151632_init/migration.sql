-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'restore', 'login');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('active', 'transferred', 'deceased', 'inactive');

-- CreateEnum
CREATE TYPE "BaptismType" AS ENUM ('baptized', 'dedicated', 'none');

-- CreateEnum
CREATE TYPE "AttendanceKind" AS ENUM ('service', 'group', 'meeting');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'mpesa', 'cheque', 'bank_transfer', 'card');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('planned', 'active', 'completed', 'paused');

-- CreateEnum
CREATE TYPE "ContributionKind" AS ENUM ('cash', 'pledge');

-- CreateEnum
CREATE TYPE "WelfareStatus" AS ENUM ('requested', 'approved', 'disbursed', 'declined');

-- CreateEnum
CREATE TYPE "WelfareCategory" AS ENUM ('medical', 'education', 'food', 'funeral', 'rent', 'utility', 'other');

-- CreateEnum
CREATE TYPE "CharityStatus" AS ENUM ('recorded', 'verified', 'flagged');

-- CreateEnum
CREATE TYPE "FinanceAuditAction" AS ENUM ('recorded', 'voided', 'restored', 'approved', 'declined', 'disbursed', 'updated');

-- CreateEnum
CREATE TYPE "MeetingKind" AS ENUM ('stated', 'executive', 'emergency');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('scheduled', 'held', 'cancelled');

-- CreateEnum
CREATE TYPE "ResolutionStage" AS ENUM ('proposed', 'voted_approved', 'implementing', 'closed');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('bylaw', 'policy', 'constitution', 'minutes', 'certificate', 'other');

-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('service', 'conference', 'meeting', 'outreach');

-- CreateEnum
CREATE TYPE "PrayerStatus" AS ENUM ('open', 'praying', 'answered', 'archived');

-- CreateEnum
CREATE TYPE "LiturgyItemKind" AS ENUM ('call_to_worship', 'praise_worship', 'prayer', 'scripture', 'sermon', 'offering', 'announcements', 'presentation', 'dismissal', 'other');

-- CreateEnum
CREATE TYPE "DutyStatus" AS ENUM ('scheduled', 'confirmed', 'completed', 'missed', 'replaced', 'cancelled');

-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('requested', 'approved', 'declined', 'cancelled');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "panels" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT,
    "memberId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "vision" TEXT,
    "mission" TEXT,
    "coreValues" TEXT[],
    "serviceTimes" JSONB,
    "socials" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "initials" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "nationalId" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "householdId" TEXT,
    "householdRole" TEXT,
    "isHouseholdHead" BOOLEAN NOT NULL DEFAULT false,
    "status" "MemberStatus" NOT NULL DEFAULT 'active',
    "baptismType" "BaptismType" NOT NULL DEFAULT 'baptized',
    "baptismDate" TIMESTAMP(3),
    "baptismOfficiant" TEXT,
    "envelopeNumber" TEXT,
    "pastoralNotes" TEXT,
    "tags" TEXT[],
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weddingAnniversary" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ministry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leaderId" TEXT,
    "meetingDay" TEXT,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Ministry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinistryMember" (
    "id" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL DEFAULT 'Member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MinistryMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heldAt" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "venue" TEXT NOT NULL,
    "theme" TEXT,
    "officiantId" TEXT,
    "notes" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT,
    "memberId" TEXT,
    "kind" "AttendanceKind" NOT NULL DEFAULT 'service',
    "count" INTEGER NOT NULL DEFAULT 1,
    "visitorName" TEXT,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tithe" (
    "id" TEXT NOT NULL,
    "txCode" TEXT NOT NULL,
    "memberId" TEXT,
    "donorName" TEXT NOT NULL,
    "envelopeNo" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General Tithe',
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tithe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offering" (
    "id" TEXT NOT NULL,
    "txCode" TEXT NOT NULL,
    "serviceId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Sunday Offering',
    "reference" TEXT,
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Offering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'planned',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContribution" (
    "id" TEXT NOT NULL,
    "txCode" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "memberId" TEXT,
    "donorName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "kind" "ContributionKind" NOT NULL DEFAULT 'cash',
    "reference" TEXT,
    "contributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WelfareDisbursement" (
    "id" TEXT NOT NULL,
    "caseCode" TEXT NOT NULL,
    "memberId" TEXT,
    "beneficiaryName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "purpose" TEXT NOT NULL,
    "category" "WelfareCategory" NOT NULL DEFAULT 'other',
    "status" "WelfareStatus" NOT NULL DEFAULT 'requested',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedToId" TEXT,
    "approvedById" TEXT,
    "disbursedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WelfareDisbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharityActivity" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "initiative" TEXT NOT NULL,
    "vendor" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "CharityStatus" NOT NULL DEFAULT 'recorded',
    "notes" TEXT,
    "ledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CharityActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAuditEntry" (
    "id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "action" "FinanceAuditAction" NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "actorId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "previousHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "MeetingKind" NOT NULL DEFAULT 'stated',
    "status" "MeetingStatus" NOT NULL DEFAULT 'scheduled',
    "heldAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "chairId" TEXT,
    "secretaryId" TEXT,
    "attendees" INTEGER,
    "quorumMet" BOOLEAN,
    "agenda" JSONB,
    "minutes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resolution" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sponsor" TEXT NOT NULL,
    "sponsorOfficer" TEXT,
    "meetingId" TEXT,
    "councilDate" TIMESTAMP(3) NOT NULL,
    "stage" "ResolutionStage" NOT NULL DEFAULT 'proposed',
    "voteSummary" TEXT,
    "votesFor" INTEGER,
    "votesAgainst" INTEGER,
    "votesAbstain" INTEGER,
    "lead" TEXT,
    "leadNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Resolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL DEFAULT 'bylaw',
    "reference" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "adoptedAt" TIMESTAMP(3),
    "body" TEXT,
    "fileUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GovernanceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'Everyone',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "EventKind" NOT NULL DEFAULT 'service',
    "venue" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerRequest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "requesterName" TEXT,
    "request" TEXT NOT NULL,
    "status" "PrayerStatus" NOT NULL DEFAULT 'open',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PrayerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftDeletedRecord" (
    "id" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityLabel" TEXT,
    "reason" TEXT NOT NULL,
    "reasonLabel" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedById" TEXT,
    "restoreDeadline" TIMESTAMP(3),
    "restoredAt" TIMESTAMP(3),
    "restoredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoftDeletedRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderOfServiceItem" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "LiturgyItemKind" NOT NULL DEFAULT 'other',
    "durationMinutes" INTEGER,
    "responsible" TEXT,
    "ministryId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrderOfServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterDuty" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "ministryId" TEXT,
    "status" "DutyStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RosterDuty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwapRequest" (
    "id" TEXT NOT NULL,
    "dutyId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "replacementId" TEXT,
    "status" "SwapStatus" NOT NULL DEFAULT 'requested',
    "reason" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwapRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReport" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "adultsCount" INTEGER,
    "childrenCount" INTEGER,
    "visitorsCount" INTEGER,
    "offeringsTotal" DECIMAL(12,2),
    "highlights" TEXT,
    "preparedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE INDEX "Role_deletedAt_idx" ON "Role"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_memberId_key" ON "User"("memberId");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Household_unitNumber_key" ON "Household"("unitNumber");

-- CreateIndex
CREATE INDEX "Household_deletedAt_idx" ON "Household"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Member_memberId_key" ON "Member"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_envelopeNumber_key" ON "Member"("envelopeNumber");

-- CreateIndex
CREATE INDEX "Member_householdId_idx" ON "Member"("householdId");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE INDEX "Member_lastName_firstName_idx" ON "Member"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Member_deletedAt_idx" ON "Member"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ministry_name_key" ON "Ministry"("name");

-- CreateIndex
CREATE INDEX "Ministry_leaderId_idx" ON "Ministry"("leaderId");

-- CreateIndex
CREATE INDEX "Ministry_deletedAt_idx" ON "Ministry"("deletedAt");

-- CreateIndex
CREATE INDEX "MinistryMember_deletedAt_idx" ON "MinistryMember"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MinistryMember_ministryId_memberId_key" ON "MinistryMember"("ministryId", "memberId");

-- CreateIndex
CREATE INDEX "Service_heldAt_idx" ON "Service"("heldAt");

-- CreateIndex
CREATE INDEX "Service_officiantId_idx" ON "Service"("officiantId");

-- CreateIndex
CREATE INDEX "Service_deletedAt_idx" ON "Service"("deletedAt");

-- CreateIndex
CREATE INDEX "Attendance_serviceId_idx" ON "Attendance"("serviceId");

-- CreateIndex
CREATE INDEX "Attendance_memberId_idx" ON "Attendance"("memberId");

-- CreateIndex
CREATE INDEX "Attendance_deletedAt_idx" ON "Attendance"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tithe_txCode_key" ON "Tithe"("txCode");

-- CreateIndex
CREATE INDEX "Tithe_memberId_idx" ON "Tithe"("memberId");

-- CreateIndex
CREATE INDEX "Tithe_receivedAt_idx" ON "Tithe"("receivedAt");

-- CreateIndex
CREATE INDEX "Tithe_deletedAt_idx" ON "Tithe"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Offering_txCode_key" ON "Offering"("txCode");

-- CreateIndex
CREATE INDEX "Offering_serviceId_idx" ON "Offering"("serviceId");

-- CreateIndex
CREATE INDEX "Offering_receivedAt_idx" ON "Offering"("receivedAt");

-- CreateIndex
CREATE INDEX "Offering_deletedAt_idx" ON "Offering"("deletedAt");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContribution_txCode_key" ON "ProjectContribution"("txCode");

-- CreateIndex
CREATE INDEX "ProjectContribution_projectId_idx" ON "ProjectContribution"("projectId");

-- CreateIndex
CREATE INDEX "ProjectContribution_deletedAt_idx" ON "ProjectContribution"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WelfareDisbursement_caseCode_key" ON "WelfareDisbursement"("caseCode");

-- CreateIndex
CREATE INDEX "WelfareDisbursement_memberId_idx" ON "WelfareDisbursement"("memberId");

-- CreateIndex
CREATE INDEX "WelfareDisbursement_status_idx" ON "WelfareDisbursement"("status");

-- CreateIndex
CREATE INDEX "WelfareDisbursement_deletedAt_idx" ON "WelfareDisbursement"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CharityActivity_code_key" ON "CharityActivity"("code");

-- CreateIndex
CREATE INDEX "CharityActivity_occurredAt_idx" ON "CharityActivity"("occurredAt");

-- CreateIndex
CREATE INDEX "CharityActivity_initiative_idx" ON "CharityActivity"("initiative");

-- CreateIndex
CREATE INDEX "CharityActivity_deletedAt_idx" ON "CharityActivity"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceAuditEntry_sequence_key" ON "FinanceAuditEntry"("sequence");

-- CreateIndex
CREATE INDEX "FinanceAuditEntry_entityName_entityId_idx" ON "FinanceAuditEntry"("entityName", "entityId");

-- CreateIndex
CREATE INDEX "FinanceAuditEntry_createdAt_idx" ON "FinanceAuditEntry"("createdAt");

-- CreateIndex
CREATE INDEX "FinanceAuditEntry_action_idx" ON "FinanceAuditEntry"("action");

-- CreateIndex
CREATE INDEX "Meeting_heldAt_idx" ON "Meeting"("heldAt");

-- CreateIndex
CREATE INDEX "Meeting_kind_idx" ON "Meeting"("kind");

-- CreateIndex
CREATE INDEX "Meeting_deletedAt_idx" ON "Meeting"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Resolution_code_key" ON "Resolution"("code");

-- CreateIndex
CREATE INDEX "Resolution_stage_idx" ON "Resolution"("stage");

-- CreateIndex
CREATE INDEX "Resolution_councilDate_idx" ON "Resolution"("councilDate");

-- CreateIndex
CREATE INDEX "Resolution_deletedAt_idx" ON "Resolution"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceDocument_reference_key" ON "GovernanceDocument"("reference");

-- CreateIndex
CREATE INDEX "GovernanceDocument_kind_idx" ON "GovernanceDocument"("kind");

-- CreateIndex
CREATE INDEX "GovernanceDocument_deletedAt_idx" ON "GovernanceDocument"("deletedAt");

-- CreateIndex
CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- CreateIndex
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");

-- CreateIndex
CREATE INDEX "Announcement_deletedAt_idx" ON "Announcement"("deletedAt");

-- CreateIndex
CREATE INDEX "Broadcast_status_idx" ON "Broadcast"("status");

-- CreateIndex
CREATE INDEX "Broadcast_deletedAt_idx" ON "Broadcast"("deletedAt");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- CreateIndex
CREATE INDEX "Event_deletedAt_idx" ON "Event"("deletedAt");

-- CreateIndex
CREATE INDEX "PrayerRequest_status_idx" ON "PrayerRequest"("status");

-- CreateIndex
CREATE INDEX "PrayerRequest_memberId_idx" ON "PrayerRequest"("memberId");

-- CreateIndex
CREATE INDEX "PrayerRequest_deletedAt_idx" ON "PrayerRequest"("deletedAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityName_entityId_idx" ON "AuditLog"("entityName", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SoftDeletedRecord_entityName_entityId_idx" ON "SoftDeletedRecord"("entityName", "entityId");

-- CreateIndex
CREATE INDEX "SoftDeletedRecord_restoredAt_idx" ON "SoftDeletedRecord"("restoredAt");

-- CreateIndex
CREATE INDEX "OrderOfServiceItem_serviceId_idx" ON "OrderOfServiceItem"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderOfServiceItem_serviceId_position_key" ON "OrderOfServiceItem"("serviceId", "position");

-- CreateIndex
CREATE INDEX "RosterDuty_serviceId_idx" ON "RosterDuty"("serviceId");

-- CreateIndex
CREATE INDEX "RosterDuty_memberId_idx" ON "RosterDuty"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterDuty_serviceId_memberId_roleTitle_key" ON "RosterDuty"("serviceId", "memberId", "roleTitle");

-- CreateIndex
CREATE INDEX "SwapRequest_dutyId_idx" ON "SwapRequest"("dutyId");

-- CreateIndex
CREATE INDEX "SwapRequest_status_idx" ON "SwapRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceReport_serviceId_key" ON "ServiceReport"("serviceId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ministry" ADD CONSTRAINT "Ministry_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryMember" ADD CONSTRAINT "MinistryMember_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryMember" ADD CONSTRAINT "MinistryMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_officiantId_fkey" FOREIGN KEY ("officiantId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tithe" ADD CONSTRAINT "Tithe_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tithe" ADD CONSTRAINT "Tithe_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offering" ADD CONSTRAINT "Offering_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offering" ADD CONSTRAINT "Offering_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContribution" ADD CONSTRAINT "ProjectContribution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContribution" ADD CONSTRAINT "ProjectContribution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WelfareDisbursement" ADD CONSTRAINT "WelfareDisbursement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WelfareDisbursement" ADD CONSTRAINT "WelfareDisbursement_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WelfareDisbursement" ADD CONSTRAINT "WelfareDisbursement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharityActivity" ADD CONSTRAINT "CharityActivity_ledById_fkey" FOREIGN KEY ("ledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAuditEntry" ADD CONSTRAINT "FinanceAuditEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_chairId_fkey" FOREIGN KEY ("chairId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_secretaryId_fkey" FOREIGN KEY ("secretaryId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerRequest" ADD CONSTRAINT "PrayerRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftDeletedRecord" ADD CONSTRAINT "SoftDeletedRecord_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftDeletedRecord" ADD CONSTRAINT "SoftDeletedRecord_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderOfServiceItem" ADD CONSTRAINT "OrderOfServiceItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderOfServiceItem" ADD CONSTRAINT "OrderOfServiceItem_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterDuty" ADD CONSTRAINT "RosterDuty_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterDuty" ADD CONSTRAINT "RosterDuty_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterDuty" ADD CONSTRAINT "RosterDuty_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "Ministry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_dutyId_fkey" FOREIGN KEY ("dutyId") REFERENCES "RosterDuty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_replacementId_fkey" FOREIGN KEY ("replacementId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
