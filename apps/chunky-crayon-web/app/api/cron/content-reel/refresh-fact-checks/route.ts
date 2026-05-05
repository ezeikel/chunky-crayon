import { NextResponse } from 'next/server';

/**
 * Weekly content-reel fact-check refresh — thin trigger.
 *
 * Worker re-verifies any ContentReel where factCheckedAt > 180d old.
 * Items downgraded to LOW confidence or `recommendation: drop` go
 * inactive automatically (publish gate filters them).
 *
 * Worker endpoint: /jobs/content-reel/refresh-fact-checks. We DON'T
 * fire-and-forget here because the response includes the drops list
 * which is useful for admin alerting — but we cap the wait at 300s in
 * case the catalogue grows large. Real long-tail safety: worker logs
 * everything to console so even on timeout the operator can read the
 * breadcrumbs in Hetzner logs.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const maxDuration = 300;

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

  const res = await fetch(
    `${workerUrl}/jobs/content-reel/refresh-fact-checks`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(290_000),
    },
  );
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
        `[cron/content-reel/refresh-fact-checks] worker rejected: ${status} ${body.slice(0, 200)}`,
      );
      return NextResponse.json(
        { success: false, workerStatus: status, body },
        { status: 502, headers: corsHeaders },
      );
    }
    // Pass through worker's summary JSON so admin alerting can read it.
    let parsed: unknown = body;
    try {
      parsed = JSON.parse(body);
    } catch {
      /* worker returned non-JSON — surface as text */
    }
    return NextResponse.json(
      { success: true, summary: parsed },
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error(
      '[cron/content-reel/refresh-fact-checks] failed to reach worker:',
      err,
    );
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
