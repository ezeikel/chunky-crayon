-- CreateEnum
CREATE TYPE "ContentReelKind" AS ENUM ('STAT', 'FACT', 'TIP', 'MYTH');

-- CreateEnum
CREATE TYPE "ContentReelTemplate" AS ENUM ('SHOCK', 'WARM', 'QUIET');

-- CreateEnum
CREATE TYPE "ContentReelCategory" AS ENUM ('SCREEN_TIME', 'ATTENTION', 'ANXIETY', 'FINE_MOTOR', 'CREATIVITY', 'FAMILY_BONDING', 'PARENTING_TIP', 'BRAIN_DEVELOPMENT', 'SLEEP', 'COMMON_MISCONCEPTION');

-- CreateEnum
CREATE TYPE "FactCheckConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "content_reels" (
    "id" TEXT NOT NULL,
    "kind" "ContentReelKind" NOT NULL,
    "hook" TEXT NOT NULL,
    "payoff" TEXT NOT NULL,
    "centerBlock" TEXT NOT NULL,
    "coverTeaser" TEXT,
    "sourceTitle" TEXT,
    "sourceUrl" TEXT,
    "category" "ContentReelCategory" NOT NULL,
    "templateOverride" "ContentReelTemplate",
    "hookTokens" JSONB,
    "payoffTokens" JSONB,
    "factCheckedAt" TIMESTAMP(3),
    "factCheckConfidence" "FactCheckConfidence",
    "factCheckNotes" TEXT,
    "postedAt" TIMESTAMP(3),
    "socialPostResults" JSONB,
    "brand" "Brand" NOT NULL DEFAULT 'CHUNKY_CRAYON',
    "reelUrl" TEXT,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_reels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_reels_kind_brand_factCheckConfidence_postedAt_idx" ON "content_reels"("kind", "brand", "factCheckConfidence", "postedAt");

-- CreateIndex
CREATE INDEX "content_reels_factCheckedAt_idx" ON "content_reels"("factCheckedAt");
