import { db } from '@one-colored-pixel/db';
import { Difficulty, type Prisma } from '@one-colored-pixel/db';
import { getCategoryBySlug } from '@one-colored-pixel/coloring-core/gallery';
import { BRAND } from '@/lib/db';
import { createColoringImage } from '@/app/actions/coloring-image';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 150;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const IMAGES_PER_PAGE = 12;

// Get public coloring images with cursor-based pagination.
// Optional `category` (slug) filters by the category's tag set (same tag-match
// the web gallery uses: tags hasSome category.tags); optional `difficulty`
// narrows further. No category → the full public library (unchanged).
const getColoringImagesForApi = async ({
  cursor,
  categorySlug,
  difficulty,
  limit = IMAGES_PER_PAGE,
}: {
  cursor?: string;
  categorySlug?: string;
  difficulty?: Difficulty;
  limit?: number;
}) => {
  const where: Prisma.ColoringImageWhereInput = {
    brand: BRAND,
    userId: null, // Only public/community images
    status: 'READY', // Skip GENERATING / FAILED rows
  };

  if (categorySlug) {
    const category = getCategoryBySlug(categorySlug);
    // Unknown slug → empty result (don't fall back to the whole library, which
    // would silently show "all" under a bad category link).
    if (!category) {
      return { coloringImages: [], nextCursor: null, hasMore: false };
    }
    where.tags = { hasSome: category.tags };
  }

  if (difficulty) {
    where.difficulty = difficulty;
  }

  // Fetch one extra to determine if there are more pages
  const images = await db.coloringImage.findMany({
    where,
    select: {
      id: true,
      svgUrl: true,
      title: true,
      displayTitle: true,
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

// Parse the ?difficulty= param into the enum, ignoring junk values.
const parseDifficulty = (raw: string | null): Difficulty | undefined => {
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  return (Object.values(Difficulty) as string[]).includes(upper)
    ? (upper as Difficulty)
    : undefined;
};

export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') || undefined;
  const categorySlug = searchParams.get('category') || undefined;
  const difficulty = parseDifficulty(searchParams.get('difficulty'));

  return Response.json(
    await getColoringImagesForApi({ cursor, categorySlug, difficulty }),
    { headers: corsHeaders },
  );
};

export const POST = async (request: Request) => {
  const { description } = await request.json();

  const formData = new FormData();
  formData.append('description', description);

  return Response.json(
    { coloringImage: await createColoringImage(formData) },
    { headers: corsHeaders },
  );
};
