import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

// Required for Sentry to instrument client-side navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  // Use local proxy to avoid ad blockers (falls back to direct in dev)
  api_host:
    process.env.NODE_ENV === 'production'
      ? '/ingest'
      : process.env.NEXT_PUBLIC_POSTHOG_HOST,
  ui_host: 'https://eu.posthog.com',
  // Include the defaults option for proper pageview/pageleave handling
  defaults: '2025-05-24',
  // Turn on debug in development mode
  debug: process.env.NODE_ENV === 'development',
});
