import { NextRequest, NextResponse } from 'next/server';
import {
  getMobileSavedArtworksAction,
  saveMobileArtworkAction,
} from '@/app/actions/saved-artwork';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/mobile/saved-artworks
 * Returns all saved artworks for the current user/profile
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function GET() {
  try {
    const data = await getMobileSavedArtworksAction();
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching saved artworks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved artworks' },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * POST /api/mobile/saved-artworks
 * Save a new artwork to the gallery
 *
 * Auth: Handled by middleware (sets x-user-id header from JWT)
 * Uses unified auth via getUserId() in server action
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coloringImageId, imageDataUrl, title } = body;

    if (!coloringImageId || typeof coloringImageId !== 'string') {
      return NextResponse.json(
        { error: 'coloringImageId is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageDataUrl is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await saveMobileArtworkAction(
      coloringImageId,
      imageDataUrl,
      title,
    );

    if (!result.success) {
      const status = result.error === 'Not authenticated' ? 401 : 400;
      return NextResponse.json(
        { error: result.error },
        { status, headers: corsHeaders },
      );
    }

    return NextResponse.json(result, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error saving artwork:', error);
    return NextResponse.json(
      { error: 'Failed to save artwork' },
      { status: 500, headers: corsHeaders },
    );
  }
}
