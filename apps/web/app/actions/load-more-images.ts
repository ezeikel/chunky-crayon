'use server';

import { db } from '@chunky-crayon/db';
import {
  getColoringImagesPaginated,
  type PaginatedImagesResponse,
} from '@/app/data/coloring-image';
import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
import { ACTIONS } from '@/constants';

/**
 * Server action to load more coloring images for infinite scroll.
 * Respects user's showCommunityImages preference and active profile.
 */
export async function loadMoreImages(
  cursor: string,
): Promise<PaginatedImagesResponse> {
  const userId = await getUserId(ACTIONS.GET_ALL_COLORING_IMAGES);

  // Get user's showCommunityImages setting and active profile
  let showCommunityImages = false;
  let profileId: string | undefined;

  if (userId) {
    const [user, activeProfile] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { showCommunityImages: true },
      }),
      getActiveProfile(),
    ]);
    showCommunityImages = user?.showCommunityImages ?? false;
    profileId = activeProfile?.id;
  }

  return getColoringImagesPaginated(
    userId || undefined,
    profileId,
    showCommunityImages,
    cursor,
  );
}
