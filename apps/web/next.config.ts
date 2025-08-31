import { withSentryConfig } from '@sentry/nextjs';
import { withPlausibleProxy } from 'next-plausible';
import type { NextConfig } from 'next';
import withVercelToolbar from '@vercel/toolbar/plugins/next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'x0odfckl5uaoyscm.public.blob.vercel-storage.com',
        pathname: '**',
      },
    ],
  },
  serverExternalPackages: ['@react-pdf/renderer', 'playwright'],
  experimental: {
    ppr: true,
  },
};

// sentry configuration options
const sentryOptions = {
  silent: true,
  org: 'chewybytes',
  project: 'chunky-crayon-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

const configWithSentry = withSentryConfig(nextConfig, sentryOptions);

const configWithPlausible = withPlausibleProxy()(configWithSentry);

const configWithVercelToolbar = withVercelToolbar()(configWithPlausible);

export default configWithVercelToolbar;
