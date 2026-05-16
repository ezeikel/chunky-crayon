import groq from "groq";

/**
 * GROQ query builders for satellite blog pages.
 *
 * Only returns published posts (drafts have `_id` starting with `drafts.`).
 * Filters by `siteSlug` defensively even though the dataset is per-site;
 * keeps the queries copy-paste-safe across satellites. The slug is passed
 * in rather than hardcoded so the package stays site-agnostic.
 */

export const buildPublishedPostsQuery = (siteSlug: string) => groq`
  *[_type == "post"
    && siteSlug == "${siteSlug}"
    && publishedAt < now()
    && !(_id in path("drafts.**"))
  ] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    heroImage {
      ...,
      "alt": coalesce(alt, ""),
    }
  }
`;

export const buildPostBySlugQuery = (siteSlug: string) => groq`
  *[_type == "post"
    && siteSlug == "${siteSlug}"
    && slug.current == $slug
    && !(_id in path("drafts.**"))
  ][0] {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    body,
    heroImage {
      ...,
      "alt": coalesce(alt, ""),
    }
  }
`;

export const buildAllPostSlugsQuery = (siteSlug: string) => groq`
  *[_type == "post"
    && siteSlug == "${siteSlug}"
    && !(_id in path("drafts.**"))
  ].slug.current
`;

export type PostSummary = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  heroImage: SanityImage | null;
};

export type PostFull = PostSummary & {
  body: unknown[];
};

export type SanityImage = {
  asset?: { _ref: string };
  alt?: string;
};
