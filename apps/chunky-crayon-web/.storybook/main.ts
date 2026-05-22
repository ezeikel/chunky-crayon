import type { StorybookConfig } from '@storybook/react-vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(root, '../..');

function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const config: StorybookConfig = {
  // All stories live in one tree — `apps/chunky-crayon-web/stories/`,
  // organised by section. Stories for `coloring-ui` library components
  // live here too (imported via `@one-colored-pixel/coloring-ui`), so
  // this single CC Storybook shows library + app components in one UI.
  // Decoupling story location from component source keeps everything
  // findable in one place.
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [getAbsolutePath('@storybook/addon-a11y')],
  framework: getAbsolutePath('@storybook/react-vite'),
  staticDirs: ['../public'],
  viteFinal: async (viteConfig) => {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    // Browser has no `process`, so `process.env.*` reads at module
    // scope crash. Two cases this stub covers:
    //   - `next-auth/react` reads `process.env.*` on load (every story
    //     is wrapped by SessionProvider in preview.tsx).
    //   - `useStripeCheckout` calls `loadStripe(process.env
    //     .NEXT_PUBLIC_STRIPE_KEY)` at module scope; Stripe's initStripe
    //     does `key.match(...)` and throws on `undefined` — which takes
    //     down the whole story file (CreateColoringPageForm imports the
    //     paywall → useStripeCheckout). A dummy publishable key makes
    //     loadStripe load cleanly; Storybook does no real checkout.
    //   - `resolveThumbnailUrl` reads `NEXT_PUBLIC_R2_PUBLIC_URL` to
    //     build Scene Builder / Character Builder thumbnail URLs.
    //     Without it the resolver returns null and SceneTile silently
    //     falls back to the FA icon — so the Character Builder story
    //     showed grey icons instead of the real illustrations. The R2
    //     bucket URL is a public `NEXT_PUBLIC_*` value (it ships to the
    //     browser in prod), so it's safe to hardcode here.
    viteConfig.define = {
      ...viteConfig.define,
      'process.env': JSON.stringify({
        NODE_ENV: 'development',
        NEXT_PUBLIC_STRIPE_KEY: 'pk_test_storybook_dummy',
        NEXT_PUBLIC_R2_PUBLIC_URL:
          'https://pub-3113b77fbb06419f9c8070eb1f8471cc.r2.dev',
      }),
    };
    viteConfig.resolve = {
      ...viteConfig.resolve,
      alias: [
        {
          find: 'next/navigation',
          replacement: resolve(root, '.storybook/mocks/next-navigation.ts'),
        },
        {
          find: 'next/cache',
          replacement: resolve(root, '.storybook/mocks/next-cache.ts'),
        },
        {
          find: 'next/image',
          replacement: resolve(root, '.storybook/mocks/next-image.tsx'),
        },
        {
          find: 'posthog-node',
          replacement: resolve(root, '.storybook/mocks/posthog-node.ts'),
        },
        {
          find: '@one-colored-pixel/coloring-ui',
          replacement: resolve(repoRoot, 'packages/coloring-ui/src/index.ts'),
        },
        {
          find: '@one-colored-pixel/canvas',
          replacement: resolve(repoRoot, 'packages/canvas/src/index.ts'),
        },
        {
          find: '@one-colored-pixel/coloring-core/image-quality',
          replacement: resolve(root, '.storybook/mocks/coloring-core.ts'),
        },
        {
          find: '@one-colored-pixel/coloring-core',
          replacement: resolve(root, '.storybook/mocks/coloring-core.ts'),
        },
        {
          find: '@one-colored-pixel/db/types',
          replacement: resolve(root, '.storybook/mocks/db.ts'),
        },
        {
          find: '@one-colored-pixel/db',
          replacement: resolve(root, '.storybook/mocks/db.ts'),
        },
        {
          find: '@/app/actions/user',
          replacement: resolve(root, '.storybook/mocks/user-actions.ts'),
        },
        {
          find: '@/app/actions/profiles',
          replacement: resolve(root, '.storybook/mocks/profile-actions.ts'),
        },
        {
          find: '@/app/actions/auth',
          replacement: resolve(root, '.storybook/mocks/auth-actions.ts'),
        },
        {
          find: '@/app/actions/stripe',
          replacement: resolve(root, '.storybook/mocks/stripe-actions.ts'),
        },
        {
          find: '@/app/actions/share-artwork',
          replacement: resolve(root, '.storybook/mocks/app-actions.ts'),
        },
        {
          find: '@/app/actions/createPendingColoringImage',
          replacement: resolve(root, '.storybook/mocks/app-actions.ts'),
        },
        {
          find: '@/app/actions/conversions',
          replacement: resolve(root, '.storybook/mocks/app-actions.ts'),
        },
        {
          find: '@/app/actions/email',
          replacement: resolve(root, '.storybook/mocks/app-actions.ts'),
        },
        {
          find: '@/app/actions/load-more-images',
          replacement: resolve(root, '.storybook/mocks/app-actions.ts'),
        },
        {
          find: '@/app/actions/load-gallery-images',
          replacement: resolve(root, '.storybook/mocks/app-actions.ts'),
        },
        {
          find: '@/app/actions/share',
          replacement: resolve(root, '.storybook/mocks/app-actions.ts'),
        },
        {
          find: '@/app/actions/input-processing',
          replacement: resolve(root, '.storybook/mocks/app-actions.ts'),
        },
        {
          find: '@/app/actions/characters',
          replacement: resolve(root, '.storybook/mocks/app-actions.ts'),
        },
        {
          find: '@/hooks/useUser',
          replacement: resolve(root, '.storybook/mocks/useUser.ts'),
        },
        { find: '@', replacement: root },
      ],
    };
    return viteConfig;
  },
};

export default config;
