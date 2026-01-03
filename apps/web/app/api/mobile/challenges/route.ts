import { NextResponse } from 'next/server';
import { getMobileChallengesAction } from '@/app/actions/challenges';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/challenges
 * Returns the current active challenge and challenge history for the active profile
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function GET() {
  try {
    const data = await getMobileChallengesAction();
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500, headers: corsHeaders },
    );
  }
}
