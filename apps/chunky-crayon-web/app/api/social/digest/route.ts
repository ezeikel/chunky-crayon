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

    // The demo reel is produced by the worker on a SEPARATE image (not the
    // daily one). Find the most recent image with demoReelUrl from today
    // so we can include its R2 asset links in the digest.
    const demoReelImage = await db.coloringImage.findFirst({
      where: {
        brand: BRAND,
        demoReelUrl: { not: null },
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('[Digest] Generating captions for:', coloringImage.title);
    if (demoReelImage) {
      console.log(
        '[Digest] Demo reel image:',
        demoReelImage.title,
        demoReelImage.id,
      );
    }

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

    // PTP-style: read per-platform success from socialPostResults JSON.
    // Static posts store results on the DAILY image; demo-reel posts store
    // results on the WORKER-CREATED image. Merge both for accurate badges.
    type PostResult = { success?: boolean } | undefined;
    const dailyResults = (coloringImage.socialPostResults ?? {}) as Record<
      string,
      PostResult
    >;
    const reelResults = (demoReelImage?.socialPostResults ?? {}) as Record<
      string,
      PostResult
    >;
    const wasAutoPosted = (key: string): boolean =>
      !!dailyResults[key]?.success || !!reelResults[key]?.success;

    // Split entries into two groups: daily image (static posts) and
    // demo reel (worker-produced video + colored-static CTA).
    const dailyEntries: SocialDigestEntry[] = [
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
    ];

    const demoReelEntries: SocialDigestEntry[] = [
      {
        platform: 'Instagram Reel',
        caption: instagramDemoReelCaption,
        autoPosted: wasAutoPosted('instagramDemoReel'),
        assetType: 'video',
      },
      {
        platform: 'Facebook Reel',
        caption: facebookDemoReelCaption,
        autoPosted: wasAutoPosted('facebookDemoReel'),
        assetType: 'video',
      },
      {
        platform: 'TikTok',
        caption: tiktokDemoReelCaption,
        autoPosted: false,
        assetType: 'video',
      },
      {
        platform: 'LinkedIn Reel',
        caption: linkedinDemoReelCaption,
        autoPosted: wasAutoPosted('linkedinDemoReel'),
        assetType: 'video',
      },
      {
        platform: 'Pinterest Video',
        caption: pinterestCaption,
        autoPosted: wasAutoPosted('pinterestDemoReel'),
        assetType: 'video',
      },
      {
        platform: 'Instagram Static (blank)',
        caption: instagramColoredStaticCaption,
        autoPosted: wasAutoPosted('instagramColoredStatic'),
        assetType: 'image',
      },
      {
        platform: 'Facebook Static (blank)',
        caption: facebookColoredStaticCaption,
        autoPosted: wasAutoPosted('facebookColoredStatic'),
        assetType: 'image',
      },
    ];

    // Send digest email
    const result = await sendSocialDigest({
      coloringImageTitle: coloringImage.title ?? 'Untitled',
      coloringImageUrl: `${baseUrl}/coloring/${coloringImage.id}`,
      dailyImageAssetUrl: coloringImage.url ?? undefined,
      dailyEntries,
      demoReelTitle: demoReelImage?.title ?? undefined,
      demoReelUrl:
        demoReelImage?.demoReelUrl ?? coloringImage.demoReelUrl ?? undefined,
      demoReelCoverUrl:
        demoReelImage?.demoReelCoverUrl ??
        coloringImage.demoReelCoverUrl ??
        undefined,
      demoReelEntries,
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
      platformCount: dailyEntries.length + demoReelEntries.length,
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
