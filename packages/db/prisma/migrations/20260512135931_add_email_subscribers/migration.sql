-- CreateTable
CREATE TABLE "email_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lists" TEXT[] DEFAULT ARRAY['daily-coloring']::TEXT[],
    "source" TEXT,
    "sourceSlug" TEXT,
    "brand" "Brand" NOT NULL DEFAULT 'CHUNKY_CRAYON',
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "welcomeEmailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_subscribers_brand_unsubscribedAt_idx" ON "email_subscribers"("brand", "unsubscribedAt");

-- CreateIndex
CREATE INDEX "email_subscribers_brand_source_idx" ON "email_subscribers"("brand", "source");

-- CreateIndex
CREATE INDEX "email_subscribers_lists_idx" ON "email_subscribers" USING GIN ("lists");

-- CreateIndex
CREATE UNIQUE INDEX "email_subscribers_brand_email_key" ON "email_subscribers"("brand", "email");
