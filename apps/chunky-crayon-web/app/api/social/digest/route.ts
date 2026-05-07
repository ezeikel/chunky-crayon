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
import {
  generateContentReelCaption,
  type ContentReelCaptionInput,
} from '@/lib/content-reel/captions';
import { sendSocialDigest, sendAdminAlert } from '@/app/actions/email';
import type { SocialDigestEntry } from '@/app/actions/email';
import { buildComicStripCaption } from '@/lib/comic-strip/captions';

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
  // Content-reel slots (daily, 7d/wk — see vercel.json content-reel-post crons)
  facebookContentReel: { utc: '13:05', days: 'weekday' },
  pinterestContentReel: { utc: '13:07', days: 'weekday' },
  instagramContentReel: { utc: '17:05', days: 'weekday' },
  // tiktokDemoReel + tiktokContentReel intentionally omitted — TikTok auto-
  // posting is paused; brief surfaces caption + asset for manual upload via
  // the TikTok app (sandbox API only writes drafts anyway, half-manual).
};

const POST_SCHEDULE_WEEKEND: Record<string, ScheduledSlot> = {
  instagramDemoReel: { utc: '17:00', days: 'weekend' },
  facebookDemoReel: { utc: '17:02', days: 'weekend' },
  pinterestDemoReel: { utc: '17:06', days: 'weekend' },
  instagramCarousel: { utc: '17:08', days: 'weekend' },
  pinterest: { utc: '17:10', days: 'weekend' },
  // Content-reel slots (daily, same UTC times as weekday — picked once and
  // applied to all 7 days, see vercel.json).
  facebookContentReel: { utc: '13:05', days: 'weekend' },
  pinterestContentReel: { utc: '13:07', days: 'weekend' },
  instagramContentReel: { utc: '17:05', days: 'weekend' },
  // Comic strip — Sunday only. Generation 06:00 UTC, posts that afternoon.
  // The brief fires 08:30 UTC so the strip is already in DB by then.
  facebookComicStrip: { utc: '13:00', days: 'weekend' },
  pinterestComicStrip: { utc: '13:02', days: 'weekend' },
  instagramComicStrip: { utc: '17:00', days: 'weekend' },
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

    // Note: missing daily image is no longer fatal. The brief ships
    // with whatever sections ARE ready (demo reel, content reel, comic
    // strip, blog). Only the dailyEntries (Instagram carousel /
    // Facebook image / Pinterest static / LinkedIn static) get omitted
    // when there's no daily image — those captions and assets all
    // depend on it. The demo reel uses its own coloringImage row
    // (demoReelImage) so it's independent of the daily one.
    if (!coloringImage) {
      console.warn(
        '[Digest] No daily coloring image today — brief will skip the dailyEntries section but still ship demo reel / content reel / comic strip / blog if ready.',
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

    // Today's ContentReel — the daily-publish cron fires at 05:00 UTC and
    // sets `postedAt` after the worker uploads the rendered mp4 + cover.
    // By 08:30 UTC (digest time) it should be ready. If it isn't (cron
    // failed, no candidates available) the brief omits the section.
    const contentReel = await db.contentReel.findFirst({
      where: {
        brand: BRAND,
        postedAt: { gte: todayStart },
        reelUrl: { not: null },
      },
      orderBy: { postedAt: 'desc' },
    });

    // Today's comic strip — only included on Sunday morning briefs.
    // Generation cron fires 06:00 UTC, brief fires 08:30 UTC, posts
    // start at 13:00 UTC — so the Sunday brief is the actionable
    // window: review the strip, re-roll if needed, grab assets for
    // manual TikTok posting before auto-posts fire. Mon-Sat the strip's
    // already out; including it would just be noise.
    //
    // Filtering by createdAt >= todayStart is naturally Sunday-only
    // because that's the only day the generation cron runs — and it
    // self-corrects if we ever fire an off-schedule generation.
    const comicStrip = await db.comicStrip.findFirst({
      where: {
        brand: BRAND,
        status: { in: ['READY', 'POSTED'] },
        assembledUrl: { not: null },
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

    if (coloringImage) {
      console.log('[Digest] Generating captions for:', coloringImage.title);
    }
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

    // Caption generation has two independent code paths now:
    //
    //   1. Daily-image captions — Instagram carousel, Facebook image,
    //      Pinterest static, LinkedIn static, and the colored-static
    //      "after" posts. All of these post the daily coloring page,
    //      so they need the daily coloringImage to generate captions.
    //      Skipped (empty array later) when no daily image exists.
    //
    //   2. Demo-reel captions — Instagram Reel, Facebook Reel, TikTok,
    //      Pinterest Video, LinkedIn Reel. These use the demoReelImage
    //      row (separate worker-produced image, generated by its own
    //      cron) so they're independent of the daily image.
    //
    // Previously both groups fed `coloringImage` into the caption
    // function with different mode arguments — that conflated two
    // separate concerns and meant a missing daily image incorrectly
    // killed the demo-reel section too.
    const captionImage = demoReelImage ?? coloringImage;
    const dailyImageCaptionPromises = coloringImage
      ? ([
          generateInstagramCaption(coloringImage, 'carousel'),
          generateInstagramCaption(coloringImage, 'colored_static'),
          generateFacebookCaption(coloringImage, 'image'),
          generateFacebookCaption(coloringImage, 'colored_static'),
          generatePinterestCaption(coloringImage),
          generateLinkedInCaption(coloringImage),
        ] as const)
      : null;
    const demoReelCaptionPromises = captionImage
      ? ([
          generateInstagramCaption(captionImage, 'demo_reel'),
          generateFacebookCaption(captionImage, 'demo_reel'),
          generateTikTokCaption(captionImage, 'demo_reel'),
          generateLinkedInCaption(captionImage, 'demo_reel'),
          // Pinterest video reel reuses the daily Pinterest caption
          // when daily image exists; otherwise generate against the
          // demo-reel image.
          generatePinterestCaption(captionImage),
        ] as const)
      : null;

    const [dailyImageResults, demoReelResults] = await Promise.all([
      dailyImageCaptionPromises
        ? Promise.all(dailyImageCaptionPromises)
        : Promise.resolve(null),
      demoReelCaptionPromises
        ? Promise.all(demoReelCaptionPromises)
        : Promise.resolve(null),
    ]);

    const [
      instagramCarouselCaption,
      instagramColoredStaticCaption,
      facebookImageCaption,
      facebookColoredStaticCaption,
      pinterestCaption,
      linkedinCaption,
    ] = dailyImageResults ?? (Array.from({ length: 6 }, () => '') as string[]);
    const [
      instagramDemoReelCaption,
      facebookDemoReelCaption,
      tiktokDemoReelCaption,
      linkedinDemoReelCaption,
      pinterestDemoReelCaption,
    ] = demoReelResults ?? (Array.from({ length: 5 }, () => '') as string[]);

    // Pre-generate content-reel captions for the brief so the recipient
    // can copy-paste for manual platforms (TikTok). The auto-post route
    // generates these again at fire time, accepting the small duplicate
    // Claude cost — keeps each surface independent and means a brief-
    // failure doesn't block the post route or vice versa.
    let contentReelCaptions: Record<
      'instagram' | 'facebook' | 'pinterest' | 'tiktok',
      string
    > | null = null;
    if (contentReel) {
      const reelCaptionInput: ContentReelCaptionInput = {
        kind: contentReel.kind,
        hook: contentReel.hook,
        payoff: contentReel.payoff,
        sourceTitle: contentReel.sourceTitle ?? undefined,
        sourceUrl: contentReel.sourceUrl ?? undefined,
      };
      const [ig, fb, pin, tt] = await Promise.all([
        generateContentReelCaption('instagram', reelCaptionInput),
        generateContentReelCaption('facebook', reelCaptionInput),
        generateContentReelCaption('pinterest', reelCaptionInput),
        generateContentReelCaption('tiktok', reelCaptionInput),
      ]);
      contentReelCaptions = {
        instagram: ig,
        facebook: fb,
        pinterest: pin,
        tiktok: tt,
      };
    }

    // Prefer the product-demo reel as the video asset — the Veo animation
    // cron is dormant, so animationUrl will usually be null for new images.
    // demoReelImage is the worker-produced row (separate from the daily
    // coloring page); it's the canonical source for the demo reel mp4.
    const videoAssetUrl =
      demoReelImage?.demoReelUrl ??
      coloringImage?.demoReelUrl ??
      coloringImage?.animationUrl ??
      undefined;

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
    //
    // Both arrays go empty when there's no daily image — the captions
    // would all be empty strings (they need the image as input). The
    // email template skips a whole section when its entries[] is empty
    // so this is safe; the brief just renders content-reel / comic-strip
    // / blog sections instead.
    const dailyEntries: SocialDigestEntry[] = !coloringImage
      ? []
      : [
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

    // Demo-reel entries gate on whether we have a coloringImage source
    // for captions (either the daily one OR the demo-reel-specific
    // worker row). The colored-static "blank" entries depend on the
    // DAILY image specifically (those posts share the daily image's
    // line-art), so they only appear when coloringImage is set.
    const demoReelEntries: SocialDigestEntry[] = !captionImage
      ? []
      : [
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
            caption: pinterestDemoReelCaption,
            ...slotFor('pinterestDemoReel'),
            assetType: 'video',
          },
          // Colored-static "blank" entries only when a DAILY image exists —
          // those posts use the daily image's line art, not the demo-reel's.
          ...(coloringImage
            ? [
                {
                  platform: 'Instagram Static (blank)' as const,
                  caption: instagramColoredStaticCaption,
                  ...slotFor('instagramColoredStatic'),
                  assetType: 'image' as const,
                },
                {
                  platform: 'Facebook Static (blank)' as const,
                  caption: facebookColoredStaticCaption,
                  ...slotFor('facebookColoredStatic'),
                  assetType: 'image' as const,
                },
              ]
            : []),
        ];

    // Comic-strip platform entries — IG/FB/Pinterest auto-post via
    // /api/social/comic-strip-post crons (Sunday only). TikTok is manual:
    // we surface the assembled strip + per-panel downloads + caption so
    // we can post the carousel via the TikTok app.
    const comicStripEntries: SocialDigestEntry[] = comicStrip
      ? (() => {
          const captionInput = {
            title: comicStrip.title,
            baseCaption: comicStrip.caption ?? comicStrip.title,
            theme: comicStrip.theme,
          };
          return [
            {
              platform: 'Instagram Carousel',
              caption: buildComicStripCaption('instagram', captionInput),
              ...slotFor('instagramComicStrip'),
              assetType: 'image' as const,
            },
            {
              platform: 'Facebook',
              caption: buildComicStripCaption('facebook', captionInput),
              ...slotFor('facebookComicStrip'),
              assetType: 'image' as const,
            },
            {
              platform: 'Pinterest',
              caption: buildComicStripCaption('pinterest', captionInput),
              ...slotFor('pinterestComicStrip'),
              assetType: 'image' as const,
            },
            {
              platform: 'TikTok',
              caption: buildComicStripCaption('tiktok', captionInput),
              willAutoPost: false, // TikTok comic strips are manual carousel
              assetType: 'image' as const,
            },
          ];
        })()
      : [];

    // Content-reel platform entries — IG/FB/Pinterest auto-post via
    // /api/social/content-reel-post crons; TikTok is manual via this
    // brief (sandbox API limitations + you upload from the app yourself).
    const contentReelEntries: SocialDigestEntry[] = contentReelCaptions
      ? [
          {
            platform: 'Instagram Reel',
            caption: contentReelCaptions.instagram,
            ...slotFor('instagramContentReel'),
            assetType: 'video',
          },
          {
            platform: 'Facebook Reel',
            caption: contentReelCaptions.facebook,
            ...slotFor('facebookContentReel'),
            assetType: 'video',
          },
          {
            platform: 'Pinterest Video',
            caption: contentReelCaptions.pinterest,
            ...slotFor('pinterestContentReel'),
            assetType: 'video',
          },
          {
            platform: 'TikTok',
            caption: contentReelCaptions.tiktok,
            willAutoPost: false, // TikTok is manual-only — upload via app
            assetType: 'video',
          },
        ]
      : [];

    // Final bail: nothing to ship at all. Only happens if every section
    // is empty — daily image missing AND demo reel missing AND no
    // content reel AND no blog post AND no comic strip.
    const hasAnyContent =
      coloringImage || demoReelImage || contentReel || blogPost || comicStrip;
    if (!hasAnyContent) {
      const message =
        'No content of any kind ready for today — skipping digest';
      console.warn(`[Digest] ${message}`);
      await sendAdminAlert({
        subject: 'Social digest skipped - no content ready',
        body: `The social digest cron was skipped because no daily image, demo reel, content reel, or blog post was ready for today.\n\nCheck the worker logs and Vercel function logs.`,
      });
      return NextResponse.json(
        { success: false, message, skipped: true },
        { status: 200 },
      );
    }

    // Send digest email
    const result = await sendSocialDigest({
      blogTitle: blogPost?.title,
      blogExcerpt: blogPost?.excerpt,
      blogImageUrl,
      blogUrl,
      coloringImageTitle: coloringImage?.title ?? '',
      coloringImageUrl: coloringImage
        ? `${baseUrl}/coloring/${coloringImage.id}`
        : '',
      dailyImageAssetUrl: coloringImage?.url ?? undefined,
      dailyEntries,
      demoReelTitle: demoReelImage?.title ?? undefined,
      demoReelUrl:
        demoReelImage?.demoReelUrl ?? coloringImage?.demoReelUrl ?? undefined,
      demoReelCoverUrl:
        demoReelImage?.demoReelCoverUrl ??
        coloringImage?.demoReelCoverUrl ??
        undefined,
      demoReelEntries,
      // Content reel — researched stats/facts/tips/myth-busts. Lower
      // signal-density than demo reels, so we surface only the basics:
      // hook, kind, source, asset URLs. Manual posting (today) doesn't
      // need cross-platform captions because the auto-publish cron is
      // the intended path; the brief's content-reel section is for
      // editorial review.
      contentReel: contentReel
        ? {
            id: contentReel.id,
            kind: contentReel.kind,
            hook: contentReel.hook,
            sourceTitle: contentReel.sourceTitle ?? undefined,
            sourceUrl: contentReel.sourceUrl ?? undefined,
            reelUrl: contentReel.reelUrl ?? undefined,
            coverUrl: contentReel.coverUrl ?? undefined,
            entries: contentReelEntries,
          }
        : undefined,
      comicStrip: comicStrip
        ? {
            id: comicStrip.id,
            title: comicStrip.title,
            theme: comicStrip.theme,
            assembledUrl: comicStrip.assembledUrl ?? undefined,
            panel1Url: comicStrip.panel1Url ?? undefined,
            panel2Url: comicStrip.panel2Url ?? undefined,
            panel3Url: comicStrip.panel3Url ?? undefined,
            panel4Url: comicStrip.panel4Url ?? undefined,
            entries: comicStripEntries,
          }
        : undefined,
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
      coloringImageId: coloringImage?.id ?? null,
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
