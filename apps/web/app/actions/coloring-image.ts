'use server';

import { put, del } from '@vercel/blob';
import { revalidatePath, cacheLife, cacheTag } from 'next/cache';
import { after } from 'next/server';
import QRCode from 'qrcode';
import sharp from 'sharp';
import {
  generateText,
  generateObject,
  experimental_generateImage,
  models,
  getTracedModels,
  IMAGE_DEFAULTS,
  createColoringImagePromptDetailed,
  CLEAN_UP_DESCRIPTION_SYSTEM,
  IMAGE_METADATA_SYSTEM,
  IMAGE_METADATA_PROMPT,
  imageMetadataSchema,
  analyzeImageForAnalytics,
} from '@/lib/ai';
import { ACTIONS, TRACKING_EVENTS } from '@/constants';
import { track, trackWithUser } from '@/utils/analytics-server';
import {
  db,
  ColoringImage,
  GenerationType,
  CreditTransactionType,
} from '@chunky-crayon/db';
import { getRandomDescriptionSmart as getRandomDescription } from '@/utils/random';
import type { ColoringImageSearchParams } from '@/types';
import { getUserId } from '@/app/actions/user';
import { checkSvgImage, retraceImage, traceImage } from '@/utils/traceImage';

// generate coloring image from openai based on text/audio/image description
const generateColoringImage = async (description: string) => {
  const prompt = createColoringImagePromptDetailed(description);

  // DEBUG: Log the full prompt being sent to OpenAI
  // eslint-disable-next-line no-console
  console.log('[ImageGeneration] Full prompt being sent to OpenAI:', prompt);
  // eslint-disable-next-line no-console
  console.log('[ImageGeneration] Prompt length:', prompt.length, 'characters');

  const { image } = await experimental_generateImage({
    model: models.image,
    prompt,
    size: IMAGE_DEFAULTS.size,
    providerOptions: {
      openai: {
        quality: IMAGE_DEFAULTS.quality,
      },
    },
  });

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log('generateColoringImage response', image);

  // convert base64 to buffer for storage
  const imageBuffer = Buffer.from(image.base64, 'base64');

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
  // Get traced models for observability (latency, tokens, costs)
  const tracedModels = getTracedModels({
    userId,
    properties: { action: 'coloring-image-generation' },
  });

  // clean up the user's description
  const { text: cleanedUpUserDescription } = await generateText({
    model: tracedModels.text,
    system: CLEAN_UP_DESCRIPTION_SYSTEM,
    prompt: description,
  });

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

  const { object: imageMetadata } = await generateObject({
    model: tracedModels.text,
    schema: imageMetadataSchema,
    system: IMAGE_METADATA_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: IMAGE_METADATA_PROMPT,
          },
          {
            type: 'image',
            image: new URL(imageUrl),
          },
        ],
      },
    ],
  });

  // DEBUG:
  // eslint-disable-next-line no-console
  console.log('imageMetadata', imageMetadata);

  // create new coloringImage in db
  const coloringImage = await db.coloringImage.create({
    data: {
      title: imageMetadata.title,
      description: imageMetadata.description,
      alt: imageMetadata.alt,
      tags: imageMetadata.tags,
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

  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);

  // Check credits for authenticated users
  if (userId) {
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

      // Run SVG check and analytics in parallel, independently
      await Promise.allSettled([
        // Check SVG validity and retrace if needed
        (async () => {
          const { isValid } = await checkSvgImage(result.svgUrl!);
          if (!isValid) {
            await retraceImage(result.id, result.url!);
          }
        })(),

        // Analyze image content for PostHog insights (using Gemini 3 Flash)
        (async () => {
          const imageAnalytics = await analyzeImageForAnalytics(result.url!);
          if (imageAnalytics && userId) {
            await trackWithUser(userId, TRACKING_EVENTS.CREATION_ANALYZED, {
              coloringImageId: result.id,
              ...imageAnalytics,
            });
          }
        })(),
      ]);
    });

    revalidatePath('/');
    return result;
  }

  // Guest users (not authenticated) - no credit check required
  const result = await generateColoringImageWithMetadata(
    rawFormData.description,
    undefined,
    rawFormData.generationType,
  );

  after(async () => {
    if (!result.url || !result.svgUrl) {
      return;
    }

    // Run SVG check and analytics in parallel, independently
    await Promise.allSettled([
      // Check SVG validity and retrace if needed
      (async () => {
        const { isValid } = await checkSvgImage(result.svgUrl!);
        if (!isValid) {
          await retraceImage(result.id, result.url!);
        }
      })(),

      // Analyze image content for PostHog insights (using Gemini 3 Flash)
      (async () => {
        const imageAnalytics = await analyzeImageForAnalytics(result.url!);
        if (imageAnalytics) {
          await track(TRACKING_EVENTS.CREATION_ANALYZED, {
            coloringImageId: result.id,
            ...imageAnalytics,
          });
        }
      })(),
    ]);
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
