import posthog from 'posthog-js';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  // Include the defaults option for proper pageview/pageleave handling
  defaults: '2025-05-24',
  // Turn on debug in development mode
  debug: process.env.NODE_ENV === 'development',
});
