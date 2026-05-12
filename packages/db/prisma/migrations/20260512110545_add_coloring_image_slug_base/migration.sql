-- AlterTable
ALTER TABLE "coloring_images" ADD COLUMN     "slugBase" TEXT;

-- CreateIndex
CREATE INDEX "coloring_images_slugBase_idx" ON "coloring_images"("slugBase");
