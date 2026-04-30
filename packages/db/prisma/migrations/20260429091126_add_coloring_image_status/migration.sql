-- CreateEnum
CREATE TYPE "ColoringImageStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "coloring_images" ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "status" "ColoringImageStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN     "streamingPartialUrl" TEXT,
ADD COLUMN     "streamingProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "workerJobId" TEXT;

-- CreateIndex
CREATE INDEX "coloring_images_status_createdAt_idx" ON "coloring_images"("status", "createdAt");
