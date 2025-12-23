'use server';

import { db } from '@chunky-crayon/db';
import {
  getColoringImagesPaginated,
  type PaginatedImagesResponse,
} from '@/app/data/coloring-image';
import { getUserId } from '@/app/actions/user';
import { ACTIONS } from '@/constants';

/**
 * Server action to load more coloring images for infinite scroll.
 * Respects user's showCommunityImages preference.
 */
export async function loadMoreImages(
  cursor: string,
): Promise<PaginatedImagesResponse> {
  const userId = await getUserId(ACTIONS.GET_ALL_COLORING_IMAGES);

  // Get user's showCommunityImages setting
  let showCommunityImages = false;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { showCommunityImages: true },
    });
    showCommunityImages = user?.showCommunityImages ?? false;
  }

  return getColoringImagesPaginated(
    userId || undefined,
    showCommunityImages,
    cursor,
  );
}
