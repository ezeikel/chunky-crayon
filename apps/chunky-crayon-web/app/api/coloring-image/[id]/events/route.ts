/**
 * SSE passthrough to the Hetzner worker's /sse/coloring-image/:id endpoint.
 *
 * Why a passthrough instead of having the browser hit the worker directly:
 *   - We need to auth-check the user. The worker has no knowledge of
 *     Vercel's session cookies; doing auth here keeps that boundary clean.
 *   - We attach the WORKER_SECRET bearer header so the worker's bearer
 *     guard passes. The browser never sees it.
 *   - We can fail-fast with 404 if the row doesn't belong to the user.
 *
 * Latency: the proxy adds one TCP hop (Vercel → Hetzner). Not measurable
 * in practice — the events themselves only fire on pg_notify, so the
 * extra hop is dwarfed by generation time.
 */
import { NextResponse } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { getUserId } from '@/app/actions/user';
import { ACTIONS } from '@/constants';

// Vercel Pro caps Serverless Function maxDuration at 300s. The worker's
// generation can run longer than that for complex images, but the
// browser's EventSource auto-reconnects on drop, so a 300s cap just
// means SSE silently reconnects every ~5 min. Each reconnect re-reads
// the row's current state via the `state` event, so the user never
// sees a regression — the partial image / status catches up.
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const GET = async (
  request: Request,
  { params }: RouteContext,
): Promise<Response> => {
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  // Ownership rules:
  //   - userId rows: only the owner can subscribe
  //   - null-userId rows (guest-created, community gallery): any caller
  //     can subscribe (consistent with how the rendered image is public)
  // This also catches typos / stale URLs cleanly with a 404.
  const row = await db.coloringImage.findUnique({
    where: { id },
    select: { userId: true, status: true },
  });
  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (row.userId && row.userId !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // If the row is already terminal we still proxy — the worker emits a
  // single state event then closes. Cheaper than a special-case branch
  // here, and keeps the client's reconnect logic simple.

  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    return NextResponse.json(
      { error: 'CHUNKY_CRAYON_WORKER_URL not set' },
      { status: 500 },
    );
  }

  const upstream = await fetch(
    `${workerUrl}/sse/coloring-image/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      // Forward client disconnects upstream so the worker can release its
      // shared LISTEN subscriber slot. Without this the worker would keep
      // the SSE handler alive until its 10-min hard cap.
      signal: request.signal,
    },
  );

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return NextResponse.json(
      {
        error: 'worker_sse_failed',
        status: upstream.status,
        body: text.slice(0, 300),
      },
      { status: 502 },
    );
  }

  // Pass the upstream stream straight through. We don't parse / re-encode
  // events here — the wire format is identical to what the browser wants.
  //
  // Wrap the upstream body in a TransformStream that swallows aborts so
  // mobile-network disconnects (4G→wifi handoff, screen lock) don't
  // raise "failed to pipe response" Sentry noise. Client disconnect is
  // the EXPECTED end of the stream, not an error. AbortError still
  // propagates to upstream via request.signal so the worker releases
  // its LISTEN subscriber slot — we just don't bubble it as a 5xx.
  const passthrough = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
    },
  });
  upstream.body.pipeTo(passthrough.writable).catch((err) => {
    // Aborts include client navigations away, mobile network drops, and
    // our own request.signal forwarding. None are real errors.
    if (err?.name === 'AbortError' || request.signal.aborted) {
      return;
    }
    console.warn('[sse-passthrough] upstream pipe error:', err);
  });

  return new Response(passthrough.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      // Disable Vercel/CDN buffering so events stream live.
      'X-Accel-Buffering': 'no',
    },
  });
};
