import { createClient, type SanityClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { ImageUrlBuilder, SanityImageSource } from "@sanity/image-url";
import type { SiteConfig } from "../config";

export const SANITY_API_VERSION = "2026-01-01";

export type { ImageUrlBuilder, SanityImageSource };

/**
 * Client-only Sanity setup. Deliberately does NOT depend on `sanity`,
 * `@sanity/astro`, or `@sanity/vision` — those Studio packages pull in a
 * conflicting `@portabletext/sanity-bridge` that broke CC's build.
 */
export const createSanityClient = (config: SiteConfig): SanityClient =>
  createClient({
    projectId: config.sanityProjectId,
    dataset: config.sanityDataset,
    apiVersion: SANITY_API_VERSION,
    useCdn: true,
  });

export const createUrlForImage = (
  client: SanityClient,
): ((source: SanityImageSource) => ImageUrlBuilder) => {
  const builder = imageUrlBuilder(client);
  return (source) => builder.image(source);
};
