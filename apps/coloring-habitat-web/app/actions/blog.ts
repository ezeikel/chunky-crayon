"use server";

import {
  client,
  isSanityConfigured,
  postsQuery,
  postBySlugQuery,
  postsByCategoryQuery,
  categoriesQuery,
} from "@/lib/sanity";

export type BlogPost = {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt?: string;
  body?: unknown[];
  contentType?: string;
  eventDate?: string;
  featuredImage?: {
    asset: { _ref: string; url?: string };
    alt?: string;
    caption?: string;
  };
  author?: {
    name: string;
    slug: { current: string };
    image?: { asset: { _ref: string; url?: string } };
    title?: string;
    bio?: string;
  };
  categories?: Array<{
    title: string;
    slug: { current: string };
    color?: string;
  }>;
  publishedAt: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  generationMeta?: {
    estimatedReadTime?: number;
    topic?: string;
    contentType?: string;
  };
};

export type BlogCategory = {
  _id: string;
  title: string;
  slug: { current: string };
  description?: string;
  color?: string;
  postCount: number;
};

/**
 * Get all published blog posts, ordered by date descending
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  if (!isSanityConfigured) return [];
  try {
    return await client.fetch<BlogPost[]>(postsQuery);
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return [];
  }
}

/**
 * Get a single blog post by its slug, with expanded author and categories
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!isSanityConfigured) return null;
  try {
    return await client.fetch<BlogPost>(postBySlugQuery, { slug });
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return null;
  }
}

/**
 * Get blog posts filtered by category slug
 */
export async function getPostsByCategory(
  categorySlug: string,
): Promise<BlogPost[]> {
  if (!isSanityConfigured) return [];
  try {
    return await client.fetch<BlogPost[]>(postsByCategoryQuery, {
      categorySlug,
    });
  } catch (error) {
    console.error("Failed to fetch posts by category:", error);
    return [];
  }
}

/**
 * Get all blog categories with post counts
 */
export async function getCategories(): Promise<BlogCategory[]> {
  if (!isSanityConfigured) return [];
  try {
    return await client.fetch<BlogCategory[]>(categoriesQuery);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}
