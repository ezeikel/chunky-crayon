-- CreateEnum
CREATE TYPE "Brand" AS ENUM ('CHUNKY_CRAYON', 'COLORING_HABITAT');

-- AlterTable
ALTER TABLE "coloring_images" ADD COLUMN     "brand" "Brand" NOT NULL DEFAULT 'CHUNKY_CRAYON';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "brand" "Brand" NOT NULL DEFAULT 'CHUNKY_CRAYON';

-- AlterTable
ALTER TABLE "weekly_challenges" ADD COLUMN     "brand" "Brand" NOT NULL DEFAULT 'CHUNKY_CRAYON';
