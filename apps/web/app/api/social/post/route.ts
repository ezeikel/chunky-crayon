import { NextResponse } from 'next/server';
import { GenerationType } from '@chunky-crayon/db';
import sharp from 'sharp';
import { put, del } from '@/lib/storage';
import { db } from '@chunky-crayon/db';
import {
  generateInstagramCaption,
  generateFacebookCaption,
  generatePinterestCaption,
  type InstagramPostType,
  type FacebookPostType,
} from '@/app/actions/social';

export const maxDuration = 180; // Increased for carousel creation

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    });

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
  if (!data.id) {
    throw new Error('failed to create Instagram media container');
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
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${containerId}?fields=status_code,status&access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`,
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
) => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        share_to_feed: true, // Also share to main feed
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
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

const publishInstagramMedia = async (creationId: string) => {
  const response = await fetch(
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
  );

  const data = await response.json();
  if (!data.id) {
    throw new Error('failed to publish Instagram media');
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
) => {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${process.env.FACEBOOK_PAGE_ID}/videos`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_url: videoUrl,
        description,
        title,
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      }),
    },
  );

  const data = await response.json();
  if (!data.id) {
    console.error('Facebook video API response:', data);
    throw new Error(`Failed to post video to Facebook: ${JSON.stringify(data)}`);
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
  const response = await fetch('https://api.pinterest.com/v5/pins', {
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

const handleRequest = async (request: Request) => {
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
    const platformFilter = url.searchParams.get('platform'); // optional: 'instagram', 'facebook', 'pinterest'

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

    let coloringImage;

    if (coloringImageId) {
      // get specific coloring image by ID
      coloringImage = await db.coloringImage.findUnique({
        where: {
          id: coloringImageId,
        },
      });

      if (!coloringImage) {
        throw new Error(`Coloring image with ID ${coloringImageId} not found`);
      }
    } else {
      // get the most recent daily coloring image (default behavior)
      coloringImage = await db.coloringImage.findFirst({
        where: {
          generationType: GenerationType.DAILY,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    if (!coloringImage?.svgUrl) {
      throw new Error('no recent coloring image found');
    }

    const results = {
      instagram: null as string | null,
      instagramReel: null as string | null, // Separate Reel for discovery
      facebook: null as string | null,
      facebookImage: null as string | null, // Image post when video is also posted
      pinterest: null as string | null,
      errors: [] as string[],
    };

    // post to Instagram
    if (shouldPost('instagram')) {
      // convert svg to jpeg for Instagram
      const instagramBuffer = await convertSvgToJpeg(
        coloringImage.svgUrl,
        'instagram',
      );

      // upload to temporary storage
      const instagramImageUrl = await uploadToTempStorage(
        instagramBuffer,
        'instagram',
      );
      tempFiles.push(instagramImageUrl.split('/').pop() || '');

      // Post 1: Carousel (if we have animation) or single image
      try {
        const postType: InstagramPostType = coloringImage.animationUrl
          ? 'carousel'
          : 'image';
        const instagramCaption = await generateInstagramCaption(
          coloringImage,
          postType,
        );

        if (!instagramCaption) {
          throw new Error('failed to generate Instagram caption');
        }

        let instagramMediaId: string;

        if (coloringImage.animationUrl) {
          console.log('[Instagram] Creating carousel with image + video...');

          // Create image container (static image first for conversion)
          const imageContainerId =
            await createInstagramImageContainerForCarousel(instagramImageUrl);
          console.log('[Instagram] Image container created:', imageContainerId);

          // Create video container (animation second for engagement)
          const videoContainerId = await createInstagramVideoContainer(
            coloringImage.animationUrl,
          );
          console.log('[Instagram] Video container created:', videoContainerId);

          // Wait for video to process
          await waitForMediaReady(videoContainerId);

          // Create carousel container with both items (image first, video second)
          const carouselId = await createInstagramCarouselContainer(
            [imageContainerId, videoContainerId],
            instagramCaption,
          );
          console.log('[Instagram] Carousel container created:', carouselId);

          // Publish carousel
          instagramMediaId = await publishInstagramMedia(carouselId);
          console.log('[Instagram] Carousel published:', instagramMediaId);
        } else {
          // Single image post
          console.log('[Instagram] No animation, posting single image...');
          const creationId = await createInstagramMediaContainer(
            instagramImageUrl,
            instagramCaption,
          );
          instagramMediaId = await publishInstagramMedia(creationId);
        }

        results.instagram = instagramMediaId;
        console.log('Successfully posted to Instagram:', instagramMediaId);
      } catch (error) {
        console.error('Error posting to Instagram:', error);
        results.errors.push(
          `Instagram: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Post 2: Reel (if we have animation) - for algorithm reach/discovery
      if (coloringImage.animationUrl) {
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
    if (shouldPost('facebook')) {
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
          console.log('Successfully posted video to Facebook:', facebookVideoId);
        } catch (error) {
          console.error('Error posting video to Facebook:', error);
          results.errors.push(
            `Facebook Video: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Post 2: Image (always post - either standalone or as companion to video)
      try {
        console.log('[Facebook] Posting image...');

        const postType: FacebookPostType = coloringImage.animationUrl
          ? 'image_with_video'
          : 'image';
        const imageCaption = await generateFacebookCaption(
          coloringImage,
          postType,
        );

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

        console.log('Successfully posted image to Facebook:', facebookImageId);
      } catch (error) {
        console.error('Error posting image to Facebook:', error);
        results.errors.push(
          `Facebook Image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // post to Pinterest
    if (shouldPost('pinterest')) {
      try {
        // convert svg to jpeg for Pinterest (reuse instagram dimensions - square works well)
        const pinterestBuffer = await convertSvgToJpeg(
          coloringImage.svgUrl,
          'instagram', // reuse instagram dimensions for Pinterest (1080x1080 square)
        );

        // upload to temporary storage
        const pinterestImageUrl = await uploadToTempStorage(
          pinterestBuffer,
          'pinterest',
        );
        tempFiles.push(pinterestImageUrl.split('/').pop() || '');

        // generate Pinterest caption (description)
        const pinterestCaption = await generatePinterestCaption(coloringImage);

        if (!pinterestCaption) {
          throw new Error('failed to generate Pinterest caption');
        }

        // post to Pinterest
        const pinterestPinId = await postToPinterest(
          pinterestImageUrl,
          coloringImage.title ?? 'Free Coloring Page',
          pinterestCaption,
          coloringImage.id,
        );

        results.pinterest = pinterestPinId;
        console.log('Successfully posted to Pinterest:', pinterestPinId);
      } catch (error) {
        console.error('Error posting to Pinterest:', error);
        results.errors.push(
          `Pinterest: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // return results
    const hasSuccess =
      results.instagram ||
      results.instagramReel ||
      results.facebook ||
      results.facebookImage ||
      results.pinterest;

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
