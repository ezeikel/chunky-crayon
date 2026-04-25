'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

/**
 * Fires TEACHER_HUB_VIEWED once on mount of /for-teachers. Renders
 * nothing. Lets the Free Tools dashboard track teacher hub funnel
 * separately from the generic /tools hub.
 */
export default function TeacherHubViewTracker() {
  const { track } = useAnalytics();

  useEffect(() => {
    track(TRACKING_EVENTS.TEACHER_HUB_VIEWED, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
