import { test, expect } from '@playwright/test';

/**
 * Public homepage smoke (no auth). These were placeholder assertions
 * ("adjust selector based on actual UI") that never matched the real DOM
 * — corrected here to assert things that are actually true and that
 * matter: the page loads, a guest can reach sign-in, the create form is
 * present for guests, and pricing is reachable.
 */

test.describe('Home page (unauthenticated)', () => {
  test('loads with the Chunky Crayon title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Chunky Crayon/i);
  });

  test('exposes a sign-in entry point', async ({ page }) => {
    await page.goto('/');
    // Sign-in is a <Link href="/signin"> in the header (role=link), not
    // a button. A guest must always have a visible path to authenticate.
    await expect(page.locator('a[href$="/signin"]').first()).toBeVisible();
  });

  test('shows the create form to guests', async ({ page }) => {
    await page.goto('/');
    // Guests can start a creation (subject to the free-tries limit) — the
    // prompt box must be on the homepage, not gated behind auth.
    await expect(page.getByTestId('create-prompt')).toBeVisible();
  });

  test('pricing page is reachable', async ({ page }) => {
    const res = await page.goto('/pricing');
    expect(res?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/pricing/);
  });
});
