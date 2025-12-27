import { db } from '@chunky-crayon/db';

/**
 * Test user configuration
 */
export const TEST_USER = {
  id: 'test-user-e2e-001',
  email: 'e2e-test@chunkycrayon.com',
  name: 'E2E Test User',
  credits: 100,
} as const;

export const TEST_USER_NO_CREDITS = {
  id: 'test-user-e2e-002',
  email: 'e2e-nocredits@chunkycrayon.com',
  name: 'E2E No Credits User',
  credits: 0,
} as const;

/**
 * Create or update a test user in the database
 */
export async function createTestUser(
  userData: typeof TEST_USER | typeof TEST_USER_NO_CREDITS = TEST_USER,
) {
  return db.user.upsert({
    where: { id: userData.id },
    update: {
      email: userData.email,
      name: userData.name,
      credits: userData.credits,
      emailVerified: new Date(),
    },
    create: {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      credits: userData.credits,
      emailVerified: new Date(),
    },
  });
}

/**
 * Create a database session for the test user
 * Returns the session token to be set as a cookie
 */
export async function createTestSession(userId: string): Promise<string> {
  const sessionToken = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Delete any existing sessions for this user
  await db.session.deleteMany({
    where: { userId },
  });

  // Create new session
  await db.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return sessionToken;
}

/**
 * Create a test profile for the user
 */
export async function createTestProfile(userId: string, profileData?: Partial<{
  name: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  ageGroup: 'TODDLER' | 'CHILD' | 'TWEEN' | 'TEEN' | 'ADULT';
}>) {
  const profile = await db.profile.create({
    data: {
      userId,
      name: profileData?.name ?? 'Test Profile',
      difficulty: profileData?.difficulty ?? 'BEGINNER',
      ageGroup: profileData?.ageGroup ?? 'CHILD',
      isDefault: true,
    },
  });

  // Set as active profile
  await db.user.update({
    where: { id: userId },
    data: { activeProfileId: profile.id },
  });

  return profile;
}

/**
 * Clean up test data after tests
 */
export async function cleanupTestUser(userId: string) {
  // Delete in correct order due to foreign keys
  await db.session.deleteMany({ where: { userId } });
  await db.savedArtwork.deleteMany({ where: { userId } });
  await db.coloringImage.deleteMany({ where: { userId } });
  await db.creditTransaction.deleteMany({ where: { userId } });
  await db.profile.deleteMany({ where: { userId } });
  await db.account.deleteMany({ where: { userId } });
  await db.user.deleteMany({ where: { id: userId } });
}

/**
 * Reset user credits to a specific amount
 */
export async function setUserCredits(userId: string, credits: number) {
  return db.user.update({
    where: { id: userId },
    data: { credits },
  });
}

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return user?.credits ?? 0;
}

/**
 * Create a sample coloring image for testing
 */
export async function createTestColoringImage(userId?: string, profileId?: string) {
  return db.coloringImage.create({
    data: {
      title: 'Test Coloring Image',
      description: 'A test image for e2e testing',
      alt: 'Test coloring page',
      url: 'https://example.com/test-image.webp',
      svgUrl: 'https://example.com/test-image.svg',
      tags: ['test', 'e2e'],
      difficulty: 'BEGINNER',
      generationType: 'USER',
      userId,
      profileId,
    },
  });
}
