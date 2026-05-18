import { defineConfig } from 'vitest/config';

/**
 * Root Vitest workspace.
 *
 * Lists each package/app that has unit tests as an explicit project. We do
 * NOT glob `packages/* /vitest.config.*` on purpose: coloring-ui runs its
 * tests through the Storybook Vitest addon (browser mode, Playwright) with
 * no standalone config, and we don't want a plain `vitest run` here to drag
 * that in. Add a line below when a new package gains unit tests.
 *
 * Normally you'd run tests via Turborepo (`pnpm test` → `turbo run test`)
 * so each project runs in its own package context with caching. This root
 * config exists for the `vitest related` pre-commit path, which needs a
 * single Vitest invocation that spans the whole repo's changed files.
 */
export default defineConfig({
  test: {
    projects: [
      './apps/chunky-crayon-web/vitest.config.mts',
      './packages/stripe-shared/vitest.config.mts',
      './packages/canvas/vitest.config.mts',
      './packages/coloring-core/vitest.config.mts',
    ],
  },
});
