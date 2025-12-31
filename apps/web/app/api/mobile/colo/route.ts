import { NextRequest, NextResponse } from 'next/server';
import {
  getMyColoState,
  checkAndUpdateColoEvolution,
} from '@/app/actions/colo';

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
export async function GET() {
  try {
    const coloState = await getMyColoState();

    if (!coloState) {
      return NextResponse.json(
        { coloState: null },
        { status: 200, headers: corsHeaders },
      );
    }

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
    const body = await request.json();
    const { profileId } = body;

    const evolutionResult = await checkAndUpdateColoEvolution(profileId);

    // Get updated Colo state
    const coloState = await getMyColoState();

    return NextResponse.json(
      {
        coloState: coloState
          ? {
              stage: coloState.stage,
              stageName: coloState.stageName,
              imagePath: coloState.imagePath,
              accessories: coloState.accessories,
              progressToNext: coloState.progressToNext,
            }
          : null,
        evolutionResult: evolutionResult
          ? {
              evolved: evolutionResult.evolved,
              previousStage: evolutionResult.previousStage,
              newStage: evolutionResult.newStage,
              newAccessories: evolutionResult.newAccessories,
            }
          : null,
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
