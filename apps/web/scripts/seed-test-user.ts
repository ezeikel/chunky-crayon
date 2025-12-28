#!/usr/bin/env npx tsx

/**
 * Seed Test User Script
 *
 * Creates a test user and session for Playwright E2E testing.
 * This bypasses OAuth/magic link authentication by directly creating
 * database records that NextAuth will recognize.
 *
 * Usage:
 *   pnpm tsx scripts/seed-test-user.ts
 *   pnpm tsx scripts/seed-test-user.ts --clean  # Remove test user
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local BEFORE importing db
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Known test session token - use this in Playwright tests
export const TEST_SESSION_TOKEN = 'playwright-test-session-token-chunkycrayon';
export const TEST_USER_EMAIL = 'playwright-test@chunkycrayon.com';

async function getDb() {
  // Dynamic import after env is loaded
  const { db } = await import('@chunky-crayon/db');
  return db;
}

async function seedTestUser(): Promise<void> {
  const db = await getDb();
  console.log('Seeding test user for Playwright...\n');

  // Create or update test user
  const user = await db.user.upsert({
    where: { email: TEST_USER_EMAIL },
    update: {
      name: 'Playwright Test User',
      credits: 100,
      emailVerified: new Date(),
    },
    create: {
      email: TEST_USER_EMAIL,
      name: 'Playwright Test User',
      credits: 100,
      emailVerified: new Date(),
    },
  });

  console.log(`User: ${user.email} (id: ${user.id})`);

  // Create a valid session that expires in 30 days
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const session = await db.session.upsert({
    where: { sessionToken: TEST_SESSION_TOKEN },
    update: { expires },
    create: {
      sessionToken: TEST_SESSION_TOKEN,
      userId: user.id,
      expires,
    },
  });

  console.log(`Session: ${session.sessionToken.substring(0, 20)}...`);
  console.log(`Expires: ${session.expires.toISOString()}`);

  // Create a default profile for the test user
  const existingProfile = await db.profile.findFirst({
    where: { userId: user.id, isDefault: true },
  });

  if (!existingProfile) {
    const profile = await db.profile.create({
      data: {
        userId: user.id,
        name: 'Test Child',
        avatarId: 'default',
        ageGroup: 'CHILD',
        difficulty: 'BEGINNER',
        isDefault: true,
      },
    });
    console.log(`Profile: ${profile.name} (id: ${profile.id})`);

    // Set as active profile
    await db.user.update({
      where: { id: user.id },
      data: { activeProfileId: profile.id },
    });
  } else {
    console.log(`Profile: ${existingProfile.name} (already exists)`);
  }

  console.log('\nTest user seeded successfully!');
  console.log('\nUse this session token in Playwright tests:');
  console.log(`  ${TEST_SESSION_TOKEN}`);
}

async function cleanTestUser(): Promise<void> {
  const db = await getDb();
  console.log('Cleaning up test user...\n');

  const user = await db.user.findUnique({
    where: { email: TEST_USER_EMAIL },
  });

  if (!user) {
    console.log('Test user not found, nothing to clean.');
    return;
  }

  // Delete session first (cascade should handle this, but be explicit)
  await db.session.deleteMany({
    where: { userId: user.id },
  });

  // Delete profiles
  await db.profile.deleteMany({
    where: { userId: user.id },
  });

  // Delete the user
  await db.user.delete({
    where: { id: user.id },
  });

  console.log('Test user cleaned up successfully!');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const clean = args.includes('--clean');
  const db = await getDb();

  try {
    if (clean) {
      await cleanTestUser();
    } else {
      await seedTestUser();
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
