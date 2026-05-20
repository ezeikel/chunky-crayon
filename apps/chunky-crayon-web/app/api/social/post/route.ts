import { NextResponse, connection } from 'next/server';
import { GenerationType } from '@one-colored-pixel/db';
import sharp from 'sharp';
import { put, del } from '@one-colored-pixel/storage';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import {
  generateInstagramCaption,
  generateFacebookCaption,
  generatePinterestCaption,
  // generateLinkedInCaption is used by the Buffer bridge below (LinkedIn
  // demo-reel posting via Buffer until direct LinkedIn approval lands).
  // postToLinkedInPage (the direct path) stays dormant until then.
  generateLinkedInCaption,
  generateTikTokCaption,
  generateThreadsCaption,
  type InstagramPostType,
  type FacebookPostType,
} from '@/app/actions/social';
import {
  schedulePostViaBuffer,
  isBufferBridgeEnabled,
} from '@/lib/social/buffer';

export const maxDuration = 180; // Increased for carousel creation

/**
 * Get Pinterest API base URL.
 * Uses sandbox for Trial access apps, production for Standard access.
 */
const getPinterestApiUrl = () => {
  const useSandbox = process.env.PINTEREST_USE_SANDBOX === 'true';
  return useSandbox
    ? 'https://api-sandbox.pinterest.com'
    : 'https://api.pinterest.com';
};

/**
 * Fetch with configurable timeout to prevent connection hanging.
 * Default timeout is 30 seconds, which is more generous than Node's default 10s.
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000,
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Environment variables for colored example auto-pull:
 * - COLORED_EXAMPLE_USER_EMAIL: Email of user whose saved artwork to use
 * - COLORED_EXAMPLE_PROFILE_NAME: Profile name to check for saved artwork
 *
 * If configured, the social post will automatically include their saved
 * artwork as the colored example in the carousel (3rd slide).
 */

/**
 * Check if the configured user has a saved artwork for this coloring image.
 * Saved artwork is already stored at 1080x1080 (Instagram-ready).
 *
 * This allows automatic inclusion of colored examples without manual upload.
 * Configure via COLORED_EXAMPLE_USER_EMAIL and COLORED_EXAMPLE_PROFILE_NAME.
 */
const getColoredExampleUrl = async (
  coloringImageId: string,
): Promise<string | null> => {
  const userEmail = process.env.COLORED_EXAMPLE_USER_EMAIL;
  const profileName = process.env.COLORED_EXAMPLE_PROFILE_NAME;

  if (!userEmail || !profileName) {
    console.log('[Social] Colored example env vars not configured, skipping');
    return null;
  }

  try {
    // Find the user and profile
    const user = await db.user.findUnique({
      where: { email: userEmail },
      include: {
        profiles: {
          where: { name: profileName },
        },
      },
    });

    if (!user) {
      console.log(`[Social] User ${userEmail} not found`);
      return null;
    }

    const profile = user.profiles[0];
    if (!profile) {
      console.log(`[Social] Profile ${profileName} not found for ${userEmail}`);
      return null;
    }

    // Check for saved artwork for this coloring image
    const savedArtwork = await db.savedArtwork.findFirst({
      where: {
        coloringImageId,
        profileId: profile.id,
      },
      orderBy: { createdAt: 'desc' }, // Get most recent if multiple
    });

    if (!savedArtwork?.imageUrl) {
      console.log(
        `[Social] No saved artwork found for image ${coloringImageId} by ${profileName}`,
      );
      return null;
    }

    console.log(
      `[Social] Found saved artwork from ${profileName}: ${savedArtwork.imageUrl}`,
    );

    // Saved artwork is already stored at 1080x1080 (Instagram-ready)
    // No need to fetch/resize/re-upload - use directly
    return savedArtwork.imageUrl;
  } catch (error) {
    console.error('[Social] Error processing colored example:', error);
    return null;
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Returns midnight of `date`'s calendar day in `timeZone`, as a UTC
 * Date instance. Used to scope cron lookups to the audience's day
 * rather than UTC's (so 00:30 UTC Wed = 8:30pm Tue ET still picks up
 * Tuesday's image).
 *
 * Implementation: format `date` in the target timezone, extract the
 * Y/M/D parts, then compute the UTC instant that corresponds to
 * 00:00 in the target timezone. The DST-correct way without pulling
 * in a TZ library — Intl.DateTimeFormat handles the offset for us.
 */
const startOfDayInTimezone = (date: Date, timeZone: string): Date => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = p.value;
  }
  const year = Number(partMap.year);
  const month = Number(partMap.month);
  const day = Number(partMap.day);
  // Naive ISO at midnight of the target day, treated as UTC for now.
  const naiveMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  // Recover the true UTC instant by subtracting the offset Intl applied.
  // Re-format the naive midnight in the target tz; the difference between
  // its parts and the naive parts == the timezone offset for that day
  // (DST-correct because Intl resolves it for us).
  const naiveDate = new Date(naiveMidnight);
  const naiveParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(naiveDate);
  const naiveMap: Record<string, string> = {};
  for (const p of naiveParts) {
    if (p.type !== 'literal') naiveMap[p.type] = p.value;
  }
  const naiveTzMs = Date.UTC(
    Number(naiveMap.year),
    Number(naiveMap.month) - 1,
    Number(naiveMap.day),
    Number(naiveMap.hour === '24' ? '00' : naiveMap.hour),
    Number(naiveMap.minute),
    Number(naiveMap.second),
  );
  const offsetMs = naiveTzMs - naiveMidnight;
  return new Date(naiveMidnight - offsetMs);
};

/**
 * Per-platform post outcome stored in coloringImage.socialPostResults.
 * Each platform gets its own key — autoPosted in the digest reflects
 * `success`, not a hardcoded assumption.
 */
type PlatformResult = {
  success: boolean;
  /** IG/FB media ID, LinkedIn URN (when auto-post is wired up), etc. */
  mediaId?: string;
  caption?: string;
  postedAt?: string; // ISO
  error?: string;
  /**
   * Posting route, when not our own direct API. 'buffer' = scheduled into
   * Buffer's queue (TikTok/LinkedIn bridge until direct approval lands).
   * The digest uses this to render "Auto-posted via Buffer" instead of a
   * plain "Auto-posted" badge. Absent for direct IG/FB/Pinterest posts.
   */
  via?: 'buffer';
};

type SocialPostResults = {
  instagramCarousel?: PlatformResult;
  instagramReel?: PlatformResult;
  instagramDemoReel?: PlatformResult;
  instagramColoredStatic?: PlatformResult;
  instagramStory?: PlatformResult;
  instagramStoryDemoReel?: PlatformResult;
  instagramStoryColoredStatic?: PlatformResult;
  facebookImage?: PlatformResult;
  facebookVideo?: PlatformResult;
  facebookDemoReel?: PlatformResult;
  facebookColoredStatic?: PlatformResult;
  facebookStory?: PlatformResult;
  facebookStoryDemoReel?: PlatformResult;
  facebookStoryColoredStatic?: PlatformResult;
  pinterest?: PlatformResult;
  pinterestVideo?: PlatformResult;
  pinterestDemoReel?: PlatformResult;
  // TODO(LinkedIn auto-post): currently unset — LinkedIn is manual-only
  // (caption appears in the digest email for copy-paste). Re-enable when
  // we wire postToLinkedInPage into handleRequest.
  linkedin?: PlatformResult;
  linkedinDemoReel?: PlatformResult;
  /** Daily coloring page image, posted to LinkedIn via the Buffer bridge.
   * Static, so LinkedIn only (TikTok is video-only). */
  linkedinCarousel?: PlatformResult;
  tiktok?: PlatformResult;
  tiktokDemoReel?: PlatformResult;
  /** Threads via the Buffer bridge — text-first platform; demo-reels post
   * as native video, daily carousel posts as a text take with the
   * coloring-page URL in a reply-thread. */
  threadsDemoReel?: PlatformResult;
  threadsCarousel?: PlatformResult;
};

/**
 * Merge new platform results into the row's existing `socialPostResults`
 * JSON. We do a shallow merge keyed by platform so multiple cron runs
 * (carousel at 16:00, reel at 16:05, demo-reel at 16:30 etc.) accumulate
 * outcomes on the same row without overwriting each other.
 */
const mergeSocialPostResults = async (
  coloringImageId: string,
  partial: SocialPostResults,
): Promise<void> => {
  const row = await db.coloringImage.findUnique({
    where: { id: coloringImageId },
    select: { socialPostResults: true },
  });
  const existing = (row?.socialPostResults as SocialPostResults | null) ?? {};
  const merged: SocialPostResults = { ...existing, ...partial };
  await db.coloringImage.update({
    where: { id: coloringImageId },
    data: { socialPostResults: merged },
  });
};

const convertSvgToJpeg = async (
  svgUrl: string,
  platform: 'instagram' | 'facebook',
): Promise<Buffer> => {
  // fetch the svg
  const svgResponse = await fetch(svgUrl);

  const svgBuffer = Buffer.from(await svgResponse.arrayBuffer());

  try {
    // use square format for both platforms - coloring pages work best as squares
    const dimensions = { width: 1080, height: 1080 }; // 1:1 for both Instagram and Facebook

    const jpegBuffer = await sharp(svgBuffer)
      .flatten({ background: '#ffffff' }) // preventing black backgrounds when converting to JPEG, which doesn't support transparency.
      .resize(dimensions.width, dimensions.height, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .jpeg({
        quality: 95, // consistent quality for both platforms
        progressive: true,
      })
      .toBuffer();

    return jpegBuffer;
  } catch (error) {
    console.error(`error converting svg to jpeg for ${platform}:`, error);
    throw error;
  }
};

const uploadToTempStorage = async (
  imageBuffer: Buffer,
  platform: string,
): Promise<string> => {
  // generate a unique temporary filename
  const tempFileName = `temp/social/${platform}/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;

  try {
    // save the image to blob storage temporarily
    const { url } = await put(tempFileName, imageBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    console.log(
      `[${platform}] Uploaded temp image: ${url} (${imageBuffer.length} bytes)`,
    );

    // Verify the upload is accessible before returning
    try {
      const verifyResponse = await fetch(url, { method: 'HEAD' });
      console.log(
        `[${platform}] Verify upload - Status: ${verifyResponse.status}, Content-Type: ${verifyResponse.headers.get('content-type')}`,
      );
    } catch (verifyError) {
      console.error(
        `[${platform}] Warning: Could not verify upload:`,
        verifyError,
      );
    }

    return url;
  } catch (error) {
    console.error(`error saving temporary image for ${platform}:`, error);
    throw error;
  }
};

const createInstagramMediaContainer = async (
  imageUrl: string,
  caption: string,
) => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();

  // Log the full response for debugging
  console.log('[Instagram] Media container response:', JSON.stringify(data));

  if (!data.id) {
    console.error('[Instagram] Media container error - full response:', data);
    throw new Error(
      `failed to create Instagram media container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

/**
 * Create an Instagram video media container for carousel items.
 * Videos in carousels don't have captions - caption goes on the carousel container.
 */
const createInstagramVideoContainer = async (videoUrl: string) => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: 'VIDEO',
        video_url: videoUrl,
        is_carousel_item: true,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    console.error('Instagram video container error:', data);
    throw new Error(
      `failed to create Instagram video container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

/**
 * Create an Instagram image media container for carousel items.
 * Images in carousels don't have captions - caption goes on the carousel container.
 */
const createInstagramImageContainerForCarousel = async (imageUrl: string) => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    console.error('Instagram image container error:', data);
    throw new Error(
      `failed to create Instagram image container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

/**
 * Create an Instagram carousel container with multiple media items.
 * The carousel can contain videos and images.
 */
const createInstagramCarouselContainer = async (
  childrenIds: string[],
  caption: string,
) => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: childrenIds.join(','),
        caption,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    console.error('Instagram carousel container error:', data);
    throw new Error(
      `failed to create Instagram carousel container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

/**
 * Wait for a media container to be ready for publishing.
 * Videos take time to process on Instagram's servers.
 */
const waitForMediaReady = async (
  containerId: string,
  maxAttempts = 30,
  intervalMs = 5000,
): Promise<void> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchWithTimeout(
      `https://graph.facebook.com/v22.0/${containerId}?fields=status_code,status&access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`,
      {},
      30000, // 30 second timeout for status checks
    );
    const data = await response.json();

    console.log(
      `[Instagram] Media ${containerId} status: ${data.status_code || data.status}`,
    );

    if (data.status_code === 'FINISHED' || data.status === 'FINISHED') {
      return;
    }

    if (data.status_code === 'ERROR' || data.status === 'ERROR') {
      throw new Error(`Media processing failed: ${JSON.stringify(data)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Media processing timed out');
};

/**
 * Create an Instagram Reel media container.
 * Reels are vertical videos that appear in the Reels tab for discovery.
 */
const createInstagramReelContainer = async (
  videoUrl: string,
  caption: string,
  coverUrl?: string,
) => {
  const payload: Record<string, unknown> = {
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
    share_to_feed: true, // Also share to main feed
    access_token: process.env.FACEBOOK_ACCESS_TOKEN,
  };
  if (coverUrl) payload.cover_url = coverUrl;

  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await response.json();
  if (!data.id) {
    console.error('Instagram Reel container error:', data);
    throw new Error(
      `failed to create Instagram Reel container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

/**
 * Create an Instagram Story container (video).
 *
 * Accepts vertical 9:16 mp4 (our reel output is 1080×1920). Stories
 * auto-trim to 60s — our reels are ~69s so Meta will trim the tail.
 * For a perfect fit we'd export a separate 60s cut, but for now the
 * hook (first ~10s showing the kid typing) is what matters.
 */
const createInstagramStoryVideoContainer = async (videoUrl: string) => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'STORIES',
        video_url: videoUrl,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );
  const data = await response.json();
  if (!data.id) {
    throw new Error(
      `failed to create IG Story video container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

/**
 * Post a video to the Facebook Page's story.
 *
 * Uses the two-step /video_stories upload + finish flow. FB requires
 * vertical 9:16 video, max 60s. Our reels are 69s but FB usually
 * trims the tail automatically.
 */
const postVideoToFacebookStory = async (videoUrl: string) => {
  // Step 1: start upload session
  const startRes = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.FACEBOOK_PAGE_ID}/video_stories`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload_phase: 'start',
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );
  const startData = await startRes.json();
  if (!startData.video_id || !startData.upload_url) {
    throw new Error(
      `FB Story: failed to start upload session: ${JSON.stringify(startData)}`,
    );
  }

  // Step 2: upload the video by URL (Facebook fetches it)
  const uploadRes = await fetch(startData.upload_url, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${process.env.FACEBOOK_ACCESS_TOKEN}`,
      file_url: videoUrl,
    },
  });
  const uploadData = await uploadRes.json();
  if (!uploadData.success) {
    throw new Error(`FB Story: upload failed: ${JSON.stringify(uploadData)}`);
  }

  // Step 3: finalize + publish
  const finishRes = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.FACEBOOK_PAGE_ID}/video_stories`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload_phase: 'finish',
        video_id: startData.video_id,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );
  const finishData = await finishRes.json();
  if (!finishData.success && !finishData.post_id) {
    throw new Error(`FB Story: finish failed: ${JSON.stringify(finishData)}`);
  }
  return finishData.post_id ?? startData.video_id;
};

const publishInstagramMedia = async (creationId: string) => {
  const response = await fetchWithTimeout(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
    30000, // 30 second timeout for publish
  );

  const data = await response.json();

  // Log the full response for debugging
  console.log('[Instagram] Publish response:', JSON.stringify(data));

  if (!data.id) {
    console.error('[Instagram] Publish error - full response:', data);
    throw new Error(
      `failed to publish Instagram media: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

const postToFacebookPage = async (imageUrl: string, message: string) => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.FACEBOOK_PAGE_ID}/photos`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: imageUrl,
        message,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    console.error('Facebook API response:', data);
    throw new Error(`Failed to post to Facebook: ${JSON.stringify(data)}`);
  }
  return data.id;
};

/**
 * Post a video to Facebook page.
 * Uses the video upload API for direct URL posting.
 */
const postVideoToFacebookPage = async (
  videoUrl: string,
  description: string,
  title: string,
  coverUrl?: string | null,
) => {
  // FB Graph /videos: file_url accepts a hosted MP4, but the custom
  // thumbnail (`thumb`) MUST be sent as a multipart binary upload —
  // no `thumb_url` JSON equivalent. So we fetch the cover JPEG
  // server-side and attach it as a Blob in FormData. If coverUrl is
  // null/undefined or the fetch fails, fall through to the JSON-only
  // path so the post still goes out — FB will auto-extract a frame
  // thumbnail in that case.
  const url = `https://graph.facebook.com/v22.0/${process.env.FACEBOOK_PAGE_ID}/videos`;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN ?? '';

  if (coverUrl) {
    try {
      const coverRes = await fetch(coverUrl);
      if (!coverRes.ok) {
        throw new Error(`cover fetch returned ${coverRes.status}`);
      }
      const coverBlob = await coverRes.blob();
      const form = new FormData();
      form.append('file_url', videoUrl);
      form.append('description', description);
      form.append('title', title);
      form.append('access_token', accessToken);
      form.append('thumb', coverBlob, 'cover.jpg');
      const response = await fetch(url, { method: 'POST', body: form });
      const data = await response.json();
      if (!data.id) {
        console.error(
          'Facebook video API response (multipart with thumb):',
          data,
        );
        throw new Error(
          `Failed to post video to Facebook: ${JSON.stringify(data)}`,
        );
      }
      return data.id;
    } catch (err) {
      console.warn(
        '[FB video] thumb upload failed, retrying without:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_url: videoUrl,
      description,
      title,
      access_token: accessToken,
    }),
  });
  const data = await response.json();
  if (!data.id) {
    console.error('Facebook video API response:', data);
    throw new Error(
      `Failed to post video to Facebook: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
};

// Get Pinterest access token - tries DB first, falls back to env var
const getPinterestAccessToken = async (): Promise<string> => {
  // Try database first (auto-refreshed tokens)
  const dbToken = await db.apiToken.findUnique({
    where: { provider: 'pinterest' },
  });

  if (dbToken) {
    return dbToken.accessToken;
  }

  // Fall back to env var
  if (process.env.PINTEREST_ACCESS_TOKEN) {
    return process.env.PINTEREST_ACCESS_TOKEN;
  }

  throw new Error('Pinterest access token not configured');
};

/**
 * Create a 9:16 cover image from the SVG for Pinterest video pins.
 * Pinterest requires a cover image for video pins.
 */
const createPinterestVideoCoverImage = async (
  svgUrl: string,
): Promise<string> => {
  console.log('[Pinterest Video] Creating cover image from SVG...');

  const svgResponse = await fetch(svgUrl);
  const svgBuffer = Buffer.from(await svgResponse.arrayBuffer());

  // Convert to 9:16 vertical (same as video)
  const coverBuffer = await sharp(svgBuffer)
    .flatten({ background: '#ffffff' })
    .resize(1080, 1920, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  const tempFileName = `temp/social/pinterest/${Date.now()}-cover.jpg`;
  const { url } = await put(tempFileName, coverBuffer, {
    access: 'public',
    contentType: 'image/jpeg',
  });

  console.log('[Pinterest Video] Cover image created:', url);
  return url;
};

/**
 * Poll for Pinterest video media upload status.
 * Pinterest processes videos asynchronously.
 */
const pollPinterestMediaStatus = async (
  accessToken: string,
  mediaId: string,
  maxAttempts = 60,
  intervalMs = 5000,
): Promise<void> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${getPinterestApiUrl()}/v5/media/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const data = await response.json();
    console.log(
      `[Pinterest Video] Media status (attempt ${attempt + 1}):`,
      data.status,
    );

    if (data.status === 'succeeded') {
      return;
    }

    if (data.status === 'failed') {
      throw new Error(
        `Pinterest media processing failed: ${data.failure_code || 'Unknown error'}`,
      );
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Pinterest media processing timed out');
};

/**
 * Post a video pin to Pinterest.
 *
 * Pinterest Video Pin Creation Flow:
 * 1. Register media upload (declare intent to upload video)
 * 2. Upload video file to the provided upload URL
 * 3. Wait for media processing to complete
 * 4. Create pin with the processed video
 */
const postVideoToPinterest = async (
  videoUrl: string,
  coverImageUrl: string,
  title: string,
  description: string,
  coloringImageId: string,
  boardId: string,
): Promise<string> => {
  const accessToken = await getPinterestAccessToken();

  console.log('[Pinterest Video] Starting video pin creation...');

  // Step 1: Register media upload
  console.log('[Pinterest Video] Step 1: Registering media upload...');
  const registerResponse = await fetch(`${getPinterestApiUrl()}/v5/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      media_type: 'video',
    }),
  });

  const registerData = await registerResponse.json();

  if (!registerResponse.ok) {
    console.error('[Pinterest Video] Media register failed:', registerData);
    throw new Error(
      `Pinterest media registration failed: ${JSON.stringify(registerData)}`,
    );
  }

  const { media_id, upload_url, upload_parameters } = registerData;
  console.log('[Pinterest Video] Media ID:', media_id);

  // Step 2: Upload video file
  console.log('[Pinterest Video] Step 2: Fetching video from R2...');
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video: ${videoResponse.status}`);
  }
  const videoBuffer = await videoResponse.arrayBuffer();
  console.log('[Pinterest Video] Video size:', videoBuffer.byteLength, 'bytes');

  console.log('[Pinterest Video] Step 2: Uploading video to Pinterest...');

  // Pinterest uses multipart form upload
  const formData = new FormData();

  // Add upload parameters if provided
  if (upload_parameters) {
    for (const [key, value] of Object.entries(upload_parameters)) {
      formData.append(key, value as string);
    }
  }

  // Add the video file
  formData.append('file', new Blob([videoBuffer], { type: 'video/mp4' }));

  const uploadResponse = await fetch(upload_url, {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    const uploadError = await uploadResponse.text();
    console.error('[Pinterest Video] Upload failed:', uploadError);
    throw new Error(`Pinterest video upload failed: ${uploadError}`);
  }

  console.log('[Pinterest Video] Video uploaded successfully');

  // Step 3: Wait for media processing
  console.log('[Pinterest Video] Step 3: Waiting for media processing...');
  await pollPinterestMediaStatus(accessToken, media_id);
  console.log('[Pinterest Video] Media processing complete');

  // Step 4: Create pin with video
  console.log('[Pinterest Video] Step 4: Creating pin...');

  const pinResponse = await fetch(`${getPinterestApiUrl()}/v5/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: boardId,
      media_source: {
        source_type: 'video_id',
        cover_image_url: coverImageUrl,
        media_id: media_id,
      },
      title: title.slice(0, 100), // Pinterest title limit
      description: description.slice(0, 500), // Pinterest description limit
      link: `https://chunkycrayon.com/coloring/${coloringImageId}`,
      alt_text: `${title} - Animated coloring page from Chunky Crayon`,
    }),
  });

  const pinData = await pinResponse.json();

  if (!pinResponse.ok) {
    console.error('[Pinterest Video] Pin creation failed:', pinData);
    throw new Error(
      `Pinterest pin creation failed: ${JSON.stringify(pinData)}`,
    );
  }

  console.log('[Pinterest Video] Pin created successfully:', pinData.id);
  return pinData.id;
};

const postToPinterest = async (
  imageUrl: string,
  title: string,
  description: string,
  coloringImageId: string,
) => {
  if (!process.env.PINTEREST_BOARD_ID) {
    throw new Error('Pinterest board ID not configured');
  }

  const accessToken = await getPinterestAccessToken();

  // Pinterest API v5 - Create a pin
  const response = await fetch(`${getPinterestApiUrl()}/v5/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: process.env.PINTEREST_BOARD_ID,
      media_source: {
        source_type: 'image_url',
        url: imageUrl,
      },
      title: title.slice(0, 100), // Pinterest title limit is 100 chars
      description: description.slice(0, 500), // Pinterest description limit is 500 chars
      link: `https://chunkycrayon.com/coloring/${coloringImageId}`,
      alt_text: `${title} - Free printable coloring page from Chunky Crayon`,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Pinterest API response:', data);
    throw new Error(`Failed to post to Pinterest: ${JSON.stringify(data)}`);
  }

  return data.id;
};

/**
 * DORMANT — LinkedIn auto-post is not wired up yet.
 *
 * LinkedIn is currently a manual channel: the caption is generated in
 * /api/social/digest so you can copy-paste it when posting by hand.
 *
 * This helper is kept around because the v2 registerUpload → upload →
 * /ugcPosts flow is fiddly to get right; when we eventually wire up
 * auto-posting (needs LINKEDIN_ACCESS_TOKEN + LINKEDIN_ORGANIZATION_ID
 * env vars and a working post branch inside handleRequest), this will
 * save reimplementing the whole thing.
 *
 * TODO: wire this back up when we have tokens. Search for "LinkedIn is
 * manual-only" comments in handleRequest for the call sites to restore.
 */
const postToLinkedInPage = async (imageUrl: string, message: string) => {
  if (
    !process.env.LINKEDIN_ACCESS_TOKEN ||
    !process.env.LINKEDIN_ORGANIZATION_ID
  ) {
    throw new Error('LinkedIn credentials not configured');
  }

  const owner = `urn:li:organization:${process.env.LINKEDIN_ORGANIZATION_ID}`;

  // 1. Register an upload slot for the image.
  const registerRes = await fetch(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      }),
    },
  );

  const registerData = await registerRes.json();
  const uploadMech =
    registerData?.value?.uploadMechanism?.[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ];
  if (!uploadMech || !registerData.value?.asset) {
    throw new Error(
      `Failed to register LinkedIn image upload: ${JSON.stringify(registerData)}`,
    );
  }

  // 2. Upload the image bytes to the signed URL LinkedIn gave us.
  const imageBuffer = await fetch(imageUrl).then((r) => r.arrayBuffer());
  const uploadRes = await fetch(uploadMech.uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
    },
    body: imageBuffer,
  });
  if (!uploadRes.ok) {
    throw new Error(
      `LinkedIn image upload failed: ${uploadRes.status} ${await uploadRes.text().catch(() => '')}`,
    );
  }

  // 3. Publish the UGC post referencing the uploaded asset.
  const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: owner,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: message },
          shareMediaCategory: 'IMAGE',
          media: [
            {
              status: 'READY',
              media: registerData.value.asset,
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });
  const postData = await postRes.json();
  if (!postData.id) {
    throw new Error(`Failed to post to LinkedIn: ${JSON.stringify(postData)}`);
  }
  return postData.id as string;
};
// Silence unused-helper warning while LinkedIn auto-post is dormant.
void postToLinkedInPage;

const handleRequest = async (request: Request) => {
  await connection();

  const tempFiles: string[] = [];

  try {
    if (
      !process.env.INSTAGRAM_ACCOUNT_ID ||
      !process.env.FACEBOOK_ACCESS_TOKEN ||
      !process.env.FACEBOOK_PAGE_ID
    ) {
      throw new Error('social media credentials not configured');
    }

    const url = new URL(request.url);
    let coloringImageId = url.searchParams.get('coloring_image_id');
    const platformFilter = url.searchParams.get('platform'); // optional: 'instagram', 'facebook', 'pinterest', 'tiktok'
    const typeFilter = url.searchParams.get('type'); // optional: 'carousel', 'reel', 'demo-reel'

    // if POST request, also check request body
    if (!coloringImageId && request.method === 'POST') {
      try {
        const body = await request.json();
        coloringImageId = body.coloringImageId;
      } catch {
        // if body parsing fails, continue with query param value
      }
    }

    const shouldPost = (platform: string) =>
      !platformFilter || platformFilter === platform;

    // For Instagram, allow filtering by post type (carousel vs reel)
    // This enables splitting into separate cron jobs to avoid timeout
    const shouldPostInstagramType = (type: 'carousel' | 'reel') =>
      !typeFilter || typeFilter === type;

    let coloringImage;

    if (coloringImageId) {
      // get specific coloring image by ID
      coloringImage = await db.coloringImage.findFirst({
        where: {
          id: coloringImageId,
          brand: BRAND,
        },
      });

      if (!coloringImage) {
        throw new Error(`Coloring image with ID ${coloringImageId} not found`);
      }
    } else {
      // Audience-timezone scoped lookup. Posts are timed for US Eastern
      // (peak parent engagement after dinner) — at 00:30 UTC Wed that
      // is still Tuesday 8:30pm ET, so from the audience's POV "today"
      // is Tuesday and Tuesday's daily image (generated 08:00 UTC =
      // 04:00 ET) is what we want.
      //
      // Filtering by ET-day instead of UTC-day removes the
      // off-by-one we'd otherwise need (yesterday-UTC lookups, fuzzy
      // 48h windows). Sharp half-open window: [todayStartET, tomorrowStartET).
      const AUDIENCE_TZ = 'America/New_York';
      const todayStartAudience = startOfDayInTimezone(new Date(), AUDIENCE_TZ);
      const tomorrowStartAudience = new Date(todayStartAudience);
      tomorrowStartAudience.setUTCDate(tomorrowStartAudience.getUTCDate() + 1);

      coloringImage = await db.coloringImage.findFirst({
        where: {
          brand: BRAND,
          generationType: GenerationType.DAILY,
          createdAt: {
            gte: todayStartAudience,
            lt: tomorrowStartAudience,
          },
          status: 'READY',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    if (!coloringImage?.svgUrl) {
      // Skip silently — log to Vercel for debugging but don't email.
      // The Posting Brief at 08:30 UTC is the canonical "what's queued
      // for today" surface; per-cron admin alerts were redundant noise.
      const message =
        'No recent DAILY coloring image found - skipping social posts';
      console.warn(`[Social] ${message}`);
      return NextResponse.json(
        { success: false, message, skipped: true },
        { headers: corsHeaders },
      );
    }

    // ---------------------------------------------------------------------
    // DEMO-REEL MODE — product-demo video (prompt → AI draws → Magic Brush).
    //
    // Triggered separately from the static image posts so it can:
    //   1. Kick the Hetzner worker to produce the mp4 if we don't have one
    //      on the row already (coloringImage.demoReelUrl).
    //   2. Post as video across IG Reel, FB Reel, TikTok, Pinterest video
    //      pin — all using the `demo_reel` caption variant so copy
    //      reflects the workflow, not the artwork.
    //
    // TODO(LinkedIn auto-post): LinkedIn is manual-only right now; its
    // caption is surfaced in the digest email. When we wire up auto-post,
    // add a LinkedIn branch here using postToLinkedInPage (the helper is
    // kept dormant above the handler).
    //
    // Runs as its own cron slot (type=demo-reel). Short-circuits the rest
    // of the handler so we don't double-post or fight with the static flow.
    // ---------------------------------------------------------------------
    if (typeFilter === 'demo-reel') {
      const demoResults = {
        instagramReel: null as string | null,
        facebook: null as string | null,
        tiktok: null as string | null,
        linkedin: null as string | null,
        threads: null as string | null,
        pinterestVideo: null as string | null,
        errors: [] as string[],
      };

      // Buffer needs a future dueAt. This route runs AT the platform's
      // cron slot, so "the slot" is effectively now — schedule a few
      // minutes out to give Buffer's pipeline headroom and stay safely
      // in the future. The exact slot is owned by vercel.json's cron
      // time; we don't recompute a clock time here.
      const bufferDueAt = (_key: keyof SocialPostResults): Date =>
        new Date(Date.now() + 5 * 60 * 1000);

      // If today's image doesn't have a rendered reel yet, pick the most
      // recent image that does. The separate /api/social/demo-reel/produce
      // cron is responsible for triggering the Hetzner worker; this post
      // route never waits on rendering (that'd blow past Vercel's 300s cap).
      if (!coloringImage.demoReelUrl) {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const withReel = await db.coloringImage.findFirst({
          where: {
            brand: BRAND,
            demoReelUrl: { not: null },
            createdAt: { gte: todayStart },
            status: 'READY',
          },
          orderBy: { createdAt: 'desc' },
        });
        if (withReel) {
          console.log(
            `[DemoReel] Today's image ${coloringImage.id} has no reel yet — using ${withReel.id} which does`,
          );
          coloringImage = withReel;
        } else {
          const message = `No demoReelUrl on today's image yet — the produce cron may still be running. Skipping ${platformFilter ?? 'all'}.`;
          console.warn(`[DemoReel] ${message}`);
          return NextResponse.json(
            { success: false, message, skipped: true },
            { status: 200, headers: corsHeaders },
          );
        }
      }

      const reelUrl = coloringImage.demoReelUrl;
      if (!reelUrl) {
        // unreachable — we either swapped in a row with demoReelUrl or
        // returned `skipped` above. Narrow for TypeScript.
        return NextResponse.json(
          { success: false, error: 'demoReelUrl unexpectedly null' },
          { status: 500, headers: corsHeaders },
        );
      }

      // Stories are capped at 60s; our reels are ~69s and fail Stories
      // validation with error 2207082. The worker now uploads a trimmed
      // 60s copy to demoReelStoryUrl. Fall back to the full reel for
      // older images that predate this column — they'll fail to post to
      // story (non-fatal) until they're re-produced.
      const storyReelUrl = coloringImage.demoReelStoryUrl ?? reelUrl;

      // Per-platform results we'll merge into coloringImage.socialPostResults
      // at the end so the digest cron can read accurate auto-posted flags.
      const platformResults: SocialPostResults = {};

      // Guard: check if this platform already posted successfully for
      // this image. Prevents duplicate posts when the cron or manual
      // trigger fires twice for the same image.
      const existingResults =
        (coloringImage.socialPostResults as SocialPostResults | null) ?? {};
      const alreadyPosted = (key: keyof SocialPostResults) =>
        !!existingResults[key]?.success;

      // IG Reel — pass the worker-captured colored cover so the reel
      // thumbnail in feed/explore shows the finished artwork instead
      // of a random video frame (often the dark Colo intro card).
      if (shouldPost('instagram') && !alreadyPosted('instagramDemoReel')) {
        const caption = await generateInstagramCaption(
          coloringImage,
          'demo_reel',
        );
        try {
          // IG Reel feed cover: prefer the stop-scroll hook cover
          // (input → blurred outcome) over the finished-colored canvas.
          // Falls through to demoReelCoverUrl for older rows.
          const igFeedCover =
            coloringImage.demoReelHookCoverUrl ??
            coloringImage.demoReelCoverUrl ??
            undefined;
          const containerId = await createInstagramReelContainer(
            reelUrl,
            caption,
            igFeedCover,
          );
          await waitForMediaReady(containerId);
          const mediaId = await publishInstagramMedia(containerId);
          demoResults.instagramReel = mediaId;
          platformResults.instagramDemoReel = {
            success: true,
            mediaId,
            caption,
            postedAt: new Date().toISOString(),
          };
        } catch (err) {
          console.error('[DemoReel] IG Reel failed:', err);
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          demoResults.errors.push(`Instagram Reel: ${errorMsg}`);
          platformResults.instagramDemoReel = {
            success: false,
            caption,
            error: errorMsg,
          };
        }

        // Also post the reel to IG Story. Non-blocking — a failed story
        // never fails the feed post (which is the real one).
        if (
          platformResults.instagramDemoReel?.success &&
          !alreadyPosted('instagramStoryDemoReel')
        ) {
          try {
            const storyContainerId =
              await createInstagramStoryVideoContainer(storyReelUrl);
            await waitForMediaReady(storyContainerId);
            const storyId = await publishInstagramMedia(storyContainerId);
            platformResults.instagramStoryDemoReel = {
              success: true,
              mediaId: storyId,
              postedAt: new Date().toISOString(),
            };
            console.log('[DemoReel] IG Story posted:', storyId);
          } catch (err) {
            console.error('[DemoReel] IG Story failed (non-fatal):', err);
            platformResults.instagramStoryDemoReel = {
              success: false,
              error: err instanceof Error ? err.message : 'Unknown error',
            };
          }
        }
      }

      // FB Reel (posted via the same video endpoint)
      if (shouldPost('facebook') && !alreadyPosted('facebookDemoReel')) {
        const caption = await generateFacebookCaption(
          coloringImage,
          'demo_reel',
        );
        try {
          // FB feed cover: prefer the new "stop-scroll" hook cover
          // (input → blurred outcome) over the finished-colored canvas.
          // Stories already use the resolution cover (see story call
          // below). Falls through to demoReelCoverUrl, then to no cover
          // (FB auto-extracts a frame), so older rows without the new
          // field still get the resolution thumbnail.
          const fbFeedCover =
            coloringImage.demoReelHookCoverUrl ??
            coloringImage.demoReelCoverUrl ??
            null;
          const postId = await postVideoToFacebookPage(
            reelUrl,
            caption,
            coloringImage.title ?? 'Chunky Crayon demo',
            fbFeedCover,
          );
          demoResults.facebook = postId;
          platformResults.facebookDemoReel = {
            success: true,
            mediaId: postId,
            caption,
            postedAt: new Date().toISOString(),
          };
        } catch (err) {
          console.error('[DemoReel] FB video failed:', err);
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          demoResults.errors.push(`Facebook: ${errorMsg}`);
          platformResults.facebookDemoReel = {
            success: false,
            caption,
            error: errorMsg,
          };
        }

        // Also post to FB Story — non-blocking (story failure doesn't
        // fail the feed post).
        if (
          platformResults.facebookDemoReel?.success &&
          !alreadyPosted('facebookStoryDemoReel')
        ) {
          try {
            const storyId = await postVideoToFacebookStory(storyReelUrl);
            platformResults.facebookStoryDemoReel = {
              success: true,
              mediaId: storyId,
              postedAt: new Date().toISOString(),
            };
            console.log('[DemoReel] FB Story posted:', storyId);
          } catch (err) {
            console.error('[DemoReel] FB Story failed (non-fatal):', err);
            platformResults.facebookStoryDemoReel = {
              success: false,
              error: err instanceof Error ? err.message : 'Unknown error',
            };
          }
        }
      }

      // The cover image we hand Buffer as the video thumbnail — same
      // stop-scroll hook cover IG/FB use, falling back to the colored
      // outcome cover for older rows.
      const bufferThumbnailUrl =
        coloringImage.demoReelHookCoverUrl ??
        coloringImage.demoReelCoverUrl ??
        undefined;

      // TikTok. While direct TikTok publishing is pending App Review the
      // sandbox API only writes drafts (success:false, you publish in-app).
      // When the Buffer bridge is enabled for TikTok we push the reel into
      // Buffer's queue instead — a real scheduled publish — and skip the
      // sandbox draft entirely. Falls back to the draft path if Buffer is
      // off or the push fails, so a Buffer outage degrades to manual.
      if (shouldPost('tiktok') && !alreadyPosted('tiktokDemoReel')) {
        const caption = await generateTikTokCaption(coloringImage, 'demo_reel');

        let bufferHandled = false;
        if (isBufferBridgeEnabled('tiktok')) {
          const buffered = await schedulePostViaBuffer({
            platform: 'tiktok',
            text: caption,
            videoUrl: reelUrl,
            thumbnailUrl: bufferThumbnailUrl,
            dueAt: bufferDueAt('tiktokDemoReel'),
          });
          if (buffered.scheduled) {
            bufferHandled = true;
            demoResults.tiktok = buffered.postId ?? 'buffer-scheduled';
            platformResults.tiktokDemoReel = {
              success: true,
              via: 'buffer',
              mediaId: buffered.postId,
              caption,
              postedAt: new Date().toISOString(),
            };
            console.log(
              `[DemoReel] TikTok scheduled via Buffer: ${buffered.postId}`,
            );
          } else if (!buffered.disabled) {
            // Buffer was on but the push failed — log and fall through to
            // the sandbox draft so the caption/asset still reach you.
            console.error(
              `[DemoReel] Buffer TikTok push failed, falling back to draft: ${buffered.error}`,
            );
            demoResults.errors.push(`Buffer TikTok: ${buffered.error}`);
          }
        }

        if (!bufferHandled) {
          try {
            const tiktokRes = await fetch(
              new URL('/api/social/tiktok/post', request.url).toString(),
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  authorization: request.headers.get('authorization') ?? '',
                },
                body: JSON.stringify({
                  videoUrl: reelUrl,
                  caption,
                  coloringImageId: coloringImage.id,
                }),
              },
            );
            const tiktokJson = (await tiktokRes.json().catch(() => ({}))) as {
              publishId?: string;
              id?: string;
            };
            const draftId = tiktokJson.publishId ?? tiktokJson.id ?? 'queued';
            demoResults.tiktok = draftId;
            platformResults.tiktokDemoReel = {
              success: false, // sandbox API → drafts only, not auto-published
              mediaId: draftId,
              caption,
              postedAt: new Date().toISOString(),
            };
          } catch (err) {
            console.error('[DemoReel] TikTok failed:', err);
            const errorMsg =
              err instanceof Error ? err.message : 'Unknown error';
            demoResults.errors.push(`TikTok: ${errorMsg}`);
            platformResults.tiktokDemoReel = {
              success: false,
              caption,
              error: errorMsg,
            };
          }
        }
      }

      // LinkedIn. Direct posting (postToLinkedInPage, kept dormant above
      // handleRequest) is blocked until LinkedIn approves the app. Until
      // then the Buffer bridge schedules the reel into Buffer's queue when
      // enabled. When direct approval lands: flip BUFFER_ENABLE_LINKEDIN
      // off and re-wire postToLinkedInPage here. If the bridge is off this
      // stays a no-op and the caption still appears in the digest email.
      if (
        shouldPost('linkedin') &&
        !alreadyPosted('linkedinDemoReel') &&
        isBufferBridgeEnabled('linkedin')
      ) {
        const caption = await generateLinkedInCaption(
          coloringImage,
          'demo_reel',
        );
        const buffered = await schedulePostViaBuffer({
          platform: 'linkedin',
          text: caption,
          videoUrl: reelUrl,
          thumbnailUrl: bufferThumbnailUrl,
          dueAt: bufferDueAt('linkedinDemoReel'),
        });
        if (buffered.scheduled) {
          demoResults.linkedin = buffered.postId ?? 'buffer-scheduled';
          platformResults.linkedinDemoReel = {
            success: true,
            via: 'buffer',
            mediaId: buffered.postId,
            caption,
            postedAt: new Date().toISOString(),
          };
          console.log(
            `[DemoReel] LinkedIn scheduled via Buffer: ${buffered.postId}`,
          );
        } else {
          // Push failed (Buffer was on but errored). Record it so the
          // digest still surfaces the caption for manual posting.
          console.error(
            `[DemoReel] Buffer LinkedIn push failed: ${buffered.error}`,
          );
          demoResults.errors.push(`Buffer LinkedIn: ${buffered.error}`);
          platformResults.linkedinDemoReel = {
            success: false,
            caption,
            error: buffered.error,
          };
        }
      }

      // Threads. Text-first platform but accepts native video; we post the
      // demo reel as a video Threads post with the demo-reel caption.
      // Threads doesn't have a per-post URL concept like blog promo (the
      // reel IS the content), so no replyThread/linkAttachment here.
      if (
        shouldPost('threads') &&
        !alreadyPosted('threadsDemoReel') &&
        isBufferBridgeEnabled('threads')
      ) {
        const caption = await generateThreadsCaption(coloringImage);
        const buffered = await schedulePostViaBuffer({
          platform: 'threads',
          text: caption,
          videoUrl: reelUrl,
          thumbnailUrl: bufferThumbnailUrl,
          dueAt: bufferDueAt('threadsDemoReel'),
        });
        if (buffered.scheduled) {
          demoResults.threads = buffered.postId ?? 'buffer-scheduled';
          platformResults.threadsDemoReel = {
            success: true,
            via: 'buffer',
            mediaId: buffered.postId,
            caption,
            postedAt: new Date().toISOString(),
          };
          console.log(
            `[DemoReel] Threads scheduled via Buffer: ${buffered.postId}`,
          );
        } else {
          console.error(
            `[DemoReel] Buffer Threads push failed: ${buffered.error}`,
          );
          demoResults.errors.push(`Buffer Threads: ${buffered.error}`);
          platformResults.threadsDemoReel = {
            success: false,
            caption,
            error: buffered.error,
          };
        }
      }

      // Pinterest video pin — prefer the worker-captured colored cover
      // (finished artwork). Fall back to a square line-art render if
      // that's missing (e.g. older images without demoReelCoverUrl).
      if (
        shouldPost('pinterest') &&
        !alreadyPosted('pinterestDemoReel') &&
        process.env.PINTEREST_BOARD_ID_VIDEOS &&
        coloringImage.svgUrl
      ) {
        const caption = await generatePinterestCaption(coloringImage);
        try {
          const coverUrl =
            coloringImage.demoReelCoverUrl ??
            (await createPinterestVideoCoverImage(coloringImage.svgUrl));
          if (!coloringImage.demoReelCoverUrl) {
            tempFiles.push(coverUrl.split('/').pop() || '');
          }
          const pinId = await postVideoToPinterest(
            reelUrl,
            coverUrl,
            coloringImage.title ?? 'Free Coloring Page',
            caption,
            coloringImage.id,
            process.env.PINTEREST_BOARD_ID_VIDEOS,
          );
          demoResults.pinterestVideo = pinId;
          platformResults.pinterestDemoReel = {
            success: true,
            mediaId: pinId,
            caption,
            postedAt: new Date().toISOString(),
          };
        } catch (err) {
          console.error('[DemoReel] Pinterest video failed:', err);
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          demoResults.errors.push(`Pinterest: ${errorMsg}`);
          platformResults.pinterestDemoReel = {
            success: false,
            caption,
            error: errorMsg,
          };
        }
      }

      // Persist per-platform outcomes for the digest cron.
      try {
        await mergeSocialPostResults(coloringImage.id, platformResults);
      } catch (err) {
        console.error('[DemoReel] Failed to persist socialPostResults:', err);
      }

      const hasSuccess =
        demoResults.instagramReel ||
        demoResults.facebook ||
        demoResults.tiktok ||
        demoResults.linkedin ||
        demoResults.threads ||
        demoResults.pinterestVideo;

      return NextResponse.json(
        {
          success: hasSuccess,
          type: 'demo-reel',
          demoReelUrl: reelUrl,
          results: demoResults,
        },
        {
          status: hasSuccess ? 200 : 500,
          headers: corsHeaders,
        },
      );
    }

    // ---------------------------------------------------------------------
    // COLORED-STATIC MODE — single image of the FINISHED colored artwork.
    //
    // Posts the BLANK line art of the demo-reel image so the audience
    // that just watched the coloured reveal can print + colour it
    // themselves. CTA: "your kid can color this — free at chunkycrayon.com"
    //
    // Uses the image's svgUrl (converted to JPEG). The coloured cover is
    // already visible as the reel's thumbnail — this post is the blank
    // canvas counterpart. IG + FB only.
    // ---------------------------------------------------------------------
    if (typeFilter === 'colored-static') {
      // Find the image that was used for the demo reel.
      if (!coloringImage.demoReelUrl) {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const withReel = await db.coloringImage.findFirst({
          where: {
            brand: BRAND,
            demoReelUrl: { not: null },
            createdAt: { gte: todayStart },
            status: 'READY',
          },
          orderBy: { createdAt: 'desc' },
        });
        if (withReel) {
          console.log(
            `[ColoredStatic] Today's image ${coloringImage.id} has no reel — using ${withReel.id}`,
          );
          coloringImage = withReel;
        } else {
          const message = `No demoReelUrl on today's images — produce cron may not have run. Skipping ${platformFilter ?? 'all'}.`;
          console.warn(`[ColoredStatic] ${message}`);
          return NextResponse.json(
            { success: false, message, skipped: true },
            { status: 200, headers: corsHeaders },
          );
        }
      }

      if (!coloringImage.svgUrl) {
        return NextResponse.json(
          { success: false, error: 'svgUrl missing on demo-reel image' },
          { status: 500, headers: corsHeaders },
        );
      }

      // Convert SVG line art to JPEG for posting
      const blankBuffer = await convertSvgToJpeg(
        coloringImage.svgUrl,
        'instagram',
      );
      const blankImageUrl = await uploadToTempStorage(
        blankBuffer,
        'colored-static',
      );
      tempFiles.push(blankImageUrl.split('/').pop() || '');

      const coloredResults = {
        instagram: null as string | null,
        facebook: null as string | null,
        errors: [] as string[],
      };
      const platformResults: SocialPostResults = {};

      // Guard against duplicate posts
      const csExisting =
        (coloringImage.socialPostResults as SocialPostResults | null) ?? {};
      const csAlreadyPosted = (key: keyof SocialPostResults) =>
        !!csExisting[key]?.success;

      // Instagram single-image post
      if (
        shouldPost('instagram') &&
        !csAlreadyPosted('instagramColoredStatic')
      ) {
        const caption = await generateInstagramCaption(
          coloringImage,
          'colored_static',
        );
        try {
          const containerId = await createInstagramMediaContainer(
            blankImageUrl,
            caption,
          );
          await waitForMediaReady(containerId, 20, 3000);
          const mediaId = await publishInstagramMedia(containerId);
          coloredResults.instagram = mediaId;
          platformResults.instagramColoredStatic = {
            success: true,
            mediaId,
            caption,
            postedAt: new Date().toISOString(),
          };
        } catch (err) {
          console.error('[ColoredStatic] IG failed:', err);
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          coloredResults.errors.push(`Instagram: ${errorMsg}`);
          platformResults.instagramColoredStatic = {
            success: false,
            caption,
            error: errorMsg,
          };
        }

        // No Story for colored_static. Stories are reserved for reel
        // video content (demo reel + content reel) where the asset is
        // already vertical 9:16 and the format earns the 24h placement.
        // Static + carousel images stay feed-only.
      }

      // Facebook single-image post
      if (shouldPost('facebook') && !csAlreadyPosted('facebookColoredStatic')) {
        const caption = await generateFacebookCaption(
          coloringImage,
          'colored_static',
        );
        try {
          const postId = await postToFacebookPage(blankImageUrl, caption);
          coloredResults.facebook = postId;
          platformResults.facebookColoredStatic = {
            success: true,
            mediaId: postId,
            caption,
            postedAt: new Date().toISOString(),
          };
        } catch (err) {
          console.error('[ColoredStatic] FB failed:', err);
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          coloredResults.errors.push(`Facebook: ${errorMsg}`);
          platformResults.facebookColoredStatic = {
            success: false,
            caption,
            error: errorMsg,
          };
        }

        // No FB Story for colored_static (see IG Story comment above).
      }

      try {
        await mergeSocialPostResults(coloringImage.id, platformResults);
      } catch (err) {
        console.error('[ColoredStatic] persist results failed:', err);
      }

      const hasSuccess = coloredResults.instagram || coloredResults.facebook;
      return NextResponse.json(
        {
          success: hasSuccess,
          type: 'colored-static',
          blankImageUrl,
          results: coloredResults,
        },
        {
          status: hasSuccess ? 200 : 500,
          headers: corsHeaders,
        },
      );
    }

    const results = {
      instagram: null as string | null,
      instagramReel: null as string | null, // Separate Reel for discovery
      facebook: null as string | null,
      facebookImage: null as string | null, // Image post when video is also posted
      pinterest: null as string | null,
      pinterestVideo: null as string | null, // Video pin for engagement
      errors: [] as string[],
    };

    // Per-platform results merged into coloringImage.socialPostResults at
    // the end so /api/social/digest reflects what actually posted.
    const staticPlatformResults: SocialPostResults = {};

    // Existing results on the row (from earlier cron runs) — used to skip
    // story re-posts if they already went out in a previous slot.
    const existingStaticResults =
      (coloringImage.socialPostResults as SocialPostResults | null) ?? {};
    const staticAlreadyPosted = (key: keyof SocialPostResults) =>
      !!existingStaticResults[key]?.success;

    // post to Instagram
    if (shouldPost('instagram')) {
      // Only prepare image assets if we're posting carousel (or no type filter)
      const needsImageAsset = shouldPostInstagramType('carousel');

      let instagramImageUrl: string | null = null;

      if (needsImageAsset) {
        // convert svg to jpeg for Instagram
        const instagramBuffer = await convertSvgToJpeg(
          coloringImage.svgUrl,
          'instagram',
        );

        // upload to temporary storage
        instagramImageUrl = await uploadToTempStorage(
          instagramBuffer,
          'instagram',
        );
        tempFiles.push(instagramImageUrl.split('/').pop() || '');
      }

      // Post 1: Image post (single image or carousel with colored example)
      // Video is handled separately as a Reel for proper 9:16 display.
      // Dedup: skip if this image's IG carousel slot already succeeded
      // in a prior run — prevents the 48h-lookback from re-posting the
      // same image two nights in a row.
      if (
        shouldPostInstagramType('carousel') &&
        !staticAlreadyPosted('instagramCarousel')
      ) {
        let instagramCaptionForResults = '';
        try {
          let instagramMediaId: string;

          // Check for optional colored example from configured user's saved artwork
          const coloredExampleUrl = await getColoredExampleUrl(
            coloringImage.id,
          );
          const hasColoredExample = !!coloredExampleUrl;

          if (hasColoredExample) {
            // Carousel: Colored example + B&W image (2 slides)
            console.log(
              '[Instagram] Creating carousel with colored example...',
            );

            const instagramCaption = await generateInstagramCaption(
              coloringImage,
              'carousel_with_colored',
            );
            instagramCaptionForResults = instagramCaption ?? '';

            if (!instagramCaption) {
              throw new Error('failed to generate Instagram caption');
            }

            const carouselChildren: string[] = [];
            console.log('[Instagram] Adding colored example as first slide...');
            const coloredContainerId =
              await createInstagramImageContainerForCarousel(coloredExampleUrl);
            carouselChildren.push(coloredContainerId);

            const imageContainerId =
              await createInstagramImageContainerForCarousel(
                instagramImageUrl!,
              );
            carouselChildren.push(imageContainerId);

            const carouselId = await createInstagramCarouselContainer(
              carouselChildren,
              instagramCaption,
            );
            await waitForMediaReady(carouselId, 20, 3000);
            instagramMediaId = await publishInstagramMedia(carouselId);
            console.log('[Instagram] Carousel published:', instagramMediaId);
          } else {
            console.log('[Instagram] Posting single image...');
            const instagramCaption = await generateInstagramCaption(
              coloringImage,
              'image',
            );
            instagramCaptionForResults = instagramCaption ?? '';

            if (!instagramCaption) {
              throw new Error('failed to generate Instagram caption');
            }

            const creationId = await createInstagramMediaContainer(
              instagramImageUrl!,
              instagramCaption,
            );
            await waitForMediaReady(creationId, 20, 3000);
            instagramMediaId = await publishInstagramMedia(creationId);
          }

          results.instagram = instagramMediaId;
          staticPlatformResults.instagramCarousel = {
            success: true,
            mediaId: instagramMediaId,
            caption: instagramCaptionForResults,
            postedAt: new Date().toISOString(),
          };
          console.log('Successfully posted to Instagram:', instagramMediaId);
        } catch (error) {
          console.error('Error posting to Instagram:', error);
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`Instagram: ${errorMsg}`);
          staticPlatformResults.instagramCarousel = {
            success: false,
            caption: instagramCaptionForResults,
            error: errorMsg,
          };
        }

        // LinkedIn via the Buffer bridge — the daily coloring page as a
        // single image post. Static, so LinkedIn ONLY (TikTok is
        // video-only by design; see the demo-reel/content-reel paths for
        // video). Gated by BUFFER_ENABLE_LINKEDIN; no-ops when off. Reuses
        // the JPEG already uploaded for the IG feed post.
        if (
          isBufferBridgeEnabled('linkedin') &&
          instagramImageUrl &&
          !staticAlreadyPosted('linkedinCarousel')
        ) {
          try {
            const liCaption = await generateLinkedInCaption(
              coloringImage,
              'image',
            );
            const liPageUrl = `https://chunkycrayon.com/coloring/${coloringImage.id}`;
            const buffered = await schedulePostViaBuffer({
              platform: 'linkedin',
              text: liCaption,
              imageUrl: instagramImageUrl,
              metadata: {
                // First comment with the link (LinkedIn downranks
                // link-in-body); body stays clean.
                firstComment: `Grab the printable: ${liPageUrl}`,
                linkAttachmentUrl: liPageUrl,
              },
              dueAt: new Date(Date.now() + 5 * 60 * 1000),
            });
            if (buffered.scheduled) {
              staticPlatformResults.linkedinCarousel = {
                success: true,
                via: 'buffer',
                mediaId: buffered.postId,
                caption: liCaption,
                postedAt: new Date().toISOString(),
              };
              console.log(
                `[Carousel] LinkedIn scheduled via Buffer: ${buffered.postId}`,
              );
            } else if (!buffered.disabled) {
              console.error(
                `[Carousel] Buffer LinkedIn failed: ${buffered.error}`,
              );
              results.errors.push(`LinkedIn (Buffer): ${buffered.error}`);
              staticPlatformResults.linkedinCarousel = {
                success: false,
                caption: liCaption,
                error: buffered.error,
              };
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error('[Carousel] LinkedIn Buffer push errored:', msg);
            results.errors.push(`LinkedIn (Buffer): ${msg}`);
          }
        }

        // Threads via the Buffer bridge — daily coloring page as a text
        // take (Threads is text-first; the visual carries via the
        // linkAttachment card and the URL in a reply post). Same algo
        // play as LinkedIn: keep the body link-free, link goes in a
        // follow-up reply via metadata.threads.thread.
        if (
          isBufferBridgeEnabled('threads') &&
          !staticAlreadyPosted('threadsCarousel')
        ) {
          try {
            const thCaption = await generateThreadsCaption(coloringImage);
            const thPageUrl = `https://chunkycrayon.com/coloring/${coloringImage.id}`;
            const buffered = await schedulePostViaBuffer({
              platform: 'threads',
              text: thCaption,
              // No videoUrl/imageUrl — text-only main post. The image
              // shows up via the linkAttachment preview card.
              metadata: {
                linkAttachmentUrl: thPageUrl,
                replyThread: `Print it free: ${thPageUrl}`,
              },
              dueAt: new Date(Date.now() + 5 * 60 * 1000),
            });
            if (buffered.scheduled) {
              staticPlatformResults.threadsCarousel = {
                success: true,
                via: 'buffer',
                mediaId: buffered.postId,
                caption: thCaption,
                postedAt: new Date().toISOString(),
              };
              console.log(
                `[Carousel] Threads scheduled via Buffer: ${buffered.postId}`,
              );
            } else if (!buffered.disabled) {
              console.error(
                `[Carousel] Buffer Threads failed: ${buffered.error}`,
              );
              results.errors.push(`Threads (Buffer): ${buffered.error}`);
              staticPlatformResults.threadsCarousel = {
                success: false,
                caption: thCaption,
                error: buffered.error,
              };
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error('[Carousel] Threads Buffer push errored:', msg);
            results.errors.push(`Threads (Buffer): ${msg}`);
          }
        }

        // No Story for the carousel / line-art feed image. Stories are
        // reserved for reel video content (demo reel + content reel)
        // where the asset is already vertical 9:16. Static + carousel
        // images stay feed-only.
      }

      // Post 2: Reel (if we have animation) - for algorithm reach/discovery
      if (shouldPostInstagramType('reel') && coloringImage.animationUrl) {
        try {
          console.log('[Instagram] Creating Reel for discovery...');

          const reelCaption = await generateInstagramCaption(
            coloringImage,
            'reel',
          );

          if (!reelCaption) {
            throw new Error('failed to generate Instagram Reel caption');
          }

          // Create Reel container
          const reelContainerId = await createInstagramReelContainer(
            coloringImage.animationUrl,
            reelCaption,
          );
          console.log('[Instagram] Reel container created:', reelContainerId);

          // Wait for video to process
          await waitForMediaReady(reelContainerId);

          // Publish Reel
          const reelMediaId = await publishInstagramMedia(reelContainerId);
          console.log('[Instagram] Reel published:', reelMediaId);

          results.instagramReel = reelMediaId;
        } catch (error) {
          console.error('Error posting Instagram Reel:', error);
          results.errors.push(
            `Instagram Reel: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }

    // post to Facebook
    if (shouldPost('facebook') && !staticAlreadyPosted('facebookImage')) {
      // convert svg to jpeg for Facebook
      const facebookBuffer = await convertSvgToJpeg(
        coloringImage.svgUrl,
        'facebook',
      );

      // upload to temporary storage
      const facebookImageUrl = await uploadToTempStorage(
        facebookBuffer,
        'facebook',
      );
      tempFiles.push(facebookImageUrl.split('/').pop() || '');

      // Post 1: Video (if we have animation) for engagement
      if (coloringImage.animationUrl) {
        try {
          console.log('[Facebook] Posting video...');

          const videoCaption = await generateFacebookCaption(
            coloringImage,
            'video',
          );

          if (!videoCaption) {
            throw new Error('failed to generate Facebook video caption');
          }

          const facebookVideoId = await postVideoToFacebookPage(
            coloringImage.animationUrl,
            videoCaption,
            coloringImage.title ?? 'Coloring Page',
          );

          results.facebook = facebookVideoId;
          console.log(
            'Successfully posted video to Facebook:',
            facebookVideoId,
          );
        } catch (error) {
          console.error('Error posting video to Facebook:', error);
          results.errors.push(
            `Facebook Video: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Post 2: Image (always post - either standalone or as companion to video)
      let imageCaptionForResults = '';
      try {
        console.log('[Facebook] Posting image...');

        const postType: FacebookPostType = coloringImage.animationUrl
          ? 'image_with_video'
          : 'image';
        const imageCaption = await generateFacebookCaption(
          coloringImage,
          postType,
        );
        imageCaptionForResults = imageCaption ?? '';

        if (!imageCaption) {
          throw new Error('failed to generate Facebook image caption');
        }

        const facebookImageId = await postToFacebookPage(
          facebookImageUrl,
          imageCaption,
        );

        // If we already have a video post, store this as the image post
        if (coloringImage.animationUrl) {
          results.facebookImage = facebookImageId;
        } else {
          results.facebook = facebookImageId;
        }

        staticPlatformResults.facebookImage = {
          success: true,
          mediaId: facebookImageId,
          caption: imageCaptionForResults,
          postedAt: new Date().toISOString(),
        };
        console.log('Successfully posted image to Facebook:', facebookImageId);

        // No FB Story for the static feed image (see carousel comment above).
      } catch (error) {
        console.error('Error posting image to Facebook:', error);
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Facebook Image: ${errorMsg}`);
        staticPlatformResults.facebookImage = {
          success: false,
          caption: imageCaptionForResults,
          error: errorMsg,
        };
      }
    }

    // post to Pinterest
    if (shouldPost('pinterest') && !staticAlreadyPosted('pinterest')) {
      // Post 1: Image pin (static coloring page for search traffic)
      let pinterestImageCaptionForResults = '';
      try {
        const pinterestBuffer = await convertSvgToJpeg(
          coloringImage.svgUrl,
          'instagram', // reuse 1080x1080 square
        );
        const pinterestImageUrl = await uploadToTempStorage(
          pinterestBuffer,
          'pinterest',
        );
        tempFiles.push(pinterestImageUrl.split('/').pop() || '');

        const pinterestCaption = await generatePinterestCaption(coloringImage);
        pinterestImageCaptionForResults = pinterestCaption ?? '';

        if (!pinterestCaption) {
          throw new Error('failed to generate Pinterest caption');
        }

        const pinterestPinId = await postToPinterest(
          pinterestImageUrl,
          coloringImage.title ?? 'Free Coloring Page',
          pinterestCaption,
          coloringImage.id,
        );

        results.pinterest = pinterestPinId;
        staticPlatformResults.pinterest = {
          success: true,
          mediaId: pinterestPinId,
          caption: pinterestImageCaptionForResults,
          postedAt: new Date().toISOString(),
        };
        console.log('Successfully posted image to Pinterest:', pinterestPinId);
      } catch (error) {
        console.error('Error posting image to Pinterest:', error);
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Pinterest Image: ${errorMsg}`);
        staticPlatformResults.pinterest = {
          success: false,
          caption: pinterestImageCaptionForResults,
          error: errorMsg,
        };
      }

      // Post 2: Video pin (animated coloring page for engagement)
      if (coloringImage.animationUrl && process.env.PINTEREST_BOARD_ID_VIDEOS) {
        try {
          console.log('[Pinterest] Posting video pin...');

          // Create cover image from SVG (9:16 aspect ratio)
          const coverImageUrl = await createPinterestVideoCoverImage(
            coloringImage.svgUrl,
          );
          tempFiles.push(coverImageUrl.split('/').pop() || '');

          // Generate Pinterest caption (can reuse or generate new)
          const videoCaption = await generatePinterestCaption(coloringImage);

          if (!videoCaption) {
            throw new Error('failed to generate Pinterest video caption');
          }

          // Post video pin to separate board
          const pinterestVideoId = await postVideoToPinterest(
            coloringImage.animationUrl,
            coverImageUrl,
            coloringImage.title ?? 'Free Coloring Page',
            videoCaption,
            coloringImage.id,
            process.env.PINTEREST_BOARD_ID_VIDEOS,
          );

          results.pinterestVideo = pinterestVideoId;
          console.log(
            'Successfully posted video to Pinterest:',
            pinterestVideoId,
          );
        } catch (error) {
          console.error('Error posting video to Pinterest:', error);
          results.errors.push(
            `Pinterest Video: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    }

    // TODO(LinkedIn auto-post): dormant — LinkedIn is manual-only.
    // Caption is generated in the digest email for copy-paste. To
    // re-enable: add an `if (shouldPost('linkedin') && …)` branch
    // calling postToLinkedInPage(linkedInImageUrl, linkedInCaption)
    // (helper kept dormant above handleRequest; imports + SocialPostResults
    // entries kept around so the wiring is minimal).

    // Persist per-platform outcomes for the digest cron.
    if (Object.keys(staticPlatformResults).length > 0) {
      try {
        await mergeSocialPostResults(coloringImage.id, staticPlatformResults);
      } catch (err) {
        console.error('[Social] Failed to persist socialPostResults:', err);
      }
    }
    // return results
    const hasSuccess =
      results.instagram ||
      results.instagramReel ||
      results.facebook ||
      results.facebookImage ||
      results.pinterest ||
      results.pinterestVideo;

    return NextResponse.json(
      {
        success: hasSuccess,
        results,
        message: hasSuccess
          ? 'Posted successfully to at least one platform'
          : 'Failed to post to any platform',
      },
      {
        status: hasSuccess ? 200 : 500,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error('error in social media posting:', error);
    return NextResponse.json(
      { error: 'failed to post to social media platforms' },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  } finally {
    // clean up temporary files
    await Promise.allSettled(
      tempFiles
        .filter((fileName) => fileName)
        .map(async (fileName) => {
          try {
            // extract platform from filename path (stored in temp/social/{platform}/)
            let platform = 'instagram';
            if (fileName.includes('facebook')) {
              platform = 'facebook';
            } else if (fileName.includes('pinterest')) {
              platform = 'pinterest';
            }
            await del(`temp/social/${platform}/${fileName}`);
          } catch (error) {
            console.error(
              `error cleaning up temporary file ${fileName}:`,
              error,
            );
          }
        }),
    );
  }
};

export const GET = handleRequest;
export const POST = handleRequest;
