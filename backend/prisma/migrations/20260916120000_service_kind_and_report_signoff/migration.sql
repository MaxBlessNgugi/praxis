-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('worship', 'midweek', 'prayer', 'special', 'other');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "kind" "ServiceKind" NOT NULL DEFAULT 'worship';

-- AlterTable
ALTER TABLE "ServiceReport" ADD COLUMN     "finalizedAt" TIMESTAMP(3);
