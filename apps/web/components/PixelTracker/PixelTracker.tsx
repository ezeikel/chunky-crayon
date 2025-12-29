'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { trackSignUp } from '@/utils/pixels';

/**
 * Component that tracks user registration for Facebook/Pinterest pixels.
 *
 * It fires the CompleteRegistration event once per user by checking localStorage.
 * This ensures we only track the signup once, even if the user refreshes the page.
 */
const PixelTracker = () => {
  const { data: session, status } = useSession();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    // Only run once we have a valid session
    if (status !== 'authenticated' || !session?.user?.email) {
      return;
    }

    // Prevent multiple firings in the same render cycle
    if (hasTrackedRef.current) {
      return;
    }

    const storageKey = `pixel_signup_tracked_${session.user.email}`;
    const alreadyTracked = localStorage.getItem(storageKey);

    if (!alreadyTracked) {
      // Fire the CompleteRegistration event
      trackSignUp({
        method: 'oauth', // We can't determine exact method from session
      });

      // Mark as tracked
      localStorage.setItem(storageKey, 'true');
      hasTrackedRef.current = true;
    }
  }, [session, status]);

  // This component renders nothing
  return null;
};

export default PixelTracker;
