import "../global.css";
import "@/lib/i18n"; // side-effect: initialises react-i18next before first render
import { useState, useEffect } from "react";
import { Redirect, Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Sentry from "@sentry/react-native";
import Providers from "@/providers";
import { useOnboardingStore } from "@/stores/onboardingStore";

Sentry.init({
  dsn: "https://3ced8899cf0a5a8dd3b15c539379d654:590a9050ad3be778d873c840cb48012c@o358156.ingest.us.sentry.io/4507397854330880",
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
});

const RootLayout = () => {
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

  const hasCompleted = useOnboardingStore((s) => s.hasCompleted);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand persist to rehydrate from AsyncStorage
    const unsub = useOnboardingStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated (e.g. sync storage), set immediately
    if (useOnboardingStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  // Allow + DRIVE all orientations. The plist already whitelists all four, but
  // Expo SDK 56 runs a scene-LESS UIWindow lifecycle (AppDelegate attaches the
  // RN root via startReactNative(...in: window), no UIWindowScene). On iPad
  // (iOS 16+) passive device rotation resizes the RN root logically —
  // useWindowDimensions DOES report the swapped dims (verified: 1376x1032 in
  // landscape) — but the actual UIWindow geometry never follows, so the
  // portrait window just paints sideways. expo-screen-orientation's native
  // module issues the orientation update the scene-less window can't do on its
  // own. unlockAsync (allow-all) is the safe direction; we are NOT locking.
  // (A UIApplicationSceneManifest would also fix the window but black-screens
  // this app — see app.config.ts; this is the scene-compatible alternative.)
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {
      // Non-fatal: if the native module is unavailable the app still runs
      // portrait-first (the iPad-first default). Don't crash startup over it.
    });
  }, []);

  if (!loaded || !hydrated) {
    return null;
  }

  return (
    <Providers>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="coloring-image/[id]"
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackTitle: "Back",
            headerStyle: {
              backgroundColor: "#FFFFFF",
            },
            headerTintColor: "#E46444",
            headerTitleStyle: {
              fontFamily: "TondoTrial-Bold",
            },
          }}
        />
        {/* Create form — full-screen modal launched by the center
            tab-bar FAB. Modal presentation so it slides up over the
            current tab and dismisses back to it. */}
        <Stack.Screen
          name="create"
          options={{
            presentation: "modal",
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
        {/* Account / browse routes reached from Home cards + the gated
            grown-ups corner, not the tab bar. Native-stack push with a
            back-button header (no home chrome on a detail route).
            (My Art is a tab, so it's not here.) */}
        <Stack.Screen
          name="challenges"
          options={{
            headerShown: true,
            headerTitle: "Challenges",
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: "#FDFAF5" },
            headerShadowVisible: false,
            headerTintColor: "#E46444",
            headerTitleStyle: { fontFamily: "TondoTrial-Bold" },
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="characters"
          options={{
            headerShown: true,
            headerTitle: "My Characters",
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: "#FDFAF5" },
            headerShadowVisible: false,
            headerTintColor: "#E46444",
            headerTitleStyle: { fontFamily: "TondoTrial-Bold" },
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            headerTitle: "Settings",
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: "#FDFAF5" },
            headerShadowVisible: false,
            headerTintColor: "#E46444",
            headerTitleStyle: { fontFamily: "TondoTrial-Bold" },
            animation: "slide_from_right",
          }}
        />
      </Stack>
      {!hasCompleted && <Redirect href="/onboarding" />}
    </Providers>
  );
};

export default Sentry.wrap(RootLayout);
