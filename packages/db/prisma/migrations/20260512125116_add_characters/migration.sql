-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "brand" "Brand" NOT NULL DEFAULT 'CHUNKY_CRAYON',
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "shortPrompt" TEXT NOT NULL,
    "traits" TEXT[],
    "signatureDetails" TEXT[],
    "referenceSheetPrompt" TEXT NOT NULL,
    "portraitUrl" TEXT,
    "portraitLineArtUrl" TEXT,
    "status" "CharacterStatus" NOT NULL DEFAULT 'GENERATING',
    "failureReason" TEXT,
    "voiceId" TEXT,
    "voicePersona" TEXT,
    "equippedOutfitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_outfits" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_outfits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_voice_lines" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_voice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_usages" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "coloringImageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "characters_userId_brand_idx" ON "characters"("userId", "brand");

-- CreateIndex
CREATE INDEX "characters_profileId_idx" ON "characters"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "character_outfits_characterId_key_key" ON "character_outfits"("characterId", "key");

-- CreateIndex
CREATE INDEX "character_voice_lines_characterId_slot_idx" ON "character_voice_lines"("characterId", "slot");

-- CreateIndex
CREATE INDEX "character_usages_coloringImageId_idx" ON "character_usages"("coloringImageId");

-- CreateIndex
CREATE UNIQUE INDEX "character_usages_characterId_coloringImageId_key" ON "character_usages"("characterId", "coloringImageId");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_equippedOutfitId_fkey" FOREIGN KEY ("equippedOutfitId") REFERENCES "character_outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_outfits" ADD CONSTRAINT "character_outfits_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_voice_lines" ADD CONSTRAINT "character_voice_lines_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_usages" ADD CONSTRAINT "character_usages_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_usages" ADD CONSTRAINT "character_usages_coloringImageId_fkey" FOREIGN KEY ("coloringImageId") REFERENCES "coloring_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;
