'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/utils/analytics-client';
import { trackViewContent } from '@/utils/pixels';
import { TRACKING_EVENTS } from '@/constants';

type LandingPageViewTrackerProps = {
  page: 'homepage' | 'start';
  utmCampaign?: string;
  utmSource?: string;
  utmMedium?: string;
};

// Fires LANDING_PAGE_VIEWED to PostHog + Meta ViewContent + Pinterest
// pagevisit once on mount. Renders nothing. Sits inside the logged-out
// homepage and /start so PostHog can compare ad → land conversion
// against landing → demo / hero engagement on the same dashboard, AND
// the ad platforms get a retargeting-quality ViewContent for those
// surfaces.
export default function LandingPageViewTracker({
  page,
  utmCampaign,
  utmSource,
  utmMedium,
}: LandingPageViewTrackerProps) {
  const { track } = useAnalytics();

  useEffect(() => {
    track(TRACKING_EVENTS.LANDING_PAGE_VIEWED, {
      page,
      utmCampaign: utmCampaign ?? null,
      utmSource: utmSource ?? null,
      utmMedium: utmMedium ?? null,
    });
    trackViewContent({
      contentType: page === 'start' ? 'start_hero' : 'homepage',
    });
    // Track once per mount — page changes trigger a remount, so we
    // don't need to depend on the params here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
