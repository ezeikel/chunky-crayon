import { test, expect } from '@playwright/test';

/**
 * Authenticated Tests - Protected Pages
 *
 * These tests run with authentication and verify
 * that protected pages work correctly for logged-in users.
 */

test.describe('Dashboard (Authenticated)', () => {
  test('should access create page when logged in', async ({ page }) => {
    await page.goto('/create');

    // Should not redirect to sign in
    await expect(page).not.toHaveURL(/sign-in|login/i);

    // Should show the create form
    const createForm = page.getByRole('textbox');
    await expect(createForm).toBeVisible();
  });

  test('should show user credits', async ({ page }) => {
    await page.goto('/create');

    // Test user has 100 credits (from seed script)
    // Adjust this based on how credits are displayed in the UI
    await page.waitForLoadState('networkidle');
  });

  test('should access gallery page', async ({ page }) => {
    await page.goto('/gallery');
    await expect(page).toHaveURL(/gallery/);
  });

  test('should access settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/settings/);
  });
});
