-- Rename column rather than DROP + ADD. Prisma's auto-generated SQL would
-- have nuked 250+ rows of generated music URLs. RENAME COLUMN is atomic
-- and preserves all data + indexes.
ALTER TABLE "coloring_images" RENAME COLUMN "ambientSoundUrl" TO "backgroundMusicUrl";
