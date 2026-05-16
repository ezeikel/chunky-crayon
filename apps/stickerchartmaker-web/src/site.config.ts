import type { SiteConfig } from "@one-colored-pixel/satellite-shared/config";

/**
 * Per-site config for stickerchartmaker.com — satellite site #2.
 * All shared chrome (Sanity, analytics, blog helpers, cron) reads this.
 *
 * sanityDataset is the SHARED "routinecharts" dataset every satellite uses
 * (Sanity free tier caps datasets). Posts are partitioned by the `siteSlug`
 * field, not by a per-site dataset.
 */
export const siteConfig: SiteConfig = {
  slug: "stickerchartmaker",
  name: "Sticker Chart Maker",
  domain: "stickerchartmaker.com",
  tagline: "Make a sticker chart your kid will actually fill.",
  themeColor: "#f59e0b",
  ccUtmSource: "stickerchartmaker",
  sanityProjectId: "zeezp95x",
  sanityDataset: "routinecharts",
  navToolLabel: "Chart Maker",
};
