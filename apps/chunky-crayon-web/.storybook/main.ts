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

    // Proxy assets.chunkycrayon.com through the Storybook dev server
    // so the coloring-experience story can fetch SVGs / region maps
    // for the canvas without hitting CORS. Production sets these
    // CORS headers via Cloudflare; localhost obviously doesn't.
    // Only affects Storybook dev — the real app's next.config has
    // its own rewrite rules.
    viteConfig.server = {
      ...(viteConfig.server ?? {}),
      proxy: {
        ...(viteConfig.server?.proxy ?? {}),
        '/_assets-cc': {
          target: 'https://assets.chunkycrayon.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/_assets-cc/, ''),
        },
      },
    };
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
      // Force a SINGLE React copy. Radix primitives (DismissableLayer, used by
      // the shadcn Tooltip/Select/Dropdown that FormCTA pulls in text mode)
      // otherwise resolve their own React in the Storybook Vite graph →
      // "Invalid hook call / more than one copy of React" → useEffect-of-null
      // crash when switching the create form to a non-Scene mode. Deduping
      // react/react-dom (+ jsx-runtime) collapses them to one instance.
      dedupe: [
        ...((viteConfig.resolve as { dedupe?: string[] })?.dedupe ?? []),
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
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
          // The `/scene` subpath is Node-free by design (no sharp/resvg/AI
          // SDK) — alias it to the real source so GATEABLE_MODES /
          // isGateableMode / rollRandomScene resolve. The bare
          // `@one-colored-pixel/coloring-core` alias below is a prefix match,
          // so without this it rewrites `…/scene` to the mock path + `/scene`
          // (a file that doesn't exist) and crashes the Forms stories.
          find: '@one-colored-pixel/coloring-core/scene',
          replacement: resolve(
            repoRoot,
            'packages/coloring-core/src/scene/index.ts',
          ),
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
          find: '@/app/actions/createPendingColoringImage',
          replacement: resolve(root, '.storybook/mocks/app-actions.ts'),
        },
        {
          // SaveToGalleryButton (used by ColoringPageContent) imports
          // this action, which transitively pulls `@/auth` →
          // next-auth → server-only modules that fail to bundle for
          // the browser. Storybook never executes the action, so a
          // stub is enough to break the chain.
          find: '@/app/actions/saved-artwork',
          replacement: resolve(
            root,
            '.storybook/mocks/saved-artwork-actions.ts',
          ),
        },
        {
          // ColoringArea imports `type { GridColorMap, FillPointsData }`
          // from `@/lib/ai`, which re-exports lib/ai/prompts.ts — that
          // imports `CC_BRAND_VOICE_CORE` from the storybook-stubbed
          // coloring-core mock + various AI SDK clients that don't
          // bundle for the browser. Stub the whole namespace.
          find: '@/lib/ai',
          replacement: resolve(root, '.storybook/mocks/lib-ai.ts'),
        },
        {
          // ColoringArea calls generateRegionFillPoints lazily for
          // images without a region store. Real module imports prompt
          // constants + AI SDK clients — browser-bundle hostile. The
          // fixture images are backfilled, so the action never fires.
          find: '@/app/actions/generate-color-map',
          replacement: resolve(
            root,
            '.storybook/mocks/generate-color-map-actions.ts',
          ),
        },
        {
          // Same shape as generate-color-map: ColoringArea's
          // region-store retry path imports these. Fixture images
          // are pre-backfilled so these never fire.
          find: '@/app/actions/generate-regions',
          replacement: resolve(
            root,
            '.storybook/mocks/generate-regions-actions.ts',
          ),
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
