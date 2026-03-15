import { NextRequest, NextResponse } from 'next/server';
import {
  getMobileStickersAction,
  markStickersViewed,
} from '@/app/actions/stickers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/stickers
 * Returns all stickers with unlock status for the current user
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function GET() {
  try {
    const data = await getMobileStickersAction();
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching stickers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stickers' },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * POST /api/mobile/stickers
 * Mark stickers as viewed (remove NEW badge)
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stickerIds } = body;

    if (!Array.isArray(stickerIds)) {
      return NextResponse.json(
        { error: 'stickerIds must be an array' },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await markStickersViewed(stickerIds);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: corsHeaders },
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error marking stickers as viewed:', error);
    return NextResponse.json(
      { error: 'Failed to mark stickers as viewed' },
      { status: 500, headers: corsHeaders },
    );
  }
}
