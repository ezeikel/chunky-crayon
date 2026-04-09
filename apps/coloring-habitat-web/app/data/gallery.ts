import { cacheLife, cacheTag } from "next/cache";
import { db, GenerationType, Difficulty } from "@one-colored-pixel/db";
import { GALLERY_CATEGORIES, getCategoryBySlug } from "@/constants";
import { BRAND } from "@/lib/db";
import type { GalleryImage, PaginatedImagesResponse } from "./coloring-image";

// Re-export Difficulty enum for use in components
export { Difficulty } from "@one-colored-pixel/db";

// Difficulty labels for display
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]: "Beginner",
  [Difficulty.INTERMEDIATE]: "Intermediate",
  [Difficulty.ADVANCED]: "Advanced",
  [Difficulty.EXPERT]: "Expert",
};

// Difficulty descriptions
export const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]:
    "Simple designs with large areas - perfect for beginners",
  [Difficulty.INTERMEDIATE]: "Moderate detail - great for relaxation",
  [Difficulty.ADVANCED]: "Detailed designs - ideal for experienced colorists",
  [Difficulty.EXPERT]: "Intricate patterns - challenging designs for experts",
};

// All difficulty levels for iteration
export const ALL_DIFFICULTIES = Object.values(Difficulty) as Difficulty[];

export const GALLERY_PAGE_SIZE = 24;

// Brand-scoped base where clause
const brandWhere = { brand: BRAND };

// ===== ALL GALLERY IMAGES =====
// Public gallery images for the main gallery page (brand-filtered)

const getGalleryImagesBase = async (
  cursor?: string,
  limit: number = GALLERY_PAGE_SIZE,
): Promise<PaginatedImagesResponse> => {
  "use cache";
  cacheLife("gallery");
  cacheTag("gallery", "gallery-all");

  const images = await db.coloringImage.findMany({
    where: brandWhere,
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
      createdAt: "desc",
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
  const nextCursor = hasMore
    ? (resultImages[resultImages.length - 1]?.id ?? null)
    : null;

  return {
    images: resultImages,
    nextCursor,
    hasMore,
  };
};

export const getGalleryImages = async (
  cursor?: string,
  limit?: number,
): Promise<PaginatedImagesResponse> => {
  return getGalleryImagesBase(cursor, limit);
};

// ===== DAILY IMAGES =====

const getDailyImagesBase = async (
  cursor?: string,
  limit: number = GALLERY_PAGE_SIZE,
): Promise<PaginatedImagesResponse> => {
  "use cache";
  cacheLife("gallery-daily");
  cacheTag("gallery", "gallery-daily");

  const images = await db.coloringImage.findMany({
    where: {
      ...brandWhere,
      generationType: GenerationType.DAILY,
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
      tags: true,
      difficulty: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
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
  const nextCursor = hasMore
    ? (resultImages[resultImages.length - 1]?.id ?? null)
    : null;

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
export const getLatestDailyImage = async () => {
  "use cache";
  cacheLife("gallery-daily");
  cacheTag("gallery", "gallery-daily-latest");

  return db.coloringImage.findFirst({
    where: {
      ...brandWhere,
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
      createdAt: "desc",
    },
  });
};

export const getTodaysDailyImage = async () => {
  return getLatestDailyImage();
};

// ===== CATEGORY IMAGES =====

const getCategoryImagesBase = async (
  categorySlug: string,
  cursor?: string,
  limit: number = GALLERY_PAGE_SIZE,
): Promise<
  PaginatedImagesResponse & {
    category: (typeof GALLERY_CATEGORIES)[0] | null;
  }
> => {
  "use cache";
  cacheLife("gallery-daily");
  cacheTag("gallery-category", `gallery-category-${categorySlug}`);

  const category = getCategoryBySlug(categorySlug);

  if (!category) {
    return {
      images: [],
      nextCursor: null,
      hasMore: false,
      category: null,
    };
  }

  const images = await db.coloringImage.findMany({
    where: {
      ...brandWhere,
      OR: [
        { tags: { hasSome: category.tags } },
        ...category.tags.map((tag) => ({
          OR: [
            { title: { contains: tag, mode: "insensitive" as const } },
            { description: { contains: tag, mode: "insensitive" as const } },
          ],
        })),
      ],
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
      createdAt: "desc",
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
  const nextCursor = hasMore
    ? (resultImages[resultImages.length - 1]?.id ?? null)
    : null;

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

// ===== FEATURED IMAGES =====

export const getFeaturedImages = async (limit: number = 6) => {
  "use cache";
  cacheLife("gallery-category");
  cacheTag("gallery", "gallery-featured");

  return db.coloringImage.findMany({
    where: brandWhere,
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      tags: true,
      difficulty: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
};

// ===== CATEGORY COUNTS =====

export const getCategoryCounts = async () => {
  "use cache";
  cacheLife("gallery-category");
  cacheTag("gallery-category", "gallery-category-counts");

  const counts: Record<string, number> = {};

  for (const category of GALLERY_CATEGORIES) {
    const count = await db.coloringImage.count({
      where: {
        ...brandWhere,
        OR: [
          { tags: { hasSome: category.tags } },
          ...category.tags.slice(0, 3).map((tag) => ({
            OR: [
              { title: { contains: tag, mode: "insensitive" as const } },
              {
                description: { contains: tag, mode: "insensitive" as const },
              },
            ],
          })),
        ],
      },
    });
    counts[category.slug] = count;
  }

  return counts;
};

// ===== SINGLE CATEGORY COUNT =====

export const getCategoryCount = async (
  categorySlug: string,
): Promise<number> => {
  "use cache";
  cacheLife("gallery-category");
  cacheTag("gallery-category", `gallery-category-count-${categorySlug}`);

  const category = getCategoryBySlug(categorySlug);

  if (!category) {
    return 0;
  }

  return db.coloringImage.count({
    where: {
      ...brandWhere,
      OR: [
        { tags: { hasSome: category.tags } },
        ...category.tags.slice(0, 3).map((tag) => ({
          OR: [
            { title: { contains: tag, mode: "insensitive" as const } },
            {
              description: { contains: tag, mode: "insensitive" as const },
            },
          ],
        })),
      ],
    },
  });
};

// ===== GALLERY STATS =====

export const getGalleryStats = async () => {
  "use cache";
  cacheLife("gallery-stats");
  cacheTag("gallery-stats");

  const [totalImages, dailyImages, communityImages] = await Promise.all([
    db.coloringImage.count({ where: brandWhere }),
    db.coloringImage.count({
      where: { ...brandWhere, generationType: GenerationType.DAILY },
    }),
    db.coloringImage.count({
      where: { ...brandWhere, userId: null },
    }),
  ]);

  return {
    totalImages,
    dailyImages,
    communityImages,
    categoryCount: GALLERY_CATEGORIES.length,
  };
};

// ===== STATIC PARAMS =====

export const getAllCategorySlugs = () => {
  return GALLERY_CATEGORIES.map((cat) => ({ category: cat.slug }));
};

// ===== DIFFICULTY-BASED IMAGES =====

const getDifficultyImagesBase = async (
  difficulty: Difficulty,
  cursor?: string,
  limit: number = GALLERY_PAGE_SIZE,
): Promise<PaginatedImagesResponse> => {
  "use cache";
  cacheLife("gallery-difficulty");
  cacheTag(
    "gallery-difficulty",
    `gallery-difficulty-${difficulty.toLowerCase()}`,
  );

  const images = await db.coloringImage.findMany({
    where: {
      ...brandWhere,
      difficulty,
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
      createdAt: "desc",
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
  const nextCursor = hasMore
    ? (resultImages[resultImages.length - 1]?.id ?? null)
    : null;

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

export const getDifficultyCounts = async () => {
  "use cache";
  cacheLife("gallery-difficulty");
  cacheTag("gallery-difficulty", "gallery-difficulty-counts");

  const counts: Record<Difficulty, number> = {
    [Difficulty.BEGINNER]: 0,
    [Difficulty.INTERMEDIATE]: 0,
    [Difficulty.ADVANCED]: 0,
    [Difficulty.EXPERT]: 0,
  };

  const results = await Promise.all(
    ALL_DIFFICULTIES.map(async (difficulty) => ({
      difficulty,
      count: await db.coloringImage.count({
        where: {
          ...brandWhere,
          difficulty,
        },
      }),
    })),
  );

  results.forEach(({ difficulty, count }) => {
    counts[difficulty] = count;
  });

  return counts;
};

// ===== CATEGORY + DIFFICULTY FILTER =====

const getCategoryImagesWithDifficultyBase = async (
  categorySlug: string,
  difficulty?: Difficulty,
  cursor?: string,
  limit: number = GALLERY_PAGE_SIZE,
): Promise<
  PaginatedImagesResponse & {
    category: (typeof GALLERY_CATEGORIES)[0] | null;
  }
> => {
  "use cache";
  cacheLife("gallery-category");
  cacheTag(
    "gallery-category",
    `gallery-category-${categorySlug}`,
    difficulty
      ? `gallery-difficulty-${difficulty.toLowerCase()}`
      : "gallery-all-difficulties",
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

  const categoryWhere = {
    ...brandWhere,
    OR: [
      { tags: { hasSome: category.tags } },
      ...category.tags.map((tag) => ({
        OR: [
          { title: { contains: tag, mode: "insensitive" as const } },
          { description: { contains: tag, mode: "insensitive" as const } },
        ],
      })),
    ],
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
      createdAt: "desc",
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
  const nextCursor = hasMore
    ? (resultImages[resultImages.length - 1]?.id ?? null)
    : null;

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

// ===== TAG-BASED IMAGES =====

const getTagImagesBase = async (
  tag: string,
  cursor?: string,
  limit: number = GALLERY_PAGE_SIZE,
): Promise<PaginatedImagesResponse> => {
  "use cache";
  cacheLife("gallery-category");
  cacheTag("gallery-tag", `gallery-tag-${tag}`);

  const images = await db.coloringImage.findMany({
    where: {
      ...brandWhere,
      tags: { has: tag },
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
      createdAt: "desc",
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
  const nextCursor = hasMore
    ? (resultImages[resultImages.length - 1]?.id ?? null)
    : null;

  return {
    images: resultImages,
    nextCursor,
    hasMore,
  };
};

export const getTagImages = async (
  tag: string,
  cursor?: string,
  limit?: number,
): Promise<PaginatedImagesResponse> => {
  return getTagImagesBase(tag, cursor, limit);
};

export const getTagCount = async (tag: string): Promise<number> => {
  "use cache";
  cacheLife("gallery");
  cacheTag("gallery-tag", `gallery-tag-count-${tag}`);

  return db.coloringImage.count({
    where: {
      ...brandWhere,
      tags: { has: tag },
    },
  });
};

// ===== RELATED IMAGES =====

export const getRelatedImages = async (
  imageId: string,
  tags: string[],
  limit: number = 6,
): Promise<GalleryImage[]> => {
  "use cache";
  cacheLife("gallery");
  cacheTag("gallery-related", `gallery-related-${imageId}`);

  if (tags.length === 0) return [];

  return db.coloringImage.findMany({
    where: {
      ...brandWhere,
      id: { not: imageId },
      tags: { hasSome: tags },
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
};
