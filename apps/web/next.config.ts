import { withSentryConfig } from '@sentry/nextjs';
import { withPlausibleProxy } from 'next-plausible';
import type { NextConfig } from 'next';
import withVercelToolbar from '@vercel/toolbar/plugins/next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    // Blog list - updates daily via cron, but use webhook for immediate invalidation
    'blog-list': {
      stale: 60 * 60, // 1 hour - serve stale while revalidating
      revalidate: 60 * 60 * 24, // 24 hours - daily background revalidation
      expire: 60 * 60 * 24 * 30, // 30 days max
    },
    // Individual blog posts - rarely change, rely on webhook for updates
    'blog-post': {
      stale: 60 * 60 * 24, // 1 day - serve stale while revalidating
      revalidate: 60 * 60 * 24 * 7, // 7 days - weekly background revalidation
      expire: 60 * 60 * 24 * 90, // 90 days max
    },
    // Gallery category pages - SEO pages that change when new images added
    'gallery-category': {
      stale: 60 * 60 * 6, // 6 hours - serve stale while revalidating
      revalidate: 60 * 60 * 24, // 24 hours - daily background revalidation
      expire: 60 * 60 * 24 * 30, // 30 days max
    },
    // Gallery community/featured - updates frequently with new user images
    'gallery-community': {
      stale: 60 * 60, // 1 hour - serve stale while revalidating
      revalidate: 60 * 60 * 6, // 6 hours - revalidate 4x daily
      expire: 60 * 60 * 24 * 7, // 7 days max
    },
    // Daily gallery - updates once per day
    'gallery-daily': {
      stale: 60 * 60, // 1 hour - serve stale while revalidating
      revalidate: 60 * 60 * 24, // 24 hours - daily revalidation
      expire: 60 * 60 * 24 * 7, // 7 days max
    },
    // Gallery stats - cached longer, less critical
    'gallery-stats': {
      stale: 60 * 60 * 12, // 12 hours
      revalidate: 60 * 60 * 24, // 24 hours
      expire: 60 * 60 * 24 * 7, // 7 days max
    },
    // Gallery difficulty filtering - SEO pages that change when new images added
    'gallery-difficulty': {
      stale: 60 * 60 * 6, // 6 hours - serve stale while revalidating
      revalidate: 60 * 60 * 24, // 24 hours - daily background revalidation
      expire: 60 * 60 * 24 * 30, // 30 days max
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '**',
      },
      // Cloudflare R2 storage
      {
        protocol: 'https',
        hostname: 'assets.chunkycrayon.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        pathname: '**',
      },
    ],
  },
  serverExternalPackages: ['@react-pdf/renderer', 'playwright'],
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

// Create the next-intl plugin (points to i18n/request.ts)
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const configWithIntl = withNextIntl(nextConfig);

const configWithSentry = withSentryConfig(configWithIntl, sentryOptions);

const configWithPlausible = withPlausibleProxy()(configWithSentry);

const configWithVercelToolbar = withVercelToolbar()(configWithPlausible);

export default configWithVercelToolbar;
