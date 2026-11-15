-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "setPrice" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "setDiscount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isGift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "giftNote" TEXT,
ADD COLUMN     "giftRecipientName" TEXT,
ADD COLUMN     "giftRecipientPhone" TEXT;
