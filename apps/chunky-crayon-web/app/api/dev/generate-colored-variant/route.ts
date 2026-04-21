import { NextResponse, connection } from 'next/server';
import OpenAI from 'openai';
import { put } from '@one-colored-pixel/storage';

export const maxDuration = 300;

/**
 * Dev-only: given the URL of a line-art coloring page, generate a "colored
 * in by a child with crayons" variant via GPT Image 1.5 `images.edit`.
 *
 * Used by scripts/generate-ad-assets.ts to produce the "after" panel of the
 * before-after ad template. Writes the result to R2 under
 * `uploads/ad-variants/<id>-colored.png` and returns the public URL.
 *
 * Hard-gated to NODE_ENV=development unless a WORKER_SECRET bearer is sent.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/dev/generate-colored-variant \
 *     -H 'Content-Type: application/json' \
 *     -d '{"imageUrl":"https://.../image.webp","id":"cmo..."}'
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
    imageUrl?: string;
    id?: string;
  };

  const imageUrl = body.imageUrl?.trim();
  const id = body.id?.trim();

  if (!imageUrl) {
    return NextResponse.json(
      { error: 'imageUrl is required' },
      { status: 400 },
    );
  }
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const start = Date.now();

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    return NextResponse.json(
      { error: `Failed to fetch source image: ${imageResponse.status}` },
      { status: 400 },
    );
  }
  const buffer = await imageResponse.arrayBuffer();
  const ext = imageUrl.endsWith('.webp') ? 'webp' : 'png';
  const sourceFile = new File([buffer], `source.${ext}`, {
    type: `image/${ext}`,
  });

  const prompt = `Take this black-and-white line-art coloring page and produce the exact same image, same composition and line work, but colored in as if by a happy young child using wax crayons. Cheerful bright colors. Slightly imperfect colouring — a little outside the lines in places, uneven saturation, visible crayon texture. Keep all the original outlines visible on top of the color. White paper background unchanged.`;

  const client = new OpenAI();
  let result;
  try {
    result = await client.images.edit({
      model: 'gpt-image-1',
      image: [sourceFile],
      prompt,
      size: '1024x1024',
      quality: 'high',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `GPT Image edit failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 },
    );
  }

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    return NextResponse.json(
      { error: 'GPT Image did not return an image' },
      { status: 500 },
    );
  }

  const outBuffer = Buffer.from(b64, 'base64');
  const key = `uploads/ad-variants/${id}-colored.png`;

  const { url } = await put(key, outBuffer, {
    contentType: 'image/png',
  });

  return NextResponse.json({
    success: true,
    elapsedMs: Date.now() - start,
    url,
  });
}
