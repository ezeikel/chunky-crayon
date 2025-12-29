import { db } from '@chunky-crayon/db';
import { client, isSanityConfigured, postBySlugQuery } from '@/lib/sanity';
import type { PortableTextBlock } from '@portabletext/react';

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
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | null;
};

/**
 * Fetch coloring image data for OG image generation
 */
export async function getColoringImageForOG(
  id: string,
): Promise<ColoringImageOGData | null> {
  const image = await db.coloringImage.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      url: true,
      svgUrl: true,
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
    difficulty: image.difficulty,
  };
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
