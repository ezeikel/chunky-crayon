/**
 * Analytics utilities for Chunky Crayon.
 *
 * For client-side tracking in React components:
 *   import { useAnalytics, trackEvent } from '@/utils/analytics-client';
 *
 * For server-side tracking in server actions/API routes:
 *   import { track, trackWithUser } from '@/utils/analytics-server';
 */

// Clean properties for Vercel Analytics (only string, number, boolean, null)
export const cleanVercelProperties = (
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
