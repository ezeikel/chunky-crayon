import { NextRequest, NextResponse, connection } from 'next/server';
import { GenerationType } from '@one-colored-pixel/db';
import { generateColoringImageOnly } from '@/app/actions/coloring-image';

// Pipeline: Sonnet description clean-up + gpt-image-2 generation +
// metadata vision call + potrace + WebP encode + R2 uploads + DB
// inserts. Each stage is 5-30s; 120s left no headroom and we were
// timing out. 300s = Vercel Pro cap, gives the worst-case run room.
export const maxDuration = 300;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const isValidGenerationType = (type: string): type is GenerationType =>
  Object.values(GenerationType).includes(type as any);

const handleRequest = async (request: NextRequest) => {
  await connection();

  try {
    let generationType: GenerationType = GenerationType.DAILY; // Default

    if (request.method === 'GET') {
      // get type from query parameter
      const url = new URL(request.url);
      const typeParam = url.searchParams.get('type');

      if (typeParam && isValidGenerationType(typeParam)) {
        generationType = typeParam;
      }
    } else if (request.method === 'POST') {
      // get type from request body
      try {
        const body = await request.json();
        if (body.type && isValidGenerationType(body.type)) {
          generationType = body.type as GenerationType;
        }
      } catch {
        // if body parsing fails, use default
      }
    }

    const coloringImage = await generateColoringImageOnly(generationType);

    return NextResponse.json(
      {
        success: true,
        coloringImage,
        generationType,
        message: `Successfully generated ${generationType.toLowerCase()} coloring image`,
      },
      {
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error('Error generating coloring image:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate coloring image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
};

export const GET = handleRequest;
export const POST = handleRequest;
