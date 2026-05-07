import { NextResponse } from 'next/server';

/**
 * Weekly comic-strip cron — thin trigger.
 *
 * The full pipeline (Claude script + script QC + 4× gpt-image-2 panel
 * renders + per-panel vision QC + sharp 2x2 composite + R2 + Prisma row)
 * lives on the Hetzner worker at POST /generate/comic-strip. This route
 * is a thin trigger that returns 202 immediately so Vercel's cron
 * function stays under 1s.
 *
 * Worker handles failures via Resend admin alert — see
 * apps/chunky-crayon-worker/src/comic-strip/pipeline.ts.
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

  const res = await fetch(`${workerUrl}/generate/comic-strip`, {
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
        `[cron/comic-strip] worker rejected: ${status} ${body.slice(0, 200)}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: 'worker rejected comic-strip trigger',
          workerStatus: status,
        },
        { status: 502, headers: corsHeaders },
      );
    }
    return NextResponse.json(
      {
        success: true,
        accepted: true,
        message: 'comic-strip cron handed off to worker',
      },
      { status: 202, headers: corsHeaders },
    );
  } catch (err) {
    console.error('[cron/comic-strip] failed to reach worker:', err);
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
