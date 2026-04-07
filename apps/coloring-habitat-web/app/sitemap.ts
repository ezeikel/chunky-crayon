import type { MetadataRoute } from "next";
import { db } from "@one-colored-pixel/db";
import { GALLERY_CATEGORIES } from "@/constants";
import { ALL_DIFFICULTIES } from "@/app/data/gallery";
import { routing } from "@/i18n/routing";
import { BRAND } from "@/lib/db";

const BASE_URL = "https://coloringhabitat.com";

// Get all public coloring images for sitemap
async function getAllPublicImages() {
  return db.coloringImage.findMany({
    where: { brand: BRAND },
    select: { id: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
}

// Get all published blog posts from Sanity
async function getAllBlogPosts() {
  try {
    const { client, isSanityConfigured } = await import("@/lib/sanity");
    if (!isSanityConfigured) return [];

    return client.fetch<
      Array<{ slug: { current: string }; publishedAt: string }>
    >(
      `*[_type == "post" && status == "published"] | order(publishedAt desc) {
        slug,
        publishedAt
      }`,
    );
  } catch {
    return [];
  }
}

// Get all blog categories from Sanity
async function getAllBlogCategories() {
  try {
    const { client, isSanityConfigured } = await import("@/lib/sanity");
    if (!isSanityConfigured) return [];

    return client.fetch<Array<{ slug: { current: string } }>>(
      `*[_type == "category"] { slug }`,
    );
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = routing.locales;
  const urls: MetadataRoute.Sitemap = [];

  // Static pages with their priorities and change frequencies
  const staticPages = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/gallery", priority: 0.9, changeFrequency: "daily" as const },
    {
      path: "/gallery/daily",
      priority: 0.8,
      changeFrequency: "daily" as const,
    },
    { path: "/pricing", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  // Add static pages for each locale
  for (const page of staticPages) {
    for (const locale of locales) {
      urls.push({
        url: `${BASE_URL}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}${page.path}`]),
          ),
        },
      });
    }
  }

  // Add category pages for each locale
  for (const category of GALLERY_CATEGORIES) {
    for (const locale of locales) {
      urls.push({
        url: `${BASE_URL}/${locale}/gallery/${category.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [
              l,
              `${BASE_URL}/${l}/gallery/${category.slug}`,
            ]),
          ),
        },
      });
    }
  }

  // Add difficulty pages for each locale
  for (const diff of ALL_DIFFICULTIES) {
    const path = `/gallery/difficulty/${diff.toLowerCase()}`;
    for (const locale of locales) {
      urls.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}${path}`]),
          ),
        },
      });
    }
  }

  // Fetch dynamic content
  const [images, blogPosts, blogCategories] = await Promise.all([
    getAllPublicImages(),
    getAllBlogPosts(),
    getAllBlogCategories(),
  ]);

  // Add coloring image pages for each locale
  for (const image of images) {
    for (const locale of locales) {
      urls.push({
        url: `${BASE_URL}/${locale}/coloring-image/${image.id}`,
        lastModified: image.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [
              l,
              `${BASE_URL}/${l}/coloring-image/${image.id}`,
            ]),
          ),
        },
      });
    }
  }

  // Add blog posts for each locale
  for (const post of blogPosts) {
    for (const locale of locales) {
      urls.push({
        url: `${BASE_URL}/${locale}/blog/${post.slug.current}`,
        lastModified: new Date(post.publishedAt),
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [
              l,
              `${BASE_URL}/${l}/blog/${post.slug.current}`,
            ]),
          ),
        },
      });
    }
  }

  // Add blog category pages for each locale
  for (const category of blogCategories) {
    for (const locale of locales) {
      urls.push({
        url: `${BASE_URL}/${locale}/blog/category/${category.slug.current}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.5,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [
              l,
              `${BASE_URL}/${l}/blog/category/${category.slug.current}`,
            ]),
          ),
        },
      });
    }
  }

  return urls;
}
