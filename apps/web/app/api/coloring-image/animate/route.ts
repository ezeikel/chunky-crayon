import { NextRequest, NextResponse } from 'next/server';
import { GenerationType, db } from '@chunky-crayon/db';
import sharp from 'sharp';
import { put } from '@/lib/storage';
import {
  generateText,
  models,
  generateAnimationFromImage,
  isVideoGenerationAvailable,
  ANIMATION_PROMPT_SYSTEM,
  createAnimationPromptPrompt,
  DEFAULT_ANIMATION_PROMPT,
} from '@/lib/ai';

export const maxDuration = 300; // 5 minutes - video generation can take a while

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Convert SVG to PNG for video generation input.
 * Veo needs a raster image, not SVG.
 */
async function convertSvgToPng(svgUrl: string): Promise<string> {
  const svgResponse = await fetch(svgUrl);
  const svgBuffer = Buffer.from(await svgResponse.arrayBuffer());

  // Convert to PNG at 1080x1920 (9:16 vertical for Instagram Reels)
  const pngBuffer = await sharp(svgBuffer)
    .flatten({ background: '#ffffff' })
    .resize(1080, 1920, {
      fit: 'cover',
      position: 'center',
    })
    .png({ quality: 95 })
    .toBuffer();

  // Upload to temp storage
  const tempFileName = `temp/animate/${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
  const { url } = await put(tempFileName, pngBuffer, { access: 'public' });

  return url;
}

/**
 * Generate a custom animation prompt using AI based on image metadata.
 */
async function generateAnimationPrompt(
  title: string,
  description: string,
  tags: string[],
): Promise<string> {
  try {
    const { text } = await generateText({
      model: models.creative,
      system: ANIMATION_PROMPT_SYSTEM,
      prompt: createAnimationPromptPrompt(title, description, tags),
    });

    return text.trim() || DEFAULT_ANIMATION_PROMPT;
  } catch (error) {
    console.error(
      '[Animate] Failed to generate custom prompt, using default:',
      error,
    );
    return DEFAULT_ANIMATION_PROMPT;
  }
}

const handleRequest = async (request: NextRequest) => {
  try {
    // Check if video generation is available
    if (!isVideoGenerationAvailable()) {
      return NextResponse.json(
        {
          error: 'Video generation not available',
          details: 'GOOGLE_GENERATIVE_AI_API_KEY not configured',
        },
        {
          status: 503,
          headers: corsHeaders,
        },
      );
    }

    const url = new URL(request.url);
    let coloringImageId = url.searchParams.get('coloring_image_id');

    // If POST request, also check request body
    if (!coloringImageId && request.method === 'POST') {
      try {
        const body = await request.json();
        coloringImageId = body.coloringImageId;
      } catch {
        // if body parsing fails, continue with query param value
      }
    }

    let coloringImage;

    if (coloringImageId) {
      // Get specific coloring image by ID
      coloringImage = await db.coloringImage.findUnique({
        where: { id: coloringImageId },
      });

      if (!coloringImage) {
        return NextResponse.json(
          { error: `Coloring image with ID ${coloringImageId} not found` },
          { status: 404, headers: corsHeaders },
        );
      }
    } else {
      // Get the most recent DAILY coloring image without animation
      coloringImage = await db.coloringImage.findFirst({
        where: {
          generationType: GenerationType.DAILY,
          animationUrl: null, // Only ones without animation
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!coloringImage) {
        // Check if we have a recent one that already has animation
        const recentWithAnimation = await db.coloringImage.findFirst({
          where: {
            generationType: GenerationType.DAILY,
            animationUrl: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (recentWithAnimation) {
          return NextResponse.json(
            {
              success: true,
              message: 'Most recent daily image already has animation',
              coloringImage: recentWithAnimation,
              skipped: true,
            },
            { headers: corsHeaders },
          );
        }

        return NextResponse.json(
          { error: 'No coloring image found to animate' },
          { status: 404, headers: corsHeaders },
        );
      }
    }

    // Check if this image already has an animation
    if (coloringImage.animationUrl) {
      return NextResponse.json(
        {
          success: true,
          message: 'Animation already exists for this image',
          coloringImage,
          skipped: true,
        },
        { headers: corsHeaders },
      );
    }

    if (!coloringImage.svgUrl) {
      return NextResponse.json(
        { error: 'Coloring image has no SVG URL' },
        { status: 400, headers: corsHeaders },
      );
    }

    console.log(`[Animate] Starting animation for: ${coloringImage.title}`);

    // Step 1: Convert SVG to PNG for Veo input
    console.log('[Animate] Converting SVG to PNG...');
    const pngUrl = await convertSvgToPng(coloringImage.svgUrl);

    // Step 2: Use stored animation prompt (generated at image creation from visual analysis)
    // Fall back to dynamic generation only for older images without stored prompts
    let animationPrompt: string;
    if (coloringImage.animationPrompt) {
      console.log('[Animate] Using stored animation prompt (image-specific)');
      animationPrompt = coloringImage.animationPrompt;
    } else {
      console.log(
        '[Animate] No stored prompt, generating from metadata (fallback)...',
      );
      animationPrompt = await generateAnimationPrompt(
        coloringImage.title,
        coloringImage.description,
        coloringImage.tags,
      );
    }
    console.log('[Animate] Animation prompt:', animationPrompt);

    // Step 3: Generate video using Veo 3
    console.log('[Animate] Generating video with Veo 3...');
    const videoResult = await generateAnimationFromImage(
      pngUrl,
      animationPrompt,
    );

    // Step 4: Update the coloring image with the animation URL
    const updatedImage = await db.coloringImage.update({
      where: { id: coloringImage.id },
      data: { animationUrl: videoResult.url },
    });

    console.log(`[Animate] Success! Animation saved: ${videoResult.url}`);

    return NextResponse.json(
      {
        success: true,
        coloringImage: updatedImage,
        animation: {
          url: videoResult.url,
          durationSeconds: videoResult.durationSeconds,
          generationTimeMs: videoResult.generationTimeMs,
          prompt: animationPrompt,
        },
        message: 'Successfully generated animation',
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[Animate] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate animation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
};

export const GET = handleRequest;
export const POST = handleRequest;
