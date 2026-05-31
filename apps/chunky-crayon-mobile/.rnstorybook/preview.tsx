import "../global.css";
import "../lib/i18n"; // side-effect: init i18n so stories can call t()
import React from "react";
import { View, Text } from "react-native";
import type { Preview } from "@storybook/react-native";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetProvider } from "@swmansion/react-native-bottom-sheet";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Dimensions } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Storybook preview wraps every story with the minimum providers
// needed for components to render — gestures, bottom-sheets,
// safe area, React Query — but NOT the auth/user/subscription
// stack from `providers.tsx`. Those hit the network on mount and
// would make every story flicker through loading states.
//
// Stories that need user/colo data should pass mock objects
// directly via args (web Storybook's pattern in
// `apps/chunky-crayon-web/stories/fixtures.tsx`).
//
// Fonts: load the Rooney + Tondo families exactly the way the
// real app does in `app/_layout.tsx`. Without this every story
// renders in the system font and looks wrong.

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnMount: false } },
});

// Give SafeAreaProvider realistic device metrics so safe-area-aware
// stories (e.g. fullscreen paywall modals whose close button offsets by
// insets.top) render with a real top inset instead of 0 — otherwise the
// embedded Storybook frame reports top:0 and status-bar-clearing offsets
// look wrong in the preview even though they're correct on device.
const { width, height } = Dimensions.get("window");
const STORYBOOK_INITIAL_METRICS = {
  frame: { x: 0, y: 0, width, height },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

const StorybookFontGate = ({ children }: { children: React.ReactNode }) => {
  const [loaded] = useFonts({
    "RooneySans-Black-Italic": require("../assets/fonts/RooneySans-Black-Italic.ttf"),
    "RooneySans-Black": require("../assets/fonts/RooneySans-Black.ttf"),
    "RooneySans-Bold-Italic": require("../assets/fonts/RooneySans-Bold-Italic.ttf"),
    "RooneySans-Bold": require("../assets/fonts/RooneySans-Bold.ttf"),
    "RooneySans-Heavy-Italic": require("../assets/fonts/RooneySans-Heavy-Italic.ttf"),
    "RooneySans-Heavy": require("../assets/fonts/RooneySans-Heavy.ttf"),
    "RooneySans-Light-Italic": require("../assets/fonts/RooneySans-Light-Italic.ttf"),
    "RooneySans-Light": require("../assets/fonts/RooneySans-Light.ttf"),
    "RooneySans-Medium-Italic": require("../assets/fonts/RooneySans-Medium-Italic.ttf"),
    "RooneySans-Medium": require("../assets/fonts/RooneySans-Medium.ttf"),
    "RooneySans-Regular-Italic": require("../assets/fonts/RooneySans-Regular-Italic.ttf"),
    "RooneySans-Regular": require("../assets/fonts/RooneySans-Regular.ttf"),
    "TondoTrial-Bold": require("../assets/fonts/TondoTrial-Bold.ttf"),
    "TondoTrial-Light": require("../assets/fonts/TondoTrial-Light.ttf"),
    "TondoTrial-Regular": require("../assets/fonts/TondoTrial-Regular.ttf"),
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading fonts…</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const preview: Preview = {
  decorators: [
    (Story) => (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={STORYBOOK_INITIAL_METRICS}>
          <BottomSheetProvider>
            <QueryClientProvider client={queryClient}>
              <StorybookFontGate>
                <View style={{ flex: 1, padding: 16, backgroundColor: "#fff" }}>
                  <Story />
                </View>
              </StorybookFontGate>
            </QueryClientProvider>
          </BottomSheetProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color|tint)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
