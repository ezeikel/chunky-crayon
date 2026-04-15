-- AlterTable
ALTER TABLE "coloring_images" ADD COLUMN     "regionMapHeight" INTEGER,
ADD COLUMN     "regionMapUrl" TEXT,
ADD COLUMN     "regionMapWidth" INTEGER,
ADD COLUMN     "regionsGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "regionsJson" TEXT;
