'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from 'next-intl';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';

/**
 * UserIdentify component - Identifies users in PostHog and Sentry when authenticated.
 * Also sets the locale as a user property for all users (authenticated and guests).
 * This component should be rendered inside the SessionProvider.
 */
const UserIdentify = () => {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const hasIdentified = useRef(false);
  const hasSetLocale = useRef(false);

  // Set locale for all users (guests and authenticated) on initial load
  useEffect(() => {
    if (!hasSetLocale.current) {
      posthog.people.set({ locale });
      hasSetLocale.current = true;
    }
  }, [locale]);

  // Only identify once per session to avoid unnecessary calls
  if (status === 'authenticated' && session?.user && !hasIdentified.current) {
    const userId = session.user.email || session.user.id;
    if (userId) {
      // Identify in PostHog with locale
      posthog.identify(userId, {
        email: session.user.email,
        name: session.user.name,
        locale,
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
