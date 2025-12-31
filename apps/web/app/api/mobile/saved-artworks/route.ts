import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@chunky-crayon/db';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';
import { checkAndAwardStickers } from '@/lib/stickers/service';
import { checkEvolution } from '@/lib/colo/service';
import type { ColoStage, EvolutionResult } from '@/lib/colo/types';

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
 * Check for Colo evolution and update profile if needed
 */
async function checkAndUpdateColoEvolution(
  profileId: string,
): Promise<EvolutionResult | null> {
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      coloStage: true,
      coloAccessories: true,
      _count: {
        select: {
          savedArtworks: true,
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  // Check for evolution
  const evolutionResult = checkEvolution(
    profile.coloStage as ColoStage,
    profile.coloAccessories,
    profile._count.savedArtworks,
  );

  // If evolved or unlocked new accessories, update the profile
  if (evolutionResult.evolved || evolutionResult.newAccessories.length > 0) {
    await db.profile.update({
      where: { id: profile.id },
      data: {
        coloStage: evolutionResult.newStage,
        coloAccessories: [
          ...profile.coloAccessories,
          ...evolutionResult.newAccessories,
        ],
      },
    });
  }

  return evolutionResult;
}

/**
 * GET /api/mobile/saved-artworks
 * Returns all saved artworks for the current user/profile
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getMobileAuthFromHeaders(request.headers);

    if (!userId) {
      return NextResponse.json(
        { artworks: [] },
        { headers: corsHeaders },
      );
    }

    // Get user's active profile
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        activeProfileId: true,
        profiles: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, isDefault: true },
        },
      },
    });

    const activeProfileId =
      user?.activeProfileId ||
      user?.profiles.find((p) => p.isDefault)?.id ||
      user?.profiles[0]?.id;

    // Filter by active profile if exists
    const where = activeProfileId
      ? { userId, profileId: activeProfileId }
      : { userId };

    const artworks = await db.savedArtwork.findMany({
      where,
      include: {
        coloringImage: {
          select: {
            id: true,
            title: true,
            svgUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

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
    const { userId } = await getMobileAuthFromHeaders(request.headers);

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: corsHeaders },
      );
    }

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

    // Get user's active profile
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        activeProfileId: true,
        profiles: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, isDefault: true },
        },
      },
    });

    const activeProfileId =
      user?.activeProfileId ||
      user?.profiles.find((p) => p.isDefault)?.id ||
      user?.profiles[0]?.id;

    // Verify the coloring image exists
    const coloringImage = await db.coloringImage.findUnique({
      where: { id: coloringImageId },
    });

    if (!coloringImage) {
      return NextResponse.json(
        { error: 'Coloring image not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    // Convert data URL to buffer
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `uploads/saved-artwork/${userId}/${coloringImageId}/${timestamp}.png`;

    // Upload to Vercel Blob
    const { url: imageUrl } = await put(fileName, imageBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    // Create the saved artwork record
    const savedArtwork = await db.savedArtwork.create({
      data: {
        userId,
        profileId: activeProfileId,
        coloringImageId,
        title: title || coloringImage.title,
        imageUrl,
      },
    });

    // Check for sticker unlocks after saving artwork
    const { newStickers } = await checkAndAwardStickers(userId, activeProfileId);

    // Check for Colo evolution after saving artwork
    const evolutionResult = activeProfileId
      ? await checkAndUpdateColoEvolution(activeProfileId)
      : null;

    return NextResponse.json(
      {
        success: true,
        artworkId: savedArtwork.id,
        imageUrl,
        newStickers: newStickers.map((s) => ({
          id: s.id,
          name: s.name,
          imageUrl: s.imageUrl,
        })),
        evolutionResult: evolutionResult
          ? {
              evolved: evolutionResult.evolved,
              previousStage: evolutionResult.previousStage,
              newStage: evolutionResult.newStage,
              newAccessories: evolutionResult.newAccessories,
            }
          : null,
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
