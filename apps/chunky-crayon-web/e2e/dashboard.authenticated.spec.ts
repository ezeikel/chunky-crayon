import { test, expect, type Page } from '@playwright/test';

/**
 * Authenticated smoke — the protected surfaces a logged-in user reaches.
 *
 * The previous version navigated to `/create` and `/settings`, neither of
 * which exists (creation lives on `/`; account settings is
 * `/account/settings`). Those tests passed only because the assertions
 * were too weak to notice the 404. Routes corrected here.
 *
 * `gotoStable` exists because the Next *dev* server compiles a route on
 * first hit (30-40s) and can abort the in-flight navigation
 * (`net::ERR_ABORTED; frame detached`) while it does. That's a dev
 * artifact, not a product bug — but a test that only passes on retry is a
 * bad test. We navigate with `waitUntil: 'commit'` and retry once on the
 * abort, then assert the *final* state (URL + not bounced to sign-in)
 * rather than a single response object. In CI the app is prebuilt so
 * there's no compile and no abort; this just makes local runs honest.
 */

async function gotoStable(page: Page, path: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: 'commit', timeout: 60_000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 60_000 });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 0 && /ERR_ABORTED|frame was detached/.test(msg)) {
        continue; // dev recompiled mid-navigation — try once more
      }
      throw err;
    }
  }
}

test.describe('Authenticated surfaces', () => {
  test('home shows the create form (no redirect to sign-in)', async ({
    page,
  }) => {
    await gotoStable(page, '/');
    await expect(page).not.toHaveURL(/sign-in|login|auth/i);
    // Stable hook on the prompt textarea (TextInput.tsx).
    await expect(page.getByTestId('create-prompt')).toBeVisible();
  });

  test('gallery is reachable', async ({ page }) => {
    await gotoStable(page, '/gallery');
    await expect(page).toHaveURL(/\/gallery/);
    await expect(page).not.toHaveURL(/sign-in|login/i);
  });

  test('account settings is reachable when logged in', async ({ page }) => {
    await gotoStable(page, '/account/settings');
    await expect(page).toHaveURL(/\/account\/settings/);
    await expect(page).not.toHaveURL(/sign-in|login/i);
  });

  test('billing page is reachable when logged in', async ({ page }) => {
    // Billing is revenue-adjacent — a logged-in user must always be able
    // to reach it to manage/cancel a subscription.
    await gotoStable(page, '/account/billing');
    await expect(page).not.toHaveURL(/sign-in|login/i);
  });
});
