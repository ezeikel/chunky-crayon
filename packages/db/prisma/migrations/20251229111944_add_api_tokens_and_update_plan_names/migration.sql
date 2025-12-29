/*
  Warnings:

  - The values [CRAYON,MASTERPIECE,STUDIO] on the enum `PlanName` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlanName_new" AS ENUM ('SPLASH', 'RAINBOW', 'SPARKLE');
ALTER TABLE "subscriptions" ALTER COLUMN "planName" TYPE "PlanName_new" USING ("planName"::text::"PlanName_new");
ALTER TYPE "PlanName" RENAME TO "PlanName_old";
ALTER TYPE "PlanName_new" RENAME TO "PlanName";
DROP TYPE "public"."PlanName_old";
COMMIT;

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_provider_key" ON "api_tokens"("provider");
