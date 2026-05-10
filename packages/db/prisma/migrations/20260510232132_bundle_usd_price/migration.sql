/*
  Warnings:

  - A unique constraint covering the columns `[stripePriceIdUsd]` on the table `bundles` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bundles" ADD COLUMN     "pricePenceUsd" INTEGER,
ADD COLUMN     "stripePriceIdUsd" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bundles_stripePriceIdUsd_key" ON "bundles"("stripePriceIdUsd");
