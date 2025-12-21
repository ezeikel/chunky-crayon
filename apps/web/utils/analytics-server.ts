import 'server-only';

import { track as vercelTrackServer } from '@vercel/analytics/server';
import { getPostHogClient, shutdownPostHog } from '@/lib/posthog-server';
import { getUserId, getCurrentUser } from '@/app/actions/user';
import type { EventProperties, TrackingEvent } from '@/types/analytics';

// Clean properties for Vercel Analytics (only string, number, boolean, null)
const cleanVercelProperties = (
  properties: Record<string, unknown>,
): Record<string, string | number | boolean | null> =>
  Object.entries(properties).reduce(
    (cleaned, [key, value]) => {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        return { ...cleaned, [key]: value };
      }
      if (value !== undefined) {
        return { ...cleaned, [key]: String(value) };
      }
      return cleaned;
    },
    {} as Record<string, string | number | boolean | null>,
  );

/**
 * Server-side analytics tracking for server actions and API routes.
 *
 * Automatically enriches events with user information from the session.
 * Sends events to both PostHog and Vercel Analytics.
 *
 * @example
 * ```ts
 * // In a server action
 * await track(TRACKING_EVENTS.CREATION_COMPLETED, {
 *   coloringImageId: image.id,
 *   description: 'A dragon',
 *   durationMs: 5000,
 *   creditsUsed: 1,
 * });
 * ```
 */
export const track = async <TEvent extends TrackingEvent>(
  event: TEvent,
  properties: EventProperties[TEvent],
) => {
  try {
    // Get user info from server session
    const userId = await getUserId('track analytics event');
    const user = userId ? await getCurrentUser() : null;

    const userProperties = user
      ? {
          email: user.email,
          name: user.name,
        }
      : undefined;

    const enrichedProperties = {
      ...properties,
      userId: userId || undefined,
      environment: 'server',
    };

    // PostHog tracking
    const posthog = getPostHogClient();
    if (posthog) {
      // Identify user if we have their info
      if (userProperties && userId) {
        posthog.identify({
          distinctId: userId,
          properties: userProperties,
        });
      }

      posthog.capture({
        distinctId: userId || 'anonymous',
        event,
        properties: enrichedProperties,
      });

      // Flush immediately for serverless
      await shutdownPostHog();
    }

    // Vercel Analytics
    await vercelTrackServer(event, cleanVercelProperties(enrichedProperties));

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[Analytics Server]', event, enrichedProperties);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Server analytics tracking error:', error);
  }
};

/**
 * Track event with explicit user ID (for webhooks, background jobs, etc.)
 *
 * @example
 * ```ts
 * // In a Stripe webhook
 * await trackWithUser(userId, TRACKING_EVENTS.CHECKOUT_COMPLETED, {
 *   productType: 'subscription',
 *   planName: 'RAINBOW',
 *   value: 1399,
 *   currency: 'gbp',
 *   transactionId: session.id,
 * });
 * ```
 */
export const trackWithUser = async <TEvent extends TrackingEvent>(
  userId: string,
  event: TEvent,
  properties: EventProperties[TEvent],
) => {
  try {
    const enrichedProperties = {
      ...properties,
      userId,
      environment: 'server',
    };

    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({
        distinctId: userId,
        event,
        properties: enrichedProperties,
      });
      await shutdownPostHog();
    }

    await vercelTrackServer(event, cleanVercelProperties(enrichedProperties));

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[Analytics Server]', event, enrichedProperties);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Server analytics tracking error:', error);
  }
};
