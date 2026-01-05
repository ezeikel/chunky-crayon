import { NextRequest, NextResponse } from 'next/server';
import { db } from '@chunky-crayon/db';
import { put, exists } from '@/lib/storage';

export const maxDuration = 30;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const COLORED_EXAMPLES_FOLDER = 'colored-examples';

/**
 * GET: Check if a colored example exists for an image
 * Query: ?coloring_image_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const coloringImageId = url.searchParams.get('coloring_image_id');

    if (!coloringImageId) {
      return NextResponse.json(
        { error: 'coloring_image_id is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Check for different formats
    const formats = ['png', 'jpg', 'jpeg'];
    const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

    for (const format of formats) {
      const pathname = `${COLORED_EXAMPLES_FOLDER}/${coloringImageId}.${format}`;
      const found = await exists(pathname);
      if (found) {
        return NextResponse.json(
          {
            exists: true,
            url: `${publicUrl}/${pathname}`,
            coloringImageId,
          },
          { headers: corsHeaders },
        );
      }
    }

    return NextResponse.json(
      { exists: false, coloringImageId },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[ColoredExample] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to check colored example' },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * POST: Upload a colored example for an image
 * Body: FormData with 'file' (image) and 'coloringImageId'
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const coloringImageId = formData.get('coloringImageId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'file is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!coloringImageId) {
      return NextResponse.json(
        { error: 'coloringImageId is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Verify the coloring image exists
    const coloringImage = await db.coloringImage.findUnique({
      where: { id: coloringImageId },
    });

    if (!coloringImage) {
      return NextResponse.json(
        { error: `Coloring image ${coloringImageId} not found` },
        { status: 404, headers: corsHeaders },
      );
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File must be PNG or JPEG' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Determine file extension
    const extension = file.type === 'image/png' ? 'png' : 'jpg';
    const pathname = `${COLORED_EXAMPLES_FOLDER}/${coloringImageId}.${extension}`;

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to R2
    const { url } = await put(pathname, buffer, {
      access: 'public',
      contentType: file.type,
    });

    console.log(`[ColoredExample] Uploaded: ${url}`);

    return NextResponse.json(
      {
        success: true,
        url,
        coloringImageId,
        message: `Colored example uploaded for ${coloringImage.title}`,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[ColoredExample] POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload colored example',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders },
    );
  }
}

/**
 * OPTIONS: CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
