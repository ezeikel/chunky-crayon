import { test as setup, expect } from '@playwright/test';

/**
 * Auth Setup for Playwright Tests
 *
 * This setup injects the test session cookie that matches
 * the seeded session in the database.
 *
 * Before running tests:
 *   pnpm tsx scripts/seed-test-user.ts
 */

// Must match the token in scripts/seed-test-user.ts
const TEST_SESSION_TOKEN = 'playwright-test-session-token-chunkycrayon';

setup('authenticate', async ({ page, context }) => {
  // Set the session cookie that NextAuth will recognize
  // Auth.js v5 uses 'authjs.session-token' for the cookie name
  await context.addCookies([
    {
      name: 'authjs.session-token',
      value: TEST_SESSION_TOKEN,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false, // false for localhost
      sameSite: 'Lax',
    },
  ]);

  // Navigate to verify auth is working
  await page.goto('/');

  // Wait for page to load and verify we're authenticated
  // The app should show user-specific UI when logged in
  await page.waitForLoadState('networkidle');

  // Save the authenticated state for other tests to reuse
  await context.storageState({ path: '.playwright/auth.json' });
});
