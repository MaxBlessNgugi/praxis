-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('logo', 'member_photo', 'document', 'certificate_template', 'other');

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "purpose" "FilePurpose" NOT NULL DEFAULT 'other',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "data" BYTEA,
    "storageKey" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "OrganizationProfile" ADD COLUMN "logoFileId" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "photoFileId" TEXT;

-- CreateIndex
CREATE INDEX "StoredFile_purpose_idx" ON "StoredFile"("purpose");

-- CreateIndex
CREATE INDEX "StoredFile_deletedAt_idx" ON "StoredFile"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_logoFileId_key" ON "OrganizationProfile"("logoFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_photoFileId_key" ON "Member"("photoFileId");

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
