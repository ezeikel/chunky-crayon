'use server';

import { getUserId, getProfileId } from '@/app/actions/user';
import { getMobileFeed, type MobileFeedResponse } from '@/lib/feed/service';
import { ACTIONS } from '@/constants';

/**
 * Server action to get the mobile home feed.
 * Uses unified auth that works for both web sessions and mobile JWT.
 *
 * Content includes:
 * - todaysPick: Daily featured coloring page
 * - activeChallenge: Current weekly challenge with progress
 * - recentArt: User's recently saved artworks (limit 10)
 * - weeklyCollection: Weekly themed coloring pages
 * - monthlyFeatured: Monthly featured coloring pages
 */
export async function getMobileFeedAction(): Promise<MobileFeedResponse> {
  // Get user and profile using unified auth (works for both web and mobile)
  const userId = await getUserId(ACTIONS.GET_ALL_COLORING_IMAGES);
  const profileId = await getProfileId();

  return getMobileFeed(userId ?? null, profileId);
}
