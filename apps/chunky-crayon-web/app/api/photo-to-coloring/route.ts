import { createColoringImageFromPhoto } from '@/app/actions/photo-to-coloring';

export const maxDuration = 120; // Photo-to-coloring can take up to 2 minutes

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const POST = async (request: Request) => {
  try {
    const { image, locale } = await request.json();

    if (!image || typeof image !== 'string') {
      return Response.json(
        { error: 'Image data is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await createColoringImageFromPhoto(image, locale);

    // Check if it's an error result
    if ('error' in result) {
      return Response.json(
        { error: result.error },
        { status: 500, headers: corsHeaders },
      );
    }

    // Success - return the coloring image
    return Response.json({ coloringImage: result }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error generating coloring page from photo:', error);
    return Response.json(
      { error: 'Failed to generate coloring page from photo' },
      { status: 500, headers: corsHeaders },
    );
  }
};

export const OPTIONS = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
