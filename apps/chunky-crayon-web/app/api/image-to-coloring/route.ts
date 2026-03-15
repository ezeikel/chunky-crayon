import { createColoringImageFromReference } from '@/app/actions/image-to-coloring';

export const maxDuration = 120; // Image-to-coloring can take up to 2 minutes

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const POST = async (request: Request) => {
  try {
    const { image, description, locale, skipAuth } = await request.json();

    if (!image || typeof image !== 'string') {
      return Response.json(
        { error: 'Image data is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const result = await createColoringImageFromReference(
      image,
      description,
      locale,
      skipAuth === true,
    );

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
    console.error(
      'Error generating coloring page from reference image:',
      error,
    );
    return Response.json(
      { error: 'Failed to generate coloring page from reference image' },
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
