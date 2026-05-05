-- AlterTable
ALTER TABLE "coloring_images" ADD COLUMN     "bundleId" TEXT,
ADD COLUMN     "bundleOrder" INTEGER;

-- CreateTable
CREATE TABLE "bundles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 10,
    "pricePence" INTEGER NOT NULL DEFAULT 499,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "listingHeroUrl" TEXT,
    "listingPageGrid1Url" TEXT,
    "listingPageGrid2Url" TEXT,
    "listingPageGrid3Url" TEXT,
    "listingBrandCardUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "brand" "Brand" NOT NULL DEFAULT 'CHUNKY_CRAYON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "pricePence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "bundle_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bundles_slug_key" ON "bundles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "bundles_stripeProductId_key" ON "bundles"("stripeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "bundles_stripePriceId_key" ON "bundles"("stripePriceId");

-- CreateIndex
CREATE INDEX "bundles_brand_published_idx" ON "bundles"("brand", "published");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_purchases_stripeCheckoutSessionId_key" ON "bundle_purchases"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "bundle_purchases_userId_idx" ON "bundle_purchases"("userId");

-- CreateIndex
CREATE INDEX "bundle_purchases_bundleId_idx" ON "bundle_purchases"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_purchases_userId_bundleId_key" ON "bundle_purchases"("userId", "bundleId");

-- CreateIndex
CREATE INDEX "coloring_images_bundleId_bundleOrder_idx" ON "coloring_images"("bundleId", "bundleOrder");

-- AddForeignKey
ALTER TABLE "coloring_images" ADD CONSTRAINT "coloring_images_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_purchases" ADD CONSTRAINT "bundle_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_purchases" ADD CONSTRAINT "bundle_purchases_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
