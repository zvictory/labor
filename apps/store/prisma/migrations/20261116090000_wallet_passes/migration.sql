-- CreateTable
CREATE TABLE "WalletPass" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "hasUsers" BOOLEAN NOT NULL DEFAULT false,
    "lastBalance" INTEGER,
    "lastTier" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletNotification" (
    "id" SERIAL NOT NULL,
    "passId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "messageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletMessage" (
    "id" SERIAL NOT NULL,
    "header" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "segment" TEXT NOT NULL,
    "eligible" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "staffUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletPass_objectId_key" ON "WalletPass"("objectId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletPass_accountId_platform_key" ON "WalletPass"("accountId", "platform");

-- CreateIndex
CREATE INDEX "WalletNotification_passId_createdAt_idx" ON "WalletNotification"("passId", "createdAt");

-- AddForeignKey
ALTER TABLE "WalletPass" ADD CONSTRAINT "WalletPass_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletNotification" ADD CONSTRAINT "WalletNotification_passId_fkey" FOREIGN KEY ("passId") REFERENCES "WalletPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

