import type { SiteConfig } from "@one-colored-pixel/satellite-shared/config";

/**
 * Per-site config for kidsroadkit.com, satellite site #5 (the last).
 * All shared chrome (Sanity, analytics, blog helpers, cron) reads this.
 *
 * sanityDataset is the SHARED "routinecharts" dataset every satellite uses
 * (Sanity free tier caps datasets). Posts are partitioned by the `siteSlug`
 * field, not by a per-site dataset.
 */
export const siteConfig: SiteConfig = {
  slug: "kidsroadkit",
  name: "Kids Road Kit",
  domain: "kidsroadkit.com",
  tagline: "A printable activity pack for the long drive.",
  themeColor: "#0ea5e9",
  ccUtmSource: "kidsroadkit",
  sanityProjectId: "zeezp95x",
  sanityDataset: "routinecharts",
  navToolLabel: "Pack Maker",
};
