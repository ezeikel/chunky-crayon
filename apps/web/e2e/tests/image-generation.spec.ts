import { test, expect } from '../fixtures/auth';
import { getUserCredits, setUserCredits, TEST_USER, TEST_USER_NO_CREDITS } from '../fixtures/db';

/**
 * Image Generation - Happy Path Tests
 *
 * Core feature tests for the coloring page generation pipeline:
 * - Text input generation
 * - Credit deduction
 * - Generation success flow
 * - No credits handling
 *
 * Note: These tests interact with real AI services and may take 30-60s each.
 * Consider mocking AI responses for faster CI runs.
 */

test.describe('Image Generation Form', () => {
  test('should display generation form on homepage', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');

    // Look for the creation form
    const form = authenticatedPage.locator('form, [data-testid="create-form"]');
    const textInput = authenticatedPage.locator('textarea, input[type="text"]');

    await expect(form.first()).toBeVisible();
    await expect(textInput.first()).toBeVisible();
  });

  test('should display credit balance', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');

    // Look for credits display
    const creditsDisplay = authenticatedPage.locator('[data-testid="credits"], .credits');
    const creditsText = authenticatedPage.getByText(/credits?/i);

    const hasCredits = await creditsDisplay.first().isVisible().catch(() => false)
      || await creditsText.first().isVisible().catch(() => false);

    expect(hasCredits).toBe(true);
  });

  test('should accept text input for generation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');

    // Find and fill the text input
    const textInput = authenticatedPage.locator('textarea, input[type="text"]').first();
    await textInput.fill('A happy dragon playing with butterflies');

    // Verify input was accepted
    await expect(textInput).toHaveValue(/dragon/i);
  });
});

test.describe('Image Generation - With Credits', () => {
  test.beforeEach(async () => {
    // Ensure user has enough credits before each test
    await setUserCredits(TEST_USER.id, 100);
  });

  test('should generate image successfully', async ({ authenticatedPage }) => {
    // Set a longer timeout for AI generation
    test.setTimeout(120000);

    await authenticatedPage.goto('/');

    // Fill in the description
    const textInput = authenticatedPage.locator('textarea, input[type="text"]').first();
    await textInput.fill('A cute cat sleeping on a pillow');

    // Submit the form
    const submitButton = authenticatedPage.getByRole('button', { name: /create|generate|submit/i });
    await submitButton.click();

    // Wait for generation to complete (look for success indicators)
    // This could be a redirect to the coloring page, a success message, or the image appearing
    await authenticatedPage.waitForURL(/coloring-image\/|studio/, { timeout: 90000 }).catch(() => {
      // If no redirect, look for the generated image on the page
    });

    // Verify generation completed
    const generatedImage = authenticatedPage.locator('img[alt*="coloring"], svg, [data-testid="coloring-image"]');
    const successMessage = authenticatedPage.getByText(/created|generated|success/i);

    const hasImage = await generatedImage.first().isVisible({ timeout: 10000 }).catch(() => false);
    const hasSuccess = await successMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasImage || hasSuccess).toBe(true);
  });

  test('should deduct credits after generation', async ({ authenticatedPage }) => {
    test.setTimeout(120000);

    // Get initial credits
    const initialCredits = await getUserCredits(TEST_USER.id);

    await authenticatedPage.goto('/');

    // Generate an image
    const textInput = authenticatedPage.locator('textarea, input[type="text"]').first();
    await textInput.fill('A rainbow over a castle');

    const submitButton = authenticatedPage.getByRole('button', { name: /create|generate|submit/i });
    await submitButton.click();

    // Wait for generation to complete
    await authenticatedPage.waitForTimeout(60000); // Give time for generation

    // Check credits were deducted
    const finalCredits = await getUserCredits(TEST_USER.id);

    // Credits should be less (typically 5 credits per generation)
    expect(finalCredits).toBeLessThan(initialCredits);
  });

  test('should show loading state during generation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');

    const textInput = authenticatedPage.locator('textarea, input[type="text"]').first();
    await textInput.fill('A magical unicorn in a forest');

    const submitButton = authenticatedPage.getByRole('button', { name: /create|generate|submit/i });
    await submitButton.click();

    // Check for loading indicators
    const loadingSpinner = authenticatedPage.locator('[data-testid="loading"], .loading, .spinner');
    const loadingText = authenticatedPage.getByText(/generating|creating|loading|please wait/i);
    const disabledButton = authenticatedPage.getByRole('button', { disabled: true });

    const hasLoadingState = await loadingSpinner.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await loadingText.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await disabledButton.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasLoadingState).toBe(true);
  });
});

test.describe('Image Generation - No Credits', () => {
  test('should show insufficient credits message', async ({ noCreditPage }) => {
    await noCreditPage.goto('/');

    // Try to generate without credits
    const textInput = noCreditPage.locator('textarea, input[type="text"]').first();
    await textInput.fill('A pirate ship on the ocean');

    const submitButton = noCreditPage.getByRole('button', { name: /create|generate|submit/i });

    // Button might be disabled or clicking shows error
    const isDisabled = await submitButton.isDisabled().catch(() => false);

    if (!isDisabled) {
      await submitButton.click();

      // Look for error message about credits
      const errorMessage = noCreditPage.getByText(/credits?|insufficient|purchase|buy|upgrade/i);
      await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
    } else {
      // Button is disabled - that's also valid behavior
      expect(isDisabled).toBe(true);
    }
  });

  test('should show link to purchase credits', async ({ noCreditPage }) => {
    await noCreditPage.goto('/');

    // Look for buy/purchase credits link
    const purchaseLink = noCreditPage.getByRole('link', { name: /buy|purchase|get credits|upgrade/i });
    const pricingLink = noCreditPage.getByRole('link', { name: /pricing/i });

    const hasPurchaseOption = await purchaseLink.first().isVisible().catch(() => false)
      || await pricingLink.first().isVisible().catch(() => false);

    // Should provide a way to get more credits
    expect(hasPurchaseOption).toBe(true);
  });
});

test.describe('Studio/Editor Page', () => {
  test('should load studio page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/studio');

    await expect(authenticatedPage.locator('main')).toBeVisible();
  });

  test('should display generation tools', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/studio');

    // Look for creation tools
    const tools = authenticatedPage.locator('[data-testid="tools"], .tools, form');
    await expect(tools.first()).toBeVisible();
  });
});
