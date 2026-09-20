-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('normal', 'urgent');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('scheduled', 'cancelled');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "priority" "AnnouncementPriority" NOT NULL DEFAULT 'normal';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "organizerId" TEXT,
ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'scheduled';

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
