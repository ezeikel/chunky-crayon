import { NextRequest, NextResponse } from 'next/server';
import { getProfiles, createProfile } from '@/app/actions/profiles';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/profiles
 * Returns all profiles for the current user
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function GET() {
  try {
    const profiles = await getProfiles();

    if (!profiles) {
      return NextResponse.json({ profiles: [] }, { headers: corsHeaders });
    }

    return NextResponse.json(
      {
        profiles: profiles.map((profile) => ({
          id: profile.id,
          name: profile.name,
          avatarId: profile.avatarId,
          ageGroup: profile.ageGroup,
          difficulty: profile.difficulty,
          isDefault: profile.isDefault,
          artworkCount: profile._count.savedArtworks,
          createdAt: profile.createdAt,
        })),
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * POST /api/mobile/profiles
 * Create a new profile
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, avatarId, ageGroup, difficulty } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await createProfile({
      name: name.trim(),
      avatarId,
      ageGroup,
      difficulty,
    });

    if ('error' in result) {
      const status = result.error.includes('logged in') ? 401 : 400;
      return NextResponse.json(
        { error: result.error },
        { status, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        profile: {
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
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500, headers: corsHeaders },
    );
  }
}
