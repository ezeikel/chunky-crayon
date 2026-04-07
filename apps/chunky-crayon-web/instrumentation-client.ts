import posthog from 'posthog-js';
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  sendDefaultPii: false,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.2,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

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

// eslint-disable-next-line import-x/prefer-default-export
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
