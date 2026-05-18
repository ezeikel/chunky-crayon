import { describe, expect, it } from 'vitest';
import {
  adPurposeKey,
  getAdCampaignKey,
  isAdImage,
} from './coloring-image-purpose';

/**
 * purposeKey routing decides whether a generated image backs a paid ad
 * landing page and which campaign it belongs to. Ad spend attribution and
 * the "don't show ad fixtures in the public gallery" rule both ride on
 * these three helpers, so the prefix contract is pinned.
 */

describe('isAdImage', () => {
  it('is true only for the ad: prefix', () => {
    expect(isAdImage({ purposeKey: 'ad:trex' })).toBe(true);
    expect(isAdImage({ purposeKey: 'ad:' })).toBe(true);
  });

  it('is false for non-ad purposes and missing keys', () => {
    expect(isAdImage({ purposeKey: 'demo-reel' })).toBe(false);
    expect(isAdImage({ purposeKey: 'legacy-weekly' })).toBe(false);
    expect(isAdImage({ purposeKey: null })).toBe(false);
    expect(isAdImage({ purposeKey: undefined })).toBe(false);
    expect(isAdImage({})).toBe(false);
  });

  it('does not treat "ad" as a substring match (must be the prefix)', () => {
    expect(isAdImage({ purposeKey: 'gradient' })).toBe(false);
    expect(isAdImage({ purposeKey: 'not-ad:trex' })).toBe(false);
  });
});

describe('getAdCampaignKey', () => {
  it('extracts the campaign segment after the prefix', () => {
    expect(getAdCampaignKey({ purposeKey: 'ad:trex' })).toBe('trex');
    expect(getAdCampaignKey({ purposeKey: 'ad:summer-2026' })).toBe(
      'summer-2026',
    );
  });

  it('returns null for non-ad images so callers can narrow safely', () => {
    expect(getAdCampaignKey({ purposeKey: 'demo-reel' })).toBeNull();
    expect(getAdCampaignKey({ purposeKey: null })).toBeNull();
  });
});

describe('adPurposeKey', () => {
  it('builds a prefixed key', () => {
    expect(adPurposeKey('trex')).toBe('ad:trex');
  });

  it('round-trips with getAdCampaignKey', () => {
    const campaign = 'winter-wonderland';
    expect(getAdCampaignKey({ purposeKey: adPurposeKey(campaign) })).toBe(
      campaign,
    );
  });
});
