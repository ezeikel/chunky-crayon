/**
 * Hetzner worker request helpers.
 *
 * Each helper POSTs to the corresponding /generate/* endpoint on the
 * chunky-crayon-worker (deployed to the Hetzner box) and returns the
 * fetch promise so the caller can await the 202 ack. The worker
 * persists post-creation pipeline work to the DB on its own — these
 * calls just kick off the background work; we never wait for the actual
 * AI/storage operations to complete here.
 *
 * Used by createColoringImage (action) + createColoringImageFromPhoto
 * (action) + the ad-image backfill script — anywhere a coloring image
 * is created and we need its derived assets generated.
 *
 * If CHUNKY_CRAYON_WORKER_URL isn't set, logs and returns. The image
 * still gets created — derived assets just won't be generated until a
 * subsequent retrigger (admin "regenerate" UI etc.).
 *
 * IMPORTANT: callers should `await requestAllPipelineFromWorker()`
 * BEFORE returning the response from a server action. Earlier we kicked
 * these off inside Vercel `after()` (best-effort, frequently dropped on
 * CPU contention). The synchronous-await pattern adds ~200-400ms (just
 * the parallel TCP/header round-trip to Hetzner) but guarantees the
 * worker actually receives the request before the function is allowed
 * to terminate.
 */

const fireWorkerGenerate = async (
  endpoint: string,
  imageId: string,
  label: string,
): Promise<void> => {
  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    console.error(
      `[${label}] CHUNKY_CRAYON_WORKER_URL not set — cannot request worker generation for ${imageId}`,
    );
    return;
  }
  try {
    const res = await fetch(`${workerUrl}/generate/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      body: JSON.stringify({ imageId }),
      // 10s budget for the worker's 202 ack — we don't wait for the
      // generation to actually finish (worker handles that async).
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text().catch(() => '');
    console.log(
      `[${label}] worker response for ${imageId}: ${res.status} ${text.slice(0, 200)}`,
    );
  } catch (err) {
    console.error(
      `[${label}] worker request for ${imageId} failed:`,
      err instanceof Error ? err.message : err,
    );
  }
};

export const requestRegionStoreFromWorker = (imageId: string): Promise<void> =>
  fireWorkerGenerate('region-store', imageId, 'region-store');

export const requestBackgroundMusicFromWorker = (
  imageId: string,
): Promise<void> =>
  fireWorkerGenerate('background-music', imageId, 'background-music');

export const requestColoredReferenceFromWorker = (
  imageId: string,
): Promise<void> =>
  fireWorkerGenerate('colored-reference', imageId, 'colored-reference');

export const requestFillPointsFromWorker = (imageId: string): Promise<void> =>
  fireWorkerGenerate('fill-points', imageId, 'fill-points');

/**
 * Fire ALL post-creation pipeline endpoints for a coloring image,
 * awaiting the 4 acks in parallel. Resolves once all 4 have either
 * acked or failed (Promise.allSettled — one failure does not abort the
 * others).
 *
 * Caller should `await` this BEFORE returning the response from the
 * server action so the dangling fetches can't be killed by Vercel's
 * function-recycle behaviour.
 *
 * Use after creating a row via createColoringImage / photo-to-coloring,
 * OR the backfill-ad-images-to-prod script's raw INSERT (which
 * previously skipped the pipeline entirely).
 */
export const requestAllPipelineFromWorker = async (
  imageId: string,
): Promise<void> => {
  await Promise.allSettled([
    requestRegionStoreFromWorker(imageId),
    requestFillPointsFromWorker(imageId),
    requestColoredReferenceFromWorker(imageId),
    requestBackgroundMusicFromWorker(imageId),
  ]);
};
