import { NextResponse } from 'next/server';
import { db, GenerationType } from '@chunky-crayon/db';
import { auth } from '@/auth';
import sharp from 'sharp';
import { put } from '@/lib/storage';
import { generatePinterestCaption } from '@/app/actions/social';
import { ADMIN_EMAILS } from '@/constants';

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
 * Get Pinterest access token.
 * In sandbox mode, uses manually generated sandbox token if available.
 * Otherwise uses OAuth token from database.
 */
const getPinterestAccessToken = async (): Promise<string> => {
  // Use sandbox token if in sandbox mode and token is configured
  const useSandbox = process.env.PINTEREST_USE_SANDBOX === 'true';
  const sandboxToken = process.env.PINTEREST_SANDBOX_TOKEN;

  if (useSandbox && sandboxToken) {
    console.log('[Pinterest Video] Using portal-generated sandbox token');
    return sandboxToken;
  }

  const token = await db.apiToken.findUnique({
    where: { provider: 'pinterest' },
  });

  if (!token) {
    throw new Error(
      'Pinterest not connected. Please connect your Pinterest account first.',
    );
  }

  // Check if token needs refresh (within 7 days of expiry)
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (token.expiresAt < sevenDaysFromNow) {
    const refreshedToken = await refreshPinterestToken(token.refreshToken);
    return refreshedToken;
  }

  return token.accessToken;
};

/**
 * Refresh Pinterest access token.
 */
const refreshPinterestToken = async (refreshToken: string): Promise<string> => {
  const clientId = process.env.PINTEREST_APP_ID;
  const clientSecret = process.env.PINTEREST_APP_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Pinterest credentials not configured');
  }

  const response = await fetch(`${getPinterestApiUrl()}/v5/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Pinterest token refresh failed: ${data.message || data.error}`,
    );
  }

  // Update token in database
  await db.apiToken.update({
    where: { provider: 'pinterest' },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' ') || [],
    },
  });

  return data.access_token;
};

/**
 * Create a 9:16 cover image from the SVG for video pins.
 * Pinterest requires a cover image for video pins.
 */
const createCoverImage = async (svgUrl: string): Promise<string> => {
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
 * Poll for media upload status.
 * Pinterest processes videos asynchronously.
 */
const pollMediaStatus = async (
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
): Promise<string> => {
  const accessToken = await getPinterestAccessToken();

  console.log('[Pinterest Video] Starting video pin creation...');
  console.log('[Pinterest Video] Video URL:', videoUrl);
  console.log('[Pinterest Video] Cover URL:', coverImageUrl);

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
  await pollMediaStatus(accessToken, media_id);
  console.log('[Pinterest Video] Media processing complete');

  // Step 4: Create pin with video
  console.log('[Pinterest Video] Step 4: Creating pin...');

  if (!process.env.PINTEREST_BOARD_ID) {
    throw new Error('PINTEREST_BOARD_ID not configured');
  }

  const pinResponse = await fetch(`${getPinterestApiUrl()}/v5/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: process.env.PINTEREST_BOARD_ID,
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

/**
 * POST /api/social/pinterest/video
 * Posts the most recent daily coloring page animation as a video pin to Pinterest.
 */
export const POST = async () => {
  try {
    // Check if user is admin
    const session = await auth();
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the most recent daily coloring image with animation
    const coloringImage = await db.coloringImage.findFirst({
      where: {
        generationType: GenerationType.DAILY,
        animationUrl: { not: null },
        svgUrl: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!coloringImage?.animationUrl || !coloringImage?.svgUrl) {
      return NextResponse.json(
        { error: 'No coloring image with animation found' },
        { status: 404 },
      );
    }

    const usingSandbox = process.env.PINTEREST_USE_SANDBOX === 'true';
    console.log(
      '[Pinterest Video] Mode:',
      usingSandbox ? 'SANDBOX' : 'PRODUCTION',
    );
    console.log(
      '[Pinterest Video] Posting video pin for:',
      coloringImage.title,
    );

    // Create cover image from SVG (9:16 aspect ratio)
    const coverImageUrl = await createCoverImage(coloringImage.svgUrl);

    // Generate Pinterest caption
    const caption = await generatePinterestCaption(coloringImage);

    if (!caption) {
      throw new Error('Failed to generate Pinterest caption');
    }

    // Post video pin to Pinterest
    const pinId = await postVideoToPinterest(
      coloringImage.animationUrl,
      coverImageUrl,
      coloringImage.title,
      caption,
      coloringImage.id,
    );

    return NextResponse.json({
      success: true,
      pinId,
      coloringImageId: coloringImage.id,
      caption,
      message: 'Video pin posted successfully to Pinterest!',
    });
  } catch (error) {
    console.error('[Pinterest Video] Post error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to post to Pinterest',
      },
      { status: 500 },
    );
  }
};
