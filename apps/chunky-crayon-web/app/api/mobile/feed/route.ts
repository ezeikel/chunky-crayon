import { NextResponse } from 'next/server';
import { getMobileFeedAction } from '@/app/actions/feed';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/feed
 * Returns the curated home feed for mobile app
 *
 * Content includes:
 * - todaysPick: Daily featured coloring page
 * - activeChallenge: Current weekly challenge with progress
 * - recentArt: User's recently saved artworks (limit 10)
 * - weeklyCollection: Weekly themed coloring pages
 * - monthlyFeatured: Monthly featured coloring pages
 *
 * Auth: Handled by middleware (sets x-user-id, x-profile-id headers from JWT)
 * Note: User-generated content is excluded for child safety (COPPA/GDPR-K compliance)
 */
export async function GET() {
  try {
    const feed = await getMobileFeedAction();
    return NextResponse.json(feed, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching mobile feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500, headers: corsHeaders },
    );
  }
}
