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
    // The create form must be on the homepage for guests, not gated behind
    // auth. The default mode is "Build" (Scene); Type/Talk/Photo are
    // parental-gated, so the always-present, ungated proof the form is here is
    // the input-mode selector (role=tablist) with its default "Build" tab.
    // (The Type-mode prompt box `create-prompt` lives behind the parental
    // gate — exercised by the create-flow specs, not this guest smoke.)
    const modeSelector = page.getByRole('tablist', {
      name: /input mode selection/i,
    });
    await expect(modeSelector).toBeVisible();
    await expect(
      modeSelector.getByRole('tab', { name: /build/i }),
    ).toBeVisible();
  });

  test('pricing page is reachable', async ({ page }) => {
    const res = await page.goto('/pricing');
    expect(res?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/pricing/);
  });
});
