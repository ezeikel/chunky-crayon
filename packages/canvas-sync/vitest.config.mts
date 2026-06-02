import { defineConfig } from 'vitest/config';

/**
 * Vitest config for @one-colored-pixel/canvas-sync.
 *
 * The append-merge that resolves web↔mobile coloring-progress conflicts is
 * pure, deterministic, and revenue/correctness-critical: a wrong dedup or a
 * mis-ordered terminal-collapse silently loses a child's coloring work. This
 * is exactly the kind of pure logic the project's testing rule says must ship
 * with its test in the same commit. Node environment — no DOM, no RN.
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
