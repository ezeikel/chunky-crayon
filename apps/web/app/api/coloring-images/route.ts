import { db } from '@chunky-crayon/db';
import { createColoringImage } from '@/app/actions/coloring-image';
import { NextRequest } from 'next/server';

export const maxDuration = 150;

const IMAGES_PER_PAGE = 12;

// Get public coloring images with cursor-based pagination
const getColoringImagesForApi = async (
  cursor?: string,
  limit = IMAGES_PER_PAGE,
) => {
  // Fetch one extra to determine if there are more pages
  const images = await db.coloringImage.findMany({
    where: {
      userId: null, // Only public/community images
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1, // Skip the cursor item itself
        }
      : {}),
  });

  const hasMore = images.length > limit;
  const resultImages = hasMore ? images.slice(0, limit) : images;
  const nextCursor = hasMore ? resultImages[resultImages.length - 1]?.id : null;

  return {
    coloringImages: resultImages,
    nextCursor,
    hasMore,
  };
};

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') || undefined;

  return Response.json(await getColoringImagesForApi(cursor), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    },
  });
};

export const POST = async (request: Request) => {
  const { description } = await request.json();

  const formData = new FormData();
  formData.append('description', description);

  return Response.json(
    { coloringImage: await createColoringImage(formData) },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
    },
  );
};
