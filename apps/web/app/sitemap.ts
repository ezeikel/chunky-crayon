import type { MetadataRoute } from 'next';
import { db } from '@chunky-crayon/db';
import { GALLERY_CATEGORIES } from '@/constants';
import { routing } from '@/i18n/routing';

const baseUrl = 'https://chunkycrayon.com';

// Get all public coloring images for sitemap
async function getAllPublicImages() {
  return db.coloringImage.findMany({
    where: {
      userId: null, // Only public images
    },
    select: {
      id: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

// Get all published blog posts
async function getAllBlogPosts() {
  // Sanity client may not be configured in all environments
  try {
    const { client, isSanityConfigured } = await import('@/lib/sanity');
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = routing.locales;
  const urls: MetadataRoute.Sitemap = [];

  // Static pages with their priorities and change frequencies
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/gallery', priority: 0.9, changeFrequency: 'daily' as const },
    {
      path: '/gallery/daily',
      priority: 0.8,
      changeFrequency: 'daily' as const,
    },
    {
      path: '/gallery/community',
      priority: 0.7,
      changeFrequency: 'daily' as const,
    },
    { path: '/pricing', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/blog', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  // Age-based gallery pages
  const ageGroupPages = [
    '/gallery/for-toddlers',
    '/gallery/for-kids',
    '/gallery/for-teens',
    '/gallery/for-adults',
  ];

  // Difficulty pages
  const difficultyPages = [
    '/gallery/difficulty/beginner',
    '/gallery/difficulty/intermediate',
    '/gallery/difficulty/advanced',
    '/gallery/difficulty/expert',
  ];

  // Add static pages for each locale
  for (const page of staticPages) {
    for (const locale of locales) {
      urls.push({
        url: `${baseUrl}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}${page.path}`]),
          ),
        },
      });
    }
  }

  // Add category pages for each locale
  for (const category of GALLERY_CATEGORIES) {
    for (const locale of locales) {
      urls.push({
        url: `${baseUrl}/${locale}/gallery/${category.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}/gallery/${category.slug}`]),
          ),
        },
      });
    }
  }

  // Add age group pages for each locale
  for (const page of ageGroupPages) {
    for (const locale of locales) {
      urls.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}${page}`]),
          ),
        },
      });
    }
  }

  // Add difficulty pages for each locale
  for (const page of difficultyPages) {
    for (const locale of locales) {
      urls.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}${page}`]),
          ),
        },
      });
    }
  }

  // Fetch dynamic content
  const [images, blogPosts] = await Promise.all([
    getAllPublicImages(),
    getAllBlogPosts(),
  ]);

  // Add coloring image pages for each locale
  // These are the most important pages for SEO - individual coloring pages
  for (const image of images) {
    for (const locale of locales) {
      urls.push({
        url: `${baseUrl}/${locale}/coloring-image/${image.id}`,
        lastModified: image.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [
              l,
              `${baseUrl}/${l}/coloring-image/${image.id}`,
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
        url: `${baseUrl}/${locale}/blog/${post.slug.current}`,
        lastModified: new Date(post.publishedAt),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [
              l,
              `${baseUrl}/${l}/blog/${post.slug.current}`,
            ]),
          ),
        },
      });
    }
  }

  return urls;
}
