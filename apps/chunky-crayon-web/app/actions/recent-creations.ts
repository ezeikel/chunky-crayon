'use server';

import {
  getColoringImagesByIds,
  type GalleryImage,
} from '@/app/data/coloring-image';

/**
 * Server action to fetch images by IDs for the RecentCreations component.
 * This allows the client component to fetch images stored in localStorage.
 */
export async function fetchRecentCreationImages(
  ids: string[],
): Promise<GalleryImage[]> {
  if (ids.length === 0) return [];
  return getColoringImagesByIds(ids);
}
