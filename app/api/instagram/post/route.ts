import { NextResponse } from 'next/server';
import { GenerationType } from '@prisma/client';
import sharp from 'sharp';
import { put, del } from '@vercel/blob';
import { db } from '@/lib/prisma';
import { generateInstagramCaption } from '@/app/actions';

export const maxDuration = 150;

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const convertSvgToJpeg = async (svgUrl: string): Promise<Buffer> => {
  // fetch the svg
  const svgResponse = await fetch(svgUrl);

  const svgBuffer = Buffer.from(await svgResponse.arrayBuffer());

  try {
    // convert to jpeg with instagram-optimized dimensions
    // instagram feed posts work best with 1:1 aspect ratio
    const jpegBuffer = await sharp(svgBuffer)
      .flatten({ background: '#ffffff' }) // preventing black backgrounds when converting to JPEG, which doesn't support transparency.
      .resize(1080, 1080, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .jpeg({
        quality: 100,
        progressive: true,
      })
      .toBuffer();

    return jpegBuffer;
  } catch (error) {
    console.error('error converting svg to jpeg:', error);
    throw error;
  }
};

const uploadToTempStorage = async (imageBuffer: Buffer): Promise<string> => {
  // generate a unique temporary filename
  const tempFileName = `temp/instagram/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;

  try {
    // save the image to blob storage temporarily
    const { url } = await put(tempFileName, imageBuffer, {
      access: 'public',
    });

    return url;
  } catch (error) {
    console.error('error saving temporary image:', error);
    throw error;
  }
};

const createMediaContainer = async (imageUrl: string, caption: string) => {
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
    throw new Error('failed to create media container');
  }
  return data.id;
};

const publishMedia = async (creationId: string) => {
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
    throw new Error('failed to publish media');
  }
  return data.id;
};

const handleRequest = async () => {
  let tempFileName: string | null = null;

  try {
    if (
      !process.env.INSTAGRAM_ACCOUNT_ID ||
      !process.env.FACEBOOK_ACCESS_TOKEN
    ) {
      throw new Error('instagram credentials not configured');
    }

    // get the most recent daily coloring image
    const coloringImage = await db.coloringImage.findFirst({
      where: {
        generationType: GenerationType.DAILY,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!coloringImage?.svgUrl) {
      throw new Error('no recent coloring image found');
    }

    // convert svg to jpeg
    const jpegBuffer = await convertSvgToJpeg(coloringImage.svgUrl);

    // upload to temporary storage to get a public url
    const publicImageUrl = await uploadToTempStorage(jpegBuffer);
    tempFileName = publicImageUrl.split('/').pop() || null;

    // generate caption using GPT-4
    const caption = await generateInstagramCaption(coloringImage);

    if (!caption) {
      throw new Error('failed to generate instagram caption');
    }

    // create media container
    const creationId = await createMediaContainer(publicImageUrl, caption);

    // publish the media
    const mediaId = await publishMedia(creationId);

    return NextResponse.json(
      { success: true, mediaId },
      {
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error('error in instagram posting:', error);
    return NextResponse.json(
      { error: 'failed to post to instagram' },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  } finally {
    // clean up temporary file
    if (tempFileName) {
      try {
        await del(`temp/instagram/${tempFileName}`);
      } catch (error) {
        console.error('error cleaning up temporary file:', error);
      }
    }
  }
};

export const GET = handleRequest;
export const POST = handleRequest;
