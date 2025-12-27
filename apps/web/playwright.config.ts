import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Auth Strategy: Database session injection
 * - We create test users and sessions directly in the database
 * - Set the session cookie in the browser context
 * - This avoids OAuth/email flows while testing real auth behavior
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 60000, // Image generation can take up to 45s

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project runs first to create auth state
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // Uncomment for additional browser coverage
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   dependencies: ['setup'],
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   dependencies: ['setup'],
    // },

    // Mobile viewport tests
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    //   dependencies: ['setup'],
    // },
  ],

  // Run server before tests
  // In CI: uses production build (pnpm start), locally: uses dev server (pnpm dev)
  webServer: {
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
