/**
 * Kicks the Hetzner chunky-crayon-worker to produce today's demo reel
 * (Playwright recording of the actual create flow + Remotion compositing).
 *
 * Variants:
 *   ?variant=text   → /publish/reel       (default — types a prompt)
 *   ?variant=image  → /publish/image-reel (uploads a kid-safe stock photo)
 *
 * We DON'T await the worker's full 5-7 minute render — Vercel cron functions
 * cap at 300s and the worker can run longer. We fire the request, give the
 * worker enough time to at least accept the job, then return. The worker
 * writes `demoReelUrl` back to the coloringImage row when done, and the
 * per-platform post crons later pick it up.
 *
 * Expected env:
 *   CHUNKY_CRAYON_WORKER_URL   e.g. https://worker.chunkycrayon.com
 *   WORKER_SECRET              shared bearer with the worker
 *   CRON_SECRET                Vercel cron auth
 */
import { NextResponse, connection } from 'next/server';

export const maxDuration = 60;

type Variant = 'text' | 'image';

const WORKER_PATH_BY_VARIANT: Record<Variant, string> = {
  text: '/publish/reel',
  image: '/publish/image-reel',
};

const handleRequest = async (request: Request) => {
  await connection();

  // Cron auth
  const auth = request.headers.get('authorization');
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    return NextResponse.json(
      { error: 'CHUNKY_CRAYON_WORKER_URL not configured' },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const variantParam = url.searchParams.get('variant');
  const variant: Variant = variantParam === 'image' ? 'image' : 'text';
  const workerPath = WORKER_PATH_BY_VARIANT[variant];

  console.log(
    `[demo-reel/produce] triggering worker: ${workerUrl}${workerPath} (variant=${variant})`,
  );

  try {
    await fetch(`${workerUrl}${workerPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(45_000),
    }).catch((err) => {
      console.log(
        '[demo-reel/produce] worker fetch returned / timed out (expected):',
        err instanceof Error ? err.message : err,
      );
    });
  } catch (err) {
    console.error('[demo-reel/produce] unexpected error:', err);
  }

  return NextResponse.json({
    ok: true,
    variant,
    workerPath,
    message: 'Worker triggered. It will write demoReelUrl when done.',
  });
};

export const GET = handleRequest;
export const POST = handleRequest;
