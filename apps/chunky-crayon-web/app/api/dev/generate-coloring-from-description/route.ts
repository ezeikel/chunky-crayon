import { NextResponse, connection } from 'next/server';
import { GenerationType } from '@one-colored-pixel/db';
import { createColoringImage } from '@/app/actions/coloring-image';

export const maxDuration = 300;

/**
 * Dev-only: generate a coloring image from a given description.
 *
 * Unlike `/api/coloring-image/generate`, this accepts a caller-supplied
 * description instead of auto-generating one — useful for CLI scripts
 * that want to produce specific images (ads, test fixtures, etc.) without
 * fighting `server-only` imports from a plain Node process.
 *
 * Hard-gated to NODE_ENV=development unless a WORKER_SECRET bearer is sent.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/dev/generate-coloring-from-description \
 *     -H 'Content-Type: application/json' \
 *     -d '{"description":"a friendly dinosaur","generationType":"SYSTEM"}'
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    const auth = request.headers.get('authorization');
    if (!auth || auth !== `Bearer ${process.env.WORKER_SECRET}`) {
      return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }
  }

  await connection();

  const body = (await request.json().catch(() => ({}))) as {
    description?: string;
    generationType?: string;
  };

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json(
      { error: 'description is required' },
      { status: 400 },
    );
  }

  const rawType = body.generationType ?? GenerationType.USER;
  if (!Object.values(GenerationType).includes(rawType as GenerationType)) {
    return NextResponse.json(
      {
        error: `Invalid generationType: ${rawType}. Valid: ${Object.values(GenerationType).join(', ')}`,
      },
      { status: 400 },
    );
  }
  const generationType = rawType as GenerationType;

  const formData = new FormData();
  formData.append('description', description);
  formData.append('generationType', generationType);

  const start = Date.now();
  const result = await createColoringImage(formData);
  const elapsedMs = Date.now() - start;

  if ('error' in result && result.error) {
    return NextResponse.json(
      { error: result.error, elapsedMs },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    elapsedMs,
    id: result.id,
    title: result.title,
    description: result.description,
    url: result.url,
    svgUrl: result.svgUrl,
    qrCodeUrl: result.qrCodeUrl,
  });
}
