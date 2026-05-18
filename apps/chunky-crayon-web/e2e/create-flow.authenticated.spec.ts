import { test, expect } from '@playwright/test';

/**
 * THE crucial path: a logged-in user can reach the create form, type a
 * prompt, and the "make my page" CTA is live.
 *
 * Deliberately does NOT click submit. Submitting calls the
 * `createPendingColoringImage` server action, which debits a credit and
 * kicks a real GPT Image generation on the worker — minutes of latency
 * and real OpenAI spend on every CI run. The revenue-relevant regressions
 * this guards against are "the form vanished / the prompt box broke / the
 * CTA is permanently disabled / the wrong action is wired" — all visible
 * without paying for an image. The actual generation pipeline is covered
 * by unit tests on the pure pieces and by manual/staging QA, not by a
 * paid e2e on every push.
 */

test.describe('Create flow (authenticated)', () => {
  test('prompt box is present, editable, and the create CTA enables', async ({
    page,
  }) => {
    await page.goto('/');

    const prompt = page.getByTestId('create-prompt');
    await expect(prompt).toBeVisible();
    // A seeded, credited test user must NOT see a disabled prompt.
    await expect(prompt).toBeEnabled();

    await prompt.fill('a friendly dinosaur having a tea party');
    await expect(prompt).toHaveValue('a friendly dinosaur having a tea party');

    const submit = page.getByTestId('create-submit');
    await expect(submit).toBeVisible();
    await expect(submit).toBeEnabled();
  });

  test('the create form posts to a server action (not a dead form)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('create-prompt').fill('a rocket ship');

    // Arm the assertion BEFORE clicking, then cancel the request so we
    // verify the wiring without actually spending a generation. A server
    // action is a POST to the current route carrying the Next-Action
    // header; if the form were dead this request would never fire.
    let sawServerAction = false;
    await page.route('**/*', async (route) => {
      const req = route.request();
      const isServerAction =
        req.method() === 'POST' &&
        (req.headers()['next-action'] !== undefined ||
          (req.headers()['content-type'] ?? '').includes('multipart'));
      if (isServerAction) {
        sawServerAction = true;
        await route.abort(); // never let the paid generation start
        return;
      }
      await route.continue();
    });

    await page.getByTestId('create-submit').click();
    await expect.poll(() => sawServerAction, { timeout: 5000 }).toBe(true);
  });
});
