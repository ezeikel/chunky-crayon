import { ExpoConfig, ConfigContext } from "expo/config";
import pkg from "./package.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  // Reverse the Google iOS Client ID (from xxx.apps.googleusercontent.com to com.googleusercontent.apps.xxx)
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.split(".")
        .reverse()
        .join(".")
    : "";

  return {
    ...config,
    name: "Chunky Crayon",
    slug: "chunky-crayon",
    owner: "chewybytes",
    version: pkg.version,
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: "chunkycrayon",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      // Full-screen only (no iPad split-view / Slide-Over). This disables iPad
      // MULTITASKING, which is a PRECONDITION for honoring the orientation
      // whitelist (with multitasking on, iPadOS ignores the orientation list
      // and treats the app as freely resizable). It does NOT by itself enable
      // rotation — the UIApplicationSceneManifest below is what makes iOS give
      // the app a real UIWindowScene whose geometry tracks rotation. Also
      // desirable for an immersive ages-3-8 app: no accidental drag-out.
      requireFullScreen: true,
      bundleIdentifier: "com.chewybytes.chunkycrayon.app",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // Adopt the scene-based UIApplication lifecycle. Without a scene
        // manifest the app runs the legacy non-scene UIWindow lifecycle, and
        // on iPad (iOS 13+) iOS does NOT honor the LandscapeLeft/Right entries
        // in UISupportedInterfaceOrientations — it only flips the portrait
        // pair, so rotating to landscape just tips the portrait UI sideways
        // (the bug). A single full-screen window scene + requireFullScreen
        // makes iOS honor all four orientations and fire a real
        // Dimensions/useWindowDimensions change so the layout reflows to its
        // tablet-landscape tier.
        UIApplicationSceneManifest: {
          UIApplicationSupportsMultipleScenes: false,
          UISceneConfigurations: {
            UIWindowSceneSessionRoleApplication: [
              { UISceneConfigurationName: "Default Configuration" },
            ],
          },
        },
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              googleIosClientId,
              `fb${process.env.EXPO_PUBLIC_FACEBOOK_APP_ID}`,
            ],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#FF9F6E",
      },
      package: "com.chewybytes.chunkycrayon.app",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
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
      [
        "react-native-fbsdk-next",
        {
          appID: `${process.env.EXPO_PUBLIC_FACEBOOK_APP_ID}`,
          displayName: "Chunky Crayon",
          clientToken: `${process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN}`,
          scheme: "chunkycrayon",
        },
      ],
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
