// This replaces `const { getDefaultConfig } = require('expo/metro-config');`
const path = require("path");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");
const {
  withStorybook,
} = require("@storybook/react-native/metro/withStorybook");

// This replaces `const config = getDefaultConfig(__dirname);`
// eslint-disable-next-line no-undef
const config = getSentryExpoConfig(__dirname);

// ── react-native-screens/experimental resolver shim ──────────────────────────
// expo-router's experimental-stack/ExperimentalStackView.js does
// `require("react-native-screens/experimental")` at module load, and it's pulled
// into expo-router's graph even though this app only uses the standard <Stack>.
// Metro's `unstable_enablePackageExports: true` (the Expo SDK 56 / Sentry default)
// resolves subpaths via a package's `exports` map — but react-native-screens
// 4.25.2 (the SDK-56-pinned version) ships NO `exports` field; it exposes the
// subpath the legacy way, via a nested `experimental/package.json` redirect stub.
// With package-exports on, Metro skips that stub and reports "could not be found"
// even though the file is present (Node resolves it fine), redboxing every screen.
// Map the one subpath to its real source entry (the `react-native` field target),
// and delegate everything else to Metro's default resolver. No dep change, no
// native rebuild. Remove if rn-screens gains an `exports` map or package-exports
// is turned off.
// Resolve the package's real location (it's hoisted to the monorepo root under
// pnpm, not app-local), then point at the `react-native` field's source entry.
const RN_SCREENS_EXPERIMENTAL = path.join(
  // eslint-disable-next-line no-undef
  path.dirname(require.resolve("react-native-screens/package.json")),
  "src/experimental/index.ts",
);
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-screens/experimental") {
    return { type: "sourceFile", filePath: RN_SCREENS_EXPERIMENTAL };
  }
  const next = baseResolveRequest ?? context.resolveRequest;
  return next(context, moduleName, platform);
};

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
