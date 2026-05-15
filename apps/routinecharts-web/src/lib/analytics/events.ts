import posthog from "posthog-js";
import { track as vercelTrack } from "@vercel/analytics";

/**
 * Single entry point for custom events. Fires to BOTH PostHog (funnel /
 * cross-site analysis in CC's shared project) and Vercel Analytics
 * (lightweight first-party dashboard). Keep event names in sync with the
 * union below so dashboards stay queryable.
 */

export type SatelliteEvent =
  | "pdf_download"
  | "cc_cta_click"
  | "browse_all_emoji_opened"
  | "blog_post_view"
  | "chart_row_added";

export const trackEvent = (
  event: SatelliteEvent,
  props?: Record<string, string | number | boolean>,
): void => {
  try {
    if (typeof posthog?.capture === "function") {
      posthog.capture(event, props);
    }
    vercelTrack(event, props);
  } catch {
    // Analytics must never break the UX.
  }
};
