import { defineConfig } from 'vitest/config';

/**
 * Vitest config for @one-colored-pixel/stripe-shared.
 *
 * This package holds the money math (credit proration, Stripe status
 * mapping, billing-period day counts). It is pure, dependency-light, and
 * shared by every brand's checkout — exactly the kind of code that must
 * never silently regress. Node environment, no DOM.
 *
 * Tests import from ./src/* directly; Vitest transpiles TS so there is no
 * need to build dist/ first.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
    },
  },
});
