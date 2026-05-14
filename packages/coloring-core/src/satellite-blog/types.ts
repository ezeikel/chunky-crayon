/**
 * Shared types for the satellite-site blog pipeline.
 *
 * One pipeline serves N satellite sites (routinecharts.com, stickerchartmaker.com,
 * etc.). The pipeline reads a SatelliteSiteConfig from SATELLITE_SITES keyed by
 * slug to know which prompts, Sanity dataset, and CC cross-link target to use.
 */

export type SatelliteBlogTopic = {
  topic: string;
  keywords: string[];
};

export type SatelliteSiteConfig = {
  /** Stable slug used in Sanity dataset name, worker route param, and UTM source. */
  slug: string;
  /** Human-readable site name for prompts and emails. */
  displayName: string;
  /** Domain without protocol — used for in-post brand references and CTAs. */
  domain: string;
  /** Sanity dataset for this site (same project, separate dataset). */
  sanityDataset: string;
  /** Brand voice / SEO / tone instructions for the BLOG_POST_SYSTEM prompt. */
  systemPromptBrandSection: string;
  /** Topic catalogue. */
  topics: SatelliteBlogTopic[];
  /** Featured-image style direction passed to gpt-image-2. */
  imageStylePrompt: string;
  /** Where the post's CTA should send people. */
  ccCtaUrl: string;
  /** UTM-friendly natural-language CTA copy hint Claude can paraphrase. */
  ccCtaHint: string;
};
