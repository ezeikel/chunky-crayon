import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
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
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated', user: null },
        { status: 200, headers: corsHeaders },
      );
    }

    const activeProfile = await getActiveProfile();
    const stickerStats = await getStickerStats(user.id);

    // Get active subscription
    const activeSubscription = user.subscriptions.find(
      (sub) => sub.status === 'active' || sub.status === 'trialing',
    );

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
              artworkCount: activeProfile._count.coloringImages,
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
