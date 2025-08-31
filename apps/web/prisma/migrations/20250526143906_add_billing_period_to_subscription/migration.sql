/*
  Warnings:

  - Added the required column `billingPeriod` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "billingPeriod" "BillingPeriod" NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "credits" SET DEFAULT 15;
