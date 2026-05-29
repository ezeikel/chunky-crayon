-- CreateEnum
CREATE TYPE "OrganicEngine" AS ENUM ('NEWS', 'DATASET');

-- CreateEnum
CREATE TYPE "SafetyVerdict" AS ENUM ('PENDING', 'APPROVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "OrganicCategory" AS ENUM ('SCHOOL_POLICY', 'SCREEN_TIME', 'READING_LITERACY', 'CHILDCARE_COST', 'SCHOOL_FOOD', 'HOMEWORK', 'TEACHER_SUPPORT', 'CHILDHOOD_PLAY', 'BABY_NAMES', 'MILESTONES', 'CREATIVITY', 'NOSTALGIA');

-- CreateTable
CREATE TABLE "dataset_sources" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "license" TEXT,
    "lastIngestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dataset_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_rows" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dataset_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organic_posts" (
    "id" TEXT NOT NULL,
    "engine" "OrganicEngine" NOT NULL,
    "hook" TEXT NOT NULL,
    "payoff" TEXT NOT NULL,
    "centerBlock" TEXT NOT NULL,
    "coverTeaser" TEXT,
    "sourceTitle" TEXT,
    "sourceUrl" TEXT,
    "category" "OrganicCategory" NOT NULL,
    "templateOverride" "ContentReelTemplate",
    "hookTokens" JSONB,
    "payoffTokens" JSONB,
    "engagementScore" DOUBLE PRECISION,
    "safetyVerdict" "SafetyVerdict" NOT NULL DEFAULT 'PENDING',
    "safetyNotes" TEXT,
    "factCheckedAt" TIMESTAMP(3),
    "factCheckConfidence" "FactCheckConfidence",
    "factCheckNotes" TEXT,
    "datasetRowId" TEXT,
    "postedAt" TIMESTAMP(3),
    "socialPostResults" JSONB,
    "brand" "Brand" NOT NULL DEFAULT 'CHUNKY_CRAYON',
    "reelUrl" TEXT,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organic_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dataset_sources_key_key" ON "dataset_sources"("key");

-- CreateIndex
CREATE INDEX "dataset_rows_sourceKey_usedAt_idx" ON "dataset_rows"("sourceKey", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_rows_sourceKey_externalId_key" ON "dataset_rows"("sourceKey", "externalId");

-- CreateIndex
CREATE INDEX "organic_posts_engine_brand_safetyVerdict_postedAt_idx" ON "organic_posts"("engine", "brand", "safetyVerdict", "postedAt");

-- CreateIndex
CREATE INDEX "organic_posts_brand_engine_createdAt_idx" ON "organic_posts"("brand", "engine", "createdAt");

-- AddForeignKey
ALTER TABLE "dataset_rows" ADD CONSTRAINT "dataset_rows_sourceKey_fkey" FOREIGN KEY ("sourceKey") REFERENCES "dataset_sources"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organic_posts" ADD CONSTRAINT "organic_posts_datasetRowId_fkey" FOREIGN KEY ("datasetRowId") REFERENCES "dataset_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;
