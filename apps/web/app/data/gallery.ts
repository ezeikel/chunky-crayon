import { cacheLife, cacheTag } from 'next/cache';
import { db, GenerationType, Difficulty } from '@chunky-crayon/db';
import { GALLERY_CATEGORIES, getCategoryBySlug } from '@/constants';
import type { GalleryImage, PaginatedImagesResponse } from './coloring-image';

// Re-export Difficulty enum for use in components
export { Difficulty } from '@chunky-crayon/db';

// Difficulty labels for display
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]: 'Beginner',
  [Difficulty.INTERMEDIATE]: 'Intermediate',
  [Difficulty.ADVANCED]: 'Advanced',
  [Difficulty.EXPERT]: 'Expert',
};

// Difficulty descriptions
export const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]:
    'Simple shapes and big lines - perfect for toddlers and beginners',
  [Difficulty.INTERMEDIATE]: 'Moderate detail - great for kids',
  [Difficulty.ADVANCED]:
    'Detailed designs - ideal for teens and experienced colorists',
  [Difficulty.EXPERT]: 'Intricate patterns - challenging designs for adults',
};

// All difficulty levels for iteration
export const ALL_DIFFICULTIES = Object.values(Difficulty) as Difficulty[];

// Gallery-specific data fetching with Next.js 16 Cache Components
// Uses 'use cache' directive with cacheLife and cacheTag for:
// - SEO category pages with long cache times
// - Daily images archive
// - Community gallery

export const GALLERY_PAGE_SIZE = 24;

// ===== COMMUNITY IMAGES =====
// Public images created by users (shared with community)

const getCommunityImagesBase = async (
  cursor?: string,
  limit: number = GALLERY_PAGE_SIZE,
): Promise<PaginatedImagesResponse> => {
  'use cache';
  cacheLife('gallery-community');
  cacheTag('gallery-community');

  const images = await db.coloringImage.findMany({
    where: {
      userId: null, // Community images have no userId
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
      tags: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = images.length > limit;
  const resultImages = hasMore ? images.slice(0, limit) : images;
  const nextCursor = hasMore ? resultImages[resultImages.length - 1]?.id : null;

  return {
    images: resultImages,
    nextCursor,
    hasMore,
  };
};

export const getCommunityImages = async (
  cursor?: string,
  limit?: number,
): Promise<PaginatedImagesResponse> => {
  return getCommunityImagesBase(cursor, limit);
};

// ===== DAILY IMAGES =====
// Images generated automatically by the daily cron job

const getDailyImagesBase = async (
  cursor?: string,
  limit: number = GALLERY_PAGE_SIZE,
): Promise<PaginatedImagesResponse> => {
  'use cache';
  cacheLife('gallery-daily');
  cacheTag('gallery-daily');

  const images = await db.coloringImage.findMany({
    where: {
      generationType: GenerationType.DAILY,
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
      tags: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = images.length > limit;
  const resultImages = hasMore ? images.slice(0, limit) : images;
  const nextCursor = hasMore ? resultImages[resultImages.length - 1]?.id : null;

  return {
    images: resultImages,
    nextCursor,
    hasMore,
  };
};

export const getDailyImages = async (
  cursor?: string,
  limit?: number,
): Promise<PaginatedImagesResponse> => {
  return getDailyImagesBase(cursor, limit);
};

// Get the most recent daily image
// The component will check if it's from today or older
export const getLatestDailyImage = async () => {
  'use cache';
  cacheLife('gallery-daily');
  cacheTag('gallery-daily', 'gallery-daily-latest');

  return db.coloringImage.findFirst({
    where: {
      generationType: GenerationType.DAILY,
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      tags: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

// Wrapper that gets the latest daily image
// Date check happens in the component, not in the cached function
export const getTodaysDailyImage = async () => {
  return getLatestDailyImage();
};

// ===== CATEGORY IMAGES =====
// Images filtered by category tags for SEO pages

const getCategoryImagesBase = async (
  categorySlug: string,
  cursor?: string,
  limit: number = GALLERY_PAGE_SIZE,
): Promise<
  PaginatedImagesResponse & { category: (typeof GALLERY_CATEGORIES)[0] | null }
> => {
  'use cache';
  cacheLife('gallery-category');
  cacheTag('gallery-category', `gallery-category-${categorySlug}`);

  const category = getCategoryBySlug(categorySlug);

  if (!category) {
    return {
      images: [],
      nextCursor: null,
      hasMore: false,
      category: null,
    };
  }

  // Find images that have any of the category's tags
  // Using hasSome to match any tag in the array
  const images = await db.coloringImage.findMany({
    where: {
      OR: [
        // Match images with tags that contain any of the category tags
        {
          tags: {
            hasSome: category.tags,
          },
        },
        // Also include if title/description contains category keywords
        ...category.tags.map((tag) => ({
          OR: [
            { title: { contains: tag, mode: 'insensitive' as const } },
            { description: { contains: tag, mode: 'insensitive' as const } },
          ],
        })),
      ],
      // Only show public images in category pages
      userId: null,
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
      tags: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = images.length > limit;
  const resultImages = hasMore ? images.slice(0, limit) : images;
  const nextCursor = hasMore ? resultImages[resultImages.length - 1]?.id : null;

  return {
    images: resultImages,
    nextCursor,
    hasMore,
    category,
  };
};

export const getCategoryImages = async (
  categorySlug: string,
  cursor?: string,
  limit?: number,
) => {
  return getCategoryImagesBase(categorySlug, cursor, limit);
};

// ===== FEATURED/RECENT IMAGES =====
// For the main gallery page hero section

export const getFeaturedImages = async (limit: number = 6) => {
  'use cache';
  cacheLife('gallery-community');
  cacheTag('gallery-community', 'gallery-featured');

  return db.coloringImage.findMany({
    where: {
      userId: null, // Only community images
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      tags: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
};

// ===== CATEGORY COUNTS =====
// For displaying image counts on category cards

export const getCategoryCounts = async () => {
  'use cache';
  cacheLife('gallery-category');
  cacheTag('gallery-category', 'gallery-category-counts');

  const counts: Record<string, number> = {};

  // Get counts for each category
  for (const category of GALLERY_CATEGORIES) {
    const count = await db.coloringImage.count({
      where: {
        OR: [
          {
            tags: {
              hasSome: category.tags,
            },
          },
          ...category.tags.slice(0, 3).map((tag) => ({
            OR: [
              { title: { contains: tag, mode: 'insensitive' as const } },
              { description: { contains: tag, mode: 'insensitive' as const } },
            ],
          })),
        ],
        userId: null,
      },
    });
    counts[category.slug] = count;
  }

  return counts;
};

// ===== SINGLE CATEGORY COUNT =====
// For metadata generation (page titles with counts)

export const getCategoryCount = async (
  categorySlug: string,
): Promise<number> => {
  'use cache';
  cacheLife('gallery-category');
  cacheTag('gallery-category', `gallery-category-count-${categorySlug}`);

  const category = getCategoryBySlug(categorySlug);

  if (!category) {
    return 0;
  }

  return db.coloringImage.count({
    where: {
      OR: [
        {
          tags: {
            hasSome: category.tags,
          },
        },
        ...category.tags.slice(0, 3).map((tag) => ({
          OR: [
            { title: { contains: tag, mode: 'insensitive' as const } },
            { description: { contains: tag, mode: 'insensitive' as const } },
          ],
        })),
      ],
      userId: null,
    },
  });
};

// ===== STATS =====
// For displaying gallery statistics

export const getGalleryStats = async () => {
  'use cache';
  cacheLife('gallery-stats');
  cacheTag('gallery-stats');

  const [totalImages, communityImages, dailyImages] = await Promise.all([
    db.coloringImage.count(),
    db.coloringImage.count({ where: { userId: null } }),
    db.coloringImage.count({ where: { generationType: GenerationType.DAILY } }),
  ]);

  return {
    totalImages,
    communityImages,
    dailyImages,
  };
};

// ===== STATIC PARAMS =====
// For generateStaticParams in category pages

export const getAllCategorySlugs = () => {
  return GALLERY_CATEGORIES.map((cat) => ({ category: cat.slug }));
};

// ===== DIFFICULTY-BASED IMAGES =====
// Images filtered by difficulty level for SEO pages

const getDifficultyImagesBase = async (
  difficulty: Difficulty,
  cursor?: string,
  limit: number = GALLERY_PAGE_SIZE,
): Promise<PaginatedImagesResponse> => {
  'use cache';
  cacheLife('gallery-difficulty');
  cacheTag(
    'gallery-difficulty',
    `gallery-difficulty-${difficulty.toLowerCase()}`,
  );

  const images = await db.coloringImage.findMany({
    where: {
      difficulty,
      userId: null, // Only community images
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
      tags: true,
      difficulty: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = images.length > limit;
  const resultImages = hasMore ? images.slice(0, limit) : images;
  const nextCursor = hasMore ? resultImages[resultImages.length - 1]?.id : null;

  return {
    images: resultImages,
    nextCursor,
    hasMore,
  };
};

export const getDifficultyImages = async (
  difficulty: Difficulty,
  cursor?: string,
  limit?: number,
): Promise<PaginatedImagesResponse> => {
  return getDifficultyImagesBase(difficulty, cursor, limit);
};

// ===== DIFFICULTY COUNTS =====
// For displaying image counts on difficulty filter buttons

export const getDifficultyCounts = async () => {
  'use cache';
  cacheLife('gallery-difficulty');
  cacheTag('gallery-difficulty', 'gallery-difficulty-counts');

  const counts: Record<Difficulty, number> = {
    [Difficulty.BEGINNER]: 0,
    [Difficulty.INTERMEDIATE]: 0,
    [Difficulty.ADVANCED]: 0,
    [Difficulty.EXPERT]: 0,
  };

  // Get counts for each difficulty level
  const results = await Promise.all(
    ALL_DIFFICULTIES.map(async (difficulty) => ({
      difficulty,
      count: await db.coloringImage.count({
        where: {
          difficulty,
          userId: null,
        },
      }),
    })),
  );

  results.forEach(({ difficulty, count }) => {
    counts[difficulty] = count;
  });

  return counts;
};

// ===== CATEGORY IMAGES WITH DIFFICULTY FILTER =====
// For filtering category pages by difficulty

const getCategoryImagesWithDifficultyBase = async (
  categorySlug: string,
  difficulty?: Difficulty,
  cursor?: string,
  limit: number = GALLERY_PAGE_SIZE,
): Promise<
  PaginatedImagesResponse & { category: (typeof GALLERY_CATEGORIES)[0] | null }
> => {
  'use cache';
  cacheLife('gallery-category');
  cacheTag(
    'gallery-category',
    `gallery-category-${categorySlug}`,
    difficulty
      ? `gallery-difficulty-${difficulty.toLowerCase()}`
      : 'gallery-all-difficulties',
  );

  const category = getCategoryBySlug(categorySlug);

  if (!category) {
    return {
      images: [],
      nextCursor: null,
      hasMore: false,
      category: null,
    };
  }

  // Build base where clause for category
  const categoryWhere = {
    OR: [
      {
        tags: {
          hasSome: category.tags,
        },
      },
      ...category.tags.map((tag) => ({
        OR: [
          { title: { contains: tag, mode: 'insensitive' as const } },
          { description: { contains: tag, mode: 'insensitive' as const } },
        ],
      })),
    ],
    userId: null,
    ...(difficulty ? { difficulty } : {}),
  };

  const images = await db.coloringImage.findMany({
    where: categoryWhere,
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
      tags: true,
      difficulty: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = images.length > limit;
  const resultImages = hasMore ? images.slice(0, limit) : images;
  const nextCursor = hasMore ? resultImages[resultImages.length - 1]?.id : null;

  return {
    images: resultImages,
    nextCursor,
    hasMore,
    category,
  };
};

export const getCategoryImagesWithDifficulty = async (
  categorySlug: string,
  difficulty?: Difficulty,
  cursor?: string,
  limit?: number,
) => {
  return getCategoryImagesWithDifficultyBase(
    categorySlug,
    difficulty,
    cursor,
    limit,
  );
};

// ===== DIFFICULTY STATIC PARAMS =====
// For generateStaticParams in difficulty pages

export const getAllDifficultySlugs = () => {
  return ALL_DIFFICULTIES.map((difficulty) => ({
    difficulty: difficulty.toLowerCase(),
  }));
};

// Convert slug to Difficulty enum
export const getDifficultyFromSlug = (slug: string): Difficulty | null => {
  const upperSlug = slug.toUpperCase();
  if (Object.values(Difficulty).includes(upperSlug as Difficulty)) {
    return upperSlug as Difficulty;
  }
  return null;
};
