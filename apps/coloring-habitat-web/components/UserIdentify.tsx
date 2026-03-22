"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";

/**
 * UserIdentify component - Identifies authenticated users in PostHog.
 * Resets identity on sign-out. Render inside SessionProvider.
 */
const UserIdentify = () => {
  const { data: session, status } = useSession();
  const hasIdentified = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user && !hasIdentified.current) {
      const userId = session.user.email || session.user.id;
      if (userId) {
        posthog.identify(userId, {
          email: session.user.email,
          name: session.user.name,
        });
        hasIdentified.current = true;
      }
    }

    if (status === "unauthenticated" && hasIdentified.current) {
      posthog.reset();
      hasIdentified.current = false;
    }
  }, [status, session]);

  return null;
};

export default UserIdentify;
