import { defineConfig } from 'vitest/config';

/**
 * Vitest config for @one-colored-pixel/coloring-core.
 *
 * This package mixes pure logic (image-quality tier resolution, colour
 * utils, seasonal calendar) with AI-calling code. We only unit-test the
 * pure, deterministic parts — anything that hits an LLM/network belongs in
 * an integration test with explicit mocks, not here. Node environment.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Scope coverage to the pure modules we test today. Widen as we add
      // tests; never include the AI-calling actions/* here.
      include: [
        'src/image-quality.ts',
        'src/utils/color.ts',
        'src/utils/copy.ts',
        'src/scene/seasonal-calendar.ts',
        'src/organic/news/scoring.ts',
        'src/organic/brand-safety.ts',
        'src/organic/shared/article.ts',
      ],
    },
  },
});
