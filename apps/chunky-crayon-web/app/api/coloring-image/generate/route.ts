import { NextResponse } from 'next/server';

/**
 * Daily coloring-image cron — thin trigger.
 *
 * The full pipeline (Perplexity Sonar scene gen + Claude cleanup +
 * gpt-image-2 + metadata vision call + SVG trace + R2 upload + Prisma
 * row + region-store/background-music/colored-reference/fill-points)
 * lives on the Hetzner worker at POST /generate/daily-image. This route
 * is a thin trigger that returns 202 immediately.
 *
 * Worker handles failures via Resend admin alert — see
 * apps/chunky-crayon-worker/src/coloring-image/daily-pipeline.ts.
 *
 * Note: the legacy route accepted a `type` query param to switch
 * GenerationType. The worker endpoint is DAILY-specific. If we need
 * other generation types over HTTP later, add new worker endpoints
 * rather than re-introducing the on-Vercel pipeline here.
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

  const res = await fetch(`${workerUrl}/generate/daily-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
    },
    body: JSON.stringify({}),
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
        `[coloring-image/generate] worker rejected: ${status} ${body.slice(0, 200)}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: 'worker rejected daily-image trigger',
          workerStatus: status,
        },
        { status: 502, headers: corsHeaders },
      );
    }
    return NextResponse.json(
      {
        success: true,
        accepted: true,
        message: 'daily-image cron handed off to worker',
      },
      { status: 202, headers: corsHeaders },
    );
  } catch (err) {
    console.error('[coloring-image/generate] failed to reach worker:', err);
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
