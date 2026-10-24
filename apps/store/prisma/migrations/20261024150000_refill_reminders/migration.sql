-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "refillReminderAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_status_deliveredAt_idx" ON "Order"("status", "deliveredAt");

-- Orders delivered before this column existed: their last update is almost
-- always the move to 'delivered' (no status follows it), so it stands in.
UPDATE "Order" SET "deliveredAt" = "updatedAt" WHERE "status" = 'delivered' AND "deliveredAt" IS NULL;
