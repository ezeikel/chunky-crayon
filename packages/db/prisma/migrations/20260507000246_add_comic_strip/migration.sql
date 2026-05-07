-- CreateEnum
CREATE TYPE "ComicStripStatus" AS ENUM ('GENERATING', 'QC_FAILED', 'READY', 'POSTED');

-- CreateEnum
CREATE TYPE "ComicStripTheme" AS ENUM ('RULE_BREAKING', 'SNACK_TIME', 'WEATHER', 'ART_MISHAP', 'BEDTIME', 'HOLIDAY', 'FRIENDSHIP', 'WEEKEND', 'SCHOOL', 'ADVENTURE');

-- CreateTable
CREATE TABLE "comic_strips" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scriptJson" JSONB NOT NULL,
    "theme" "ComicStripTheme" NOT NULL,
    "panel1Url" TEXT,
    "panel2Url" TEXT,
    "panel3Url" TEXT,
    "panel4Url" TEXT,
    "assembledUrl" TEXT,
    "carouselCoverUrl" TEXT,
    "caption" TEXT,
    "qcResults" JSONB,
    "status" "ComicStripStatus" NOT NULL DEFAULT 'GENERATING',
    "brand" "Brand" NOT NULL DEFAULT 'CHUNKY_CRAYON',
    "postedAt" TIMESTAMP(3),
    "socialPostResults" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comic_strips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comic_strips_slug_key" ON "comic_strips"("slug");

-- CreateIndex
CREATE INDEX "comic_strips_brand_status_postedAt_idx" ON "comic_strips"("brand", "status", "postedAt");

-- CreateIndex
CREATE INDEX "comic_strips_brand_theme_createdAt_idx" ON "comic_strips"("brand", "theme", "createdAt");
