import { test as setup } from '@playwright/test';
import { createTestUser, createTestProfile, TEST_USER, TEST_USER_NO_CREDITS } from './fixtures/db';

/**
 * Global setup - runs once before all tests
 * Creates test users and profiles in the database
 */
setup('create test users', async () => {
  console.log('🔧 Setting up test users...');

  // Create main test user with credits
  const user = await createTestUser(TEST_USER);
  await createTestProfile(user.id, {
    name: 'Test Child',
    difficulty: 'BEGINNER',
    ageGroup: 'CHILD',
  });
  console.log(`✅ Created test user: ${user.email} (${user.credits} credits)`);

  // Create test user with no credits
  const noCreditsUser = await createTestUser(TEST_USER_NO_CREDITS);
  await createTestProfile(noCreditsUser.id, {
    name: 'No Credits Child',
    difficulty: 'BEGINNER',
    ageGroup: 'CHILD',
  });
  console.log(`✅ Created no-credits user: ${noCreditsUser.email} (${noCreditsUser.credits} credits)`);

  console.log('🎉 Test setup complete!');
});
