/**
 * Kicks the Hetzner chunky-crayon-worker to produce today's demo reel
 * (Playwright recording of the actual create flow + Remotion compositing).
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

  // Fire the worker. We give it 45s of connect/read budget — enough for
  // the worker to accept the job, start Playwright, and respond with an
  // ack if we change it to async mode later. For now the worker is
  // synchronous so we'll time out here and rely on it writing demoReelUrl
  // independently. That's fine — we only need this cron to trigger the job.
  try {
    await fetch(`${workerUrl}/publish/reel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(45_000),
    }).catch((err) => {
      // Expected: AbortError / timeout once the worker enters the long
      // Playwright phase. That's our "fire and continue" signal.
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
    message: 'Worker triggered. It will write demoReelUrl when done.',
  });
};

export const GET = handleRequest;
export const POST = handleRequest;
