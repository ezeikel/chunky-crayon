/*
  Warnings:

  - The values [WEEKLY,MONTHLY] on the enum `GenerationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "GenerationType_new" AS ENUM ('USER', 'DAILY', 'SYSTEM');
ALTER TABLE "public"."coloring_images" ALTER COLUMN "generationType" DROP DEFAULT;
ALTER TABLE "coloring_images" ALTER COLUMN "generationType" TYPE "GenerationType_new" USING ("generationType"::text::"GenerationType_new");
ALTER TYPE "GenerationType" RENAME TO "GenerationType_old";
ALTER TYPE "GenerationType_new" RENAME TO "GenerationType";
DROP TYPE "public"."GenerationType_old";
ALTER TABLE "coloring_images" ALTER COLUMN "generationType" SET DEFAULT 'USER';
COMMIT;
