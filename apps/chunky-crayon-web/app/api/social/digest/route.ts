import { NextResponse, connection } from 'next/server';
import { db, GenerationType } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import {
  generateInstagramCaption,
  generateFacebookCaption,
  generatePinterestCaption,
  generateLinkedInCaption,
  generateTikTokCaption,
} from '@/app/actions/social';
import { sendSocialDigest, sendAdminAlert } from '@/app/actions/email';
import type { SocialDigestEntry } from '@/app/actions/email';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

/**
 * GET /api/social/digest
 * Sends a social media digest email with all platform captions for today's coloring page.
 * Runs at :25 after all platform crons finish.
 */
export const GET = async (request: Request) => {
  await connection();

  try {
    // Auth: CRON_SECRET bearer token
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only digest today's image — prevents sending stale content
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const coloringImage = await db.coloringImage.findFirst({
      where: {
        brand: BRAND,
        generationType: GenerationType.DAILY,
        createdAt: { gte: todayStart },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!coloringImage) {
      const message =
        'No daily coloring image generated today - skipping digest';
      console.warn(`[Digest] ${message}`);
      await sendAdminAlert({
        subject: 'Social digest skipped - no daily image',
        body: `The social digest cron was skipped because no DAILY coloring image was generated today.\n\nCheck the Vercel function logs for /api/coloring-image/generate.`,
      });
      return NextResponse.json(
        { success: false, message, skipped: true },
        { status: 200 },
      );
    }

    console.log('[Digest] Generating captions for:', coloringImage.title);

    // Generate all captions in parallel
    const [
      instagramCarouselCaption,
      instagramDemoReelCaption,
      instagramColoredStaticCaption,
      facebookImageCaption,
      facebookDemoReelCaption,
      facebookColoredStaticCaption,
      pinterestCaption,
      tiktokDemoReelCaption,
      linkedinCaption,
      linkedinDemoReelCaption,
    ] = await Promise.all([
      generateInstagramCaption(coloringImage, 'carousel'),
      generateInstagramCaption(coloringImage, 'demo_reel'),
      generateInstagramCaption(coloringImage, 'colored_static'),
      generateFacebookCaption(coloringImage, 'image'),
      generateFacebookCaption(coloringImage, 'demo_reel'),
      generateFacebookCaption(coloringImage, 'colored_static'),
      generatePinterestCaption(coloringImage),
      generateTikTokCaption(coloringImage, 'demo_reel'),
      generateLinkedInCaption(coloringImage),
      generateLinkedInCaption(coloringImage, 'demo_reel'),
    ]);

    // Prefer the product-demo reel as the video asset — the Veo animation
    // cron is dormant, so animationUrl will usually be null for new images.
    const videoAssetUrl =
      coloringImage.demoReelUrl ?? coloringImage.animationUrl ?? undefined;

    // PTP-style: read per-platform success from the row's
    // socialPostResults JSON, populated by /api/social/post during the
    // platform crons. Falls back to false if the platform never ran.
    type PostResult = { success?: boolean } | undefined;
    const results = (coloringImage.socialPostResults ?? {}) as Record<
      string,
      PostResult
    >;
    const wasAutoPosted = (key: string): boolean => !!results[key]?.success;

    // Assemble digest entries — flow ordered like the cron slots:
    //   1. Static carousel (line art for printing)
    //   2. Static FB / Pinterest / LinkedIn (line art)
    //   3. Demo reel (worker product video) across IG/FB/TikTok/LinkedIn/Pinterest
    //   4. Colored-static (finished artwork CTA) on IG + FB
    const entries: SocialDigestEntry[] = [
      // 1. Static carousel — line art printable
      {
        platform: 'Instagram Carousel',
        caption: instagramCarouselCaption,
        autoPosted: wasAutoPosted('instagramCarousel'),
        assetType: 'image',
      },
      {
        platform: 'Facebook Image',
        caption: facebookImageCaption,
        autoPosted: wasAutoPosted('facebookImage'),
        assetType: 'image',
      },
      {
        platform: 'Pinterest Image',
        caption: pinterestCaption,
        autoPosted: wasAutoPosted('pinterest'),
        assetType: 'image',
      },
      {
        platform: 'LinkedIn',
        caption: linkedinCaption,
        autoPosted: wasAutoPosted('linkedin'),
        assetType: 'image',
      },
      // 2. Demo reel — product-demo video
      {
        platform: 'Instagram Demo Reel',
        caption: instagramDemoReelCaption,
        autoPosted: wasAutoPosted('instagramDemoReel'),
        assetType: 'video',
        assetUrl: coloringImage.demoReelUrl ?? undefined,
      },
      {
        platform: 'Facebook Demo Reel',
        caption: facebookDemoReelCaption,
        autoPosted: wasAutoPosted('facebookDemoReel'),
        assetType: 'video',
        assetUrl: coloringImage.demoReelUrl ?? undefined,
      },
      {
        platform: 'TikTok Demo Reel',
        caption: tiktokDemoReelCaption,
        // TikTok always goes to drafts — never auto-published.
        autoPosted: false,
        assetType: 'video',
        assetUrl: coloringImage.demoReelUrl ?? undefined,
      },
      {
        platform: 'LinkedIn Demo Reel',
        caption: linkedinDemoReelCaption,
        autoPosted: wasAutoPosted('linkedinDemoReel'),
        assetType: 'video',
        assetUrl: coloringImage.demoReelUrl ?? undefined,
      },
      {
        platform: 'Pinterest Demo Reel',
        caption: pinterestCaption,
        autoPosted: wasAutoPosted('pinterestDemoReel'),
        assetType: 'video',
        assetUrl: coloringImage.demoReelUrl ?? undefined,
      },
      // 3. Colored static — finished artwork CTA
      {
        platform: 'Instagram Colored Static',
        caption: instagramColoredStaticCaption,
        autoPosted: wasAutoPosted('instagramColoredStatic'),
        assetType: 'image',
        assetUrl: coloringImage.demoReelCoverUrl ?? undefined,
      },
      {
        platform: 'Facebook Colored Static',
        caption: facebookColoredStaticCaption,
        autoPosted: wasAutoPosted('facebookColoredStatic'),
        assetType: 'image',
        assetUrl: coloringImage.demoReelCoverUrl ?? undefined,
      },
    ];

    // Send digest email
    const result = await sendSocialDigest({
      coloringImageTitle: coloringImage.title ?? 'Untitled',
      coloringImageUrl: `${baseUrl}/coloring/${coloringImage.id}`,
      svgUrl: coloringImage.svgUrl ?? undefined,
      animationUrl: videoAssetUrl,
      demoReelUrl: coloringImage.demoReelUrl ?? undefined,
      demoReelCoverUrl: coloringImage.demoReelCoverUrl ?? undefined,
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
