/**
 * Helpers for reading ColoringImage.purposeKey. System-purpose images
 * use a stable, prefixed string so we can answer "is this an ad?",
 * "which campaign?" etc. without scattering `startsWith('ad:')` across
 * the codebase.
 *
 * Convention:
 *   ad:<campaign>        e.g. 'ad:trex'           — paid landing hero
 *   demo-reel            one fixture per record   — Playwright reel
 *   onboarding-splash    future                   — first-open image
 *   legacy-weekly|monthly retired cadence buckets  — historical only
 */

type PurposeKeyed = { purposeKey?: string | null };

export const AD_PURPOSE_PREFIX = 'ad:';

/** True when this image was generated to back a paid ad landing page. */
export const isAdImage = (image: PurposeKeyed): boolean =>
  image.purposeKey?.startsWith(AD_PURPOSE_PREFIX) ?? false;

/**
 * Extract the campaign key from an ad image (e.g. 'ad:trex' → 'trex').
 * Returns null for non-ad images so callers can narrow safely.
 */
export const getAdCampaignKey = (image: PurposeKeyed): string | null => {
  if (!isAdImage(image)) return null;
  return image.purposeKey!.slice(AD_PURPOSE_PREFIX.length);
};

/** Build the purpose key for a new ad image (e.g. 'trex' → 'ad:trex'). */
export const adPurposeKey = (campaignKey: string): string =>
  `${AD_PURPOSE_PREFIX}${campaignKey}`;
