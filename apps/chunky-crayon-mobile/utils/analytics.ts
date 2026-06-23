import { Platform } from "react-native";
import type { PostHog } from "posthog-react-native";
import { posthog } from "@/lib/posthog";

// The SDK's property-bag type (Record<string, JsonType>) isn't re-exported from
// posthog-react-native's barrel, so derive it from the identify signature on the
// PostHog *type* (the `posthog` instance is now nullable on iOS — Kids 1.3 — so
// we can't read its method off the value) rather than reaching into the nested
// @posthog/core path.
type PostHogProps = NonNullable<Parameters<PostHog["identify"]>[1]>;

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
  // iOS: `posthog` is null (Kids Category 1.3 — no third-party analytics on
  // iOS; see lib/posthog). Every analytics call is a no-op there.
  if (!posthog) return;
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
  if (!posthog) return; // iOS: analytics disabled (Kids 1.3)
  try {
    // PostHog person props only ADD/UPDATE on identify — omitting a key does NOT
    // remove a previously-set value. An explicit `null` here means "clear this
    // prop": e.g. an anon user whose DB name was reset from the old "Mobile User"
    // placeholder needs that label ACTIVELY removed from their PostHog person on
    // next app open, not just left stale.
    const set: Record<string, unknown> = { platform: Platform.OS };
    const unset: string[] = [];
    for (const [key, value] of Object.entries(properties ?? {})) {
      if (value === null || value === undefined) unset.push(key);
      else set[key] = value;
    }
    posthog.identify(userId, set as PostHogProps);
    // `identify(distinctId, props)` ONLY does $set — posthog-react-native does
    // NOT read a `$unset` key out of the properties object (verified: the $set
    // event it emits has unset=None). The supported way to REMOVE a person prop
    // is `$unset` on a capture event's properties. So fire a follow-up capture
    // carrying the $unset array. Fires only when there's something to clear.
    if (unset.length) {
      posthog.capture("$set", { $unset: unset });
    }
  } catch {
    // non-fatal
  }
};

/** Clear identity on logout so the next user isn't merged into the old person. */
export const reset = (): void => {
  if (!posthog) return; // iOS: analytics disabled (Kids 1.3)
  try {
    posthog.reset();
  } catch {
    // non-fatal
  }
};
