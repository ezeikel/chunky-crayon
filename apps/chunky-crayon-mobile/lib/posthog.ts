import { Platform } from "react-native";
import { PostHog } from "posthog-react-native";

/**
 * The single configured PostHog client for the app. Shared by the
 * PostHogProvider (autocapture + session replay) and the analytics wrapper
 * (utils/analytics.ts) so there's one instance, one config.
 *
 * IOS: DISABLED. Apple's Kids Category (Guideline 1.3) prohibits a Kids app
 * from including third-party analytics/advertising SDKs that can collect,
 * transmit, or share identifiable or device information — regardless of
 * masking. App Review rejected build 33 under 1.3 because PostHog ships a
 * device/anonymous id, identifies the user, and uploads session replays to
 * PostHog Cloud. So on iOS we never construct the client: `posthog` is null,
 * the analytics wrapper no-ops, and PostHogProvider is not mounted. No
 * identifiers or events leave an iOS device. (Crash reporting via Sentry stays
 * on — Apple tolerates crash-only reporting with PII off.)
 *
 * ANDROID: unchanged. Same project as web (`EXPO_PUBLIC_POSTHOG_KEY` = web's
 * NEXT_PUBLIC_POSTHOG_KEY, EU host) — events are split by an `environment`
 * prop, NOT separate projects. The worker already fires server-side
 * `image_generation_completed/failed`, so mobile must not duplicate those.
 *
 * Session replay (Android) is ON with EVERYTHING masked (kids app / COPPA): all
 * text inputs, all images/media, and all sandboxed system views (photo/contact
 * pickers). We see interaction flow + layout, never a child's typed input or
 * photos. 100% sample for now (tiny family volume); dial down later (JS/OTA).
 */
export const posthog =
  Platform.OS === "ios"
    ? null
    : new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "", {
        host:
          process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
        enableSessionReplay: true,
        sessionReplayConfig: {
          maskAllTextInputs: true,
          maskAllImages: true,
          maskAllSandboxedViews: true,
        },
      });
