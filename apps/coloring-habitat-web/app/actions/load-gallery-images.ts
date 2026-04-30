"use server";

import { db, GenerationType, Prisma, Difficulty } from "@one-colored-pixel/db";
import type { PaginatedImagesResponse } from "@/app/data/coloring-image";
import { GALLERY_PAGE_SIZE, getDifficultyFromSlug } from "@/app/data/gallery";
import { getCategoryBySlug } from "@/constants";
import { BRAND } from "@/lib/db";

export type GalleryType = "all" | "daily" | "category" | "difficulty" | "tag";

/**
 * Server action to load more gallery images for infinite scroll.
 * All queries are scoped to the COLORING_HABITAT brand.
 */
export async function loadGalleryImages(
  galleryType: GalleryType,
  cursor: string,
  categorySlug?: string,
  difficultySlug?: string,
  tagSlug?: string,
): Promise<PaginatedImagesResponse> {
  const limit = GALLERY_PAGE_SIZE;

  // Every branch needs status=READY so canvas-as-loader rows in flight
  // (GENERATING / FAILED) don't leak into infinite-scroll gallery loads.
  const baseWhere = {
    brand: BRAND,
    status: "READY" as const,
  };

  let whereClause: Prisma.ColoringImageWhereInput = baseWhere;

  switch (galleryType) {
    case "all":
      whereClause = baseWhere;
      break;

    case "daily":
      whereClause = { ...baseWhere, generationType: GenerationType.DAILY };
      break;

    case "category":
      if (!categorySlug) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      const category = getCategoryBySlug(categorySlug);
      if (!category) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      whereClause = {
        ...baseWhere,
        OR: [
          { tags: { hasSome: category.tags } },
          ...category.tags.map((tag) => ({
            OR: [
              { title: { contains: tag, mode: "insensitive" as const } },
              {
                description: { contains: tag, mode: "insensitive" as const },
              },
            ],
          })),
        ],
      };
      break;

    case "difficulty":
      if (!difficultySlug) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      const difficulty = getDifficultyFromSlug(difficultySlug);
      if (!difficulty) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      whereClause = {
        ...baseWhere,
        difficulty,
      };
      break;

    case "tag":
      if (!tagSlug) {
        return { images: [], nextCursor: null, hasMore: false };
      }
      whereClause = {
        ...baseWhere,
        tags: { has: tagSlug },
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
      difficulty: true,
    },
    orderBy: {
      createdAt: "desc",
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
