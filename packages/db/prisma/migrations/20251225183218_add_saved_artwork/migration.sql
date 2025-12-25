-- CreateTable
CREATE TABLE "saved_artworks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "coloringImageId" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_artworks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "saved_artworks" ADD CONSTRAINT "saved_artworks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_artworks" ADD CONSTRAINT "saved_artworks_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_artworks" ADD CONSTRAINT "saved_artworks_coloringImageId_fkey" FOREIGN KEY ("coloringImageId") REFERENCES "coloring_images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
