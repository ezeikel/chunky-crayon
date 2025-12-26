-- CreateTable
CREATE TABLE "artwork_shares" (
    "id" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "shareCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artwork_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artwork_shares_shareCode_key" ON "artwork_shares"("shareCode");

-- AddForeignKey
ALTER TABLE "artwork_shares" ADD CONSTRAINT "artwork_shares_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "saved_artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
