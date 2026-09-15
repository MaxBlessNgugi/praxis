-- DropIndex
DROP INDEX "AppSetting_key_key";

-- DropIndex
DROP INDEX "CharityActivity_code_key";

-- DropIndex
DROP INDEX "FinanceAuditEntry_sequence_key";

-- DropIndex
DROP INDEX "GovernanceDocument_reference_key";

-- DropIndex
DROP INDEX "Household_unitNumber_key";

-- DropIndex
DROP INDEX "Member_envelopeNumber_key";

-- DropIndex
DROP INDEX "Member_memberId_key";

-- DropIndex
DROP INDEX "Ministry_name_key";

-- DropIndex
DROP INDEX "Offering_txCode_key";

-- DropIndex
DROP INDEX "ProjectContribution_txCode_key";

-- DropIndex
DROP INDEX "Resolution_code_key";

-- DropIndex
DROP INDEX "Tithe_txCode_key";

-- DropIndex
DROP INDEX "WelfareDisbursement_caseCode_key";

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AppSetting" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "CharityActivity" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "FinanceAuditEntry" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "GovernanceDocument" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Household" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Ministry" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "MinistryMember" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Offering" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "OrderOfServiceItem" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "OrganizationProfile" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "PrayerRequest" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ProjectContribution" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Resolution" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "RosterDuty" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ServiceReport" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "SoftDeletedRecord" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "StoredFile" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "SwapRequest" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Tithe" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "WelfareDisbursement" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_deletedAt_idx" ON "Organization"("deletedAt");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMember_deletedAt_idx" ON "OrganizationMember"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Announcement_organizationId_idx" ON "Announcement"("organizationId");

-- CreateIndex
CREATE INDEX "AppSetting_organizationId_idx" ON "AppSetting"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_organizationId_key_key" ON "AppSetting"("organizationId", "key");

-- CreateIndex
CREATE INDEX "Attendance_organizationId_idx" ON "Attendance"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "Broadcast_organizationId_idx" ON "Broadcast"("organizationId");

-- CreateIndex
CREATE INDEX "CharityActivity_organizationId_idx" ON "CharityActivity"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CharityActivity_organizationId_code_key" ON "CharityActivity"("organizationId", "code");

-- CreateIndex
CREATE INDEX "Event_organizationId_idx" ON "Event"("organizationId");

-- CreateIndex
CREATE INDEX "FinanceAuditEntry_organizationId_idx" ON "FinanceAuditEntry"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceAuditEntry_organizationId_sequence_key" ON "FinanceAuditEntry"("organizationId", "sequence");

-- CreateIndex
CREATE INDEX "GovernanceDocument_organizationId_idx" ON "GovernanceDocument"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceDocument_organizationId_reference_key" ON "GovernanceDocument"("organizationId", "reference");

-- CreateIndex
CREATE INDEX "Household_organizationId_idx" ON "Household"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Household_organizationId_unitNumber_key" ON "Household"("organizationId", "unitNumber");

-- CreateIndex
CREATE INDEX "Meeting_organizationId_idx" ON "Meeting"("organizationId");

-- CreateIndex
CREATE INDEX "Member_organizationId_idx" ON "Member"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_envelopeNumber_key" ON "Member"("organizationId", "envelopeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_memberId_key" ON "Member"("organizationId", "memberId");

-- CreateIndex
CREATE INDEX "Ministry_organizationId_idx" ON "Ministry"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Ministry_organizationId_name_key" ON "Ministry"("organizationId", "name");

-- CreateIndex
CREATE INDEX "MinistryMember_organizationId_idx" ON "MinistryMember"("organizationId");

-- CreateIndex
CREATE INDEX "Offering_organizationId_idx" ON "Offering"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Offering_organizationId_txCode_key" ON "Offering"("organizationId", "txCode");

-- CreateIndex
CREATE INDEX "OrderOfServiceItem_organizationId_idx" ON "OrderOfServiceItem"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_organizationId_key" ON "OrganizationProfile"("organizationId");

-- CreateIndex
CREATE INDEX "PrayerRequest_organizationId_idx" ON "PrayerRequest"("organizationId");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectContribution_organizationId_idx" ON "ProjectContribution"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectContribution_organizationId_txCode_key" ON "ProjectContribution"("organizationId", "txCode");

-- CreateIndex
CREATE INDEX "Resolution_organizationId_idx" ON "Resolution"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Resolution_organizationId_code_key" ON "Resolution"("organizationId", "code");

-- CreateIndex
CREATE INDEX "RosterDuty_organizationId_idx" ON "RosterDuty"("organizationId");

-- CreateIndex
CREATE INDEX "Service_organizationId_idx" ON "Service"("organizationId");

-- CreateIndex
CREATE INDEX "ServiceReport_organizationId_idx" ON "ServiceReport"("organizationId");

-- CreateIndex
CREATE INDEX "SoftDeletedRecord_organizationId_idx" ON "SoftDeletedRecord"("organizationId");

-- CreateIndex
CREATE INDEX "StoredFile_organizationId_idx" ON "StoredFile"("organizationId");

-- CreateIndex
CREATE INDEX "SwapRequest_organizationId_idx" ON "SwapRequest"("organizationId");

-- CreateIndex
CREATE INDEX "Tithe_organizationId_idx" ON "Tithe"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Tithe_organizationId_txCode_key" ON "Tithe"("organizationId", "txCode");

-- CreateIndex
CREATE INDEX "WelfareDisbursement_organizationId_idx" ON "WelfareDisbursement"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WelfareDisbursement_organizationId_caseCode_key" ON "WelfareDisbursement"("organizationId", "caseCode");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ministry" ADD CONSTRAINT "Ministry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinistryMember" ADD CONSTRAINT "MinistryMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tithe" ADD CONSTRAINT "Tithe_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offering" ADD CONSTRAINT "Offering_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContribution" ADD CONSTRAINT "ProjectContribution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WelfareDisbursement" ADD CONSTRAINT "WelfareDisbursement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharityActivity" ADD CONSTRAINT "CharityActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceAuditEntry" ADD CONSTRAINT "FinanceAuditEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceDocument" ADD CONSTRAINT "GovernanceDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerRequest" ADD CONSTRAINT "PrayerRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftDeletedRecord" ADD CONSTRAINT "SoftDeletedRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderOfServiceItem" ADD CONSTRAINT "OrderOfServiceItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterDuty" ADD CONSTRAINT "RosterDuty_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------
-- Backfill
--
-- A database that predates tenancy holds exactly one church, so the migration turns the parish that
-- is already here into the first organisation and attaches every existing row to it. The column was
-- added nullable a few statements above for the same reason: this has to run against real data, not
-- only against an empty database. Adding, filling and then tightening is what makes it safe, and the
-- whole file is one transaction, so a failure leaves nothing half-attached.
--
-- A fresh database has no profile row, so no organisation is invented here: the seed creates the
-- church, and the loop below simply finds nothing to fill.
-- ---------------------------------------------------------------------------------------------

INSERT INTO "Organization" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."name", 'destiny-sanctuary', true, now(), now()
FROM "OrganizationProfile" p
LIMIT 1;

DO $$
DECLARE
  org_id text;
  tenant_table text;
BEGIN
  SELECT id INTO org_id FROM "Organization" ORDER BY "createdAt" LIMIT 1;
  IF org_id IS NULL THEN
    RETURN;
  END IF;

  FOREACH tenant_table IN ARRAY ARRAY[
    'OrganizationProfile', 'Household', 'Member', 'Ministry', 'MinistryMember', 'Service', 'Attendance',
    'Tithe', 'Offering', 'Project', 'ProjectContribution', 'WelfareDisbursement', 'CharityActivity',
    'AppSetting', 'FinanceAuditEntry', 'Meeting', 'Resolution', 'GovernanceDocument', 'Announcement',
    'Broadcast', 'Event', 'PrayerRequest', 'AuditLog', 'SoftDeletedRecord', 'OrderOfServiceItem',
    'RosterDuty', 'SwapRequest', 'ServiceReport', 'StoredFile'
  ]
  LOOP
    EXECUTE format('UPDATE %I SET "organizationId" = $1 WHERE "organizationId" IS NULL', tenant_table) USING org_id;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "organizationId" SET NOT NULL', tenant_table);
  END LOOP;

  -- Every existing account belongs to that church, in the role it already held, and lands there on
  -- sign-in so nobody has to be told which organisation to pick.
  INSERT INTO "OrganizationMember"
    ("id", "organizationId", "userId", "roleId", "isDefault", "isActive", "createdAt", "updatedAt")
  SELECT gen_random_uuid()::text, org_id, u."id", u."roleId", true, true, now(), now()
  FROM "User" u
  WHERE u."deletedAt" IS NULL
  ON CONFLICT ("organizationId", "userId") DO NOTHING;
END $$;

