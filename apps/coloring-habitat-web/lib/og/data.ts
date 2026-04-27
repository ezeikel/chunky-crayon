import { db } from "@one-colored-pixel/db";
import { client, isSanityConfigured, postBySlugQuery } from "@/lib/sanity";
import { BRAND } from "@/lib/db";
import type { PortableTextBlock } from "@portabletext/react";

/**
 * Data fetching utilities for OG image generation.
 * Minimal queries fetching only what's needed for OG images.
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
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" | null;
};

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
 * Recent, public coloring images for collage OG cards.
 *
 * We use line art (`svgUrl ?? url`) — not the `coloredReferenceUrl` JPEG —
 * so the OG card is an honest preview of what users actually get in-app.
 * The JPEG is a diffusion render we can't reproduce with flood-fill.
 *
 * Roadmap: docs/plans/active/REGION_PALETTE_FROM_JPEG.md
 */
export async function getFeaturedColoringImagesForOG(
  limit = 6,
  filterTag?: string,
): Promise<FeaturedOGImage[]> {
  const images = await db.coloringImage.findMany({
    where: {
      brand: BRAND,
      showInCommunity: true,
      ...(filterTag ? { tags: { has: filterTag } } : {}),
      OR: [{ svgUrl: { not: null } }, { url: { not: null } }],
    },
    select: {
      id: true,
      title: true,
      svgUrl: true,
      url: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return images
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
