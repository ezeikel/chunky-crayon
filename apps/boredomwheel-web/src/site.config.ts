import type { SiteConfig } from "@one-colored-pixel/satellite-shared/config";

/**
 * Per-site config for boredomwheel.com — satellite site #3.
 * All shared chrome (Sanity, analytics, blog helpers, cron) reads this.
 *
 * sanityDataset is the SHARED "routinecharts" dataset every satellite uses
 * (Sanity free tier caps datasets). Posts are partitioned by the `siteSlug`
 * field, not by a per-site dataset.
 */
export const siteConfig: SiteConfig = {
  slug: "boredomwheel",
  name: "Boredom Wheel",
  domain: "boredomwheel.com",
  tagline: "Spin it. Do it. Beat the boredom.",
  themeColor: "#06b6d4",
  ccUtmSource: "boredomwheel",
  sanityProjectId: "zeezp95x",
  sanityDataset: "routinecharts",
  navToolLabel: "The Wheel",
};
