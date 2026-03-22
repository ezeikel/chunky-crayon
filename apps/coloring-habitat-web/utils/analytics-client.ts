import posthog from "posthog-js";

/**
 * Track an analytics event via PostHog on the client.
 *
 * Safe to call anywhere on the client -- silently no-ops during SSR
 * or if PostHog has not been initialised.
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;

  try {
    if (posthog?.capture) {
      posthog.capture(event, {
        ...properties,
        url: window.location.href,
        environment: "client",
      });
    }

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[Analytics Client]", event, properties);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Client analytics tracking error:", error);
  }
}
