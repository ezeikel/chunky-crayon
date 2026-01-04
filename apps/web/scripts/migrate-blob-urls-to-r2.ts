/**
 * Migration Script: Vercel Blob URLs → Cloudflare R2 URLs
 *
 * This script updates all blob URLs stored in the database from Vercel Blob
 * format to Cloudflare R2 format.
 *
 * Prerequisites:
 * 1. All blobs must already be synced to R2 (use backupVercelBlobsToR2.ts)
 * 2. R2_PUBLIC_URL environment variable must be set
 *
 * Usage:
 *   # Dry run (preview changes without applying)
 *   pnpm tsx apps/web/scripts/migrate-blob-urls-to-r2.ts --dry-run
 *
 *   # Apply changes
 *   pnpm tsx apps/web/scripts/migrate-blob-urls-to-r2.ts
 *
 * Run with dotenv preload:
 *   DOTENV_CONFIG_PATH=apps/web/.env.local pnpm tsx -r dotenv/config apps/web/scripts/migrate-blob-urls-to-r2.ts
 */

import { db } from '@chunky-crayon/db';

const isDryRun = process.argv.includes('--dry-run');
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

if (!R2_PUBLIC_URL) {
  console.error('❌ R2_PUBLIC_URL environment variable is required');
  process.exit(1);
}

// Vercel Blob URL patterns to match
const VERCEL_BLOB_PATTERNS = [
  /https:\/\/[a-z0-9]+\.blob\.vercel-storage\.com\//,
  /https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//,
];

function isVercelBlobUrl(url: string | null): boolean {
  if (!url) return false;
  return VERCEL_BLOB_PATTERNS.some((pattern) => pattern.test(url));
}

function convertToR2Url(vercelUrl: string): string {
  // Extract pathname from Vercel blob URL
  // Format: https://*.blob.vercel-storage.com/pathname
  const url = new URL(vercelUrl);
  const pathname = url.pathname.slice(1); // Remove leading slash

  return `${R2_PUBLIC_URL}/${pathname}`;
}

async function migrateColoringImages() {
  console.log('\n📦 Migrating coloring_images table...\n');

  const images = await db.coloringImage.findMany({
    select: {
      id: true,
      url: true,
      svgUrl: true,
      qrCodeUrl: true,
      ambientSoundUrl: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const image of images) {
    const updates: Record<string, string> = {};

    if (isVercelBlobUrl(image.url)) {
      updates.url = convertToR2Url(image.url!);
    }
    if (isVercelBlobUrl(image.svgUrl)) {
      updates.svgUrl = convertToR2Url(image.svgUrl!);
    }
    if (isVercelBlobUrl(image.qrCodeUrl)) {
      updates.qrCodeUrl = convertToR2Url(image.qrCodeUrl!);
    }
    if (isVercelBlobUrl(image.ambientSoundUrl)) {
      updates.ambientSoundUrl = convertToR2Url(image.ambientSoundUrl!);
    }

    if (Object.keys(updates).length > 0) {
      if (isDryRun) {
        console.log(`[DRY RUN] Would update image ${image.id}:`);
        Object.entries(updates).forEach(([field, newUrl]) => {
          console.log(`  ${field}: ${newUrl}`);
        });
      } else {
        await db.coloringImage.update({
          where: { id: image.id },
          data: updates,
        });
        console.log(`✅ Updated image ${image.id} (${Object.keys(updates).length} fields)`);
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n  Updated: ${updated}, Skipped: ${skipped}`);
  return { updated, skipped };
}

async function migrateSavedArtwork() {
  console.log('\n📦 Migrating saved_artwork table...\n');

  const artworks = await db.savedArtwork.findMany({
    select: {
      id: true,
      imageUrl: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const artwork of artworks) {
    if (isVercelBlobUrl(artwork.imageUrl)) {
      const newUrl = convertToR2Url(artwork.imageUrl!);

      if (isDryRun) {
        console.log(`[DRY RUN] Would update artwork ${artwork.id}:`);
        console.log(`  imageUrl: ${newUrl}`);
      } else {
        await db.savedArtwork.update({
          where: { id: artwork.id },
          data: { imageUrl: newUrl },
        });
        console.log(`✅ Updated artwork ${artwork.id}`);
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n  Updated: ${updated}, Skipped: ${skipped}`);
  return { updated, skipped };
}

async function main() {
  console.log('🚀 Migrating blob URLs from Vercel to Cloudflare R2\n');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes will be made)' : '⚡ LIVE'}`);
  console.log(`R2 Public URL: ${R2_PUBLIC_URL}\n`);

  const coloringResults = await migrateColoringImages();
  const artworkResults = await migrateSavedArtwork();

  console.log('\n📊 Migration Summary:');
  console.log('─'.repeat(40));
  console.log(`Coloring Images: ${coloringResults.updated} updated, ${coloringResults.skipped} skipped`);
  console.log(`Saved Artwork: ${artworkResults.updated} updated, ${artworkResults.skipped} skipped`);
  console.log('─'.repeat(40));
  console.log(`Total Updated: ${coloringResults.updated + artworkResults.updated}`);

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Migration complete!');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
