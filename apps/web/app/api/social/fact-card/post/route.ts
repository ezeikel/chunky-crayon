import { NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { put, del } from '@/lib/storage';
import { generateFact } from '@/app/actions/generate-fact';
import { generateFactCardCaption } from '@/app/actions/social';
import { FactCard } from '@/components/social/FactCard';
import type { GeneratedFact } from '@/lib/social/facts';
import { db } from '@chunky-crayon/db';

export const maxDuration = 120;

// Cache fonts at module level
let rooneySansRegular: ArrayBuffer | null = null;
let rooneySansMedium: ArrayBuffer | null = null;
let tondoBold: ArrayBuffer | null = null;

async function loadFonts() {
  if (!rooneySansRegular || !rooneySansMedium || !tondoBold) {
    const fontsDir = join(process.cwd(), 'public', 'fonts');

    const [regular, medium, bold] = await Promise.all([
      readFile(join(fontsDir, 'rooney-sans-regular.ttf')),
      readFile(join(fontsDir, 'rooney-sans-medium.ttf')),
      readFile(join(fontsDir, 'tondo-bold.ttf')),
    ]);

    rooneySansRegular = regular.buffer.slice(
      regular.byteOffset,
      regular.byteOffset + regular.byteLength,
    ) as ArrayBuffer;
    rooneySansMedium = medium.buffer.slice(
      medium.byteOffset,
      medium.byteOffset + medium.byteLength,
    ) as ArrayBuffer;
    tondoBold = bold.buffer.slice(
      bold.byteOffset,
      bold.byteOffset + bold.byteLength,
    ) as ArrayBuffer;
  }

  return { rooneySansRegular, rooneySansMedium, tondoBold };
}

/**
 * Simple hash function to get a deterministic color index from a string.
 * This ensures square and vertical formats get the same background color.
 */
function getColorIndexFromFact(fact: string): number {
  let hash = 0;
  for (let i = 0; i < fact.length; i++) {
    const char = fact.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 6; // 6 background colors
}

/**
 * Render a fact card to PNG buffer using @vercel/og ImageResponse.
 */
async function renderFactCard(
  fact: GeneratedFact,
  format: 'square' | 'vertical',
  colorIndex: number,
): Promise<Buffer> {
  const fonts = await loadFonts();

  const width = format === 'vertical' ? 1000 : 1080;
  const height = format === 'vertical' ? 1500 : 1080;

  // Generate image using ImageResponse
  const imageResponse = new ImageResponse(
    FactCard({
      fact: fact.fact,
      category: fact.category,
      emoji: fact.emoji,
      format,
      colorIndex,
    }),
    {
      width,
      height,
      fonts: [
        {
          name: 'Rooney Sans',
          data: fonts.rooneySansRegular!,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Rooney Sans',
          data: fonts.rooneySansMedium!,
          weight: 500,
          style: 'normal',
        },
        {
          name: 'Tondo',
          data: fonts.tondoBold!,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );

  // Convert response to buffer
  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Convert PNG to JPEG for social platforms.
 */
async function pngToJpeg(pngBuffer: Buffer): Promise<Buffer> {
  return sharp(pngBuffer)
    .flatten({ background: '#FAF6F1' })
    .jpeg({ quality: 95, progressive: true })
    .toBuffer();
}

/**
 * Upload image to temporary storage.
 */
async function uploadToTempStorage(
  imageBuffer: Buffer,
  platform: string,
): Promise<string> {
  const tempFileName = `temp/social/fact-card/${platform}/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;

  const { url } = await put(tempFileName, imageBuffer, {
    access: 'public',
    contentType: 'image/jpeg',
  });

  console.log(
    `[Fact Card ${platform}] Uploaded temp image: ${url} (${imageBuffer.length} bytes)`,
  );

  return url;
}

/**
 * Get Pinterest API base URL.
 */
const getPinterestApiUrl = () => {
  const useSandbox = process.env.PINTEREST_USE_SANDBOX === 'true';
  return useSandbox
    ? 'https://api-sandbox.pinterest.com'
    : 'https://api.pinterest.com';
};

/**
 * Get Pinterest access token from DB or env.
 */
async function getPinterestAccessToken(): Promise<string> {
  const dbToken = await db.apiToken.findUnique({
    where: { provider: 'pinterest' },
  });

  if (dbToken) {
    return dbToken.accessToken;
  }

  if (process.env.PINTEREST_ACCESS_TOKEN) {
    return process.env.PINTEREST_ACCESS_TOKEN;
  }

  throw new Error('Pinterest access token not configured');
}

/**
 * Create Instagram single image media container.
 */
async function createInstagramMediaContainer(
  imageUrl: string,
  caption: string,
): Promise<string> {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    console.error('[Fact Card Instagram] Media container error:', data);
    throw new Error(
      `Failed to create Instagram media container: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
}

/**
 * Publish Instagram media.
 */
async function publishInstagramMedia(creationId: string): Promise<string> {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    console.error('[Fact Card Instagram] Publish error:', data);
    throw new Error(
      `Failed to publish Instagram media: ${JSON.stringify(data)}`,
    );
  }
  return data.id;
}

/**
 * Post image to Facebook page.
 */
async function postToFacebookPage(
  imageUrl: string,
  message: string,
): Promise<string> {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.FACEBOOK_PAGE_ID}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        message,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    console.error('[Fact Card Facebook] Error:', data);
    throw new Error(`Failed to post to Facebook: ${JSON.stringify(data)}`);
  }
  return data.id;
}

/**
 * Post pin to Pinterest.
 */
async function postToPinterest(
  imageUrl: string,
  title: string,
  description: string,
): Promise<string> {
  if (!process.env.PINTEREST_BOARD_ID) {
    throw new Error('Pinterest board ID not configured');
  }

  const accessToken = await getPinterestAccessToken();

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
      title: title.slice(0, 100),
      description: description.slice(0, 500),
      link: 'https://chunkycrayon.com',
      alt_text: `${title} - Coloring tips and facts from Chunky Crayon`,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[Fact Card Pinterest] Error:', data);
    throw new Error(`Failed to post to Pinterest: ${JSON.stringify(data)}`);
  }
  return data.id;
}

/**
 * POST /api/social/fact-card/post
 *
 * Post a fact card to social media platforms.
 * Query params:
 *   - platform: 'instagram' | 'facebook' | 'pinterest' (optional, defaults to all)
 *   - dryRun: 'true' to skip actual posting (for testing)
 */
export async function POST(request: Request) {
  const tempFiles: string[] = [];

  try {
    // Validate required env vars
    if (
      !process.env.INSTAGRAM_ACCOUNT_ID ||
      !process.env.FACEBOOK_ACCESS_TOKEN ||
      !process.env.FACEBOOK_PAGE_ID
    ) {
      throw new Error('Social media credentials not configured');
    }

    const url = new URL(request.url);
    const platformFilter = url.searchParams.get('platform');
    const dryRun = url.searchParams.get('dryRun') === 'true';

    const shouldPost = (platform: string) =>
      !platformFilter || platformFilter === platform;

    // Generate a fact using AI
    console.log('[Fact Card] Generating fact...');
    const fact = await generateFact();
    console.log(`[Fact Card] Generated: "${fact.fact}" (${fact.category})`);

    const results = {
      fact,
      instagram: null as string | null,
      facebook: null as string | null,
      pinterest: null as string | null,
      errors: [] as string[],
    };

    // Render fact cards
    console.log('[Fact Card] Rendering images...');
    const colorIndex = getColorIndexFromFact(fact.fact);
    const squarePng = await renderFactCard(fact, 'square', colorIndex);
    const squareJpeg = await pngToJpeg(squarePng);

    // For Pinterest, use vertical format (same color as square)
    const verticalPng = shouldPost('pinterest')
      ? await renderFactCard(fact, 'vertical', colorIndex)
      : null;
    const verticalJpeg = verticalPng ? await pngToJpeg(verticalPng) : null;

    // Upload images for each platform
    let instagramImageUrl: string | null = null;
    let facebookImageUrl: string | null = null;
    let pinterestImageUrl: string | null = null;

    if (shouldPost('instagram')) {
      instagramImageUrl = await uploadToTempStorage(squareJpeg, 'instagram');
      tempFiles.push(instagramImageUrl);
    }

    if (shouldPost('facebook')) {
      facebookImageUrl = await uploadToTempStorage(squareJpeg, 'facebook');
      tempFiles.push(facebookImageUrl);
    }

    if (shouldPost('pinterest') && verticalJpeg) {
      pinterestImageUrl = await uploadToTempStorage(verticalJpeg, 'pinterest');
      tempFiles.push(pinterestImageUrl);
    }

    // Generate captions for each platform
    const instagramCaption = shouldPost('instagram')
      ? await generateFactCardCaption(fact, 'instagram')
      : '';
    const facebookCaption = shouldPost('facebook')
      ? await generateFactCardCaption(fact, 'facebook')
      : '';
    const pinterestCaption = shouldPost('pinterest')
      ? await generateFactCardCaption(fact, 'pinterest')
      : '';

    if (dryRun) {
      console.log('[Fact Card] Dry run - skipping actual posts');
      return NextResponse.json({
        success: true,
        dryRun: true,
        fact,
        captions: {
          instagram: instagramCaption,
          facebook: facebookCaption,
          pinterest: pinterestCaption,
        },
        imageUrls: {
          instagram: instagramImageUrl,
          facebook: facebookImageUrl,
          pinterest: pinterestImageUrl,
        },
      });
    }

    // Post to Instagram
    if (shouldPost('instagram') && instagramImageUrl) {
      try {
        console.log('[Fact Card] Posting to Instagram...');
        const containerId = await createInstagramMediaContainer(
          instagramImageUrl,
          instagramCaption,
        );
        const postId = await publishInstagramMedia(containerId);
        results.instagram = postId;
        console.log(`[Fact Card] Instagram success: ${postId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Fact Card] Instagram error:', message);
        results.errors.push(`Instagram: ${message}`);
      }
    }

    // Post to Facebook
    if (shouldPost('facebook') && facebookImageUrl) {
      try {
        console.log('[Fact Card] Posting to Facebook...');
        const postId = await postToFacebookPage(
          facebookImageUrl,
          facebookCaption,
        );
        results.facebook = postId;
        console.log(`[Fact Card] Facebook success: ${postId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Fact Card] Facebook error:', message);
        results.errors.push(`Facebook: ${message}`);
      }
    }

    // Post to Pinterest
    if (shouldPost('pinterest') && pinterestImageUrl) {
      try {
        console.log('[Fact Card] Posting to Pinterest...');
        const pinId = await postToPinterest(
          pinterestImageUrl,
          `${fact.emoji} ${fact.category}`,
          pinterestCaption,
        );
        results.pinterest = pinId;
        console.log(`[Fact Card] Pinterest success: ${pinId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Fact Card] Pinterest error:', message);
        results.errors.push(`Pinterest: ${message}`);
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      ...results,
    });
  } catch (error) {
    console.error('[Fact Card] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  } finally {
    // Cleanup temp files
    for (const tempUrl of tempFiles) {
      try {
        // Extract the path from the URL for deletion
        const urlPath = new URL(tempUrl).pathname;
        const blobPath = urlPath.replace(/^\//, ''); // Remove leading slash
        await del(blobPath);
        console.log(`[Fact Card] Cleaned up: ${blobPath}`);
      } catch (cleanupError) {
        console.error(
          `[Fact Card] Cleanup error for ${tempUrl}:`,
          cleanupError,
        );
      }
    }
  }
}

// Also support GET for cron jobs
export async function GET(request: Request) {
  return POST(request);
}
