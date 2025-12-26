-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "coloAccessories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "coloStage" INTEGER NOT NULL DEFAULT 1;
