import { ExpoConfig, ConfigContext } from "expo/config";
import pkg from "./package.json";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Chunky Crayon - Creative Coloring & Learning Fun",
  slug: "chunky-crayon",
  owner: "chewybytes",
  version: pkg.version,
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "chunkycrayon",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FDFAF5",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.chewybytes.chunkycrayon",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#FDFAF5",
    },
    package: "com.chewybytes.chunkycrayon",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-dev-client",
    "expo-font",
    "expo-web-browser",
    "expo-audio",
    "expo-apple-authentication",
    "@react-native-google-signin/google-signin",
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
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "chunky-crayon-app",
        organization: "chewybytes",
      },
    ],
    [
      "@jamsch/expo-speech-recognition",
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
});
