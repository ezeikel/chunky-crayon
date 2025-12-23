'use client';

import Image from 'next/image';
import posthog from 'posthog-js';
import { toast } from 'sonner';
import cn from '@/utils/cn';
import {
  APP_STORE_LINKS,
  APP_STORE_IMAGES,
  TRACKING_EVENTS,
} from '@/constants';

type AppStoreButtonsProps = {
  className?: string;
  location: 'footer' | 'hero' | 'other';
};

const AppStoreButtons = ({ className, location }: AppStoreButtonsProps) => {
  const handleAppStoreClick = () => {
    posthog.capture(TRACKING_EVENTS.APP_STORE_CLICKED, {
      button_location: location,
    });

    if (APP_STORE_LINKS.APPLE) {
      window.open(APP_STORE_LINKS.APPLE, '_blank', 'noopener,noreferrer');
    } else {
      toast('Coming Soon!', {
        description: 'Our iOS app is on the way. Stay tuned!',
      });
    }
  };

  const handlePlayStoreClick = () => {
    posthog.capture(TRACKING_EVENTS.PLAY_STORE_CLICKED, {
      button_location: location,
    });

    if (APP_STORE_LINKS.GOOGLE) {
      window.open(APP_STORE_LINKS.GOOGLE, '_blank', 'noopener,noreferrer');
    } else {
      toast('Coming Soon!', {
        description: 'Our Android app is on the way. Stay tuned!',
      });
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        onClick={handleAppStoreClick}
        className="transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange focus-visible:ring-offset-2 rounded-lg"
        aria-label="Download on the App Store"
      >
        <Image
          src={APP_STORE_IMAGES.APPLE.DARK}
          alt="Download on the App Store"
          width={135}
          height={40}
          className="h-10 w-auto"
        />
      </button>
      <button
        type="button"
        onClick={handlePlayStoreClick}
        className="transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange focus-visible:ring-offset-2 rounded-lg"
        aria-label="Get it on Google Play"
      >
        <Image
          src={APP_STORE_IMAGES.GOOGLE.DARK}
          alt="Get it on Google Play"
          width={135}
          height={40}
          className="h-10 w-auto"
        />
      </button>
    </div>
  );
};

export default AppStoreButtons;
