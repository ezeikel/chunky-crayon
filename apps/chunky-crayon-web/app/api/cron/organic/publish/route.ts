import { NextResponse } from 'next/server';

/**
 * Daily organic-content publish cron — thin, FLAG-GUARDED trigger.
 *
 * The full pipeline (pick today's approved OrganicPost via engine rotation
 * + dedup, then voice/render/cover/R2/writeback reusing the content-reel
 * renderer) runs on the Hetzner worker at POST
 * /jobs/organic/pick-and-publish. This route returns 202 immediately.
 *
 * GUARD: no-ops unless ORGANIC_CONTENT_ENGINE_ENABLED === 'true'. The
 * engine ships OFF so merging the feature never auto-posts to live
 * socials; flip the env var to go live.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const isEnabled = () => process.env.ORGANIC_CONTENT_ENGINE_ENABLED === 'true';

const fireWorker = async (): Promise<{
  ok: boolean;
  status: number;
  body: string;
}> => {
  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) throw new Error('CHUNKY_CRAYON_WORKER_URL not set');

  const res = await fetch(`${workerUrl}/jobs/organic/pick-and-publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
    },
    body: JSON.stringify({ brand: 'CHUNKY_CRAYON' }),
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

  if (!isEnabled()) {
    return NextResponse.json(
      { success: true, skipped: true, reason: 'organic engine disabled' },
      { status: 200, headers: corsHeaders },
    );
  }

  try {
    const { ok, status, body } = await fireWorker();
    if (!ok) {
      console.error(
        `[cron/organic/publish] worker rejected: ${status} ${body.slice(0, 200)}`,
      );
      return NextResponse.json(
        { success: false, error: 'worker rejected', workerStatus: status },
        { status: 502, headers: corsHeaders },
      );
    }
    return NextResponse.json(
      { success: true, accepted: true, message: 'organic publish handed off' },
      { status: 202, headers: corsHeaders },
    );
  } catch (err) {
    console.error('[cron/organic/publish] failed to reach worker:', err);
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
