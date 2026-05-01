import { db } from '@one-colored-pixel/db';
import { client, isSanityConfigured, postBySlugQuery } from '@/lib/sanity';
import type { PortableTextBlock } from '@portabletext/react';
import { BRAND } from '@/lib/db';

/**
 * Data fetching utilities for OG image generation.
 *
 * These are minimal queries that fetch only the data needed for OG images.
 * They do NOT use 'use cache' directive since OG routes handle their own caching.
 */

// Coloring image data for OG
export type ColoringImageOGData = {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  url: string | null;
  svgUrl: string | null;
  coloredReferenceUrl: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | null;
};

/**
 * Fetch coloring image data for OG image generation
 */
export async function getColoringImageForOG(
  id: string,
): Promise<ColoringImageOGData | null> {
  const image = await db.coloringImage.findFirst({
    where: { id, brand: BRAND },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      url: true,
      svgUrl: true,
      coloredReferenceUrl: true,
      difficulty: true,
    },
  });

  if (!image) return null;

  return {
    id: image.id,
    title: image.title,
    description: image.description,
    tags: image.tags,
    url: image.url,
    svgUrl: image.svgUrl,
    coloredReferenceUrl: image.coloredReferenceUrl,
    difficulty: image.difficulty,
  };
}

// Featured coloring images for collage-style OG (homepage / landing pages)
export type FeaturedOGImage = {
  id: string;
  imageUrl: string;
  title: string;
};

/**
 * Fetch a small set of public coloring images for collage OG cards.
 *
 * Selection rules (in order):
 *  1. Take all rows where `featuredForOG = true` (admin-curated favourites)
 *  2. If fewer than `limit` are flagged, top up with most-recent
 *     `showInCommunity = true` rows (excluding ones already picked)
 *  3. Shuffle the curated subset so the daily OG cron rotates through
 *     different combinations when more than `limit` are flagged
 *
 * We deliberately use the **line art** (`svgUrl ?? url`) — not the
 * `coloredReferenceUrl` JPEG — so the OG card is an honest preview of what
 * the user actually gets in-app. The JPEG is a beautiful diffusion render
 * we can't reproduce with flood-fill, so showing it would mislead users
 * about the in-product experience.
 *
 * Tracked roadmap to use the real region-fill render here once we have a
 * pre-rendered "regions painted" PNG: docs/plans/active/REGION_PALETTE_FROM_JPEG.md
 */
export async function getFeaturedColoringImagesForOG(
  limit = 6,
  filterTag?: string,
): Promise<FeaturedOGImage[]> {
  const baseWhere = {
    brand: BRAND,
    showInCommunity: true,
    ...(filterTag ? { tags: { has: filterTag } } : {}),
    OR: [{ svgUrl: { not: null } }, { url: { not: null } }],
  };

  const featured = await db.coloringImage.findMany({
    where: { ...baseWhere, featuredForOG: true },
    select: { id: true, title: true, svgUrl: true, url: true },
    orderBy: { createdAt: 'desc' },
  });

  // Random shuffle so a flagged pool of >limit gets rotation across cron
  // runs. Fisher-Yates on a copy.
  const shuffled = [...featured];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  let picks = shuffled.slice(0, limit);

  // Top-up from most-recent if not enough flagged. The seen-id guard
  // prevents the same row appearing twice when featured is small.
  if (picks.length < limit) {
    const seen = new Set(picks.map((p) => p.id));
    const fill = await db.coloringImage.findMany({
      where: {
        ...baseWhere,
        featuredForOG: false,
        id: { notIn: [...seen] },
      },
      select: { id: true, title: true, svgUrl: true, url: true },
      orderBy: { createdAt: 'desc' },
      take: limit - picks.length,
    });
    picks = [...picks, ...fill];
  }

  return picks
    .map((i) => ({
      id: i.id,
      title: i.title,
      imageUrl: (i.svgUrl ?? i.url) as string,
    }))
    .filter((i) => !!i.imageUrl);
}

// Blog post data for OG
export type BlogPostOGData = {
  title: string;
  excerpt: string | null;
  author: {
    name: string;
    image?: { asset: { _ref: string } };
  } | null;
  categories: Array<{ title: string; color?: string }>;
  publishedAt: string;
  featuredImage: {
    asset: { _ref: string };
    alt?: string;
  } | null;
  readTime: number | null;
};

/**
 * Fetch blog post data for OG image generation
 */
export async function getBlogPostForOG(
  slug: string,
): Promise<BlogPostOGData | null> {
  if (!isSanityConfigured) return null;

  type Post = {
    _id: string;
    title: string;
    excerpt?: string;
    body: PortableTextBlock[];
    featuredImage?: {
      asset: { _ref: string };
      alt?: string;
    };
    author?: {
      name: string;
      image?: { asset: { _ref: string } };
    };
    categories?: Array<{
      title: string;
      color?: string;
    }>;
    publishedAt: string;
    generationMeta?: {
      estimatedReadTime?: number;
    };
  };

  const post = await client.fetch<Post | null>(postBySlugQuery, { slug });

  if (!post) return null;

  return {
    title: post.title,
    excerpt: post.excerpt || null,
    author: post.author || null,
    categories: post.categories || [],
    publishedAt: post.publishedAt,
    featuredImage: post.featuredImage || null,
    readTime: post.generationMeta?.estimatedReadTime || null,
  };
}

// Shared artwork data for OG
export type SharedArtworkOGData = {
  id: string;
  title: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  creatorName: string | null;
  originalTitle: string | null;
};

/**
 * Fetch shared artwork data for OG image generation
 */
export async function getSharedArtworkForOG(
  shareCode: string,
): Promise<SharedArtworkOGData | null> {
  const share = await db.artworkShare.findUnique({
    where: { shareCode },
    select: {
      artwork: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          thumbnailUrl: true,
          coloringImage: {
            select: {
              title: true,
            },
          },
          // Prefer profile name over user name for privacy
          profile: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!share?.artwork) return null;

  const artwork = share.artwork;

  return {
    id: artwork.id,
    title: artwork.title,
    imageUrl: artwork.imageUrl,
    thumbnailUrl: artwork.thumbnailUrl,
    creatorName: artwork.profile?.name || null,
    originalTitle: artwork.coloringImage?.title || null,
  };
}
