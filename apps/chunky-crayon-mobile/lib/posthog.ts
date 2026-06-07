import { PostHog } from "posthog-react-native";

/**
 * The single configured PostHog client for the app. Shared by the
 * PostHogProvider (autocapture + session replay) and the analytics wrapper
 * (utils/analytics.ts) so there's one instance, one config.
 *
 * Same project as web (`EXPO_PUBLIC_POSTHOG_KEY` = web's NEXT_PUBLIC_POSTHOG_KEY,
 * EU host) — events are split by an `environment` prop, NOT separate projects.
 * The worker already fires server-side `image_generation_completed/failed`, so
 * mobile must not duplicate those.
 *
 * Session replay is ON with EVERYTHING masked (kids app / COPPA): all text
 * inputs, all images/media, and all sandboxed system views (photo/contact
 * pickers). We see interaction flow + layout, never a child's typed input or
 * photos. 100% sample for now (tiny family volume); dial down later (JS/OTA).
 */
export const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "", {
  host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
  enableSessionReplay: true,
  sessionReplayConfig: {
    maskAllTextInputs: true,
    maskAllImages: true,
    maskAllSandboxedViews: true,
  },
});
