import { NextResponse } from 'next/server';

/**
 * Daily content-reel cron — thin trigger.
 *
 * The full pipeline (DB pick via kind rotation + 30d dedup, ElevenLabs
 * voice gen, Remotion render of the appropriate Shock/Warm/Quiet
 * template, Satori cover, R2 upload, DB writeback) lives on the
 * Hetzner worker at POST /jobs/content-reel/pick-and-publish. This
 * route is a thin trigger that returns 202 immediately.
 *
 * Worker handles failures via console error logs (Resend admin alert
 * pending — TODO link to social digest's alerting once stable).
 *
 * Why on the worker, not here:
 *   - Long-running render (60-180s) blows Vercel's 60s function ceiling.
 *   - PlasmaShader needs WebGL via headless Chromium, only available
 *     on the Hetzner box.
 *   - DB pick + publish must be atomic from the worker's POV so two
 *     fast cron retries don't double-render the same row.
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

  const res = await fetch(`${workerUrl}/jobs/content-reel/pick-and-publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
    },
    body: JSON.stringify({ brand: 'CHUNKY_CRAYON' }),
    // 10s ack window — worker should respond 202 within that. Render
    // continues in the background after.
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, body };
};

const handle = async (request: Request): Promise<Response> => {
  const auth = request.headers.get('authorization');
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: corsHeaders },
    );
  }

  try {
    const { ok, status, body } = await fireWorker();
    if (!ok) {
      console.error(
        `[cron/content-reel/publish] worker rejected: ${status} ${body.slice(0, 200)}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: 'worker rejected pick-and-publish trigger',
          workerStatus: status,
        },
        { status: 502, headers: corsHeaders },
      );
    }
    return NextResponse.json(
      {
        success: true,
        accepted: true,
        message: 'content-reel cron handed off to worker',
      },
      { status: 202, headers: corsHeaders },
    );
  } catch (err) {
    console.error('[cron/content-reel/publish] failed to reach worker:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'failed to reach worker',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500, headers: corsHeaders },
    );
  }
};

export const GET = handle;
export const POST = handle;
