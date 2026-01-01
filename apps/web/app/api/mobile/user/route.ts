import { NextResponse } from 'next/server';
import { getMobileUserAction } from '@/app/actions/user';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/user
 * Returns current user info with active profile and stats
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function GET() {
  try {
    const userData = await getMobileUserAction();
    return NextResponse.json(userData, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500, headers: corsHeaders },
    );
  }
}
