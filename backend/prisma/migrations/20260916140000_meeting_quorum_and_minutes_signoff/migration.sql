-- AlterTable
ALTER TABLE "GovernanceDocument" ADD COLUMN     "fileId" TEXT;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "minutesFinalizedAt" TIMESTAMP(3),
ADD COLUMN     "minutesFinalizedById" TEXT,
ADD COLUMN     "quorumRequired" INTEGER;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_minutesFinalizedById_fkey" FOREIGN KEY ("minutesFinalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceDocument" ADD CONSTRAINT "GovernanceDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

