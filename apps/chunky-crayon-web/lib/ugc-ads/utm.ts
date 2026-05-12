/**
 * UTM URL builder for the UGC ads system.
 *
 * Hooks into the existing /start landing-page campaign system rather than
 * inventing a new one. See lib/coloring-image-purpose.ts:
 *
 *   purposeKey = 'ad:ugc-{handle}'        → on the ColoringImage row
 *   utm_campaign = 'ugc-{handle}'         → on the bio link
 *   getColoringImageForAdCampaign(utm_campaign) resolves the image
 *
 * Everything in this file is just string conventions over those two
 * formats. Keep the builders here, not inline at call sites.
 */

const UGC_CAMPAIGN_PREFIX = 'ugc-';

/** Stable campaign key for a persona — used as utm_campaign and inside purposeKey. */
export const ugcCampaignKey = (handle: string): string =>
  `${UGC_CAMPAIGN_PREFIX}${handle}`;

/** True for any UGC campaign string. */
export const isUgcCampaign = (campaign: string | undefined | null): boolean =>
  campaign?.startsWith(UGC_CAMPAIGN_PREFIX) ?? false;

/** Reverse: 'ugc-sarah_28' → 'sarah_28'. Returns null for non-UGC keys. */
export const handleFromCampaign = (campaign: string): string | null =>
  isUgcCampaign(campaign) ? campaign.slice(UGC_CAMPAIGN_PREFIX.length) : null;

/**
 * The link operator pastes into the TikTok bio. One link per persona,
 * stable for the persona's lifetime; ad-level distinction is tracked
 * via utm_content per UgcAd row.
 *
 * Note: utm_content is per-ad — but the bio link is per-persona. The ad
 * URL is built when the ad is generated and stored on the row; what
 * goes in the bio is the canonical link below (no utm_content).
 */
export const personaBioLink = (params: {
  handle: string;
  baseUrl?: string;
  locale?: string;
}): string => {
  const base = params.baseUrl ?? 'https://chunkycrayon.com';
  const locale = params.locale ?? 'en';
  const u = new URL(`${base}/${locale}/start`);
  u.searchParams.set('utm_source', 'tiktok');
  u.searchParams.set('utm_medium', 'bio');
  u.searchParams.set('utm_campaign', ugcCampaignKey(params.handle));
  return u.toString();
};

/**
 * The link associated with a specific ad. Same destination, but with
 * utm_content = adId so PostHog can attribute clicks down to the
 * specific creative. Mostly useful for cross-checking analytics, not
 * something the operator pastes — TikTok only lets you have one bio link.
 */
export const adAttributionLink = (params: {
  handle: string;
  adId: string;
  baseUrl?: string;
  locale?: string;
}): string => {
  const base = params.baseUrl ?? 'https://chunkycrayon.com';
  const locale = params.locale ?? 'en';
  const u = new URL(`${base}/${locale}/start`);
  u.searchParams.set('utm_source', 'tiktok');
  u.searchParams.set('utm_medium', 'bio');
  u.searchParams.set('utm_campaign', ugcCampaignKey(params.handle));
  u.searchParams.set('utm_content', params.adId);
  return u.toString();
};
