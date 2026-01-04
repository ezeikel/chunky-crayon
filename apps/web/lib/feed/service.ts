import { db, GenerationType } from '@chunky-crayon/db';
import { getCurrentChallenge } from '../challenges/service';
import type { ChallengeWithProgress } from '../challenges/types';

export type FeedColoringImage = {
  id: string;
  title: string;
  description: string;
  alt: string;
  url: string | null;
  svgUrl: string | null;
  tags: string[];
  difficulty: string | null;
  createdAt: string;
  /** User's progress preview URL if they have in-progress work */
  previewUrl?: string | null;
};

export type FeedSavedArtwork = {
  id: string;
  title: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  createdAt: string;
  coloringImage: {
    id: string;
    title: string;
  };
};

export type FeedInProgressItem = {
  id: string;
  coloringImageId: string;
  coloringImage: {
    id: string;
    title: string;
    svgUrl: string | null;
  };
  previewUrl: string | null;
  updatedAt: string;
};

export type MobileFeedResponse = {
  todaysPick: FeedColoringImage | null;
  activeChallenge:
    | (Omit<ChallengeWithProgress, 'startDate' | 'endDate' | 'completedAt'> & {
        startDate: string;
        endDate: string;
        completedAt: string | null;
      })
    | null;
  inProgressWork: FeedInProgressItem[];
  recentArt: FeedSavedArtwork[];
  myCreations: FeedColoringImage[];
  moreToColor: FeedColoringImage[];
};

/**
 * Get the start of today in UTC
 */
function getTodayStart(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Serialize a ColoringImage for the feed response
 */
function serializeColoringImage(image: {
  id: string;
  title: string;
  description: string;
  alt: string;
  url: string | null;
  svgUrl: string | null;
  tags: string[];
  difficulty: string | null;
  createdAt: Date;
}): FeedColoringImage {
  return {
    id: image.id,
    title: image.title,
    description: image.description,
    alt: image.alt,
    url: image.url,
    svgUrl: image.svgUrl,
    tags: image.tags,
    difficulty: image.difficulty,
    createdAt: image.createdAt.toISOString(),
  };
}

/**
 * Get today's daily pick
 * Returns the most recently created DAILY image from today, or the most recent DAILY overall
 */
export async function getTodaysPick(): Promise<FeedColoringImage | null> {
  const todayStart = getTodayStart();

  // First, try to find a DAILY image created today
  let dailyImage = await db.coloringImage.findFirst({
    where: {
      generationType: GenerationType.DAILY,
      createdAt: { gte: todayStart },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      alt: true,
      url: true,
      svgUrl: true,
      tags: true,
      difficulty: true,
      createdAt: true,
    },
  });

  // If no image today, get the most recent DAILY image
  if (!dailyImage) {
    dailyImage = await db.coloringImage.findFirst({
      where: { generationType: GenerationType.DAILY },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        alt: true,
        url: true,
        svgUrl: true,
        tags: true,
        difficulty: true,
        createdAt: true,
      },
    });
  }

  return dailyImage ? serializeColoringImage(dailyImage) : null;
}

/**
 * Get recent saved artworks for a user
 */
export async function getRecentArt(
  userId: string,
  limit: number = 10,
): Promise<FeedSavedArtwork[]> {
  const artworks = await db.savedArtwork.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      imageUrl: true,
      thumbnailUrl: true,
      createdAt: true,
      coloringImage: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return artworks.map((artwork) => ({
    id: artwork.id,
    title: artwork.title,
    imageUrl: artwork.imageUrl,
    thumbnailUrl: artwork.thumbnailUrl,
    createdAt: artwork.createdAt.toISOString(),
    coloringImage: artwork.coloringImage,
  }));
}

/**
 * Get user's own generated coloring pages (their creations)
 * These are coloring page line art the user created via text prompt or photo-to-coloring
 * Distinct from SavedArtwork which are colored versions
 */
export async function getUserCreations(
  userId: string,
  limit: number = 10,
): Promise<FeedColoringImage[]> {
  const images = await db.coloringImage.findMany({
    where: {
      userId,
      generationType: GenerationType.USER,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      alt: true,
      url: true,
      svgUrl: true,
      tags: true,
      difficulty: true,
      createdAt: true,
    },
  });

  return images.map(serializeColoringImage);
}

/**
 * Get past daily images (excluding today's pick)
 * Shows all daily images for users to explore
 */
export async function getPastDailyImages(
  limit: number = 20,
): Promise<FeedColoringImage[]> {
  const todayStart = getTodayStart();

  const images = await db.coloringImage.findMany({
    where: {
      generationType: GenerationType.DAILY,
      createdAt: { lt: todayStart },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      alt: true,
      url: true,
      svgUrl: true,
      tags: true,
      difficulty: true,
      createdAt: true,
    },
  });

  return images.map(serializeColoringImage);
}

/**
 * Get user's preview URLs for a list of coloring image IDs
 * Returns a map of coloringImageId -> previewUrl
 */
async function getUserPreviewsForImages(
  userId: string,
  imageIds: string[],
): Promise<Map<string, string>> {
  if (imageIds.length === 0) return new Map();

  const progress = await db.canvasProgress.findMany({
    where: {
      userId,
      coloringImageId: { in: imageIds },
      previewUrl: { not: null },
    },
    select: {
      coloringImageId: true,
      previewUrl: true,
    },
  });

  const previewMap = new Map<string, string>();
  for (const p of progress) {
    if (p.previewUrl) {
      previewMap.set(p.coloringImageId, p.previewUrl);
    }
  }
  return previewMap;
}

/**
 * Enrich coloring images with user's progress preview URLs
 */
function enrichWithPreviews(
  images: FeedColoringImage[],
  previewMap: Map<string, string>,
): FeedColoringImage[] {
  return images.map((img) => ({
    ...img,
    previewUrl: previewMap.get(img.id) || null,
  }));
}

/**
 * Get user's in-progress coloring work
 * Returns coloring pages the user has started but not finished
 * Ordered by most recently updated
 */
export async function getInProgressWork(
  userId: string,
  limit: number = 5,
): Promise<FeedInProgressItem[]> {
  const progress = await db.canvasProgress.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      coloringImageId: true,
      previewUrl: true,
      updatedAt: true,
      coloringImage: {
        select: {
          id: true,
          title: true,
          svgUrl: true,
        },
      },
    },
  });

  return progress.map((p) => ({
    id: p.id,
    coloringImageId: p.coloringImageId,
    coloringImage: p.coloringImage,
    previewUrl: p.previewUrl,
    updatedAt: p.updatedAt.toISOString(),
  }));
}

/**
 * Get the complete mobile home feed
 * Returns curated content for the "For You" tab
 *
 * Sections:
 * 1. Today - Today's daily pick
 * 2. Challenge - Weekly challenge progress
 * 3. Continue Coloring - In-progress work with preview thumbnails
 * 4. Your Art - User's saved artworks (colored versions)
 * 5. My Creations - User's own generated coloring pages (line art)
 * 6. More to Color - Past daily images to explore
 */
export async function getMobileFeed(
  userId: string | null,
  profileId: string | null,
): Promise<MobileFeedResponse> {
  // Run all queries in parallel for performance
  const [
    todaysPick,
    inProgressWork,
    recentArt,
    myCreations,
    moreToColor,
    activeChallenge,
  ] = await Promise.all([
    getTodaysPick(),
    userId ? getInProgressWork(userId, 5) : Promise.resolve([]),
    userId ? getRecentArt(userId, 10) : Promise.resolve([]),
    userId ? getUserCreations(userId, 10) : Promise.resolve([]),
    getPastDailyImages(20),
    profileId ? getCurrentChallenge(profileId) : Promise.resolve(null),
  ]);

  // Collect all coloring image IDs to check for user progress
  const allImageIds: string[] = [];
  if (todaysPick) allImageIds.push(todaysPick.id);
  myCreations.forEach((img) => allImageIds.push(img.id));
  moreToColor.forEach((img) => allImageIds.push(img.id));

  // Fetch user's preview URLs for all images (if logged in)
  const previewMap = userId
    ? await getUserPreviewsForImages(userId, allImageIds)
    : new Map<string, string>();

  // Enrich coloring images with preview URLs
  const enrichedTodaysPick = todaysPick
    ? { ...todaysPick, previewUrl: previewMap.get(todaysPick.id) || null }
    : null;
  const enrichedMyCreations = enrichWithPreviews(myCreations, previewMap);
  const enrichedMoreToColor = enrichWithPreviews(moreToColor, previewMap);

  // Serialize challenge dates for JSON response
  const serializedChallenge = activeChallenge
    ? {
        ...activeChallenge,
        startDate: activeChallenge.startDate.toISOString(),
        endDate: activeChallenge.endDate.toISOString(),
        completedAt: activeChallenge.completedAt?.toISOString() || null,
      }
    : null;

  return {
    todaysPick: enrichedTodaysPick,
    activeChallenge: serializedChallenge,
    inProgressWork,
    recentArt,
    myCreations: enrichedMyCreations,
    moreToColor: enrichedMoreToColor,
  };
}
