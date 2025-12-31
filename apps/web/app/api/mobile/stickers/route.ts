import { NextRequest, NextResponse } from 'next/server';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';
import {
  getUserStickers,
  getStickerStats,
  markStickersAsViewed,
} from '@/lib/stickers/service';
import { STICKER_CATALOG } from '@/lib/stickers/catalog';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/stickers
 * Returns all stickers with unlock status for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getMobileAuthFromHeaders(request.headers);

    if (!userId) {
      // Return catalog with all stickers locked for unauthenticated users
      return NextResponse.json(
        {
          stickers: STICKER_CATALOG.map((sticker) => ({
            id: sticker.id,
            name: sticker.name,
            imageUrl: sticker.imageUrl,
            category: sticker.category,
            rarity: sticker.rarity,
            isUnlocked: false,
            isNew: false,
            unlockedAt: null,
          })),
          stats: {
            totalUnlocked: 0,
            totalPossible: STICKER_CATALOG.length,
            newCount: 0,
          },
        },
        { headers: corsHeaders },
      );
    }

    const [userStickers, stats] = await Promise.all([
      getUserStickers(userId),
      getStickerStats(userId),
    ]);

    // Create a map of unlocked stickers
    const unlockedMap = new Map(
      userStickers.unlockedStickers.map((s) => [
        s.id,
        { unlockedAt: s.unlockedAt, isNew: s.isNew },
      ]),
    );

    // Combine catalog with user's unlock status
    const stickers = STICKER_CATALOG.map((sticker) => {
      const unlocked = unlockedMap.get(sticker.id);
      return {
        id: sticker.id,
        name: sticker.name,
        imageUrl: sticker.imageUrl,
        category: sticker.category,
        rarity: sticker.rarity,
        isUnlocked: !!unlocked,
        isNew: unlocked?.isNew ?? false,
        unlockedAt: unlocked?.unlockedAt ?? null,
      };
    });

    return NextResponse.json(
      {
        stickers,
        stats: {
          totalUnlocked: stats.totalUnlocked,
          totalPossible: stats.totalPossible,
          newCount: stats.newCount,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error fetching stickers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stickers' },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * POST /api/mobile/stickers
 * Mark stickers as viewed (remove NEW badge)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getMobileAuthFromHeaders(request.headers);

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = await request.json();
    const { stickerIds } = body;

    if (!Array.isArray(stickerIds)) {
      return NextResponse.json(
        { error: 'stickerIds must be an array' },
        { status: 400, headers: corsHeaders },
      );
    }

    await markStickersAsViewed(userId, stickerIds);

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error marking stickers as viewed:', error);
    return NextResponse.json(
      { error: 'Failed to mark stickers as viewed' },
      { status: 500, headers: corsHeaders },
    );
  }
}
