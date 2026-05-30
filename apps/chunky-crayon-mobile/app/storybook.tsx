/**
 * Dev-only Storybook route (`/storybook`).
 *
 * This is the canonical @storybook/react-native Expo Router pattern: re-export
 * the default from `.rnstorybook/index.ts`, which builds the on-device UI via
 * `getStorybookUI`. Re-exporting (rather than a side-effect import) is what
 * forces `.rnstorybook/storybook.requires` to EVALUATE — running `start()` to
 * register every story and set `globalThis.view`.
 *
 * IMPORTANT — this route only renders real Storybook when Metro runs with
 * `EXPO_PUBLIC_STORYBOOK_ENABLED=true`. That flag activates the *Metro*
 * `withStorybook` wrapper (`@storybook/react-native/metro/withStorybook`),
 * which — unlike the bundler-agnostic wrapper — does NOT swap the app entry.
 * It keeps the app AND makes `/storybook` work alongside it, while enabling
 * `unstable_allowRequireContext` and regenerating `storybook.requires.ts`.
 * With the flag OFF, the wrapper redirects `.rnstorybook` to a stub that
 * renders "Storybook is disabled in the withStorybook metro wrapper."
 *
 * App ↔ Storybook is a BUILD-TIME toggle, per the @storybook/react-native
 * docs (`isStorybook ? <StorybookUI/> : <App/>`); there is no documented
 * runtime switch, and the on-device Storybook owns the full window (a sibling
 * overlay close button does not reliably layer above it — tried, reverted).
 * To leave Storybook, reload Metro / relaunch without the flag.
 *
 * So: to review stories on device, start Metro with the flag set, e.g.
 *   EXPO_PUBLIC_STORYBOOK_ENABLED=true pnpm ios
 * then navigate to `/storybook`.
 */

export { default } from "../.rnstorybook";
