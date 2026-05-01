-- AlterTable
ALTER TABLE "coloring_images" ADD COLUMN     "featuredForOG" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "coloring_images_featuredForOG_idx" ON "coloring_images"("featuredForOG");
