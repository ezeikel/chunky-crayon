import groq from "groq";

/**
 * GROQ queries for routinecharts.com blog pages.
 *
 * Only returns published posts (drafts have `_id` starting with `drafts.`).
 * Filters by `siteSlug` defensively even though the dataset is per-site;
 * keeps the queries copy-paste-safe when we replicate to other satellites.
 */

const SITE_SLUG = "routinecharts";

export const publishedPostsQuery = groq`
  *[_type == "post"
    && siteSlug == "${SITE_SLUG}"
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

export const postBySlugQuery = groq`
  *[_type == "post"
    && siteSlug == "${SITE_SLUG}"
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

export const allPostSlugsQuery = groq`
  *[_type == "post"
    && siteSlug == "${SITE_SLUG}"
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
