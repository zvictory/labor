-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" JSONB,
    "story" JSONB,
    "country" TEXT,
    "foundedYear" INTEGER,
    "website" TEXT,
    "niche" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "family" TEXT,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accord" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "colorHex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perfumer" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" JSONB,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perfumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "availableOn" TIMESTAMP(3),
    "price" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FragranceDetail" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "brandId" INTEGER,
    "gender" TEXT NOT NULL DEFAULT 'unisex',
    "concentration" TEXT,
    "releaseYear" INTEGER,
    "volumeMl" INTEGER,
    "avgRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "avgLongevity" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "avgSillage" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "votesCount" INTEGER NOT NULL DEFAULT 0,
    "discontinued" BOOLEAN NOT NULL DEFAULT false,
    "loveBreakdown" JSONB NOT NULL DEFAULT '{}',
    "seasonsBreakdown" JSONB NOT NULL DEFAULT '{}',
    "timeBreakdown" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "FragranceDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductNote" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "noteId" INTEGER NOT NULL,
    "pyramidLayer" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAccord" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "accordId" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "ProductAccord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPerfumer" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "perfumerId" INTEGER NOT NULL,

    CONSTRAINT "ProductPerfumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSimilar" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "similarId" INTEGER NOT NULL,
    "score" DECIMAL(5,4),
    "source" TEXT NOT NULL DEFAULT 'computed',

    CONSTRAINT "ProductSimilar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "preferredLocale" TEXT NOT NULL DEFAULT 'ru',
    "role" TEXT NOT NULL DEFAULT 'customer',
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "rating" INTEGER,
    "longevity" INTEGER,
    "sillage" INTEGER,
    "loveLevel" TEXT,
    "seasons" JSONB NOT NULL DEFAULT '[]',
    "timeOfDay" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" SERIAL NOT NULL,
    "cartId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isSample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "userId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "total" INTEGER NOT NULL DEFAULT 0,
    "region" TEXT,
    "district" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "deliveryMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "externalTxnId" TEXT,
    "amount" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'created',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "externalTxnId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "response" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'received',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "orderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "subtitle" JSONB,
    "body" JSONB,
    "ctaLabel" JSONB,
    "heroImage" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSlide" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "title" JSONB,
    "subtitle" JSONB,
    "ctaLabel" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampaignSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignProduct" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampaignProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_active_idx" ON "Brand"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Note_slug_key" ON "Note"("slug");

-- CreateIndex
CREATE INDEX "Note_family_idx" ON "Note"("family");

-- CreateIndex
CREATE UNIQUE INDEX "Accord_slug_key" ON "Accord"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Perfumer_slug_key" ON "Perfumer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FragranceDetail_productId_key" ON "FragranceDetail"("productId");

-- CreateIndex
CREATE INDEX "FragranceDetail_brandId_idx" ON "FragranceDetail"("brandId");

-- CreateIndex
CREATE INDEX "FragranceDetail_gender_idx" ON "FragranceDetail"("gender");

-- CreateIndex
CREATE INDEX "FragranceDetail_avgRating_idx" ON "FragranceDetail"("avgRating");

-- CreateIndex
CREATE INDEX "ProductNote_noteId_idx" ON "ProductNote"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductNote_productId_noteId_pyramidLayer_key" ON "ProductNote"("productId", "noteId", "pyramidLayer");

-- CreateIndex
CREATE INDEX "ProductAccord_accordId_idx" ON "ProductAccord"("accordId");

-- CreateIndex
CREATE INDEX "ProductAccord_productId_weight_idx" ON "ProductAccord"("productId", "weight");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAccord_productId_accordId_key" ON "ProductAccord"("productId", "accordId");

-- CreateIndex
CREATE INDEX "ProductPerfumer_perfumerId_idx" ON "ProductPerfumer"("perfumerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPerfumer_productId_perfumerId_key" ON "ProductPerfumer"("productId", "perfumerId");

-- CreateIndex
CREATE INDEX "ProductSimilar_similarId_idx" ON "ProductSimilar"("similarId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSimilar_productId_similarId_key" ON "ProductSimilar"("productId", "similarId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "OtpCode_phone_idx" ON "OtpCode"("phone");

-- CreateIndex
CREATE INDEX "Vote_productId_idx" ON "Vote"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_productId_key" ON "Vote"("userId", "productId");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "WishlistItem"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_token_key" ON "Cart"("token");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_isSample_key" ON "CartItem"("cartId", "productId", "isSample");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_orderId_idx" ON "PaymentWebhookEvent"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_externalTxnId_eventType_key" ON "PaymentWebhookEvent"("provider", "externalTxnId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_active_idx" ON "Campaign"("active");

-- CreateIndex
CREATE INDEX "CampaignSlide_campaignId_idx" ON "CampaignSlide"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignProduct_productId_idx" ON "CampaignProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignProduct_campaignId_productId_key" ON "CampaignProduct"("campaignId", "productId");

-- AddForeignKey
ALTER TABLE "FragranceDetail" ADD CONSTRAINT "FragranceDetail_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FragranceDetail" ADD CONSTRAINT "FragranceDetail_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductNote" ADD CONSTRAINT "ProductNote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductNote" ADD CONSTRAINT "ProductNote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAccord" ADD CONSTRAINT "ProductAccord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAccord" ADD CONSTRAINT "ProductAccord_accordId_fkey" FOREIGN KEY ("accordId") REFERENCES "Accord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPerfumer" ADD CONSTRAINT "ProductPerfumer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPerfumer" ADD CONSTRAINT "ProductPerfumer_perfumerId_fkey" FOREIGN KEY ("perfumerId") REFERENCES "Perfumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSimilar" ADD CONSTRAINT "ProductSimilar_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSimilar" ADD CONSTRAINT "ProductSimilar_similarId_fkey" FOREIGN KEY ("similarId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSlide" ADD CONSTRAINT "CampaignSlide_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignProduct" ADD CONSTRAINT "CampaignProduct_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignProduct" ADD CONSTRAINT "CampaignProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
