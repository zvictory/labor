-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" DATE;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "bonusSpent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LoyaltyAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "marketingConsentAt" TIMESTAMP(3),
    "marketingConsentSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyEntry" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "purchaseAmount" INTEGER,
    "orderId" INTEGER,
    "branch" TEXT,
    "staffUserId" INTEGER,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lotId" INTEGER,
    "birthdayYear" INTEGER,
    "expiryNoticeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyMessage" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "staffUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_userId_key" ON "LoyaltyAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_cardNumber_key" ON "LoyaltyAccount"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyEntry_lotId_key" ON "LoyaltyEntry"("lotId");

-- CreateIndex
CREATE INDEX "LoyaltyEntry_accountId_createdAt_idx" ON "LoyaltyEntry"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyEntry_expiresAt_idx" ON "LoyaltyEntry"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyEntry_orderId_kind_key" ON "LoyaltyEntry"("orderId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyEntry_accountId_birthdayYear_key" ON "LoyaltyEntry"("accountId", "birthdayYear");

-- CreateIndex
CREATE INDEX "LoyaltyMessage_accountId_createdAt_idx" ON "LoyaltyMessage"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "LoyaltyAccount" ADD CONSTRAINT "LoyaltyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyEntry" ADD CONSTRAINT "LoyaltyEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyMessage" ADD CONSTRAINT "LoyaltyMessage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

