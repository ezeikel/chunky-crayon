import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/account/",
          "/signin",
          "/verify-request",
          "/auth-error",
        ],
      },
    ],
    sitemap: "https://coloringhabitat.com/sitemap.xml",
  };
}
