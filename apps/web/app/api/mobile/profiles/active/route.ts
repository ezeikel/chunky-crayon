import { NextRequest, NextResponse } from 'next/server';
import { db } from '@chunky-crayon/db';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/profiles/active
 * Returns the currently active profile
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getMobileAuthFromHeaders(request.headers);

    if (!userId) {
      return NextResponse.json(
        { activeProfile: null },
        { headers: corsHeaders },
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        activeProfileId: true,
        profiles: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            avatarId: true,
            ageGroup: true,
            difficulty: true,
            isDefault: true,
            createdAt: true,
            _count: {
              select: {
                savedArtworks: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.profiles.length === 0) {
      return NextResponse.json(
        { activeProfile: null },
        { headers: corsHeaders },
      );
    }

    const activeProfile =
      user.profiles.find((p) => p.id === user.activeProfileId) ||
      user.profiles.find((p) => p.isDefault) ||
      user.profiles[0];

    return NextResponse.json(
      {
        activeProfile: {
          id: activeProfile.id,
          name: activeProfile.name,
          avatarId: activeProfile.avatarId,
          ageGroup: activeProfile.ageGroup,
          difficulty: activeProfile.difficulty,
          isDefault: activeProfile.isDefault,
          artworkCount: activeProfile._count.savedArtworks,
          createdAt: activeProfile.createdAt,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error fetching active profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active profile' },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * POST /api/mobile/profiles/active
 * Set the active profile
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
    const { profileId } = body;

    if (!profileId || typeof profileId !== 'string') {
      return NextResponse.json(
        { error: 'profileId is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Verify the profile belongs to this user
    const profile = await db.profile.findFirst({
      where: {
        id: profileId,
        userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    // Update user's active profile
    await db.user.update({
      where: { id: userId },
      data: { activeProfileId: profileId },
    });

    return NextResponse.json(
      {
        success: true,
        activeProfile: {
          id: profile.id,
          name: profile.name,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error setting active profile:', error);
    return NextResponse.json(
      { error: 'Failed to set active profile' },
      { status: 500, headers: corsHeaders },
    );
  }
}
