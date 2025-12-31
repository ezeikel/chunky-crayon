import { NextRequest, NextResponse } from 'next/server';
import { db } from '@chunky-crayon/db';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';
import { getStickerStats } from '@/lib/stickers/service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/user
 * Returns current user info with active profile and stats
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getMobileAuthFromHeaders(request.headers);

    if (!userId) {
      return NextResponse.json(
        {
          user: null,
          activeProfile: null,
          stickerStats: {
            totalUnlocked: 0,
            totalPossible: 0,
            newCount: 0,
          },
        },
        { headers: corsHeaders },
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        credits: true,
        activeProfileId: true,
        subscriptions: {
          where: {
            OR: [{ status: 'ACTIVE' }, { status: 'TRIALING' }],
          },
          select: {
            planName: true,
            billingPeriod: true,
            status: true,
            currentPeriodEnd: true,
          },
          take: 1,
        },
        profiles: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            avatarId: true,
            ageGroup: true,
            difficulty: true,
            isDefault: true,
            _count: {
              select: {
                savedArtworks: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          user: null,
          activeProfile: null,
          stickerStats: {
            totalUnlocked: 0,
            totalPossible: 0,
            newCount: 0,
          },
        },
        { headers: corsHeaders },
      );
    }

    // Determine active profile
    const activeProfile =
      user.profiles.find((p) => p.id === user.activeProfileId) ||
      user.profiles.find((p) => p.isDefault) ||
      user.profiles[0];

    const stickerStats = await getStickerStats(userId);

    const activeSubscription = user.subscriptions[0];

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          credits: user.credits,
          subscription: activeSubscription
            ? {
                planName: activeSubscription.planName,
                billingPeriod: activeSubscription.billingPeriod,
                status: activeSubscription.status,
                currentPeriodEnd: activeSubscription.currentPeriodEnd,
              }
            : null,
        },
        activeProfile: activeProfile
          ? {
              id: activeProfile.id,
              name: activeProfile.name,
              avatarId: activeProfile.avatarId,
              ageGroup: activeProfile.ageGroup,
              difficulty: activeProfile.difficulty,
              artworkCount: activeProfile._count.savedArtworks,
            }
          : null,
        stickerStats: {
          totalUnlocked: stickerStats.totalUnlocked,
          totalPossible: stickerStats.totalPossible,
          newCount: stickerStats.newCount,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500, headers: corsHeaders },
    );
  }
}
