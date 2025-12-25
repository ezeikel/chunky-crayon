/**
 * Backfill script to create default profiles for existing users who don't have any.
 *
 * Run locally:
 *   pnpm tsx scripts/backfill-profiles.ts
 *
 * Or via GitHub Action (workflow_dispatch)
 */

import { db, AgeGroup, Difficulty } from "../src";

const DEFAULT_AVATAR_ID = "crayon-orange";

async function backfillProfiles() {
  console.log("🔍 Finding users without profiles...");

  // Find all users who have no profiles
  const usersWithoutProfiles = await db.user.findMany({
    where: {
      profiles: {
        none: {},
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  console.log(`📊 Found ${usersWithoutProfiles.length} users without profiles`);

  if (usersWithoutProfiles.length === 0) {
    console.log("✅ All users already have profiles. Nothing to do.");
    return;
  }

  let created = 0;
  let failed = 0;

  for (const user of usersWithoutProfiles) {
    try {
      // Create a default profile for the user
      const profileName = user.name?.split(" ")[0] || "My Profile";

      const profile = await db.profile.create({
        data: {
          userId: user.id,
          name: profileName,
          avatarId: DEFAULT_AVATAR_ID,
          ageGroup: AgeGroup.CHILD,
          difficulty: Difficulty.BEGINNER,
          isDefault: true,
        },
      });

      // Set this as the active profile
      await db.user.update({
        where: { id: user.id },
        data: { activeProfileId: profile.id },
      });

      console.log(`  ✅ Created profile "${profileName}" for ${user.email}`);
      created++;
    } catch (error) {
      console.error(`  ❌ Failed to create profile for ${user.email}:`, error);
      failed++;
    }
  }

  console.log("\n📈 Summary:");
  console.log(`  Created: ${created}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${usersWithoutProfiles.length}`);
}

async function main() {
  console.log("🚀 Starting profile backfill...\n");

  try {
    await backfillProfiles();
    console.log("\n✨ Backfill complete!");
  } catch (error) {
    console.error("\n💥 Backfill failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
