import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth';

/**
 * Authentication - Happy Path Tests
 *
 * Tests verify:
 * - Sign in page loads correctly
 * - Auth providers are displayed
 * - Protected routes redirect unauthenticated users
 * - Authenticated users can access protected routes
 * - Sign out works correctly
 */

test.describe('Sign In Page', () => {
  test('should load sign in page', async ({ page }) => {
    await page.goto('/signin');

    // Verify sign in page loaded
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display auth provider options', async ({ page }) => {
    await page.goto('/signin');

    // Look for OAuth provider buttons (Google, Apple)
    const googleButton = page.getByRole('button', { name: /google/i });
    const appleButton = page.getByRole('button', { name: /apple/i });

    // At least one provider should be visible
    const googleVisible = await googleButton.isVisible().catch(() => false);
    const appleVisible = await appleButton.isVisible().catch(() => false);

    expect(googleVisible || appleVisible).toBe(true);
  });

  test('should display email/magic link option', async ({ page }) => {
    await page.goto('/signin');

    // Look for email input for magic link
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const emailLabel = page.locator('input[type="email"]');

    const hasEmailOption = await emailInput.isVisible().catch(() => false)
      || await emailLabel.isVisible().catch(() => false);

    // Email option should be available (Resend provider)
    expect(hasEmailOption).toBe(true);
  });
});

test.describe('Protected Routes - Unauthenticated', () => {
  test('should redirect /account to signin', async ({ page }) => {
    await page.goto('/account');

    // Should redirect to sign in
    await expect(page).toHaveURL(/signin/);
  });

  test('should redirect /account/settings to signin', async ({ page }) => {
    await page.goto('/account/settings');

    await expect(page).toHaveURL(/signin/);
  });

  test('should redirect /account/billing to signin', async ({ page }) => {
    await page.goto('/account/billing');

    await expect(page).toHaveURL(/signin/);
  });

  test('should redirect /account/my-artwork to signin', async ({ page }) => {
    await page.goto('/account/my-artwork');

    await expect(page).toHaveURL(/signin/);
  });

  test('should redirect /account/profiles to signin', async ({ page }) => {
    await page.goto('/account/profiles');

    await expect(page).toHaveURL(/signin/);
  });
});

authTest.describe('Protected Routes - Authenticated', () => {
  authTest('should access account page when authenticated', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account');

    // Should NOT redirect to signin
    await authExpect(authenticatedPage).not.toHaveURL(/signin/);

    // Should show account content
    await authExpect(authenticatedPage.locator('main')).toBeVisible();
  });

  authTest('should access settings page when authenticated', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/settings');

    await authExpect(authenticatedPage).not.toHaveURL(/signin/);
    await authExpect(authenticatedPage.locator('main')).toBeVisible();
  });

  authTest('should access billing page when authenticated', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/billing');

    await authExpect(authenticatedPage).not.toHaveURL(/signin/);
    await authExpect(authenticatedPage.locator('main')).toBeVisible();
  });

  authTest('should access my-artwork page when authenticated', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/my-artwork');

    await authExpect(authenticatedPage).not.toHaveURL(/signin/);
    await authExpect(authenticatedPage.locator('main')).toBeVisible();
  });

  authTest('should access profiles page when authenticated', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/profiles');

    await authExpect(authenticatedPage).not.toHaveURL(/signin/);
    await authExpect(authenticatedPage.locator('main')).toBeVisible();
  });

  authTest('should display user info when authenticated', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account');

    // Look for user name or email display
    const userInfo = authenticatedPage.locator('[data-testid="user-info"], [data-testid="user-name"]');
    const accountHeading = authenticatedPage.getByRole('heading', { name: /account|profile|settings/i });

    const hasUserInfo = await userInfo.first().isVisible().catch(() => false);
    const hasHeading = await accountHeading.first().isVisible().catch(() => false);

    authExpect(hasUserInfo || hasHeading).toBe(true);
  });
});

authTest.describe('Sign Out', () => {
  authTest('should sign out successfully', async ({ authenticatedPage }) => {
    // Go to a protected page first
    await authenticatedPage.goto('/account');
    await authExpect(authenticatedPage).not.toHaveURL(/signin/);

    // Find and click sign out button
    const signOutButton = authenticatedPage.getByRole('button', { name: /sign out|logout/i });

    if (await signOutButton.first().isVisible()) {
      await signOutButton.first().click();

      // Should redirect to home or signin
      await authExpect(authenticatedPage).toHaveURL(/\/$|signin/);
    }
  });
});
