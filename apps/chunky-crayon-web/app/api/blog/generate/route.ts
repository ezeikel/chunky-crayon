import { NextResponse } from 'next/server';

/**
 * Daily blog cron — thin trigger.
 *
 * The full pipeline (Sanity covered-topic check, Claude meta + content +
 * image-prompt, gpt-image-2, Sanity asset upload, post create) lives on
 * the Hetzner worker at POST /generate/blog-post — it has no timeout and
 * gpt-image-2's ~3-4min latency exceeded Vercel's 300s ceiling. This
 * route just kicks off the worker job and returns 202.
 *
 * If the worker fails partway, it sends an admin alert via Resend — see
 * apps/chunky-crayon-worker/src/blog/pipeline.ts.
 *
 * `maxDuration` removed: the route exits in <1s now.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const fireWorker = async (): Promise<{
  ok: boolean;
  status: number;
  body: string;
}> => {
  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;

  if (!workerUrl) {
    throw new Error('CHUNKY_CRAYON_WORKER_URL not set');
  }

  const res = await fetch(`${workerUrl}/generate/blog-post`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
    },
    body: JSON.stringify({}),
    // 10s budget for the worker's 202 ack — we don't wait for the
    // pipeline to finish (worker handles that async + alerts on failure).
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, body };
};

const handle = async (): Promise<Response> => {
  try {
    const { ok, status, body } = await fireWorker();
    if (!ok) {
      console.error(
        `[blog/generate] worker rejected: ${status} ${body.slice(0, 200)}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: 'worker rejected blog cron trigger',
          workerStatus: status,
        },
        { status: 502, headers: corsHeaders },
      );
    }
    return NextResponse.json(
      {
        success: true,
        accepted: true,
        message: 'blog cron handed off to worker',
      },
      { status: 202, headers: corsHeaders },
    );
  } catch (err) {
    console.error('[blog/generate] failed to reach worker:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'failed to reach worker',
        details: err instanceof Error ? err.message : 'unknown',
      },
      { status: 502, headers: corsHeaders },
    );
  }
};

export const GET = handle;
export const POST = handle;
