import { NextRequest, NextResponse } from 'next/server';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';
import { claimChallengeReward, getCurrentChallenge } from '@/lib/challenges/service';
import { getChallengeById } from '@/lib/challenges/catalog';
import { awardSticker } from '@/lib/stickers/service';
import { db } from '@chunky-crayon/db';

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

    // Get active profile
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { activeProfileId: true },
    });

    if (!user?.activeProfileId) {
      return NextResponse.json(
        { error: 'No active profile' },
        { status: 400, headers: corsHeaders },
      );
    }

    const profileId = user.activeProfileId;

    const body = await request.json();
    const { weeklyChallengeId } = body;

    if (!weeklyChallengeId) {
      return NextResponse.json(
        { error: 'weeklyChallengeId is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Verify the challenge exists and is completed
    const progress = await db.profileChallengeProgress.findUnique({
      where: {
        profileId_weeklyChallengeId: {
          profileId,
          weeklyChallengeId,
        },
      },
      include: { weeklyChallenge: true },
    });

    if (!progress) {
      return NextResponse.json(
        { error: 'Challenge progress not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    if (!progress.completed) {
      return NextResponse.json(
        { error: 'Challenge not completed' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (progress.rewardClaimed) {
      return NextResponse.json(
        { error: 'Reward already claimed' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Get challenge definition for reward info
    const challengeDefinition = getChallengeById(progress.weeklyChallenge.challengeId);
    if (!challengeDefinition) {
      return NextResponse.json(
        { error: 'Challenge definition not found' },
        { status: 500, headers: corsHeaders },
      );
    }

    // Award the reward based on type
    if (challengeDefinition.rewardType === 'sticker') {
      await awardSticker(profileId, challengeDefinition.rewardId);
    } else if (challengeDefinition.rewardType === 'accessory') {
      // Add accessory to profile's Colo accessories
      const profile = await db.profile.findUnique({
        where: { id: profileId },
        select: { coloAccessories: true },
      });

      const currentAccessories = (profile?.coloAccessories as string[]) || [];
      if (!currentAccessories.includes(challengeDefinition.rewardId)) {
        await db.profile.update({
          where: { id: profileId },
          data: {
            coloAccessories: [...currentAccessories, challengeDefinition.rewardId],
          },
        });
      }
    }

    // Mark reward as claimed
    await claimChallengeReward(profileId, weeklyChallengeId);

    return NextResponse.json(
      {
        success: true,
        reward: {
          type: challengeDefinition.rewardType,
          id: challengeDefinition.rewardId,
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
