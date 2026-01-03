import { NextRequest, NextResponse } from 'next/server';
import { db } from '@chunky-crayon/db';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/auth/me
 * Get current authentication status
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, deviceId, profileId } = await getMobileAuthFromHeaders(
      request.headers,
    );

    if (!deviceId) {
      return NextResponse.json(
        {
          authenticated: false,
          deviceId: null,
          userId: null,
          user: null,
        },
        { headers: corsHeaders },
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          authenticated: false,
          deviceId,
          userId: null,
          user: null,
        },
        { headers: corsHeaders },
      );
    }

    // Get user details
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        credits: true,
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
            coloStage: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          deviceId,
          userId: null,
          user: null,
        },
        { headers: corsHeaders },
      );
    }

    // Determine active profile
    const activeProfile =
      user.profiles.find((p) => p.id === (profileId || user.activeProfileId)) ||
      user.profiles.find((p) => p.isDefault) ||
      user.profiles[0];

    return NextResponse.json(
      {
        authenticated: true,
        deviceId,
        userId: user.id,
        isLinked: !!user.email, // User is linked if they have an email
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          credits: user.credits,
        },
        activeProfile: activeProfile || null,
        profiles: user.profiles,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error getting auth status:', error);
    return NextResponse.json(
      { error: 'Failed to get auth status' },
      { status: 500, headers: corsHeaders },
    );
  }
}
