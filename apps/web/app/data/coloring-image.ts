import { cacheLife, cacheTag } from 'next/cache';
import { db, ColoringImage } from '@chunky-crayon/db';
import { ACTIONS } from '@/constants';
import type { ColoringImageSearchParams } from '@/types';
import { getUserId } from '@/app/actions/user';

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

const getAllColoringImagesBase = async (show = 'all', userId?: string) => {
  'use cache';
  cacheLife('max');
  cacheTag('all-coloring-images');

  return db.coloringImage.findMany({
    where: {
      OR:
        show === 'all'
          ? userId
            ? [{ userId }, { userId: null }]
            : [{ userId: null }]
          : userId
            ? [{ userId }]
            : [{ id: { in: [] } }], // Empty result if filtering by user but no userId
    },
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
  const { show = 'all' } = await searchParams;

  const userId = await getUserId(ACTIONS.GET_ALL_COLORING_IMAGES);
  return getAllColoringImagesBase(show, userId || undefined);
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
