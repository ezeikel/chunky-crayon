import { PostHog } from "posthog-node";

/**
 * Worker-side PostHog for generation observability.
 *
 * The worker owns the image-generation pipeline (generate -> trace ->
 * R2 -> persist), so it is the only place that can fire
 * `image_generation_completed` / `image_generation_failed` for the
 * modern create flow. The web app's create action just dispatches the
 * job and returns; it never sees the outcome. Without this, the core
 * activation funnel (generation_started -> completed) has no end, and
 * generation failures are invisible to product analytics.
 *
 * Mirrors apps/chunky-crayon-web/lib/posthog-server.ts: posthog-node,
 * EU host, immediate flush. No-op when POSTHOG_KEY is absent so the
 * worker ships and runs unchanged until the key is added to its env on
 * the Hetzner box (it is not on Vercel — see the worker deploy
 * workflow). The coloring-core tracing seam (`withAITracing`) only wraps
 * LLM calls via @posthog/ai and cannot fire custom events, so plain
 * events go through posthog-node directly.
 */

// Event names MUST stay byte-identical to TRACKING_EVENTS in
// apps/chunky-crayon-web/constants.ts so both producers land on the same
// PostHog event and existing funnels keep working. Duplicated as literals
// here because the web constants module is web-app-scoped and not safely
// importable into the worker runtime.
export const GENERATION_EVENTS = {
  IMAGE_GENERATION_COMPLETED: "image_generation_completed",
  IMAGE_GENERATION_FAILED: "image_generation_failed",
} as const;

let client: PostHog | null | undefined;

const getClient = (): PostHog | null => {
  if (client !== undefined) return client;

  const key = process.env.POSTHOG_KEY;
  if (!key) {
    // eslint-disable-next-line no-console
    console.warn("[analytics] PostHog disabled on worker: POSTHOG_KEY not set");
    client = null;
    return client;
  }

  client = new PostHog(key, {
    host: "https://eu.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
};

/**
 * Resolve the distinct_id for a generation event.
 *
 * Prefer the DB user id (the canonical distinct_id the web app's
 * identify() now keys on, so logged-in events stitch to one person).
 * Fall back to the browser distinct_id threaded through the dispatch
 * payload for guests. If neither is present (an un-threaded guest job),
 * return null and let the caller skip — we never want to collapse real
 * generations onto the literal 'anonymous' person.
 */
const resolveDistinctId = (opts: {
  userId?: string | null;
  clientDistinctId?: string | null;
}): string | null => opts.userId || opts.clientDistinctId || null;

/**
 * Fire a generation analytics event from the worker. Fire-and-forget
 * friendly: never throws (analytics must not break the pipeline), and
 * flushes immediately so the event is sent before the detached job
 * settles. Skips silently when PostHog is disabled or no distinct_id is
 * resolvable.
 */
export const captureGenerationEvent = async (
  event: (typeof GENERATION_EVENTS)[keyof typeof GENERATION_EVENTS],
  opts: {
    userId?: string | null;
    clientDistinctId?: string | null;
    properties: Record<string, unknown>;
  },
): Promise<void> => {
  try {
    const posthog = getClient();
    if (!posthog) return;

    const distinctId = resolveDistinctId(opts);
    if (!distinctId) return;

    posthog.capture({
      distinctId,
      event,
      properties: { ...opts.properties, environment: "worker" },
    });
    await posthog.flush();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[analytics] capture failed:", error);
  }
};
