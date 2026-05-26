import type { StorybookConfig } from "@storybook/react-native";

// CC mobile Storybook lives next to each component (colocated):
// `components/X/X.stories.tsx`. Story `title` strings drive the
// sidebar section structure ("Design System / Button", "Coloring
// Experience / ImageCanvas", etc.) — mirroring the web Storybook
// section layout under `apps/chunky-crayon-web/stories/`.
//
// Stories are reviewed on-device (iPhone + iPad simulators) via
// the Expo dev client. `withStorybook` in metro.config.js wires
// `unstable_allowRequireContext`, auto-generates the
// `storybook.requires.ts` glob, and swaps the Expo Router entry
// for `./index.ts` only when `EXPO_PUBLIC_STORYBOOK_ENABLED=true`.
// When disabled, Storybook is stripped from the bundle entirely.
const main: StorybookConfig = {
  stories: ["../components/**/*.stories.?(ts|tsx|js|jsx)"],
  deviceAddons: [
    "@storybook/addon-ondevice-controls",
    "@storybook/addon-ondevice-actions",
  ],
};

export default main;
