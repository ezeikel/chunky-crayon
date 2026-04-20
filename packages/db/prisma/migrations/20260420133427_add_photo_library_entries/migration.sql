-- CreateTable
CREATE TABLE "photo_library_entries" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "safe" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brand" "Brand" NOT NULL DEFAULT 'CHUNKY_CRAYON',

    CONSTRAINT "photo_library_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_library_entries_brand_safe_lastUsed_idx" ON "photo_library_entries"("brand", "safe", "lastUsed");
