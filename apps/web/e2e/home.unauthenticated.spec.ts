import { test, expect } from '@playwright/test';

/**
 * Unauthenticated Tests - Public Pages
 *
 * These tests run without authentication and verify
 * that public pages are accessible and working.
 */

test.describe('Home Page (Unauthenticated)', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Chunky Crayon/i);
  });

  test('should show sign in option', async ({ page }) => {
    await page.goto('/');

    // Look for auth-related UI (adjust selector based on actual UI)
    const signInButton = page.getByRole('button', { name: /sign in|get started/i });
    await expect(signInButton).toBeVisible();
  });

  test('should navigate to pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/pricing/);
  });
});
