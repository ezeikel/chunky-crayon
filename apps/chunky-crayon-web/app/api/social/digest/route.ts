import { NextResponse, connection } from 'next/server';
import { groq } from 'next-sanity';
import { db, GenerationType } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { client as sanityClient, urlFor } from '@/lib/sanity';
import {
  generateInstagramCaption,
  generateFacebookCaption,
  generatePinterestCaption,
  generateLinkedInCaption,
  generateTikTokCaption,
} from '@/app/actions/social';
import { sendSocialDigest, sendAdminAlert } from '@/app/actions/email';
import type { SocialDigestEntry } from '@/app/actions/email';

// Today's blog post — fetched separately from Sanity since the brief
// fires AFTER the blog cron (06:00 UTC) but the row sits in Sanity, not
// the Prisma daily-image flow. If the blog cron hasn't completed by 08:30
// UTC (rare — usually finishes ~06:05) the brief simply omits the blog
// section.
const todaysBlogPostQuery = groq`
  *[_type == "post" && status == "published"
    && publishedAt >= $todayStart && publishedAt < $tomorrowStart]
    | order(publishedAt desc)[0] {
      title,
      slug,
      excerpt,
      featuredImage {
        asset->,
        alt
      }
    }
`;
type TodaysBlogPost = {
  title?: string;
  slug?: { current?: string };
  excerpt?: string;
  featuredImage?: { asset?: unknown; alt?: string } | null;
};

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

// Maps each `socialPostResults` key to the cron schedule that fires it.
// Mirrors the cron entries in apps/chunky-crayon-web/vercel.json — when you
// move a cron, update this table too.
//
// Day strings: 'weekday' = Mon-Fri, 'weekend' = Sat+Sun, 'next-day-weekday'
// = the cron fires Tue-Sat UTC because the post is *for* the previous
// weekday's audience (e.g. 00:30 UTC Wed = 8:30pm Tue ET).
type ScheduledSlot = {
  /** UTC HH:MM when the cron fires */
  utc: string;
  /** Which days of week the slot is active (UTC, not local) */
  days: 'weekday' | 'weekend' | 'next-day-weekday' | 'next-day-weekend';
};
const POST_SCHEDULE: Record<string, ScheduledSlot> = {
  // Weekday demo-reel slots (afternoon UTC = US workday morning/lunch)
  facebookDemoReel: { utc: '13:00', days: 'weekday' },
  pinterestDemoReel: { utc: '13:02', days: 'weekday' },
  instagramDemoReel: { utc: '17:00', days: 'weekday' },
  pinterest: { utc: '18:00', days: 'weekday' }, // weekday Pinterest static
  // Weekday late-night slots (00:30+ UTC = US Eastern evening prior calendar day)
  instagramCarousel: { utc: '00:30', days: 'next-day-weekday' },
  tiktokDemoReel: { utc: '00:32', days: 'next-day-weekday' },
};

const POST_SCHEDULE_WEEKEND: Record<string, ScheduledSlot> = {
  instagramDemoReel: { utc: '17:00', days: 'weekend' },
  facebookDemoReel: { utc: '17:02', days: 'weekend' },
  tiktokDemoReel: { utc: '17:04', days: 'weekend' },
  pinterestDemoReel: { utc: '17:06', days: 'weekend' },
  instagramCarousel: { utc: '17:08', days: 'weekend' },
  pinterest: { utc: '17:10', days: 'weekend' },
};

/**
 * Returns the UTC HH:MM today's cron will fire for `key`, or undefined if
 * no cron is scheduled for the current day-of-week.
 *
 * Used by the brief email to show "scheduled HH:MM UTC" alongside captions.
 */
const scheduledTimeFor = (key: string): string | undefined => {
  const todayDay = new Date().getUTCDay(); // 0=Sun, 6=Sat
  const isWeekend = todayDay === 0 || todayDay === 6;
  const table = isWeekend ? POST_SCHEDULE_WEEKEND : POST_SCHEDULE;
  return table[key]?.utc;
};

/**
 * GET /api/social/digest
 * Sends the daily posting brief email — fires in the morning before any
 * platform cron, lists what's scheduled to auto-post today, and includes
 * raw assets + captions for anything you want to post manually.
 *
 * Renamed from "social digest" — the previous version ran in the evening
 * after posts had landed and showed past-tense "auto-posted" badges.
 * The route URL stays the same for cron config compat.
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

    // Fetch today's published blog post from Sanity, if any. The blog cron
    // fires at 06:00 UTC and usually finishes within minutes, so by 08:30
    // UTC (when the brief fires) it should be live. If it isn't (cron
    // failed, all topics covered, etc.) the brief omits the section
    // gracefully — null result means no blog to surface.
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
    let blogPost: TodaysBlogPost | null = null;
    try {
      blogPost = await sanityClient.fetch<TodaysBlogPost | null>(
        todaysBlogPostQuery,
        {
          todayStart: todayStart.toISOString(),
          tomorrowStart: tomorrowStart.toISOString(),
        },
      );
    } catch (err) {
      console.warn('[Digest] Sanity blog fetch failed:', err);
    }

    const blogImageUrl =
      blogPost?.featuredImage?.asset && blogPost.title
        ? urlFor(blogPost.featuredImage).width(1104).height(580).url()
        : undefined;
    const blogUrl =
      blogPost?.slug?.current && blogPost.title
        ? `${baseUrl}/blog/${blogPost.slug.current}`
        : undefined;

    console.log('[Digest] Generating captions for:', coloringImage.title);
    if (demoReelImage) {
      console.log(
        '[Digest] Demo reel image:',
        demoReelImage.title,
        demoReelImage.id,
      );
    }
    if (blogPost) {
      console.log('[Digest] Blog post for today:', blogPost.title);
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

    // willAutoPost: true if there's a cron scheduled for this platform/type
    // today. False = manual-only (LinkedIn, currently colored-static which
    // we paused earlier). When the entry has a cron, scheduledTimeUtc tells
    // the recipient when it'll fire so they can plan around it.
    const slotFor = (
      key: string,
    ): { willAutoPost: boolean; scheduledTimeUtc?: string } => {
      const utc = scheduledTimeFor(key);
      return utc
        ? { willAutoPost: true, scheduledTimeUtc: utc }
        : { willAutoPost: false };
    };

    // Split entries into two groups: daily image (static posts) and
    // demo reel (worker-produced video). Each carries its scheduled UTC
    // post time when there's a cron; manual entries (LinkedIn) have none.
    const dailyEntries: SocialDigestEntry[] = [
      {
        platform: 'Instagram Carousel',
        caption: instagramCarouselCaption,
        ...slotFor('instagramCarousel'),
        assetType: 'image',
      },
      {
        platform: 'Facebook Image',
        caption: facebookImageCaption,
        ...slotFor('facebookImage'),
        assetType: 'image',
      },
      {
        platform: 'Pinterest Image',
        caption: pinterestCaption,
        ...slotFor('pinterest'),
        assetType: 'image',
      },
      {
        platform: 'LinkedIn',
        caption: linkedinCaption,
        willAutoPost: false, // LinkedIn is manual-only
        assetType: 'image',
      },
    ];

    const demoReelEntries: SocialDigestEntry[] = [
      {
        platform: 'Instagram Reel',
        caption: instagramDemoReelCaption,
        ...slotFor('instagramDemoReel'),
        assetType: 'video',
      },
      {
        platform: 'Facebook Reel',
        caption: facebookDemoReelCaption,
        ...slotFor('facebookDemoReel'),
        assetType: 'video',
      },
      {
        platform: 'TikTok',
        caption: tiktokDemoReelCaption,
        ...slotFor('tiktokDemoReel'),
        assetType: 'video',
      },
      {
        platform: 'LinkedIn Reel',
        caption: linkedinDemoReelCaption,
        willAutoPost: false, // LinkedIn is manual-only
        assetType: 'video',
      },
      {
        platform: 'Pinterest Video',
        caption: pinterestCaption,
        ...slotFor('pinterestDemoReel'),
        assetType: 'video',
      },
      {
        platform: 'Instagram Static (blank)',
        caption: instagramColoredStaticCaption,
        ...slotFor('instagramColoredStatic'),
        assetType: 'image',
      },
      {
        platform: 'Facebook Static (blank)',
        caption: facebookColoredStaticCaption,
        ...slotFor('facebookColoredStatic'),
        assetType: 'image',
      },
    ];

    // Send digest email
    const result = await sendSocialDigest({
      blogTitle: blogPost?.title,
      blogExcerpt: blogPost?.excerpt,
      blogImageUrl,
      blogUrl,
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
