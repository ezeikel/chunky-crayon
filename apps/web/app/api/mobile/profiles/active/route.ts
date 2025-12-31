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
 */
export async function GET() {
  try {
    const profile = await getActiveProfile();

    if (!profile) {
      return NextResponse.json(
        { activeProfile: null },
        { status: 200, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        activeProfile: {
          id: profile.id,
          name: profile.name,
          avatarId: profile.avatarId,
          ageGroup: profile.ageGroup,
          difficulty: profile.difficulty,
          isDefault: profile.isDefault,
          artworkCount: profile._count.coloringImages,
          createdAt: profile.createdAt,
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
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        activeProfile: result.profile
          ? {
              id: result.profile.id,
              name: result.profile.name,
            }
          : null,
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
