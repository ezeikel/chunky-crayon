/*
  Warnings:

  - You are about to drop the `character_outfits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `character_usages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `character_voice_lines` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `characters` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "character_outfits" DROP CONSTRAINT "character_outfits_characterId_fkey";

-- DropForeignKey
ALTER TABLE "character_usages" DROP CONSTRAINT "character_usages_characterId_fkey";

-- DropForeignKey
ALTER TABLE "character_usages" DROP CONSTRAINT "character_usages_coloringImageId_fkey";

-- DropForeignKey
ALTER TABLE "character_voice_lines" DROP CONSTRAINT "character_voice_lines_characterId_fkey";

-- DropForeignKey
ALTER TABLE "characters" DROP CONSTRAINT "characters_equippedOutfitId_fkey";

-- DropForeignKey
ALTER TABLE "characters" DROP CONSTRAINT "characters_profileId_fkey";

-- DropForeignKey
ALTER TABLE "characters" DROP CONSTRAINT "characters_userId_fkey";

-- DropTable
DROP TABLE "character_outfits";

-- DropTable
DROP TABLE "character_usages";

-- DropTable
DROP TABLE "character_voice_lines";

-- DropTable
DROP TABLE "characters";

-- DropEnum
DROP TYPE "CharacterStatus";

-- CreateTable
CREATE TABLE "email_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT,
    "sourceSlug" TEXT,
    "brand" "Brand" NOT NULL DEFAULT 'CHUNKY_CRAYON',
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "welcomeEmailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_subscribers_brand_unsubscribedAt_idx" ON "email_subscribers"("brand", "unsubscribedAt");

-- CreateIndex
CREATE INDEX "email_subscribers_brand_source_idx" ON "email_subscribers"("brand", "source");

-- CreateIndex
CREATE UNIQUE INDEX "email_subscribers_brand_email_key" ON "email_subscribers"("brand", "email");
