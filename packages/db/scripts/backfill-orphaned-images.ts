/**
 * Backfill script to assign orphaned coloring images to user's default profile.
 *
 * "Orphaned" images are those with a userId but no profileId - these were created
 * before the profiles feature was added.
 *
 * Run locally:
 *   pnpm tsx scripts/backfill-orphaned-images.ts
 *
 * Or via GitHub Action (workflow_dispatch)
 */

import { db } from "../src";

async function backfillOrphanedImages() {
  console.log(
    "🔍 Finding orphaned coloring images (has userId but no profileId)...",
  );

  // Find all coloring images that have a userId but no profileId
  const orphanedImages = await db.coloringImage.findMany({
    where: {
      userId: { not: null },
      profileId: null,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  console.log(`📊 Found ${orphanedImages.length} orphaned images`);

  if (orphanedImages.length === 0) {
    console.log("✅ No orphaned images found. Nothing to do.");
    return;
  }

  // Group images by userId
  const imagesByUser = orphanedImages.reduce(
    (acc, img) => {
      const userId = img.userId!;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(img.id);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const userIds = Object.keys(imagesByUser);
  console.log(`👥 Images belong to ${userIds.length} users`);

  // Get default profiles for all affected users
  const defaultProfiles = await db.profile.findMany({
    where: {
      userId: { in: userIds },
      isDefault: true,
    },
    select: {
      id: true,
      userId: true,
      name: true,
    },
  });

  console.log(`📋 Found ${defaultProfiles.length} default profiles`);

  // Create a map of userId -> defaultProfileId
  const userToDefaultProfile = defaultProfiles.reduce(
    (acc, profile) => {
      acc[profile.userId] = profile;
      return acc;
    },
    {} as Record<string, { id: string; userId: string; name: string }>,
  );

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const userId of userIds) {
    const imageIds = imagesByUser[userId];
    const defaultProfile = userToDefaultProfile[userId];

    if (!defaultProfile) {
      console.log(
        `  ⚠️ User ${userId} has no default profile - skipping ${imageIds.length} images`,
      );
      skipped += imageIds.length;
      continue;
    }

    try {
      // Batch update all images for this user
      const result = await db.coloringImage.updateMany({
        where: {
          id: { in: imageIds },
        },
        data: {
          profileId: defaultProfile.id,
        },
      });

      console.log(
        `  ✅ Assigned ${result.count} images to profile "${defaultProfile.name}" (user: ${userId})`,
      );
      updated += result.count;
    } catch (error) {
      console.error(`  ❌ Failed to update images for user ${userId}:`, error);
      failed += imageIds.length;
    }
  }

  console.log("\n📈 Summary:");
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (no default profile): ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${orphanedImages.length}`);
}

async function main() {
  console.log("🚀 Starting orphaned images backfill...\n");

  try {
    await backfillOrphanedImages();
    console.log("\n✨ Backfill complete!");
  } catch (error) {
    console.error("\n💥 Backfill failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
