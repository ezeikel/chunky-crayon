import type { SiteConfig } from "@one-colored-pixel/satellite-shared/config";

/**
 * Per-site config for routinecharts.com — the first satellite.
 * All shared chrome (Sanity, analytics, blog helpers, cron) reads this.
 */
export const siteConfig: SiteConfig = {
  slug: "routinecharts",
  name: "Routine Charts",
  domain: "routinecharts.com",
  tagline: "Practical tips for parents who actually have to live this.",
  themeColor: "#f97316",
  ccUtmSource: "routinecharts",
  sanityProjectId: "zeezp95x",
  sanityDataset: "routinecharts",
};
