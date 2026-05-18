import { test, expect } from '@playwright/test';

/**
 * Revenue path: the pricing page renders the three plans with a price and
 * a working CTA, and clicking it initiates Stripe Checkout.
 *
 * We never complete a payment. The CTA calls the `createCheckoutSession`
 * server action and then `stripe.redirectToCheckout`. We block the
 * redirect to checkout.stripe.com so no real session is paid — the
 * assertion is "checkout was initiated", which is the regression that
 * actually costs money if it breaks (a dead Subscribe button = zero
 * conversions and you won't notice from the homepage).
 */

test.describe('Pricing & checkout (unauthenticated)', () => {
  test('pricing page renders the three plans with prices', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/\/pricing/);

    // Plan names are stable product copy (Splash / Rainbow / Sparkle).
    for (const plan of ['Splash', 'Rainbow', 'Sparkle']) {
      await expect(page.getByText(plan, { exact: true }).first()).toBeVisible();
    }

    // A currency amount must be on the page — GBP default, USD for US.
    await expect(page.getByText(/[£$]\s?\d/).first()).toBeVisible();
  });

  test('a plan CTA initiates Stripe checkout', async ({ page }) => {
    await page.goto('/pricing');

    // Block any navigation/load of the real Stripe checkout host so no
    // session is ever paid, regardless of which mechanism the SDK uses.
    let checkoutInitiated = false;
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (
        url.includes('checkout.stripe.com') ||
        url.includes('js.stripe.com')
      ) {
        checkoutInitiated = true;
        await route.abort();
        return;
      }
      // The server action POST that creates the session also counts as
      // "checkout initiated" — it's the first irreversible step.
      const req = route.request();
      if (
        req.method() === 'POST' &&
        req.headers()['next-action'] !== undefined
      ) {
        checkoutInitiated = true;
        await route.abort();
        return;
      }
      await route.continue();
    });

    const cta = page
      .getByRole('button', { name: /start 7-day free trial/i })
      .first();
    await expect(cta).toBeVisible();
    await cta.click();

    await expect.poll(() => checkoutInitiated, { timeout: 8000 }).toBe(true);
  });
});
