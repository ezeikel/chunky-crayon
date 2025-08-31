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
    backgroundColor: "#FFF2E6",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.chewybytes.chunkycrayon",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#FFF2E6",
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
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "chunky-crayon-app",
        organization: "chewybytes",
      },
    ],
  ],
  experiments: { typedRoutes: true },
  updates: { url: "https://u.expo.dev/b57fff00-94cc-43fb-9224-924e34d301c9" },
  runtimeVersion: { policy: "appVersion" },
  extra: { eas: { projectId: "7cae64a2-e46f-4be2-880b-4e51c4f33036" } },
});
