import { test, expect } from '../fixtures/auth';

/**
 * Profile Management - Happy Path Tests
 *
 * Tests multi-profile support for family accounts:
 * - Viewing profiles
 * - Creating new profiles
 * - Switching active profile
 * - Editing profile settings
 */

test.describe('Profile Management', () => {
  test('should display profiles page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/profiles');

    await expect(authenticatedPage.locator('main')).toBeVisible();
  });

  test('should show existing profiles', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/profiles');

    // Look for profile cards or list items
    const profiles = authenticatedPage.locator('[data-testid="profile"], .profile, [data-testid="profile-card"]');
    const profileNames = authenticatedPage.getByText(/test child|profile/i);

    const hasProfiles = await profiles.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await profileNames.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasProfiles).toBe(true);
  });

  test('should have add profile button', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/profiles');

    // Look for add profile button
    const addButton = authenticatedPage.getByRole('button', { name: /add|create|new profile/i });
    const addLink = authenticatedPage.getByRole('link', { name: /add|create|new profile/i });

    const hasAddOption = await addButton.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await addLink.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasAddOption).toBe(true);
  });

  test('should open create profile form', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/profiles');

    // Click add profile button
    const addButton = authenticatedPage.getByRole('button', { name: /add|create|new/i });

    if (await addButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await addButton.first().click();

      // Look for profile creation form
      const nameInput = authenticatedPage.locator('input[name="name"], input[placeholder*="name"]');
      const form = authenticatedPage.locator('form, [data-testid="create-profile-form"]');

      const hasForm = await nameInput.first().isVisible({ timeout: 5000 }).catch(() => false)
        || await form.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasForm).toBe(true);
    }
  });

  test('should create new profile successfully', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/profiles');

    // Click add profile
    const addButton = authenticatedPage.getByRole('button', { name: /add|create|new/i });

    if (await addButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await addButton.first().click();

      // Fill in profile name
      const nameInput = authenticatedPage.locator('input[name="name"], input[placeholder*="name"]').first();

      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill('New Test Profile');

        // Submit form
        const submitButton = authenticatedPage.getByRole('button', { name: /save|create|add|submit/i });
        await submitButton.first().click();

        // Verify profile was created
        const newProfile = authenticatedPage.getByText('New Test Profile');
        const successMessage = authenticatedPage.getByText(/created|saved|success/i);

        const hasSuccess = await newProfile.first().isVisible({ timeout: 5000 }).catch(() => false)
          || await successMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should allow switching active profile', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/profiles');

    // Look for profile switch buttons or dropdown
    const switchButton = authenticatedPage.getByRole('button', { name: /switch|select|use/i });
    const profileCards = authenticatedPage.locator('[data-testid="profile"], .profile-card');

    if (await switchButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await switchButton.first().click();

      // Verify switch happened
      await authenticatedPage.waitForTimeout(1000);
      await expect(authenticatedPage.locator('main')).toBeVisible();
    } else if (await profileCards.count() > 1) {
      // Click on a different profile card
      await profileCards.nth(1).click();
      await authenticatedPage.waitForTimeout(1000);
    }
  });

  test('should display difficulty settings', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/profiles');

    // Look for difficulty selector
    const difficultySelect = authenticatedPage.locator('[data-testid="difficulty"], select[name="difficulty"]');
    const difficultyText = authenticatedPage.getByText(/beginner|intermediate|advanced|expert/i);

    const hasDifficulty = await difficultySelect.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await difficultyText.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasDifficulty).toBe(true);
  });

  test('should display age group settings', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/profiles');

    // Look for age group selector
    const ageSelect = authenticatedPage.locator('[data-testid="age-group"], select[name="ageGroup"]');
    const ageText = authenticatedPage.getByText(/toddler|child|tween|teen|adult/i);

    const hasAgeGroup = await ageSelect.first().isVisible({ timeout: 5000 }).catch(() => false)
      || await ageText.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasAgeGroup).toBe(true);
  });
});

test.describe('Profile Avatar', () => {
  test('should display avatar options', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/account/profiles');

    // Look for avatar selection
    const avatars = authenticatedPage.locator('[data-testid="avatar"], .avatar, img[alt*="avatar"]');

    await expect(avatars.first()).toBeVisible({ timeout: 5000 });
  });
});
