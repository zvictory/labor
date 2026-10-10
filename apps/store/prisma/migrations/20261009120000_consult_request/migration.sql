-- CreateTable
CREATE TABLE "ConsultRequest" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "productSlug" TEXT,
    "source" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ru',
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultRequest_status_createdAt_idx" ON "ConsultRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultRequest_phone_createdAt_idx" ON "ConsultRequest"("phone", "createdAt");

