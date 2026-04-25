'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { trackSignUp } from '@/utils/pixels';

type SessionUser = {
  // Some session enrichment paths populate `dbId`; the default NextAuth
  // database-session shape exposes the user row's primary key as `id`.
  // Either is acceptable as the CAPI dedup eventId — they're the same
  // value when present.
  dbId?: string;
  id?: string;
  email?: string | null;
};

/**
 * Component that tracks user registration for Facebook/Pinterest pixels.
 *
 * It fires the CompleteRegistration event once per user by checking localStorage.
 * This ensures we only track the signup once, even if the user refreshes the page.
 *
 * Passes session.user.dbId as eventId so Meta deduplicates this client
 * fire against the matching server CAPI fire from the NextAuth signIn
 * callback (lib/conversion-api.ts → sendSignupConversionEvents).
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
      const sessionUser = session.user as SessionUser;
      trackSignUp({
        method: 'oauth',
        eventId: sessionUser.dbId ?? sessionUser.id,
      });

      localStorage.setItem(storageKey, 'true');
      hasTrackedRef.current = true;
    }
  }, [session, status]);

  // This component renders nothing
  return null;
};

export default PixelTracker;
