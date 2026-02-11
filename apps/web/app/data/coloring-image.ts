import { cacheLife, cacheTag } from 'next/cache';
import { db, ColoringImage } from '@chunky-crayon/db';
import { ACTIONS } from '@/constants';
import type { ColoringImageSearchParams } from '@/types';
import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';

// Cached data fetching for coloring images using Next.js 16 Cache Components
// Uses 'use cache' directive with cacheLife and cacheTag for:
// - Build-time caching during static generation (generateStaticParams)
// - Runtime caching with cacheLife('max') = 1 week cache, 30 day expiration
// - On-demand invalidation via revalidateTag('coloring-image-{id}')
//
// Static generation works because we use WebSocket connections to Neon
// (poolQueryViaFetch is disabled in packages/db/src/client.ts)

// Base cached function for fetching a single coloring image
export const getColoringImageBase = async (
  id: string,
): Promise<Partial<ColoringImage> | null> => {
  'use cache';
  cacheLife('max');
  cacheTag('coloring-image', `coloring-image-${id}`);

  return db.coloringImage.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      alt: true,
      tags: true,
      url: true,
      svgUrl: true,
      qrCodeUrl: true,
      ambientSoundUrl: true,
      colorMapJson: true,
      fillPointsJson: true,
    },
  });
};

// Wrapper for API routes that receive params as Promise
export const getColoringImage = async (
  params: Promise<{ id: string }>,
): Promise<Partial<ColoringImage> | null> => {
  const { id } = await params;
  return getColoringImageBase(id);
};

// Export for components that have a plain string ID (uses cached version)
export const getColoringImageById = async (
  id: string,
): Promise<Partial<ColoringImage> | null> => {
  return getColoringImageBase(id);
};

// Fetch multiple images by IDs (for recent creations, etc.)
export const getColoringImagesByIds = async (
  ids: string[],
): Promise<GalleryImage[]> => {
  'use cache';
  cacheLife('hours');
  cacheTag('coloring-images-by-ids');

  if (ids.length === 0) return [];

  const images = await db.coloringImage.findMany({
    where: {
      id: { in: ids },
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
    },
  });

  // Maintain the order of the input IDs
  const imageMap = new Map(images.map((img) => [img.id, img]));
  return ids
    .map((id) => imageMap.get(id))
    .filter((img): img is NonNullable<typeof img> => img !== undefined)
    .map((img) => ({
      ...img,
      title: img.title || null,
      description: img.description || null,
    }));
};

const getAllColoringImagesBase = async (
  userId?: string,
  profileId?: string,
  showCommunityImages?: boolean,
) => {
  'use cache';
  cacheLife('max');
  cacheTag('all-coloring-images');

  // Determine what images to show based on auth state and settings
  let whereClause;

  if (!userId) {
    // Logged out: show all community images (userId: null)
    whereClause = { userId: null };
  } else if (showCommunityImages) {
    // Logged in + community enabled: show user's images (filtered by profile) + community images
    whereClause = {
      OR: [{ userId, ...(profileId ? { profileId } : {}) }, { userId: null }],
    };
  } else {
    // Logged in + community disabled (default): show only user's images for active profile
    whereClause = { userId, ...(profileId ? { profileId } : {}) };
  }

  return db.coloringImage.findMany({
    where: whereClause,
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getAllColoringImages = async (
  searchParams: Promise<ColoringImageSearchParams>,
) => {
  const { show } = await searchParams;

  const userId = await getUserId(ACTIONS.GET_ALL_COLORING_IMAGES);

  // Get user's showCommunityImages preference and active profile if logged in
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

  // Use URL param to determine filter:
  // - 'user': show only user's images (if logged in)
  // - 'all': show user's + community images (if logged in and setting enabled)
  // - undefined: default to user's showCommunityImages preference
  const effectiveShowCommunity =
    show === 'user' ? false : show === 'all' || showCommunityImages;

  return getAllColoringImagesBase(
    userId || undefined,
    profileId,
    effectiveShowCommunity,
  );
};

// Static version for generateStaticParams - no caching, direct DB query
// This runs at build time and should NOT use 'use cache'
export const getAllColoringImagesStatic = async () => {
  return db.coloringImage.findMany({
    where: {
      userId: null, // Only public images for static generation
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

// Image type for gallery display
export type GalleryImage = {
  id: string;
  title: string | null;
  description: string | null;
  svgUrl: string | null;
  userId: string | null;
};

// Paginated response type
export type PaginatedImagesResponse = {
  images: GalleryImage[];
  nextCursor: string | null;
  hasMore: boolean;
};

// Default page size for infinite scroll
export const IMAGES_PER_PAGE = 12;

// Paginated version for infinite scroll
const getColoringImagesPaginatedBase = async (
  userId?: string,
  profileId?: string,
  showCommunityImages?: boolean,
  cursor?: string,
  limit: number = IMAGES_PER_PAGE,
): Promise<PaginatedImagesResponse> => {
  'use cache';
  cacheLife('hours');
  cacheTag('coloring-images-paginated');

  // Determine what images to show based on auth state and settings
  let whereClause;

  if (!userId) {
    // Logged out: show all community images (userId: null)
    whereClause = { userId: null };
  } else if (showCommunityImages) {
    // Logged in + community enabled: show user's images (filtered by profile) + community images
    whereClause = {
      OR: [{ userId, ...(profileId ? { profileId } : {}) }, { userId: null }],
    };
  } else {
    // Logged in + community disabled (default): show only user's images for active profile
    whereClause = { userId, ...(profileId ? { profileId } : {}) };
  }

  // Fetch one extra to determine if there are more pages
  const images = await db.coloringImage.findMany({
    where: whereClause,
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1, // Skip the cursor item itself
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

// Export for use in server actions
export const getColoringImagesPaginated = async (
  userId?: string,
  profileId?: string,
  showCommunityImages?: boolean,
  cursor?: string,
  limit?: number,
): Promise<PaginatedImagesResponse> => {
  return getColoringImagesPaginatedBase(
    userId,
    profileId,
    showCommunityImages,
    cursor,
    limit,
  );
};
