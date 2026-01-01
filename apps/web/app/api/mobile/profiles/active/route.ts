import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile, setActiveProfile } from '@/app/actions/profiles';

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
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function GET() {
  try {
    const activeProfile = await getActiveProfile();

    if (!activeProfile) {
      return NextResponse.json(
        { activeProfile: null },
        { headers: corsHeaders },
      );
    }

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
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId } = body;

    if (!profileId || typeof profileId !== 'string') {
      return NextResponse.json(
        { error: 'profileId is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await setActiveProfile(profileId);

    if ('error' in result) {
      const status = result.error.includes('logged in') ? 401 : 404;
      return NextResponse.json(
        { error: result.error },
        { status, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        activeProfile: {
          id: result.profile.id,
          name: result.profile.name,
          avatarId: result.profile.avatarId,
          ageGroup: result.profile.ageGroup,
          difficulty: result.profile.difficulty,
          isDefault: result.profile.isDefault,
          artworkCount: result.profile._count.savedArtworks,
          createdAt: result.profile.createdAt,
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
