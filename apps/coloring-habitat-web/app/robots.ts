import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/signin", "/verify-request", "/auth-error"],
      },
    ],
    sitemap: "https://coloringhabitat.com/sitemap.xml",
  };
}
