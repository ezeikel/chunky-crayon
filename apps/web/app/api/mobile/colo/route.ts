import { NextRequest, NextResponse } from 'next/server';
import { db } from '@chunky-crayon/db';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';
import { getColoState, checkEvolution } from '@/lib/colo/service';
import type { ColoStage } from '@/lib/colo/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/colo
 * Returns the current Colo state for the active profile
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getMobileAuthFromHeaders(request.headers);

    if (!userId) {
      return NextResponse.json(
        { coloState: null },
        { headers: corsHeaders },
      );
    }

    // Get user's active profile with Colo data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        activeProfileId: true,
        profiles: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            isDefault: true,
            coloStage: true,
            coloAccessories: true,
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
        { coloState: null },
        { headers: corsHeaders },
      );
    }

    const activeProfile =
      user.profiles.find((p) => p.id === user.activeProfileId) ||
      user.profiles.find((p) => p.isDefault) ||
      user.profiles[0];

    const coloState = getColoState(
      activeProfile.coloStage as ColoStage,
      activeProfile.coloAccessories,
      activeProfile._count.savedArtworks,
    );

    return NextResponse.json(
      {
        coloState: {
          stage: coloState.stage,
          stageName: coloState.stageName,
          imagePath: coloState.imagePath,
          accessories: coloState.accessories,
          progressToNext: coloState.progressToNext,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error fetching Colo state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Colo state' },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * POST /api/mobile/colo
 * Check for Colo evolution (called after saving artwork)
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
    const { profileId: requestedProfileId } = body;

    // Get user's active profile or use the requested one
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        activeProfileId: true,
        profiles: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, isDefault: true },
        },
      },
    });

    const profileId =
      requestedProfileId ||
      user?.activeProfileId ||
      user?.profiles.find((p) => p.isDefault)?.id ||
      user?.profiles[0]?.id;

    if (!profileId) {
      return NextResponse.json(
        { coloState: null, evolutionResult: null },
        { headers: corsHeaders },
      );
    }

    // Verify profile belongs to user
    const profile = await db.profile.findFirst({
      where: {
        id: profileId,
        userId,
      },
      select: {
        id: true,
        coloStage: true,
        coloAccessories: true,
        _count: {
          select: {
            savedArtworks: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { coloState: null, evolutionResult: null },
        { headers: corsHeaders },
      );
    }

    // Check for evolution
    const evolutionResult = checkEvolution(
      profile.coloStage as ColoStage,
      profile.coloAccessories,
      profile._count.savedArtworks,
    );

    // If evolved or unlocked new accessories, update the profile
    if (evolutionResult.evolved || evolutionResult.newAccessories.length > 0) {
      await db.profile.update({
        where: { id: profile.id },
        data: {
          coloStage: evolutionResult.newStage,
          coloAccessories: [
            ...profile.coloAccessories,
            ...evolutionResult.newAccessories,
          ],
        },
      });
    }

    // Get updated Colo state
    const coloState = getColoState(
      evolutionResult.newStage as ColoStage,
      [...profile.coloAccessories, ...evolutionResult.newAccessories],
      profile._count.savedArtworks,
    );

    return NextResponse.json(
      {
        coloState: {
          stage: coloState.stage,
          stageName: coloState.stageName,
          imagePath: coloState.imagePath,
          accessories: coloState.accessories,
          progressToNext: coloState.progressToNext,
        },
        evolutionResult: {
          evolved: evolutionResult.evolved,
          previousStage: evolutionResult.previousStage,
          newStage: evolutionResult.newStage,
          newAccessories: evolutionResult.newAccessories,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error checking Colo evolution:', error);
    return NextResponse.json(
      { error: 'Failed to check Colo evolution' },
      { status: 500, headers: corsHeaders },
    );
  }
}
