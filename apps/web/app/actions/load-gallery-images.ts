'use server';

import { db, GenerationType, Prisma, Difficulty } from '@chunky-crayon/db';
import type { PaginatedImagesResponse } from '@/app/data/coloring-image';
import { GALLERY_PAGE_SIZE, getDifficultyFromSlug } from '@/app/data/gallery';
import { getCategoryBySlug } from '@/constants';

export type GalleryType = 'community' | 'daily' | 'category' | 'difficulty';

/**
 * Server action to load more gallery images for infinite scroll.
 * Supports different gallery types: community, daily, category, and difficulty.
 */
export async function loadGalleryImages(
  galleryType: GalleryType,
  cursor: string,
  categorySlug?: string,
  difficultySlug?: string,
): Promise<PaginatedImagesResponse> {
  const limit = GALLERY_PAGE_SIZE;

  let whereClause: Prisma.ColoringImageWhereInput = {};

  switch (galleryType) {
    case 'community':
      whereClause = { userId: null };
      break;

    case 'daily':
      whereClause = { generationType: GenerationType.DAILY };
      break;

    case 'category':
      if (!categorySlug) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      const category = getCategoryBySlug(categorySlug);
      if (!category) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      whereClause = {
        OR: [
          { tags: { hasSome: category.tags } },
          ...category.tags.map((tag) => ({
            OR: [
              { title: { contains: tag, mode: 'insensitive' as const } },
              { description: { contains: tag, mode: 'insensitive' as const } },
            ],
          })),
        ],
        userId: null,
      };
      break;

    case 'difficulty':
      if (!difficultySlug) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      const difficulty = getDifficultyFromSlug(difficultySlug);
      if (!difficulty) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      whereClause = {
        difficulty,
        userId: null,
      };
      break;
  }

  const images = await db.coloringImage.findMany({
    where: whereClause,
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
    cursor: { id: cursor },
    skip: 1,
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
}
