import { getColoringImage } from '@/app/data/coloring-image';

export const GET = async (
  request: Request,
  props: { params: Promise<{ id: string }> },
) => {
  return Response.json(
    { coloringImage: await getColoringImage(props.params) },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    },
  );
};
