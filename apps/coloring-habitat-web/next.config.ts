import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    max: {
      stale: 60 * 60 * 24,
      revalidate: 60 * 60 * 24 * 7,
      expire: 60 * 60 * 24 * 30,
    },
    days: {
      stale: 60 * 60 * 24,
      revalidate: 60 * 60 * 24,
      expire: 60 * 60 * 24 * 30,
    },
    hours: {
      stale: 60,
      revalidate: 60 * 60,
      expire: 60 * 60 * 24,
    },
    gallery: {
      stale: 60 * 5,
      revalidate: 60 * 60,
      expire: 60 * 60 * 24,
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
