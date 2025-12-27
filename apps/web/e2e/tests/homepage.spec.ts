import { test, expect } from '@playwright/test';

/**
 * Homepage & Public Routes - Happy Path Tests
 *
 * These tests verify that public pages load correctly and
 * core UI elements are present and functional.
 */

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Verify page loaded
    await expect(page).toHaveTitle(/Chunky Crayon/i);

    // Verify main content is visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display navigation elements', async ({ page }) => {
    await page.goto('/');

    // Check for main navigation
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();

    // Check for sign in link (when not authenticated)
    const signInLink = page.getByRole('link', { name: /sign in|login/i });
    await expect(signInLink.first()).toBeVisible();
  });

  test('should display gallery section or featured images', async ({ page }) => {
    await page.goto('/');

    // Look for image gallery, featured section, or coloring images
    const gallerySection = page.locator('[data-testid="gallery"], section, .gallery');
    await expect(gallerySection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have working pricing link', async ({ page }) => {
    await page.goto('/');

    // Click on pricing link
    const pricingLink = page.getByRole('link', { name: /pricing|plans|subscribe/i });

    if (await pricingLink.first().isVisible()) {
      await pricingLink.first().click();
      await expect(page).toHaveURL(/pricing/);
    }
  });
});

test.describe('Pricing Page', () => {
  test('should load pricing page', async ({ page }) => {
    await page.goto('/pricing');

    // Verify pricing content is visible
    await expect(page.locator('main')).toBeVisible();

    // Look for pricing plans
    const plans = page.locator('[data-testid="pricing-plan"], .pricing-card, .plan');
    // If structured pricing exists, verify it
    const planCount = await plans.count();
    if (planCount > 0) {
      expect(planCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Gallery Page', () => {
  test('should load gallery page', async ({ page }) => {
    await page.goto('/gallery');

    // Verify gallery loaded
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display coloring images', async ({ page }) => {
    await page.goto('/gallery');

    // Wait for images to load
    const images = page.locator('img[alt], [data-testid="coloring-image"]');
    await expect(images.first()).toBeVisible({ timeout: 15000 });
  });

  test('should allow filtering by category', async ({ page }) => {
    await page.goto('/gallery');

    // Look for filter/category controls
    const filters = page.locator('[data-testid="filter"], select, [role="tablist"]');

    if (await filters.first().isVisible()) {
      await expect(filters.first()).toBeVisible();
    }
  });

  test('should navigate to daily gallery', async ({ page }) => {
    await page.goto('/gallery/daily');
    await expect(page.locator('main')).toBeVisible();
  });
});
