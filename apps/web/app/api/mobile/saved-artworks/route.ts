import { NextRequest, NextResponse } from 'next/server';
import {
  getUserSavedArtwork,
  saveArtworkToGallery,
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
 */
export async function GET() {
  try {
    const artworks = await getUserSavedArtwork();

    return NextResponse.json(
      {
        artworks: artworks.map((artwork) => ({
          id: artwork.id,
          title: artwork.title,
          imageUrl: artwork.imageUrl,
          coloringImageId: artwork.coloringImageId,
          coloringImage: artwork.coloringImage
            ? {
                id: artwork.coloringImage.id,
                title: artwork.coloringImage.title,
                svgUrl: artwork.coloringImage.svgUrl,
              }
            : null,
          createdAt: artwork.createdAt,
        })),
      },
      { headers: corsHeaders },
    );
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

    const result = await saveArtworkToGallery(coloringImageId, imageDataUrl, title);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        artworkId: result.artworkId,
        imageUrl: result.imageUrl,
        newStickers: result.newStickers,
        evolutionResult: result.evolutionResult,
      },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error saving artwork:', error);
    return NextResponse.json(
      { error: 'Failed to save artwork' },
      { status: 500, headers: corsHeaders },
    );
  }
}
