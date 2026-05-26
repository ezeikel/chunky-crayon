// This replaces `const { getDefaultConfig } = require('expo/metro-config');`
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");
const {
  withStorybook,
} = require("@storybook/react-native/metro/withStorybook");

// This replaces `const config = getDefaultConfig(__dirname);`
// eslint-disable-next-line no-undef
const config = getSentryExpoConfig(__dirname);

const withTailwind = withNativeWind(config, { input: "./global.css" });

// withStorybook is a no-op (returns the config unchanged) unless
// EXPO_PUBLIC_STORYBOOK_ENABLED=true. When enabled it:
//   - sets `transformer.unstable_allowRequireContext = true` so the
//     auto-generated `.rnstorybook/storybook.requires.ts` can pull in
//     every co-located `*.stories.tsx` via `require.context`.
//   - swaps Metro's resolution of `expo-router/entry` for
//     `.rnstorybook/index.ts`, so the storybook UI replaces the app
//     entirely instead of running alongside it.
//   - regenerates `storybook.requires.ts` on Metro start.
//
// When disabled, the wrapper is a complete no-op, so production
// builds carry zero Storybook code.
// eslint-disable-next-line no-undef
module.exports = withStorybook(withTailwind, {
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true",
});
