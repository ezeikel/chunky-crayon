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
 * GET /api/mobile/profiles
 * Returns all profiles for the current user
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

    const profiles = await db.profile.findMany({
      where: { userId },
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
    });

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

    // Check profile limit (max 5 profiles per user)
    const existingCount = await db.profile.count({
      where: { userId },
    });

    if (existingCount >= 5) {
      return NextResponse.json(
        { error: 'Maximum of 5 profiles allowed' },
        { status: 400, headers: corsHeaders },
      );
    }

    const profile = await db.profile.create({
      data: {
        userId,
        name: name.trim(),
        avatarId: avatarId || 'default',
        ageGroup: ageGroup || 'CHILD',
        difficulty: difficulty || 'BEGINNER',
        isDefault: existingCount === 0,
      },
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
