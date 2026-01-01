import { NextRequest, NextResponse } from 'next/server';
import {
  getMobileColoStateAction,
  checkMobileColoEvolutionAction,
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
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function GET() {
  try {
    const data = await getMobileColoStateAction();
    return NextResponse.json(data, { headers: corsHeaders });
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
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId } = body;

    const data = await checkMobileColoEvolutionAction(profileId);
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error checking Colo evolution:', error);
    return NextResponse.json(
      { error: 'Failed to check Colo evolution' },
      { status: 500, headers: corsHeaders },
    );
  }
}
