import { NextResponse } from 'next/server';

/**
 * Recurring Parent Tips discovery cron — thin, FLAG-GUARDED trigger.
 *
 * Fires the worker's tips-discovery job (/jobs/organic/tips-discover), which
 * surfaces one fresh save-worthy parent tip via Perplexity, grounds +
 * verifies it against the real source, brand-safety gates it, and upserts an
 * OrganicPost (engine=DATASET). The publish cron later turns approved rows
 * into reels. This replaces the old hardcoded dataset ingest.
 *
 * GUARD: no-ops unless ORGANIC_CONTENT_ENGINE_ENABLED === 'true'.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const isEnabled = () => process.env.ORGANIC_CONTENT_ENGINE_ENABLED === 'true';

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

  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    return NextResponse.json(
      { success: false, error: 'CHUNKY_CRAYON_WORKER_URL not set' },
      { status: 500, headers: corsHeaders },
    );
  }

  try {
    const res = await fetch(`${workerUrl}/jobs/organic/tips-discover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      body: JSON.stringify({ brand: 'CHUNKY_CRAYON' }),
      signal: AbortSignal.timeout(55_000),
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(
      { success: res.ok, worker: body },
      { status: res.ok ? 200 : 502, headers: corsHeaders },
    );
  } catch (err) {
    console.error('[cron/organic/tips-discover] failed:', err);
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
