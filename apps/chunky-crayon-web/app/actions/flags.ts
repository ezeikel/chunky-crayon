'use server';

import { updateTag } from 'next/cache';

/**
 * Invalidate cache for a specific feature flag
 * Call this when a flag value changes in PostHog
 * @param flagKey - The feature flag key to invalidate
 */
export const invalidateFlagCache = async (flagKey: string) => {
  updateTag(`feature:${flagKey}`);
};

/**
 * Invalidate cache for multiple feature flags
 * @param flagKeys - Array of feature flag keys to invalidate
 */
export const invalidateMultipleFlagCaches = async (flagKeys: string[]) => {
  for (const flagKey of flagKeys) {
    updateTag(`feature:${flagKey}`);
  }
};
