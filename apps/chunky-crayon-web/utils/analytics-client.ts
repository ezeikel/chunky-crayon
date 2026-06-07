'use client';

import { useCallback } from 'react';
import { track as vercelTrack } from '@vercel/analytics';
import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import { POSTHOG_DISTINCT_ID_HEADER } from '@/constants';
import type { EventProperties, TrackingEvent } from '@/types/analytics';

type SessionUser = {
  dbId?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
};

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
 * Hook for tracking analytics events from client components.
 *
 * Sends events to both PostHog and Vercel Analytics with automatic
 * user enrichment from the session.
 *
 * @example
 * ```tsx
 * const { track } = useAnalytics();
 *
 * track(TRACKING_EVENTS.CREATION_SUBMITTED, {
 *   description: 'A dragon flying over a castle',
 *   inputType: 'text',
 *   characterCount: 30,
 * });
 * ```
 */
export const useAnalytics = () => {
  const { data: session } = useSession();

  const track = useCallback(
    <TEvent extends TrackingEvent & keyof EventProperties>(
      event: TEvent,
      properties: EventProperties[TEvent],
    ) => {
      try {
        const sessionUser = session?.user as SessionUser;
        const userId = sessionUser?.dbId;

        const enrichedProperties = {
          ...properties,
          userId,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          environment: 'client',
        };

        // PostHog tracking
        if (typeof window !== 'undefined' && posthog?.capture) {
          // Ensure user is identified if we have userId
          if (userId && sessionUser) {
            posthog.identify(userId, {
              email: sessionUser.email,
              name: sessionUser.name,
            });
          }
          posthog.capture(event, enrichedProperties);
        }

        // Vercel Analytics
        vercelTrack(event, cleanVercelProperties(enrichedProperties));

        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('[Analytics Client]', event, enrichedProperties);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Client analytics tracking error:', error);
      }
    },
    [session],
  );

  return { track };
};

/**
 * Returns the current browser's PostHog distinct_id, or undefined if
 * PostHog hasn't initialised (SSR, blocked, etc.). Use when calling an
 * API route that tracks server-side, so the route can pass it through to
 * `track()` and keep submit→outcome events on one person.
 *
 * @example
 * ```ts
 * await fetch('/api/tools/abc-tracing', {
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...posthogDistinctIdHeader(),
 *   },
 *   body: JSON.stringify(payload),
 * });
 * ```
 */
export const posthogDistinctIdHeader = (): Record<string, string> => {
  const id = getPosthogDistinctId();
  return id ? { [POSTHOG_DISTINCT_ID_HEADER]: id } : {};
};

/**
 * The raw browser PostHog distinct_id, or undefined if PostHog hasn't
 * initialised. Use when you need to pass the id as a value (e.g. into a
 * server-action argument or a JSON dispatch payload) rather than as a
 * header. Same source as `posthogDistinctIdHeader`.
 */
export const getPosthogDistinctId = (): string | undefined => {
  if (typeof window === 'undefined' || !posthog?.get_distinct_id) {
    return undefined;
  }
  try {
    return posthog.get_distinct_id() || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Direct tracking function for use outside of React components.
 * Prefer useAnalytics hook when possible for automatic session enrichment.
 *
 * @example
 * ```ts
 * trackEvent(TRACKING_EVENTS.CTA_CLICKED, {
 *   ctaName: 'Get Started',
 *   location: 'hero',
 * });
 * ```
 */
export const trackEvent = <
  TEvent extends TrackingEvent & keyof EventProperties,
>(
  event: TEvent,
  properties: EventProperties[TEvent],
) => {
  try {
    const enrichedProperties = {
      ...properties,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      environment: 'client',
    };

    if (typeof window !== 'undefined' && posthog?.capture) {
      posthog.capture(event, enrichedProperties);
    }

    vercelTrack(event, cleanVercelProperties(enrichedProperties));

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[Analytics Client]', event, enrichedProperties);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Client analytics tracking error:', error);
  }
};
