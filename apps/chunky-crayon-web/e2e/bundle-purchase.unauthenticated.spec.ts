import { test, expect } from '@playwright/test';

/**
 * Revenue path: a guest can browse a digital bundle and start checkout.
 *
 * Bundles are the one-off-purchase revenue line (guest pays via Stripe
 * Checkout with just an email — the path the bundle-download JWT unit
 * tests also cover). This spec verifies the storefront → product →
 * checkout-initiation chain without completing a payment.
 *
 * Resilience: `/products/digital` is gated by the `bundles-shop` feature
 * flag and calls notFound() when off, and the test DB may have zero
 * published bundles. Both are environment facts, not regressions, so the
 * test skips (not fails) in those cases. When bundles ARE live, a broken
 * buy button IS a regression and the test fails loudly.
 */

test.describe('Bundle purchase (unauthenticated)', () => {
  test('storefront → product page → checkout initiation', async ({ page }) => {
    const res = await page.goto('/products/digital');

    test.skip(
      (res?.status() ?? 404) === 404,
      'bundles-shop flag off in this environment — nothing to test',
    );

    // Must require a slug segment AFTER /products/digital/ — the
    // storefront has a self-referential link to /products/digital
    // itself, which a bare `*="/products/digital/"` would wrongly match.
    const bundleLink = page
      .locator('a[href*="/products/digital/"]:not([href$="/products/digital"])')
      .first();

    const hasBundle = await bundleLink.isVisible().catch(() => false);
    test.skip(!hasBundle, 'no published bundles seeded in this environment');

    await bundleLink.click();
    await expect(page).toHaveURL(/\/products\/digital\/[^/]+$/);

    // Product page must show a price and the buy CTA.
    await expect(page.getByText(/[£$]\s?\d/).first()).toBeVisible();
    const buy = page.getByRole('button', { name: /buy now/i }).first();
    await expect(buy).toBeVisible();

    // Block the real Stripe hop so no session is paid; assert the buy
    // path initiates checkout (server action POST or Stripe redirect).
    let checkoutInitiated = false;
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      const req = route.request();
      if (
        url.includes('checkout.stripe.com') ||
        url.includes('js.stripe.com') ||
        (req.method() === 'POST' && req.headers()['next-action'] !== undefined)
      ) {
        checkoutInitiated = true;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await buy.click();
    await expect.poll(() => checkoutInitiated, { timeout: 8000 }).toBe(true);
  });
});
