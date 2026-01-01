import { NextRequest, NextResponse } from 'next/server';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';
import {
  getProfilesForUser,
  createProfileForUser,
} from '@/lib/profiles/service';

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
 * Returns all profiles for the current user - wraps getProfilesForUser service
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getMobileAuthFromHeaders(request.headers);

    if (!userId) {
      return NextResponse.json(
        { profiles: [] },
        { headers: corsHeaders },
      );
    }

    const profiles = await getProfilesForUser(userId);

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
 * Create a new profile - wraps createProfileForUser service
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
    const { name, avatarId, ageGroup, difficulty } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await createProfileForUser(userId, {
      name: name.trim(),
      avatarId,
      ageGroup,
      difficulty,
    });

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders },
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
