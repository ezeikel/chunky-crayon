import posthog from "posthog-js";

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
) {
  if (typeof window !== "undefined" && posthog) {
    posthog.capture(event, properties);
  }
}
