-- CreateEnum
CREATE TYPE "PersonaStatus" AS ENUM ('DRAFTING', 'WARMING', 'ACTIVE', 'BANNED', 'RETIRED');

-- CreateEnum
CREATE TYPE "PersonaPosture" AS ENUM ('STEALTH', 'OFFICIAL');

-- CreateEnum
CREATE TYPE "UgcWarmUpActionType" AS ENUM ('SCROLL_FYP', 'FOLLOW_ACCOUNT', 'LIKE_VIDEO', 'COMMENT_VIDEO', 'POST_WARMUP_CLIP', 'ADD_LINK_IN_BIO');

-- CreateEnum
CREATE TYPE "UgcAdStatus" AS ENUM ('DRAFTING', 'READY', 'POSTED', 'FAILED_QC', 'KILLED');

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "status" "PersonaStatus" NOT NULL DEFAULT 'DRAFTING',
    "posture" "PersonaPosture" NOT NULL DEFAULT 'STEALTH',
    "faceBriefJson" JSONB NOT NULL,
    "faceStillUrl" TEXT NOT NULL,
    "pfpUrl" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "followListJson" JSONB NOT NULL,
    "likeTargetsJson" JSONB NOT NULL,
    "commentTargetsJson" JSONB NOT NULL,
    "deviceLabel" TEXT,
    "deviceFingerprint" TEXT,
    "simLast4" TEXT,
    "proxyEndpoint" TEXT,
    "proxyProvider" TEXT,
    "accountCreatedAt" TIMESTAMP(3),
    "firstWarmupAt" TIMESTAMP(3),
    "firstAdAt" TIMESTAMP(3),
    "utmCampaign" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_warmup_clips" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "scheduledDay" INTEGER NOT NULL,
    "posted" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ugc_warmup_clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_warmup_actions" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "type" "UgcWarmUpActionType" NOT NULL,
    "target" TEXT,
    "description" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ugc_warmup_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_ads" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "coloringImageId" TEXT,
    "hookText" TEXT NOT NULL,
    "scriptText" TEXT NOT NULL,
    "stillUrl" TEXT NOT NULL,
    "voiceoverUrl" TEXT NOT NULL,
    "finalVideoUrl" TEXT NOT NULL,
    "framesPrefix" TEXT NOT NULL,
    "judgeReportJson" JSONB,
    "viralityScore" INTEGER,
    "viralityReportUrl" TEXT,
    "status" "UgcAdStatus" NOT NULL DEFAULT 'DRAFTING',
    "utmCampaign" TEXT NOT NULL,
    "utmContent" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ugc_ads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personas_handle_key" ON "personas"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "personas_utmCampaign_key" ON "personas"("utmCampaign");

-- CreateIndex
CREATE INDEX "personas_deviceFingerprint_idx" ON "personas"("deviceFingerprint");

-- CreateIndex
CREATE INDEX "personas_proxyEndpoint_idx" ON "personas"("proxyEndpoint");

-- CreateIndex
CREATE INDEX "personas_status_idx" ON "personas"("status");

-- CreateIndex
CREATE INDEX "ugc_warmup_clips_personaId_sequence_idx" ON "ugc_warmup_clips"("personaId", "sequence");

-- CreateIndex
CREATE INDEX "ugc_warmup_actions_personaId_day_idx" ON "ugc_warmup_actions"("personaId", "day");

-- CreateIndex
CREATE INDEX "ugc_ads_personaId_status_idx" ON "ugc_ads"("personaId", "status");

-- CreateIndex
CREATE INDEX "ugc_ads_utmCampaign_idx" ON "ugc_ads"("utmCampaign");

-- AddForeignKey
ALTER TABLE "ugc_warmup_clips" ADD CONSTRAINT "ugc_warmup_clips_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ugc_warmup_actions" ADD CONSTRAINT "ugc_warmup_actions_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ugc_ads" ADD CONSTRAINT "ugc_ads_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
