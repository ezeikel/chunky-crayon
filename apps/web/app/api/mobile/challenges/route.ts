import { NextRequest, NextResponse } from 'next/server';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';
import {
  getCurrentChallenge,
  getChallengeHistory,
} from '@/lib/challenges/service';
import { db } from '@chunky-crayon/db';

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
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getMobileAuthFromHeaders(request.headers);

    if (!userId) {
      return NextResponse.json(
        { currentChallenge: null, history: [] },
        { headers: corsHeaders },
      );
    }

    // Get active profile
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { activeProfileId: true },
    });

    if (!user?.activeProfileId) {
      return NextResponse.json(
        { currentChallenge: null, history: [] },
        { headers: corsHeaders },
      );
    }

    const profileId = user.activeProfileId;

    // Get current challenge and history in parallel
    const [currentChallenge, history] = await Promise.all([
      getCurrentChallenge(profileId),
      getChallengeHistory(profileId, 5),
    ]);

    // Filter out current challenge from history if it exists
    const filteredHistory = history.filter(
      (h) => h.weeklyChallengeId !== currentChallenge?.weeklyChallengeId,
    );

    // Serialize dates for JSON response
    const serializeChallenge = (challenge: typeof currentChallenge) => {
      if (!challenge) return null;
      return {
        ...challenge,
        startDate: challenge.startDate.toISOString(),
        endDate: challenge.endDate.toISOString(),
        completedAt: challenge.completedAt?.toISOString() || null,
      };
    };

    return NextResponse.json(
      {
        currentChallenge: serializeChallenge(currentChallenge),
        history: filteredHistory.map(serializeChallenge),
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500, headers: corsHeaders },
    );
  }
}
