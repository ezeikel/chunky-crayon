import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Vitest config for chunky-crayon-web.
 *
 * Scope: pure logic + (eventually) component tests. We deliberately do NOT
 * try to render React Server Components or exercise Next routing/Cache
 * Components here — that's Playwright's job (see e2e/). Vitest covers the
 * extracted, deterministic logic where a silent bug costs money or breaks
 * the core experience.
 *
 * `@/*` path alias is resolved from tsconfig.json by vite-tsconfig-paths.
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/vitest.setup.ts'],
    // Only our own tests. e2e/ is Playwright; never let Vitest pick it up.
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      'e2e/**',
      'test-clips/**',
      'test-results/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      // Only measure coverage on code we actually have tests for yet.
      // Widen this allowlist as more areas get covered — do NOT flip to
      // "everything" or the number becomes noise.
      include: [
        'lib/currency.ts',
        'lib/coloring-image-purpose.ts',
        'lib/bundle-download-token.ts',
        'lib/unsubscribe.ts',
        'lib/social/buffer.ts',
        'lib/scene/build-scene-description.ts',
        'lib/scene/random-scene.ts',
        'lib/scene/thumbnail-url.ts',
      ],
    },
  },
});
