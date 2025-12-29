import { NextResponse } from 'next/server';
import { GenerationType } from '@chunky-crayon/db';
import sharp from 'sharp';
import { put, del } from '@vercel/blob';
import { db } from '@chunky-crayon/db';
import {
  generateInstagramCaption,
  generateFacebookCaption,
  generatePinterestCaption,
} from '@/app/actions/social';

export const maxDuration = 150;

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

    // if POST request, also check request body
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
      facebook: null as string | null,
      pinterest: null as string | null,
      errors: [] as string[],
    };

    // post to Instagram
    try {
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

      // generate Instagram caption
      const instagramCaption = await generateInstagramCaption(coloringImage);

      if (!instagramCaption) {
        throw new Error('failed to generate Instagram caption');
      }

      // create media container and publish
      const creationId = await createInstagramMediaContainer(
        instagramImageUrl,
        instagramCaption,
      );
      const instagramMediaId = await publishInstagramMedia(creationId);

      results.instagram = instagramMediaId;
      console.log('Successfully posted to Instagram:', instagramMediaId);
    } catch (error) {
      console.error('Error posting to Instagram:', error);
      results.errors.push(
        `Instagram: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // post to Facebook
    try {
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

      // generate Facebook caption
      const facebookCaption = await generateFacebookCaption(coloringImage);

      if (!facebookCaption) {
        throw new Error('failed to generate Facebook caption');
      }

      // post to Facebook page
      const facebookPostId = await postToFacebookPage(
        facebookImageUrl,
        facebookCaption,
      );

      results.facebook = facebookPostId;
      console.log('Successfully posted to Facebook:', facebookPostId);
    } catch (error) {
      console.error('Error posting to Facebook:', error);
      results.errors.push(
        `Facebook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // post to Pinterest
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

    // return results
    const hasSuccess =
      results.instagram || results.facebook || results.pinterest;

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
