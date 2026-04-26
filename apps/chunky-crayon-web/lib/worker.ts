/**
 * Hetzner worker fire-and-forget request helpers.
 *
 * Each helper POSTs to the corresponding /generate/* endpoint on the
 * chunky-crayon-worker (deployed to the Hetzner box) and returns
 * immediately without awaiting the worker's response. The worker
 * persists post-creation pipeline work to the DB on its own (no Vercel
 * after() drops, no serverless timeout).
 *
 * Used by createColoringImage (action) + createColoringImageFromPhoto
 * (action) + the ad-image backfill script — anywhere a coloring image
 * is created and we need its derived assets generated.
 *
 * If CHUNKY_CRAYON_WORKER_URL isn't set, logs and returns. The image
 * still gets created — derived assets just won't be generated until a
 * subsequent retrigger (admin "regenerate" UI etc.).
 */

const fireWorkerGenerate = (
  endpoint: string,
  imageId: string,
  label: string,
): void => {
  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    console.error(
      `[${label}] CHUNKY_CRAYON_WORKER_URL not set — cannot request worker generation for ${imageId}`,
    );
    return;
  }
  fetch(`${workerUrl}/generate/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
    },
    body: JSON.stringify({ imageId }),
    // 10s budget for the worker's 202 ack — we don't wait for the
    // generation to actually finish (worker handles that async).
    signal: AbortSignal.timeout(10_000),
  })
    .then(async (res) => {
      const text = await res.text().catch(() => '');
      console.log(
        `[${label}] worker response for ${imageId}: ${res.status} ${text.slice(0, 200)}`,
      );
    })
    .catch((err) => {
      console.error(
        `[${label}] worker request for ${imageId} failed:`,
        err instanceof Error ? err.message : err,
      );
    });
};

export const requestRegionStoreFromWorker = (imageId: string): void =>
  fireWorkerGenerate('region-store', imageId, 'region-store');

export const requestAmbientSoundFromWorker = (imageId: string): void =>
  fireWorkerGenerate('ambient-sound', imageId, 'ambient-sound');

export const requestColoredReferenceFromWorker = (imageId: string): void =>
  fireWorkerGenerate('colored-reference', imageId, 'colored-reference');

export const requestFillPointsFromWorker = (imageId: string): void =>
  fireWorkerGenerate('fill-points', imageId, 'fill-points');

/**
 * Fire ALL post-creation pipeline endpoints for a coloring image.
 *
 * Use after creating a row via createColoringImage's after() hook, the
 * photo-to-coloring action's after() hook, OR the
 * backfill-ad-images-to-prod script's raw INSERT (which previously
 * skipped the pipeline entirely).
 *
 * Each call is fire-and-forget — they kick off in parallel and return
 * immediately.
 */
export const requestAllPipelineFromWorker = (imageId: string): void => {
  requestRegionStoreFromWorker(imageId);
  requestFillPointsFromWorker(imageId);
  requestColoredReferenceFromWorker(imageId);
  requestAmbientSoundFromWorker(imageId);
};
