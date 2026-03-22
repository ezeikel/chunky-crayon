"use server";

import { db } from "@one-colored-pixel/db";
import type { PaginatedImagesResponse } from "@/app/data/coloring-image";
import { IMAGES_PER_PAGE } from "@/app/data/coloring-image";
import { BRAND } from "@/lib/db";

/**
 * Server action to load more coloring images for infinite scroll.
 * Scoped to the COLORING_HABITAT brand (no profile filtering).
 */
export async function loadMoreImages(
  cursor: string,
): Promise<PaginatedImagesResponse> {
  const limit = IMAGES_PER_PAGE;

  const images = await db.coloringImage.findMany({
    where: { brand: BRAND },
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
