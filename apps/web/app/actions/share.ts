'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import {
  createArtworkShare,
  deactivateShare,
  getSharedArtwork,
  getUserShares,
  getShareStats,
  type ShareExpiration,
  type SharedArtworkData,
  type ShareWithArtwork,
} from '@/lib/share';

type CreateShareResponse = {
  success: boolean;
  shareCode?: string;
  shareUrl?: string;
  error?: string;
};

/**
 * Create a shareable link for an artwork
 * Requires parent confirmation via AdultGate before calling
 */
export async function createShare(
  artworkId: string,
  expiration: ShareExpiration = '30days',
): Promise<CreateShareResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await createArtworkShare(
      artworkId,
      session.user.id,
      expiration,
    );

    // Revalidate the my-artwork page to show share status
    revalidatePath('/account/my-artwork');

    return {
      success: true,
      shareCode: result.shareCode,
      shareUrl: result.shareUrl,
    };
  } catch (error) {
    console.error('Failed to create share:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create share link',
    };
  }
}

/**
 * Get shared artwork by share code (public endpoint - no auth required)
 */
export async function getSharedArtworkByCode(
  shareCode: string,
): Promise<SharedArtworkData | null> {
  try {
    return await getSharedArtwork(shareCode);
  } catch (error) {
    console.error('Failed to get shared artwork:', error);
    return null;
  }
}

/**
 * Get all shares for the current user's artworks
 */
export async function getMyShares(): Promise<ShareWithArtwork[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    return await getUserShares(session.user.id);
  } catch (error) {
    console.error('Failed to get shares:', error);
    return [];
  }
}

/**
 * Deactivate (revoke) a share link
 */
export async function revokeShare(shareCode: string): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return false;
    }

    const success = await deactivateShare(shareCode, session.user.id);

    if (success) {
      revalidatePath('/account/my-artwork');
    }

    return success;
  } catch (error) {
    console.error('Failed to revoke share:', error);
    return false;
  }
}

/**
 * Get share statistics for the current user
 */
export async function getMyShareStats(): Promise<{
  totalShares: number;
  totalViews: number;
  activeShares: number;
} | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    return await getShareStats(session.user.id);
  } catch (error) {
    console.error('Failed to get share stats:', error);
    return null;
  }
}
