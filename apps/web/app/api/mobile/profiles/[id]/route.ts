import { NextRequest, NextResponse } from 'next/server';
import { db } from '@chunky-crayon/db';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';

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
 * Update a profile
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

    // Verify the profile belongs to the user
    const existingProfile = await db.profile.findFirst({
      where: { id, userId },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    const body = await request.json();
    const { name, avatarId, ageGroup, difficulty } = body;

    const updateData: Record<string, unknown> = {};
    if (name && typeof name === 'string') {
      updateData.name = name.trim();
    }
    if (avatarId) {
      updateData.avatarId = avatarId;
    }
    if (ageGroup) {
      updateData.ageGroup = ageGroup;
    }
    if (difficulty) {
      updateData.difficulty = difficulty;
    }

    const profile = await db.profile.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json(
      {
        success: true,
        profile: {
          id: profile.id,
          name: profile.name,
          avatarId: profile.avatarId,
          ageGroup: profile.ageGroup,
          difficulty: profile.difficulty,
          isDefault: profile.isDefault,
          artworkCount: profile._count.savedArtworks,
          createdAt: profile.createdAt,
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
 * Delete a profile
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

    // Verify the profile belongs to the user
    const existingProfile = await db.profile.findFirst({
      where: { id, userId },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    // Check if it's the default profile
    if (existingProfile.isDefault) {
      // Count other profiles
      const otherProfiles = await db.profile.findMany({
        where: { userId, id: { not: id } },
        orderBy: { createdAt: 'asc' },
        take: 1,
      });

      if (otherProfiles.length === 0) {
        return NextResponse.json(
          { error: 'Cannot delete the only profile' },
          { status: 400, headers: corsHeaders },
        );
      }

      // Make another profile the default before deleting
      await db.profile.update({
        where: { id: otherProfiles[0].id },
        data: { isDefault: true },
      });
    }

    // Delete the profile (this will cascade delete saved artworks due to schema)
    await db.profile.delete({
      where: { id },
    });

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
