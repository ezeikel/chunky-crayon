/**
 * Dev-only Storybook route (`/storybook`).
 *
 * Reached by navigating to `/storybook` in the running dev build — NOT by
 * the `EXPO_PUBLIC_STORYBOOK_ENABLED` entry swap (that no-ops under Expo
 * SDK 56). The `.rnstorybook` graph (→ `storybook.requires` →
 * `require.context(..., /\.stories\./)`) is required LAZILY inside the
 * component body, so the stories load only when this screen mounts and
 * never enter the main app bundle's static graph (a story in the main
 * graph breaks Metro's `@/*` tsconfig-path resolution on a cold cache).
 *
 * We deliberately do NOT `export { default } from '../.rnstorybook'` —
 * Expo Router statically pulls each route's default export into the
 * router tree, which would drag the stories back into the main graph.
 */

import { useMemo } from "react";
import { View } from "react-native";

export default function StorybookRoute() {
  const StorybookUIRoot = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    return require("../.rnstorybook").default as React.ComponentType;
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StorybookUIRoot />
    </View>
  );
}
