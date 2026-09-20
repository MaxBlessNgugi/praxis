-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "fileId" TEXT,
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "warrantyUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "servicedAt" TIMESTAMP(3) NOT NULL,
    "provider" TEXT,
    "cost" DECIMAL(12,2),
    "description" TEXT,
    "nextDueAt" TIMESTAMP(3),
    "fileId" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceRecord_organizationId_idx" ON "MaintenanceRecord"("organizationId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_itemId_servicedAt_idx" ON "MaintenanceRecord"("itemId", "servicedAt");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_nextDueAt_idx" ON "MaintenanceRecord"("nextDueAt");

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
