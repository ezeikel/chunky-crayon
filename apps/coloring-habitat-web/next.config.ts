import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    // Maximum cache - static content that rarely changes
    max: {
      stale: 60 * 60 * 24,
      revalidate: 60 * 60 * 24 * 7,
      expire: 60 * 60 * 24 * 30,
    },
    // Daily cache - content that updates once per day (e.g. Footer year)
    days: {
      stale: 60 * 60 * 24,
      revalidate: 60 * 60 * 24,
      expire: 60 * 60 * 24 * 30,
    },
    // Hourly cache - content that updates frequently
    hours: {
      stale: 60,
      revalidate: 60 * 60,
      expire: 60 * 60 * 24,
    },
    // Blog list - updates via cron, webhook for immediate invalidation
    "blog-list": {
      stale: 60 * 60,
      revalidate: 60 * 60 * 24,
      expire: 60 * 60 * 24 * 30,
    },
    // Individual blog posts - rarely change, rely on webhook for updates
    "blog-post": {
      stale: 60 * 60 * 24,
      revalidate: 60 * 60 * 24 * 7,
      expire: 60 * 60 * 24 * 90,
    },
    // Gallery category pages - change when new images added
    "gallery-category": {
      stale: 60 * 60 * 6,
      revalidate: 60 * 60 * 24,
      expire: 60 * 60 * 24 * 30,
    },
    // Gallery main/featured - updates with new images
    gallery: {
      stale: 60 * 5,
      revalidate: 60 * 60,
      expire: 60 * 60 * 24,
    },
    // Daily gallery - updates once per day via cron
    "gallery-daily": {
      stale: 60 * 60,
      revalidate: 60 * 60 * 24,
      expire: 60 * 60 * 24 * 7,
    },
    // Gallery difficulty pages
    "gallery-difficulty": {
      stale: 60 * 60 * 6,
      revalidate: 60 * 60 * 24,
      expire: 60 * 60 * 24 * 30,
    },
    // Gallery stats (total counts)
    "gallery-stats": {
      stale: 60 * 60,
      revalidate: 60 * 60 * 24,
      expire: 60 * 60 * 24 * 30,
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coloringhabitat.com" },
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/_r2/:path*",
        destination: "https://assets.coloringhabitat.com/:path*",
      },
    ];
  },
};

export default nextConfig;
