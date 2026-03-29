import { PostHog } from "posthog-node";

/**
 * Create a PostHog Node SDK client configured for server-side use.
 * Creates a per-request client — call `shutdown()` after capturing events
 * to ensure they flush before the serverless function freezes.
 */
export function createPostHogClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;

  // Server-side: send directly to PostHog EU, not through the reverse proxy.
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: "https://eu.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
}

// Lazy singleton for long-lived use (e.g. AI tracing)
let posthogServerInstance: PostHog | null | undefined;

export const getPostHogClient = (): PostHog | null => {
  if (posthogServerInstance === undefined) {
    posthogServerInstance = createPostHogClient();
  }
  return posthogServerInstance;
};

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  const client = createPostHogClient();
  if (client) {
    client.capture({ distinctId, event, properties });
    await client.shutdown();
  }
}
