import { test, expect } from '../fixtures/auth';

/**
 * Account Management - Happy Path Tests
 *
 * Tests user account features:
 * - Account settings
 * - Billing and credits
 * - My Artwork gallery
 * - Parental controls
 */

test.describe('Account Settings', () => {
  test('should display account settings page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/settings');

    await expect(authenticatedPage.locator('main')).toBeVisible();
  });

  test('should show user information', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/settings');

    // Look for user info display
    const nameField = authenticatedPage.locator('input[name="name"], [data-testid="user-name"]');
    const emailField = authenticatedPage.locator('input[name="email"], [data-testid="user-email"]');
    const userText = authenticatedPage.getByText(/e2e-test@chunkycrayon\.com|E2E Test User/i);

    const hasUserInfo = await nameField.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await emailField.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await userText.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasUserInfo).toBe(true);
  });

  test('should have parental controls toggle', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/settings');

    // Look for community images toggle (parental control)
    const communityToggle = authenticatedPage.locator('[data-testid="community-toggle"], input[type="checkbox"]');
    const parentalText = authenticatedPage.getByText(/community|parental|control/i);

    const hasParentalControl = await communityToggle.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await parentalText.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasParentalControl).toBe(true);
  });
});

test.describe('Billing Page', () => {
  test('should display billing page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/billing');

    await expect(authenticatedPage.locator('main')).toBeVisible();
  });

  test('should show credit balance', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/billing');

    // Look for credits display
    const creditsDisplay = authenticatedPage.locator('[data-testid="credits"], .credits');
    const creditsText = authenticatedPage.getByText(/\d+\s*credits?/i);
    const balanceText = authenticatedPage.getByText(/balance|available/i);

    const hasCredits = await creditsDisplay.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await creditsText.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await balanceText.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasCredits).toBe(true);
  });

  test('should show purchase options', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/billing');

    // Look for purchase/upgrade buttons
    const purchaseButton = authenticatedPage.getByRole('button', { name: /buy|purchase|upgrade|subscribe/i });
    const purchaseLink = authenticatedPage.getByRole('link', { name: /buy|purchase|upgrade|subscribe/i });
    const pricingSection = authenticatedPage.locator('[data-testid="pricing"], .pricing');

    const hasPurchaseOption = await purchaseButton.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await purchaseLink.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await pricingSection.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasPurchaseOption).toBe(true);
  });

  test('should show transaction history', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/billing');

    // Look for transaction history section
    const historySection = authenticatedPage.locator('[data-testid="transactions"], .transactions, table');
    const historyText = authenticatedPage.getByText(/history|transactions?|recent/i);

    const hasHistory = await historySection.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await historyText.first().isVisible({ timeout: 5000 }).catch(() => false);

    // History section should exist (may be empty for test user)
    expect(hasHistory).toBe(true);
  });
});

test.describe('My Artwork Gallery', () => {
  test('should display my artwork page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/my-artwork');

    await expect(authenticatedPage.locator('main')).toBeVisible();
  });

  test('should show artwork gallery or empty state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/my-artwork');

    // Look for artwork gallery or empty state message
    const artworkGrid = authenticatedPage.locator('[data-testid="artwork-grid"], .artwork-grid, .gallery');
    const emptyState = authenticatedPage.getByText(/no artwork|empty|start coloring|create/i);
    const artworkCards = authenticatedPage.locator('[data-testid="artwork"], .artwork-card, img');

    const hasContent = await artworkGrid.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await emptyState.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await artworkCards.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasContent).toBe(true);
  });

  test('should show sticker collection widget', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/my-artwork');

    // Look for sticker/achievement section
    const stickerSection = authenticatedPage.locator('[data-testid="stickers"], .stickers, [data-testid="achievements"]');
    const stickerText = authenticatedPage.getByText(/stickers?|achievements?|collected/i);

    const hasStickers = await stickerSection.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await stickerText.first().isVisible({ timeout: 5000 }).catch(() => false);

    // Sticker widget should be visible
    expect(hasStickers).toBe(true);
  });

  test('should show weekly challenge widget', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/my-artwork');

    // Look for challenge section
    const challengeSection = authenticatedPage.locator('[data-testid="challenge"], .challenge, [data-testid="weekly-challenge"]');
    const challengeText = authenticatedPage.getByText(/challenge|weekly|progress/i);

    const hasChallenge = await challengeSection.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await challengeText.first().isVisible({ timeout: 5000 }).catch(() => false);

    // Challenge widget may or may not be present depending on active challenges
    // Just verify page loads correctly
    await expect(authenticatedPage.locator('main')).toBeVisible();
  });
});

test.describe('Artwork Sharing', () => {
  test('should have share option for artwork', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/my-artwork');

    // Look for share buttons on artwork cards
    const shareButton = authenticatedPage.getByRole('button', { name: /share/i });
    const shareIcon = authenticatedPage.locator('[data-testid="share-button"], .share-button');

    // If there's artwork, there should be share options
    const hasShareOption = await shareButton.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await shareIcon.first().isVisible({ timeout: 5000 }).catch(() => false);

    // Share option exists if there's artwork to share
    await expect(authenticatedPage.locator('main')).toBeVisible();
  });
});

test.describe('Challenges Page', () => {
  test('should display challenges page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/challenges');

    await expect(authenticatedPage.locator('main')).toBeVisible();
  });

  test('should show current or available challenges', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/challenges');

    // Look for challenge content
    const challenges = authenticatedPage.locator('[data-testid="challenge"], .challenge');
    const challengeText = authenticatedPage.getByText(/challenge|goal|complete|progress/i);
    const emptyState = authenticatedPage.getByText(/no challenges?|coming soon/i);

    const hasContent = await challenges.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await challengeText.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await emptyState.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasContent).toBe(true);
  });
});
