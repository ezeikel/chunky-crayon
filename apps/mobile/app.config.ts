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
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "chunkycrayon",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.chewybytes.chunkycrayon.app",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
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
        backgroundColor: "#FFD6A5",
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
          backgroundColor: "#FDFAF5",
        },
      ],
      "expo-dev-client",
      "expo-font",
      "expo-web-browser",
      "expo-audio",
      "expo-apple-authentication",
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
  };
};
