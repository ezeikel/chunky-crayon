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
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/coloring-ui/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [getAbsolutePath('@storybook/addon-a11y')],
  framework: getAbsolutePath('@storybook/react-vite'),
  staticDirs: ['../public'],
  viteFinal: async (viteConfig) => {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
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
