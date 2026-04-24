-- AlterEnum
ALTER TYPE "GenerationType" ADD VALUE 'SYSTEM';

-- AlterTable
ALTER TABLE "coloring_images" ADD COLUMN     "purposeKey" TEXT,
ADD COLUMN     "showInCommunity" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "coloring_images_generationType_purposeKey_idx" ON "coloring_images"("generationType", "purposeKey");

-- CreateIndex
CREATE INDEX "coloring_images_showInCommunity_idx" ON "coloring_images"("showInCommunity");
