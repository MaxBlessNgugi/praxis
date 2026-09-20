-- CreateEnum
CREATE TYPE "CertificateKind" AS ENUM ('baptism', 'dedication');

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "kind" "CertificateKind" NOT NULL,
    "fullName" TEXT NOT NULL,
    "memberNumber" TEXT,
    "memberId" TEXT,
    "parents" TEXT,
    "ceremonyDate" TIMESTAMP(3),
    "officiant" TEXT,
    "scripture" TEXT,
    "issuedById" TEXT,
    "reissuesId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Certificate_organizationId_kind_idx" ON "Certificate"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "Certificate_deletedAt_idx" ON "Certificate"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_organizationId_serial_key" ON "Certificate"("organizationId", "serial");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_reissuesId_fkey" FOREIGN KEY ("reissuesId") REFERENCES "Certificate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
