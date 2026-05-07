'use client';

import { useEffect, useRef } from 'react';
import { trackViewContent } from '@/utils/pixels';

type ContentType = Parameters<typeof trackViewContent>[0]['contentType'];

type Props = {
  contentType: ContentType;
  contentId?: string;
  contentName?: string;
  value?: number;
  currency?: string;
};

/**
 * Drop-in tracker that fires Meta Pixel ViewContent + Pinterest Tag
 * pagevisit once on mount. Use on Server-Component landing pages
 * (homepage, /start, /create, /gallery, /tools, /tools/[slug]) where
 * the page itself can't run useEffect.
 *
 * Renders nothing. The strict-mode guard avoids the double fire that
 * `useEffect` would otherwise trigger in dev (production unaffected).
 */
const ViewContentTracker = ({
  contentType,
  contentId,
  contentName,
  value,
  currency,
}: Props) => {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    trackViewContent({ contentType, contentId, contentName, value, currency });
  }, [contentType, contentId, contentName, value, currency]);

  return null;
};

export default ViewContentTracker;
