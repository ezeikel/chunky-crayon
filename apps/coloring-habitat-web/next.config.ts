import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheLife: {
    max: {
      stale: 60 * 60 * 24,
      revalidate: 60 * 60 * 24 * 7,
      expire: 60 * 60 * 24 * 30,
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coloringhabitat.com" },
    ],
  },
};

export default nextConfig;
