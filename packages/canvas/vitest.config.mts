import { defineConfig } from 'vitest/config';

/**
 * Vitest config for @one-colored-pixel/canvas.
 *
 * Canvas algorithms (colour maths, region detection, fill geometry) are
 * deterministic and pure — a wrong number here means the coloring
 * experience visibly breaks. Node environment; the DOM-dependent bits
 * (actual <canvas> rendering) are not unit-tested here, only the maths.
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
