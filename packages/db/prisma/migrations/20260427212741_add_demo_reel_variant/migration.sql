-- CreateEnum
CREATE TYPE "DemoReelVariant" AS ENUM ('TEXT', 'IMAGE', 'VOICE');

-- AlterTable
ALTER TABLE "coloring_images" ADD COLUMN     "demoReelVariant" "DemoReelVariant";
