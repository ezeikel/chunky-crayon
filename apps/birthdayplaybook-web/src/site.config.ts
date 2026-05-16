import type { SiteConfig } from "@one-colored-pixel/satellite-shared/config";

/**
 * Per-site config for birthdayplaybook.com — satellite site #4.
 * All shared chrome (Sanity, analytics, blog helpers, cron) reads this.
 *
 * sanityDataset is the SHARED "routinecharts" dataset every satellite uses
 * (Sanity free tier caps datasets). Posts are partitioned by the `siteSlug`
 * field, not by a per-site dataset.
 */
export const siteConfig: SiteConfig = {
  slug: "birthdayplaybook",
  name: "Birthday Playbook",
  domain: "birthdayplaybook.com",
  tagline: "A calm, printable plan for your kid's party.",
  themeColor: "#ec4899",
  ccUtmSource: "birthdayplaybook",
  sanityProjectId: "zeezp95x",
  sanityDataset: "routinecharts",
  navToolLabel: "Party Planner",
};
