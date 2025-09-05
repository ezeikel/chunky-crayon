import { checkSvgImage, retraceImage } from '@/utils/traceImage';
import { db } from '@chunky-crayon/db';

export const POST = async (req: Request) => {
  const { id } = await req.json();

  const coloringImage = await db.coloringImage.findUnique({
    where: { id },
    select: { svgUrl: true, url: true },
  });

  if (!coloringImage?.svgUrl || !coloringImage?.url) {
    return Response.json(
      { error: 'Coloring image not found or missing required URLs' },
      { status: 404 },
    );
  }

  const { isValid } = await checkSvgImage(coloringImage.svgUrl);

  if (!isValid) {
    const { svgUrl } = await retraceImage(id, coloringImage.url);
    return Response.json(
      { retraced: true, svgUrl },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        },
      },
    );
  }

  return Response.json(
    { retraced: false, svgUrl: coloringImage.svgUrl },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
    },
  );
};
