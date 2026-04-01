"use client";

import posthog from "posthog-js";

/**
 * Lightweight analytics tracking for coloring UI components.
 * Sends events to PostHog (routed to the correct project via env var).
 * Each app configures its own PostHog key — no app-specific logic here.
 */
export const trackEvent = (
  event: string,
  properties: Record<string, unknown> = {},
) => {
  try {
    if (typeof window !== "undefined" && posthog?.capture) {
      posthog.capture(event, {
        ...properties,
        url: window.location.href,
        environment: "client",
      });
    }

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[Analytics]", event, properties);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Analytics tracking error:", error);
  }
};
