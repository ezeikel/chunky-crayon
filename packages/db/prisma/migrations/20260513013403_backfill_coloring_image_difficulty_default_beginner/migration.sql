-- Backfill existing NULL difficulty values to BEGINNER before adding the
-- NOT NULL constraint. The previous reference set produced beginner-style
-- output regardless of any difficulty tag the row carried, so BEGINNER is
-- the honest default for all pre-existing images.
UPDATE "coloring_images" SET "difficulty" = 'BEGINNER' WHERE "difficulty" IS NULL;

-- Now flip the column to required with the default for future inserts.
ALTER TABLE "coloring_images" ALTER COLUMN "difficulty" SET NOT NULL,
ALTER COLUMN "difficulty" SET DEFAULT 'BEGINNER';
