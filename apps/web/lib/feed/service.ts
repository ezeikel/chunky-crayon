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

export type MobileFeedResponse = {
  todaysPick: FeedColoringImage | null;
  activeChallenge:
    | (Omit<ChallengeWithProgress, 'startDate' | 'endDate' | 'completedAt'> & {
        startDate: string;
        endDate: string;
        completedAt: string | null;
      })
    | null;
  recentArt: FeedSavedArtwork[];
  weeklyCollection: FeedColoringImage[];
  monthlyFeatured: FeedColoringImage[];
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
 * Get weekly collection images
 */
export async function getWeeklyCollection(
  limit: number = 10,
): Promise<FeedColoringImage[]> {
  const images = await db.coloringImage.findMany({
    where: { generationType: GenerationType.WEEKLY },
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
 * Get monthly featured images
 */
export async function getMonthlyFeatured(
  limit: number = 6,
): Promise<FeedColoringImage[]> {
  const images = await db.coloringImage.findMany({
    where: { generationType: GenerationType.MONTHLY },
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
 * Get the complete mobile home feed
 * Returns curated content for the "For You" tab
 */
export async function getMobileFeed(
  userId: string | null,
  profileId: string | null,
): Promise<MobileFeedResponse> {
  // Run all queries in parallel for performance
  const [
    todaysPick,
    recentArt,
    weeklyCollection,
    monthlyFeatured,
    activeChallenge,
  ] = await Promise.all([
    getTodaysPick(),
    userId ? getRecentArt(userId, 10) : Promise.resolve([]),
    getWeeklyCollection(10),
    getMonthlyFeatured(6),
    profileId ? getCurrentChallenge(profileId) : Promise.resolve(null),
  ]);

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
    todaysPick,
    activeChallenge: serializedChallenge,
    recentArt,
    weeklyCollection,
    monthlyFeatured,
  };
}
