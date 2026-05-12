import { PostHog } from 'posthog-node';

// Initialize PostHog client for server-side feature flags
// This client can be used across the app for feature flag evaluation
export const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

/**
 * Helper to check a feature flag server-side
 * @param flagKey - The PostHog feature flag key
 * @param distinctId - User ID or 'server-side-check' for anonymous
 * @param defaultValue - Value to return if flag check fails
 */
export async function checkFeatureFlag(
  flagKey: string,
  distinctId: string = 'server-side-check',
  defaultValue: boolean = false,
): Promise<boolean> {
  try {
    const isEnabled = await posthog.isFeatureEnabled(flagKey, distinctId);
    return isEnabled ?? defaultValue;
  } catch (error) {
    console.error(`Error fetching PostHog feature flag "${flagKey}":`, error);
    return defaultValue;
  }
}

/**
 * Helper to resolve a multivariate feature flag server-side.
 * Returns the variant key (e.g. 'subscriptions_primary') or the default
 * if the flag can't be resolved.
 */
export async function getFeatureFlagVariant<T extends string>(
  flagKey: string,
  distinctId: string,
  defaultVariant: T,
): Promise<T> {
  try {
    const variant = await posthog.getFeatureFlag(flagKey, distinctId);
    if (typeof variant === 'string' && variant.length > 0) {
      return variant as T;
    }
    return defaultVariant;
  } catch (error) {
    console.error(`Error fetching PostHog variant flag "${flagKey}":`, error);
    return defaultVariant;
  }
}

// Add feature flag functions here as needed
// Example:
// export async function myNewFeatureFlag(): Promise<boolean> {
//   return checkFeatureFlag('my-new-feature', 'server-side-check', false);
// }

/**
 * Persistent characters feature (kid-created recurring figures with portraits,
 * outfits, and voice). Gates the /characters routes, the nav link, the picker
 * inside CreateColoringPageForm, and the action-layer guards in createCharacter
 * / createPendingColoringImage. Default off; admin + ezeikelpemberton see it via
 * the PostHog cohort.
 */
export async function charactersFeatureEnabled(
  distinctId?: string,
): Promise<boolean> {
  return checkFeatureFlag(
    'characters-feature',
    distinctId ?? 'server-side-check',
    false,
  );
}

/**
 * Marketing surfaces for characters — home-page "Meet your characters" section
 * and the /start landing-page hook. Held separate from the core feature flag
 * so the surfaces can be ramped independently of the feature itself (e.g. ship
 * the feature dark, then turn marketing on once retention signal is good).
 */
export async function charactersMarketingEnabled(
  distinctId?: string,
): Promise<boolean> {
  return checkFeatureFlag(
    'characters-marketing',
    distinctId ?? 'server-side-check',
    false,
  );
}
