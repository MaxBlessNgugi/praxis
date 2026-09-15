/*
  Warnings:

  - Made the column `organizationId` on table `Announcement` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `AppSetting` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Attendance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Broadcast` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `CharityActivity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `FinanceAuditEntry` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `GovernanceDocument` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Household` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Meeting` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Member` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Ministry` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `MinistryMember` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Offering` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `OrderOfServiceItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `OrganizationProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `PrayerRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Project` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `ProjectContribution` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Resolution` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `RosterDuty` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Service` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `ServiceReport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `SoftDeletedRecord` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `StoredFile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `SwapRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Tithe` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `WelfareDisbursement` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');

-- AlterTable
ALTER TABLE "Announcement" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AppSetting" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Attendance" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Broadcast" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CharityActivity" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "FinanceAuditEntry" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "GovernanceDocument" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Household" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Meeting" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Ministry" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MinistryMember" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Offering" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "OrderOfServiceItem" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrganizationProfile" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PrayerRequest" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProjectContribution" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Resolution" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RosterDuty" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Service" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ServiceReport" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SoftDeletedRecord" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "StoredFile" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SwapRequest" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Tithe" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WelfareDisbursement" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "interval" "BillingInterval" NOT NULL DEFAULT 'monthly',
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "limits" JSONB NOT NULL,
    "features" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "requestedPlanId" TEXT,
    "requestedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "method" "PaymentMethod" NOT NULL DEFAULT 'mpesa',
    "reference" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_organizationId_idx" ON "SubscriptionPayment"("organizationId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_subscriptionId_idx" ON "SubscriptionPayment"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_receivedAt_idx" ON "SubscriptionPayment"("receivedAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_requestedPlanId_fkey" FOREIGN KEY ("requestedPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
