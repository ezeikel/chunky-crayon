/**
 * Per-site configuration for an Astro satellite (routinecharts.com et al.).
 *
 * Every consuming app defines its own `src/site.config.ts` exporting one
 * `SiteConfig`. All shared chrome (Sanity client, queries, analytics, blog
 * helpers, cron handler) is parameterised by this object so the package
 * stays site-agnostic and the apps stay thin.
 */
export type SiteConfig = {
  /** Stable slug used for Sanity `siteSlug` filtering + analytics `app` tag. */
  slug: string;
  /** Human-readable site name (e.g. "Routine Charts"). */
  name: string;
  /** Bare apex domain (e.g. "routinecharts.com"). */
  domain: string;
  /** Short marketing tagline (used in shared layouts later). */
  tagline: string;
  /** Brand theme color hex (e.g. "#f97316"). */
  themeColor: string;
  /** utm_source value for outbound chunkycrayon.com links. */
  ccUtmSource: string;
  /** Sanity project id (e.g. "zeezp95x"). */
  sanityProjectId: string;
  /** Sanity dataset (e.g. "routinecharts"). */
  sanityDataset: string;
  /** Nav label for the tool/home link (defaults to "Builder"). */
  navToolLabel?: string;
};
