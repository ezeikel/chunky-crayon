-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "unlockedModes" TEXT[] DEFAULT ARRAY[]::TEXT[];
