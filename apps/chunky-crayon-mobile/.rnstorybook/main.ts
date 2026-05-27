import type { StorybookConfig } from "@storybook/react-native";

// CC mobile Storybook lives in two places:
//   1. Component-colocated: `components/X/X.stories.tsx` — for stories
//      that document a single component's variants.
//   2. Standalone catalog: `stories/<topic>.stories.tsx` — for stories
//      that document design tokens / cross-component compositions /
//      surfaces with no single owning component (Colors, Typography,
//      Buttons, Sound playground, etc.). Mirrors web's
//      `apps/chunky-crayon-web/stories/` layout.
//
// Story `title` strings drive the sidebar section structure, e.g.
// "Design System / Colors", "Coloring Experience / ImageCanvas" —
// mirroring the web Storybook section layout.
//
// Stories are reviewed on-device (iPhone + iPad simulators) via
// the Expo dev client. `withStorybook` in metro.config.js wires
// `unstable_allowRequireContext`, auto-generates the
// `storybook.requires.ts` glob, and swaps the Expo Router entry
// for `./index.ts` only when `EXPO_PUBLIC_STORYBOOK_ENABLED=true`.
// When disabled, Storybook is stripped from the bundle entirely.
const main: StorybookConfig = {
  stories: [
    "../components/**/*.stories.?(ts|tsx|js|jsx)",
    "../stories/**/*.stories.?(ts|tsx|js|jsx)",
  ],
  deviceAddons: [
    "@storybook/addon-ondevice-controls",
    "@storybook/addon-ondevice-actions",
  ],
};

export default main;
