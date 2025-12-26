import { db } from '@chunky-crayon/db';
import { nanoid } from 'nanoid';
import type {
  ShareExpiration,
  ShareWithArtwork,
  SharedArtworkData,
} from './types';

// Generate a URL-safe share code
function generateShareCode(): string {
  // Use nanoid for URL-safe, collision-resistant codes
  // 10 characters gives us plenty of entropy for our use case
  return nanoid(10);
}

// Calculate expiration date based on option
function calculateExpirationDate(expiration: ShareExpiration): Date | null {
  if (expiration === 'never') return null;

  const now = new Date();
  if (expiration === '7days') {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  if (expiration === '30days') {
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

/**
 * Create a shareable link for an artwork
 */
export async function createArtworkShare(
  artworkId: string,
  userId: string,
  expiration: ShareExpiration = '30days',
): Promise<{ shareCode: string; shareUrl: string }> {
  // Verify the artwork belongs to this user
  const artwork = await db.savedArtwork.findFirst({
    where: {
      id: artworkId,
      userId,
    },
  });

  if (!artwork) {
    throw new Error('Artwork not found or access denied');
  }

  // Check if there's already an active share for this artwork
  const existingShare = await db.artworkShare.findFirst({
    where: {
      artworkId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (existingShare) {
    // Return existing share
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://chunkycrayon.com';
    return {
      shareCode: existingShare.shareCode,
      shareUrl: `${baseUrl}/shared/${existingShare.shareCode}`,
    };
  }

  // Create new share
  const shareCode = generateShareCode();
  const expiresAt = calculateExpirationDate(expiration);

  await db.artworkShare.create({
    data: {
      artworkId,
      shareCode,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chunkycrayon.com';
  return {
    shareCode,
    shareUrl: `${baseUrl}/shared/${shareCode}`,
  };
}

/**
 * Get shared artwork data by share code (for public viewing)
 */
export async function getSharedArtwork(
  shareCode: string,
): Promise<SharedArtworkData | null> {
  const share = await db.artworkShare.findUnique({
    where: { shareCode },
    include: {
      artwork: {
        include: {
          coloringImage: {
            select: {
              title: true,
              description: true,
              tags: true,
            },
          },
          profile: {
            select: {
              name: true,
              avatarId: true,
            },
          },
        },
      },
    },
  });

  // Check if share exists and is valid
  if (!share) return null;
  if (!share.isActive) return null;
  if (share.expiresAt && share.expiresAt < new Date()) return null;

  // Increment view count (fire and forget)
  db.artworkShare
    .update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {
      // Ignore errors for view count - not critical
    });

  return {
    shareCode: share.shareCode,
    imageUrl: share.artwork.imageUrl,
    title: share.artwork.title || share.artwork.coloringImage.title,
    artistName: share.artwork.profile?.name || 'Young Artist',
    avatarId: share.artwork.profile?.avatarId || 'default',
    tags: share.artwork.coloringImage.tags,
    createdAt: share.artwork.createdAt,
  };
}

/**
 * Get all shares for a user's artworks
 */
export async function getUserShares(
  userId: string,
): Promise<ShareWithArtwork[]> {
  return db.artworkShare.findMany({
    where: {
      artwork: {
        userId,
      },
      isActive: true,
    },
    include: {
      artwork: {
        include: {
          coloringImage: {
            select: {
              title: true,
              description: true,
              tags: true,
            },
          },
          profile: {
            select: {
              name: true,
              avatarId: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Deactivate a share (revoke access)
 */
export async function deactivateShare(
  shareCode: string,
  userId: string,
): Promise<boolean> {
  // First verify the share belongs to this user's artwork
  const share = await db.artworkShare.findFirst({
    where: {
      shareCode,
      artwork: {
        userId,
      },
    },
  });

  if (!share) return false;

  await db.artworkShare.update({
    where: { id: share.id },
    data: { isActive: false },
  });

  return true;
}

/**
 * Get share stats for a user
 */
export async function getShareStats(userId: string): Promise<{
  totalShares: number;
  totalViews: number;
  activeShares: number;
}> {
  const shares = await db.artworkShare.findMany({
    where: {
      artwork: {
        userId,
      },
    },
    select: {
      isActive: true,
      viewCount: true,
      expiresAt: true,
    },
  });

  const now = new Date();
  const activeShares = shares.filter(
    (s) => s.isActive && (!s.expiresAt || s.expiresAt > now),
  ).length;

  const totalViews = shares.reduce((sum, s) => sum + s.viewCount, 0);

  return {
    totalShares: shares.length,
    totalViews,
    activeShares,
  };
}
