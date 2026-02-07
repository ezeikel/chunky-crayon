import { NextResponse } from 'next/server';
import { db, GenerationType } from '@chunky-crayon/db';
import {
  generateInstagramCaption,
  generateFacebookCaption,
  generatePinterestCaption,
  generateTikTokCaption,
} from '@/app/actions/social';
import { sendSocialDigest } from '@/app/actions/email';
import type { SocialDigestEntry } from '@/app/actions/email';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

/**
 * GET /api/social/digest
 * Sends a social media digest email with all platform captions for today's coloring page.
 * Runs at :25 after all platform crons finish.
 */
export const GET = async (request: Request) => {
  try {
    // Auth: CRON_SECRET bearer token
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the most recent daily coloring image
    const coloringImage = await db.coloringImage.findFirst({
      where: {
        generationType: GenerationType.DAILY,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!coloringImage) {
      return NextResponse.json(
        { error: 'No daily coloring image found' },
        { status: 404 },
      );
    }

    console.log('[Digest] Generating captions for:', coloringImage.title);

    // Generate all captions in parallel
    const [
      instagramCarouselCaption,
      instagramReelCaption,
      facebookVideoCaption,
      facebookImageCaption,
      pinterestCaption,
      tiktokCaption,
    ] = await Promise.all([
      generateInstagramCaption(coloringImage, 'carousel'),
      generateInstagramCaption(coloringImage, 'reel'),
      generateFacebookCaption(coloringImage, 'video'),
      generateFacebookCaption(coloringImage, 'image_with_video'),
      generatePinterestCaption(coloringImage),
      generateTikTokCaption(coloringImage),
    ]);

    // Assemble digest entries
    const entries: SocialDigestEntry[] = [
      {
        platform: 'Instagram Carousel',
        caption: instagramCarouselCaption,
        autoPosted: true,
        assetType: 'image',
      },
      {
        platform: 'Instagram Reel',
        caption: instagramReelCaption,
        autoPosted: true,
        assetType: 'video',
        assetUrl: coloringImage.animationUrl ?? undefined,
      },
      {
        platform: 'Facebook Video',
        caption: facebookVideoCaption,
        autoPosted: true,
        assetType: 'video',
        assetUrl: coloringImage.animationUrl ?? undefined,
      },
      {
        platform: 'Facebook Image',
        caption: facebookImageCaption,
        autoPosted: true,
        assetType: 'image',
      },
      {
        platform: 'Pinterest Image',
        caption: pinterestCaption,
        autoPosted: true,
        assetType: 'image',
      },
      {
        platform: 'Pinterest Video',
        caption: pinterestCaption,
        autoPosted: true,
        assetType: 'video',
        assetUrl: coloringImage.animationUrl ?? undefined,
      },
      {
        platform: 'TikTok',
        caption: tiktokCaption,
        autoPosted: false,
        assetType: 'video',
        assetUrl: coloringImage.animationUrl ?? undefined,
      },
    ];

    // Send digest email
    const result = await sendSocialDigest({
      coloringImageTitle: coloringImage.title ?? 'Untitled',
      coloringImageUrl: `${baseUrl}/coloring/${coloringImage.id}`,
      svgUrl: coloringImage.svgUrl ?? undefined,
      animationUrl: coloringImage.animationUrl ?? undefined,
      entries,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Failed to send digest' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Social digest email sent',
      coloringImageId: coloringImage.id,
      platformCount: entries.length,
    });
  } catch (error) {
    console.error('[Digest] Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send social digest',
      },
      { status: 500 },
    );
  }
};
