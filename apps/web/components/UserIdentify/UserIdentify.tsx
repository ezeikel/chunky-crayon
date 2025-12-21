'use client';

import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';
import { useRef } from 'react';

/**
 * UserIdentify component - Identifies users in PostHog and Sentry when authenticated.
 * This component should be rendered inside the SessionProvider.
 */
const UserIdentify = () => {
  const { data: session, status } = useSession();
  const hasIdentified = useRef(false);

  // Only identify once per session to avoid unnecessary calls
  if (status === 'authenticated' && session?.user && !hasIdentified.current) {
    const userId = session.user.email || session.user.id;
    if (userId) {
      // Identify in PostHog
      posthog.identify(userId, {
        email: session.user.email,
        name: session.user.name,
      });

      // Identify in Sentry
      Sentry.setUser({
        id: session.user.id,
        email: session.user.email ?? undefined,
        username: session.user.name ?? undefined,
      });

      hasIdentified.current = true;
    }
  }

  // Reset identification when user logs out
  if (status === 'unauthenticated' && hasIdentified.current) {
    posthog.reset();
    Sentry.setUser(null);
    hasIdentified.current = false;
  }

  return null;
};

// Keep the old export name for backwards compatibility
export default UserIdentify;
