import type { SiteConfig } from "../config";
import { createSanityClient } from "../sanity/client";
import {
  buildPublishedPostsQuery,
  buildPostBySlugQuery,
  type PostSummary,
  type PostFull,
} from "../sanity/queries";

/**
 * Blog data helpers for the thin app-side .astro shells.
 *
 * Astro can't route pages from a package, so the `.astro` files stay in
 * each app — but the Sanity fetch + data shaping live here. Each helper
 * takes the site's `SiteConfig` and returns exactly what the page needs.
 */

/** US-style long date, e.g. "January 1, 2026". */
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export const getBlogIndexData = async (
  config: SiteConfig,
): Promise<{ posts: PostSummary[] }> => {
  const client = createSanityClient(config);
  const posts = await client.fetch<PostSummary[]>(
    buildPublishedPostsQuery(config.slug),
  );
  return { posts };
};

export const getBlogPostData = async (
  config: SiteConfig,
  slug: string | undefined,
): Promise<{ post: PostFull | null }> => {
  const client = createSanityClient(config);
  const post = await client.fetch<PostFull | null>(
    buildPostBySlugQuery(config.slug),
    { slug },
  );
  return { post };
};
