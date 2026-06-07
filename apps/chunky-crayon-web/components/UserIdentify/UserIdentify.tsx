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
    // Canonical distinct_id is the DB User.id (`dbId`). Every other
    // analytics surface keys on it: server `track` (getUserId →
    // session.user.id, which the PrismaAdapter populates from User.id),
    // `useAnalytics` (sessionUser.dbId), and the Stripe/RevenueCat
    // webhooks (`trackWithUser(user.id, …)`). Identifying the browser
    // person by `dbId` collapses all of those onto one person instead
    // of scattering events across an email-keyed person (this used to
    // pass `email || id`), a dbId-keyed person (webhooks), and an
    // anonymous guest. `id` is the same value as `dbId` under the
    // database session strategy, but we read `dbId` explicitly so the
    // intent — "the DB user id" — is unambiguous and can't silently
    // drift if the adapter's `id` semantics ever change.
    const userId = session.user.dbId || session.user.id;
    if (userId) {
      // Stitch the pre-signup journey onto the canonical id. The browser
      // is anonymous up to this point (see the note in
      // JoinColoringPageEmailListForm — email subscribers are tagged
      // with a person property rather than identified by email, so the
      // browser stays anonymous), and posthog-js automatically links the
      // current anonymous distinct_id's events to `userId` on the first
      // identify. That merge is what joins the guest browsing+coloring
      // history to the same person the server-side webhook later writes
      // `subscription_started` to. We deliberately do NOT call
      // `posthog.alias` here: alias requires the aliased id to never
      // have been used as a distinct_id, which we can't guarantee, and
      // a plain identify already performs the anonymous→identified merge.
      //
      // Identify in PostHog with locale.
      //
      // `has_account: true` is the positive counterpart to the
      // `email_subscriber: true` property set in
      // JoinColoringPageEmailListForm when someone joins the daily-image
      // email list. Without it, funnels can't distinguish a real app
      // account from an email-only subscriber, so the
      // signup → pricing step looks like a 0% drop-off when it's really
      // just email subscribers who never intended to open the app.
      // Filter funnels on `has_account = true` to measure true product
      // users, or `email_subscriber = true` (no account) for the
      // email re-activation path.
      posthog.identify(userId, {
        email: session.user.email,
        name: session.user.name,
        locale,
        has_account: true,
        account_identified_at: new Date().toISOString(),
      });

      // Identify in Sentry
      Sentry.setUser({
        id: session.user.dbId || session.user.id,
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
