/*
  Warnings:

  - A unique constraint covering the columns `[userId,profileId,coloringImageId]` on the table `canvas_progress` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "canvas_progress_userId_coloringImageId_key";

-- AlterTable
ALTER TABLE "canvas_progress" ADD COLUMN     "profileId" TEXT,
ADD COLUMN     "snapshotHeight" INTEGER,
ADD COLUMN     "snapshotUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "snapshotUrl" TEXT,
ADD COLUMN     "snapshotWidth" INTEGER;

-- CreateIndex
CREATE INDEX "canvas_progress_profileId_idx" ON "canvas_progress"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "canvas_progress_userId_profileId_coloringImageId_key" ON "canvas_progress"("userId", "profileId", "coloringImageId");

-- AddForeignKey
ALTER TABLE "canvas_progress" ADD CONSTRAINT "canvas_progress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
