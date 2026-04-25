'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

type SeoLandingViewTrackerProps = {
  slug: string;
};

/**
 * Fires SEO_LANDING_PAGE_VIEWED once on mount for the long-tail
 * /coloring-pages/[slug] pages (distinct from LandingPageViewTracker
 * which targets the paid-ad funnel on / and /start). Captures the
 * referrer host so the dashboard can split SEO/social/direct without
 * waiting on the full $pageview pipeline.
 */
export default function SeoLandingViewTracker({
  slug,
}: SeoLandingViewTrackerProps) {
  const { track } = useAnalytics();

  useEffect(() => {
    let referrerHost: string | undefined;
    try {
      if (document.referrer) {
        referrerHost = new URL(document.referrer).host;
      }
    } catch {
      // ignore malformed referrers
    }

    track(TRACKING_EVENTS.SEO_LANDING_PAGE_VIEWED, {
      slug,
      referrerHost,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
