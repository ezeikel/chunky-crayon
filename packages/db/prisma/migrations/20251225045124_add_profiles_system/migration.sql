-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('TODDLER', 'CHILD', 'TWEEN', 'TEEN', 'ADULT');

-- AlterTable
ALTER TABLE "coloring_images" ADD COLUMN     "profileId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeProfileId" TEXT;

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL DEFAULT 'default',
    "ageGroup" "AgeGroup" NOT NULL DEFAULT 'CHILD',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'BEGINNER',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "coloring_images" ADD CONSTRAINT "coloring_images_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
