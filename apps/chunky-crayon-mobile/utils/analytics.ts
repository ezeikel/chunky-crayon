import { Platform } from "react-native";
import { posthog } from "@/lib/posthog";

/**
 * Thin analytics wrapper around the shared PostHog client. Mirrors web's
 * analytics-client so events look the same in one project:
 * - every event carries `environment`, `platform`, and (when known) `userId`
 *   so web + mobile funnels unify and we can split by env/platform.
 * - `track` works OUTSIDE React too (e.g. the canvas store) since it uses the
 *   module-level client, not a hook.
 *
 * Event NAMES come from TRACKING_EVENTS (constants/analytics) and MUST match
 * web's strings exactly. The worker already fires server-side
 * `image_generation_completed/failed`; mobile fires the CLIENT-side
 * creation_* lifecycle, not those.
 */

const environment = process.env.EXPO_PUBLIC_ENVIRONMENT ?? "development";

export const track = (
  event: string,
  properties?: Record<string, unknown>,
): void => {
  try {
    posthog.capture(event, {
      ...properties,
      environment,
      platform: Platform.OS,
    });
  } catch {
    // Analytics must never crash a kid's tap.
  }
};

/**
 * Identify the person on the PostHog client. distinct_id = the DB user id (the
 * SAME id web uses) so a guest→account and web↔mobile collapse onto one person.
 * Person props (plan/credits/locale) power cohorts + funnel breakdowns.
 */
export const identify = (
  userId: string,
  properties?: Record<string, unknown>,
): void => {
  try {
    posthog.identify(userId, {
      ...properties,
      platform: Platform.OS,
    });
  } catch {
    // non-fatal
  }
};

/** Clear identity on logout so the next user isn't merged into the old person. */
export const reset = (): void => {
  try {
    posthog.reset();
  } catch {
    // non-fatal
  }
};
