'use client';

/**
 * Tiny client wrapper around the Characters CTA so we can fire the
 * CTA_CLICKED tracking event. Keeping the section itself a server
 * component means the whole "Meet your characters" surface still
 * prerenders cleanly.
 */

import Link from 'next/link';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

type Props = {
  cta: 'characters_home_section' | 'characters_landing_hook';
  location: 'homepage' | 'start';
};

const MakeYoursCta = ({ cta, location }: Props) => {
  return (
    <Link
      href="/characters"
      onClick={() => {
        trackEvent(TRACKING_EVENTS.CTA_CLICKED, {
          ctaName: cta,
          location,
          destination: '/characters',
        });
      }}
      className="inline-flex items-center justify-center rounded-full bg-crayon-orange text-white px-6 py-4 text-lg font-bold min-h-[44px] hover:scale-105 active:scale-95 transition-transform"
    >
      Make yours
    </Link>
  );
};

export default MakeYoursCta;
