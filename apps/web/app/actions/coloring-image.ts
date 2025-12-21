'use server';

import { put, del } from '@vercel/blob';
import { revalidatePath, cacheLife, cacheTag } from 'next/cache';
import { after } from 'next/server';
import OpenAI from 'openai';
import QRCode from 'qrcode';
import sharp from 'sharp';
import {
  OPENAI_MODEL_GPT_4O,
  OPENAI_MODEL_GPT_IMAGE_OPTIONS,
  REFERENCE_IMAGES,
  ACTIONS,
} from '@/constants';
import {
  db,
  ColoringImage,
  GenerationType,
  CreditTransactionType,
} from '@chunky-crayon/db';
import { getRandomDescriptionSmart as getRandomDescription } from '@/utils/random';
import { showAuthButtonsFlag } from '@/flags';
import type { ColoringImageSearchParams } from '@/types';
import { getUserId } from '@/app/actions/user';
import { checkSvgImage, retraceImage, traceImage } from '@/utils/traceImage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// generate coloring image from openai based on text/audio/image description
const generateColoringImage = async (description: string) => {
  const response = await openai.images.generate({
    ...OPENAI_MODEL_GPT_IMAGE_OPTIONS,
    prompt: `${description}. The image should be in cartoon style with thick lines, low detail, no color, no shading, and no fill. Only black lines should be used. Ensure no extraneous elements such as additional shapes or artifacts are included. Refer to the style of the provided reference images: ${REFERENCE_IMAGES.join(', ')}`,
  });

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log('generateColoringImage response', response);

  const { b64_json: base64Image } = (
    response.data as { b64_json: string }[]
  )[0];

  // convert base64 to buffer for storage
  const imageBuffer = Buffer.from(base64Image, 'base64');

  // generate a unique temporary filename
  const tempFileName = `temp/${Date.now()}-${Math.random().toString(36).substring(2)}.png`;

  try {
    // save the image to blob storage temporarily
    const { url } = await put(tempFileName, imageBuffer, {
      access: 'public',
    });

    return {
      url,
      tempFileName,
    };
  } catch (error) {
    console.error('Error saving temporary image:', error);
    throw error;
  }
};

// generate an appropriate prompt for the coloring image
const cleanUpDescription = async (roughUserDescription: string) => {
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL_GPT_4O,
    messages: [
      {
        role: 'system',
        content: `You are an assistant that helps clean up and simplify user descriptions for generating coloring book images for children. Ensure the description is suitable for a cartoon-style image with thick lines, low detail, no color, no shading, and no fill. Only black lines should be used. The target age is 3-8 years old. If the user's description does not include a scene or background, add an appropriate one. Consider the attached reference images: ${REFERENCE_IMAGES.join(', ')}. Do not include any extraneous elements in the description.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: roughUserDescription,
          },
        ],
      },
    ],
  });

  return response.choices[0].message.content;
};

type CreateColoringImageResult =
  | Partial<ColoringImage>
  | { error: string; credits: number };

const isErrorResult = (
  result: CreateColoringImageResult,
): result is { error: string; credits: number } => 'error' in result;

const isColoringImage = (
  result: CreateColoringImageResult,
): result is Partial<ColoringImage> => !isErrorResult(result);

const generateColoringImageWithMetadata = async (
  description: string,
  userId?: string,
  generationType?: GenerationType,
) => {
  // clean up the user's description
  const cleanedUpUserDescription = await cleanUpDescription(description);

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log('cleanedUpUserDescription', cleanedUpUserDescription);

  // generate the coloring image
  const { url: imageUrl, tempFileName } = await generateColoringImage(
    cleanedUpUserDescription as string,
  );

  if (!imageUrl) {
    throw new Error('Failed to generate an acceptable image');
  }

  const generateImageMetadataResponse = await openai.chat.completions.create({
    model: OPENAI_MODEL_GPT_4O,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an assistant that generates metadata for images to be used for SEO and accessibility. The metadata should include a title, a description, and an alt text for the image alt attribute. The information should be concise, relevant to the image, and suitable for children aged 3-8.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Generate a JSON object with properties "title", "description", "alt" and "tags" for the generated image based on the following image:`,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
  });

  const generateImageMetadataResponseContent = JSON.parse(
    generateImageMetadataResponse.choices[0].message.content as string,
  );

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log(
    'generateImageMetadataResponseContent',
    generateImageMetadataResponseContent,
  );

  // create new coloringImage in db
  const coloringImage = await db.coloringImage.create({
    data: {
      title: generateImageMetadataResponseContent.title,
      description: generateImageMetadataResponseContent.description,
      alt: generateImageMetadataResponseContent.alt,
      tags: generateImageMetadataResponseContent.tags,
      generationType: generationType || GenerationType.USER,
      userId,
    },
  });

  // generate QR code for the coloring image
  const qrCodeSvg = await QRCode.toString(
    `https://chunkycrayon.com?utm_source=${coloringImage.id}&utm_medium=pdf-qr-code&utm_campaign=coloring-image-pdf`,
    {
      type: 'svg',
    },
  );

  const qrCodeSvgBuffer = Buffer.from(qrCodeSvg);

  // fetch image from url in a format suitable for saving in blob storage
  const response = await fetch(imageUrl);
  const imageBuffer = await response.arrayBuffer();

  const svg = await traceImage(imageBuffer);
  const imageSvgBuffer = Buffer.from(svg);

  // save image webp to blob storage
  const imageFileName = `uploads/coloring-images/${coloringImage.id}/image.webp`;

  // convert PNG buffer to WebP before uploading
  const webpBuffer = await sharp(Buffer.from(imageBuffer)).webp().toBuffer();

  // save image svg to blob storage
  const svgFileName = `uploads/coloring-images/${coloringImage.id}/image.svg`;

  // save qr code svg in blob storage
  const qrCodeFileName = `uploads/coloring-images/${coloringImage.id}/qr-code.svg`;

  const [
    { url: imageBlobUrl },
    { url: imageSvgBlobUrl },
    { url: qrCodeSvgBlobUrl },
  ] = await Promise.all([
    put(imageFileName, webpBuffer, {
      access: 'public',
    }),
    put(svgFileName, imageSvgBuffer, {
      access: 'public',
    }),
    put(qrCodeFileName, qrCodeSvgBuffer, {
      access: 'public',
    }),
  ]);

  // update coloringImage in db with qr code url
  const updatedColoringImage = await db.coloringImage.update({
    where: {
      id: coloringImage.id,
    },
    data: {
      url: imageBlobUrl,
      svgUrl: imageSvgBlobUrl,
      qrCodeUrl: qrCodeSvgBlobUrl,
    },
  });

  // clean up temporary file
  try {
    if (tempFileName) {
      await del(tempFileName);
    }
  } catch (error) {
    console.error('Error cleaning up temporary file:', error);
  }

  return updatedColoringImage;
};

export const createColoringImage = async (
  formData: FormData,
): Promise<CreateColoringImageResult> => {
  const rawFormData = {
    description: (formData.get('description') as string) || '',
    generationType:
      (formData.get('generationType') as GenerationType) || undefined,
  };

  // check if auth is enabled and user is authenticated
  const showAuthButtons = await showAuthButtonsFlag();
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);

  if (showAuthButtons && userId) {
    // get user's credit balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user || user.credits < 5) {
      return {
        error: 'Insufficient credits',
        credits: user?.credits || 0,
      };
    }

    // use a transaction to deduct credits and create the coloring image
    const result = await db.$transaction(
      async (tx) => {
        // deduct credits
        await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: 5 } },
        });

        // create credit transaction record
        await tx.creditTransaction.create({
          data: {
            userId,
            amount: -5,
            type: CreditTransactionType.GENERATION,
          },
        });

        return generateColoringImageWithMetadata(
          rawFormData.description,
          userId,
          rawFormData.generationType,
        );
      },
      {
        timeout: 120000, // 2 minutes in milliseconds
      },
    );

    after(async () => {
      if (!result.url || !result.svgUrl) {
        return;
      }

      const { isValid } = await checkSvgImage(result.svgUrl);

      if (!isValid) {
        await retraceImage(result.id, result.url);
      }
    });

    revalidatePath('/');
    return result;
  }

  // if auth is not enabled or user is not authenticated, proceed with original flow
  const result = await generateColoringImageWithMetadata(
    rawFormData.description,
    undefined,
    rawFormData.generationType,
  );

  after(async () => {
    if (!result.url || !result.svgUrl) {
      return;
    }

    const { isValid } = await checkSvgImage(result.svgUrl);

    if (!isValid) {
      await retraceImage(result.id, result.url);
    }
  });

  revalidatePath('/');
  return result;
};

// Base cached function for fetching a coloring image by ID
export const getColoringImageBase = async (
  id: string,
): Promise<Partial<ColoringImage> | null> => {
  'use cache';

  // The id parameter is serializable and becomes part of the cache key
  cacheLife('max');
  cacheTag('coloring-image', `coloring-image-${id}`);

  return db.coloringImage.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      alt: true,
      tags: true,
      url: true,
      svgUrl: true,
      qrCodeUrl: true,
    },
  });
};

// Wrapper for page components that receive params as Promise
export const getColoringImage = async (
  params: Promise<{ id: string }>,
): Promise<Partial<ColoringImage> | null> => {
  const { id } = await params;
  return getColoringImageBase(id);
};

// Export for components that have a plain string ID
export const getColoringImageById = async (
  id: string,
): Promise<Partial<ColoringImage> | null> => {
  return getColoringImageBase(id);
};

const getAllColoringImagesBase = async (show = 'all', userId?: string) => {
  'use cache';
  cacheLife('max');
  cacheTag('all-coloring-images');

  return db.coloringImage.findMany({
    where: {
      OR:
        show === 'all'
          ? userId
            ? [{ userId }, { userId: null }]
            : [{ userId: null }]
          : userId
            ? [{ userId }]
            : [{ id: { in: [] } }], // Empty result if filtering by user but no userId
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getAllColoringImages = async (
  searchParams: Promise<ColoringImageSearchParams>,
) => {
  const { show = 'all' } = await searchParams;

  const userId = await getUserId(ACTIONS.GET_ALL_COLORING_IMAGES);
  return getAllColoringImagesBase(show, userId || undefined);
};

// Static version for generateStaticParams - no user context needed
export const getAllColoringImagesStatic = async () => {
  // Return all public images for static generation
  // No userId needed since this runs at build time
  return getAllColoringImagesBase('all', undefined);
};

export const generateColoringImageOnly = async (
  generationType: GenerationType,
): Promise<Partial<ColoringImage>> => {
  const description = getRandomDescription();

  const formData = new FormData();

  formData.append('description', description);
  formData.append('generationType', generationType);

  const coloringImage = await createColoringImage(formData);

  if (!isColoringImage(coloringImage)) {
    throw new Error(
      coloringImage.error ||
        `Error generating ${generationType.toLowerCase()} coloring image`,
    );
  }

  return coloringImage;
};
