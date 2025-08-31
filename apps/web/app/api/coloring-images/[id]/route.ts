import { getColoringImage } from '@/app/actions';

export const GET = async (
  request: Request,
  props: { params: Promise<{ id: string }> },
) => {
  const params = await props.params;
  const { id } = params;

  return Response.json(
    { coloringImage: await getColoringImage(id) },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    },
  );
};
