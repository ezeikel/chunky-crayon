import { NextRequest, NextResponse } from 'next/server';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';
import {
  updateProfileForUser,
  deleteProfileForUser,
} from '@/lib/profiles/service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * PUT /api/mobile/profiles/[id]
 * Update a profile - wraps updateProfileForUser service
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = await getMobileAuthFromHeaders(request.headers);

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = await request.json();
    const { name, avatarId, ageGroup, difficulty } = body;

    const result = await updateProfileForUser(id, userId, {
      name,
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
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * DELETE /api/mobile/profiles/[id]
 * Delete a profile - wraps deleteProfileForUser service
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId } = await getMobileAuthFromHeaders(request.headers);

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: corsHeaders },
      );
    }

    const result = await deleteProfileForUser(id, userId);

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { success: true },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500, headers: corsHeaders },
    );
  }
}
