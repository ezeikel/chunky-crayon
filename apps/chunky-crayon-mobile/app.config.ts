import { ExpoConfig, ConfigContext } from "expo/config";
import { existsSync } from "fs";
import { join } from "path";
import pkg from "./package.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  // Reverse the Google iOS Client ID (from xxx.apps.googleusercontent.com to com.googleusercontent.apps.xxx)
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.split(".")
        .reverse()
        .join(".")
    : "";

  // Facebook Login config. Guard like googleIosClientId above: if the vars are
  // absent the SDK plugin + URL scheme are omitted entirely, rather than baking
  // the literal "fbundefined" scheme / appID "undefined" (which silently breaks
  // FB auth in a build that otherwise looks fine). When EXPO_PUBLIC_FACEBOOK_APP_ID
  // and EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN are present (EAS env), FB login wires up.
  const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  const facebookClientToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN;
  const facebookEnabled = Boolean(facebookAppId && facebookClientToken);

  // Built as a typed plugin entry so the conditional spread below keeps the
  // [name, options] tuple shape (a bare spread of [[...]] widens to string[] and
  // breaks tuple inference for every plugin after it).
  const facebookPlugin: NonNullable<ExpoConfig["plugins"]> = facebookEnabled
    ? [
        [
          "react-native-fbsdk-next",
          {
            appID: facebookAppId,
            displayName: "Chunky Crayon",
            clientToken: facebookClientToken,
            scheme: "chunkycrayon",
          },
        ],
      ]
    : [];

  // Per-variant app identity (matches PTP). EXPO_PUBLIC_ENVIRONMENT is set per
  // EAS build profile (eas.json) so dev / preview / prod produce DIFFERENT
  // bundle ids + names + icons and can all install side-by-side on one device.
  // Prod keeps the original com.chewybytes.chunkycrayon.app + "Chunky Crayon"
  // (the live App Store identity — do NOT change). dev/preview get suffixed ids.
  const env = process.env.EXPO_PUBLIC_ENVIRONMENT || "development";

  const appName =
    env === "production"
      ? "Chunky Crayon"
      : env === "preview"
        ? "CC Internal"
        : "CC Dev";

  const bundleId =
    env === "production"
      ? "com.chewybytes.chunkycrayon.app"
      : env === "preview"
        ? "com.chewybytes.chunkycrayon.app.internal"
        : "com.chewybytes.chunkycrayon.app.dev";

  // Per-variant icons if present, else fall back to the prod icon. CC doesn't
  // ship dev/preview-badged icons yet — drop in icon-preview.png / icon-dev.png
  // + adaptive-icon-{preview,dev}.png later and they're picked up automatically
  // (no config change). The existsSync guard means a missing badged icon never
  // breaks a dev/preview build; it just shares the prod icon until then.
  const variantSuffix =
    env === "production" ? "" : env === "preview" ? "-preview" : "-dev";
  const pickIcon = (base: string): string => {
    const variantPath = `./assets/images/${base}${variantSuffix}.png`;
    return existsSync(join(__dirname, variantPath))
      ? variantPath
      : `./assets/images/${base}.png`;
  };
  const icon = pickIcon("icon");
  const adaptiveIcon = pickIcon("adaptive-icon");

  return {
    ...config,
    name: appName,
    slug: "chunky-crayon",
    owner: "chewybytes",
    version: pkg.version,
    orientation: "default",
    icon,
    scheme: "chunkycrayon",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      // requireFullScreen must be FALSE for the iPad to actually rotate.
      // With requireFullScreen=true (multitasking disabled) AND no
      // UIApplicationSceneManifest, the scene-less Expo SDK 56 window resizes
      // its RN root to the landscape size (useWindowDimensions reports
      // 1376x1032) but the WINDOW's display surface never completes the
      // rotation — so the correct landscape layout is painted into a portrait
      // surface and shown sideways. Allowing multitasking (requireFullScreen
      // false) lets iPadOS treat the app as a normal resizable window that
      // rotates natively with the device. Verified on iPad Pro 13.
      //
      // DO NOT add a UIApplicationSceneManifest here. The Expo SDK 56
      // AppDelegate.swift uses the classic non-scene UIWindow lifecycle
      // (creates `window` in didFinishLaunchingWithOptions and attaches the RN
      // root via startReactNative(...in: window)). Declaring a scene manifest
      // without a matching UISceneDelegate switches iOS to scene-based window
      // management, orphaning the AppDelegate's window — the RN root never gets
      // a visible window and the app boots to a BLACK SCREEN on every device.
      requireFullScreen: false,
      bundleIdentifier: bundleId,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              googleIosClientId,
              ...(facebookEnabled ? [`fb${facebookAppId}`] : []),
            ],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: adaptiveIcon,
        backgroundColor: "#FF9F6E",
      },
      package: bundleId,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      // Wires the ScreenOrientation AppDelegate subscriber + react-delegate
      // handler so the scene-less Expo SDK 56 window can be told to follow
      // device rotation (unlockAsync at the app root drives it). This is the
      // scene-compatible way to get real iPad landscape WITHOUT a
      // UIApplicationSceneManifest (which black-screens this app — see the ios
      // block above).
      "expo-screen-orientation",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#FF9F6E",
        },
      ],
      "expo-dev-client",
      "expo-font",
      "expo-web-browser",
      "expo-audio",
      "expo-apple-authentication",
      "expo-secure-store",
      "expo-sharing",
      "expo-status-bar",
      "expo-image",
      "expo-localization",
      "@react-native-google-signin/google-signin",
      ...facebookPlugin,
      [
        "expo-image-picker",
        {
          cameraPermission:
            "Allow Chunky Crayon to take photos of your hand-drawn sketches",
          photosPermission:
            "Allow Chunky Crayon to access your photos to select sketches",
        },
      ],
      [
        "@sentry/react-native",
        {
          url: "https://sentry.io/",
          project: "chunky-crayon-app",
          organization: "chewybytes",
        },
      ],
      [
        "expo-speech-recognition",
        {
          microphonePermission:
            "Allow Chunky Crayon to use the microphone to hear your coloring ideas",
          speechRecognitionPermission:
            "Allow Chunky Crayon to recognize your voice to create coloring pages",
        },
      ],
    ],
    experiments: { typedRoutes: true },
    updates: { url: "https://u.expo.dev/b57fff00-94cc-43fb-9224-924e34d301c9" },
    runtimeVersion: { policy: "appVersion" },
    extra: { eas: { projectId: "7cae64a2-e46f-4be2-880b-4e51c4f33036" } },
  };
};
