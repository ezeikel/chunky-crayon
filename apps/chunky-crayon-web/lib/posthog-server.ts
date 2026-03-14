import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

/**
 * Get or create a PostHog client for server-side tracking.
 * Configured for serverless with immediate flushing.
 */
export function getPostHogClient(): PostHog | null {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!posthogKey || !posthogHost) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('PostHog server-side tracking disabled: missing env vars');
    }
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(posthogKey, {
      host: posthogHost,
      // For serverless functions, flush immediately
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

/**
 * Shutdown and flush all pending events.
 * Call this at the end of server actions/API routes.
 */
export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null; // Reset for next request in serverless
  }
}
