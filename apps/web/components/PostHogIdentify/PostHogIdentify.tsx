'use client';

import { useSession } from 'next-auth/react';
import posthog from 'posthog-js';
import { useRef } from 'react';

/**
 * PostHogIdentify component - Identifies users in PostHog when they are authenticated.
 * This component should be rendered inside the SessionProvider.
 */
const PostHogIdentify = () => {
  const { data: session, status } = useSession();
  const hasIdentified = useRef(false);

  // Only identify once per session to avoid unnecessary calls
  if (status === 'authenticated' && session?.user && !hasIdentified.current) {
    const userId = session.user.email || session.user.id;
    if (userId) {
      posthog.identify(userId, {
        email: session.user.email,
        name: session.user.name,
      });
      hasIdentified.current = true;
    }
  }

  // Reset the identification flag when user logs out
  if (status === 'unauthenticated' && hasIdentified.current) {
    posthog.reset();
    hasIdentified.current = false;
  }

  return null;
};

export default PostHogIdentify;
