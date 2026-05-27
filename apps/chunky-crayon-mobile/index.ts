/**
 * Custom entry that conditionally boots either Expo Router (production
 * + normal dev) or Storybook (dev only, gated by env var).
 *
 * Why this file exists: `withStorybook`'s built-in Metro resolver swap
 * for `expo-router/entry` is supposed to re-route to `.rnstorybook/
 * index.ts` automatically when `EXPO_PUBLIC_STORYBOOK_ENABLED=true`.
 * Under Expo SDK 56 + Expo CLI's bundler the swap silently no-ops
 * (verified: bundle is built from expo-router/entry with no Storybook
 * modules). The Callstack-recommended workaround is the explicit
 * entry swap below — package.json `main` points at this file, and
 * we conditionally bootstrap the right entry based on the env at
 * boot time. Production builds DCE the storybook branch because
 * the env var is undefined.
 *
 * `withStorybook` is still wrapped around Metro in metro.config.js so
 * `storybook.requires.ts` keeps regenerating and
 * `unstable_allowRequireContext` stays enabled.
 *
 * Note: Expo Router's `expo-router/entry` registers itself with
 * AppRegistry as 'main'. Storybook's `view.getStorybookUI` only
 * returns a component — we have to register it ourselves under the
 * 'main' name so RN's native side can find it.
 */

if (process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppRegistry } = require("react-native");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const StorybookUIRoot = require("./.rnstorybook").default;
  AppRegistry.registerComponent("main", () => StorybookUIRoot);
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("expo-router/entry");
}
