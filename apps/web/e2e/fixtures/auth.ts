import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { createTestUser, createTestSession, createTestProfile, TEST_USER, TEST_USER_NO_CREDITS } from './db';

/**
 * Session cookie name used by NextAuth v5
 * In development it's `authjs.session-token`
 * In production with HTTPS it's `__Secure-authjs.session-token`
 */
const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production'
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token';

/**
 * Extended test fixtures for authenticated testing
 */
type AuthFixtures = {
  /** Page with authenticated user (has credits) */
  authenticatedPage: Page;
  /** Page with authenticated user (no credits) */
  noCreditPage: Page;
  /** Context with authentication */
  authenticatedContext: BrowserContext;
};

/**
 * Base test extended with auth fixtures
 *
 * Usage:
 * ```ts
 * import { test, expect } from '../fixtures/auth';
 *
 * test('logged in user can see account page', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/account');
 *   await expect(authenticatedPage.locator('h1')).toContainText('Account');
 * });
 * ```
 */
export const test = base.extend<AuthFixtures>({
  authenticatedContext: async ({ browser }, use) => {
    // Create test user and session in database
    await createTestUser(TEST_USER);
    await createTestProfile(TEST_USER.id);
    const sessionToken = await createTestSession(TEST_USER.id);

    // Create new browser context with session cookie
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await use(context);
    await context.close();
  },

  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
    await page.close();
  },

  noCreditPage: async ({ browser }, use) => {
    // Create user with no credits
    await createTestUser(TEST_USER_NO_CREDITS);
    await createTestProfile(TEST_USER_NO_CREDITS.id);
    const sessionToken = await createTestSession(TEST_USER_NO_CREDITS.id);

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    const page = await context.newPage();
    await use(page);
    await page.close();
    await context.close();
  },
});

/**
 * Helper to manually authenticate a page
 * Useful when you need more control over the test user
 */
export async function authenticatePage(
  page: Page,
  userId: string,
  sessionToken: string,
) {
  await page.context().addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

/**
 * Check if a page has a valid session
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some(c => c.name === SESSION_COOKIE_NAME);
}

export { expect };
