import { NextRequest, NextResponse } from 'next/server';
import { claimMyChallengeReward } from '@/app/actions/challenges';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/mobile/challenges/claim
 * Claim the reward for a completed challenge
 * Body: { weeklyChallengeId: string }
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weeklyChallengeId } = body;

    if (!weeklyChallengeId) {
      return NextResponse.json(
        { error: 'weeklyChallengeId is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await claimMyChallengeReward(weeklyChallengeId);

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            'Failed to claim reward. Challenge may not be completed or reward already claimed.',
        },
        { status: 400, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        reward: {
          type: result.rewardType,
          id: result.rewardId,
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error claiming challenge reward:', error);
    return NextResponse.json(
      { error: 'Failed to claim reward' },
      { status: 500, headers: corsHeaders },
    );
  }
}
