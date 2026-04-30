/**
 * Worker → Vercel cache invalidation hop.
 *
 * The web app's `getColoringImageBase` is `'use cache'` with cacheLife max.
 * When the worker writes new fields to Postgres directly (svgUrl, regionMapUrl,
 * fillPointsJson, etc.) Vercel never sees the update and keeps serving the
 * stale snapshot — the page polls forever and never sees backgroundMusicUrl /
 * regionMapUrl populated.
 *
 * Each writer that mutates a coloringImage row calls this after their DB
 * UPDATE so the next page request reads fresh data. Best-effort; we log on
 * failure but don't block the worker job.
 *
 * Auth: Bearer WORKER_SECRET. Vercel route only enforces if the env var is
 * set; in dev we leave it set so worker + web are symmetric.
 */
export const revalidateVercelCache = async (
  coloringImageId: string,
  context: string,
): Promise<void> => {
  const ccOrigin = process.env.CC_ORIGIN;
  if (!ccOrigin) {
    console.warn(
      `[${context}] CC_ORIGIN not set; skipping cache revalidation for ${coloringImageId}`,
    );
    return;
  }
  const secret = process.env.WORKER_SECRET;
  try {
    const res = await fetch(
      `${ccOrigin}/api/coloring-image/${coloringImageId}/revalidate`,
      {
        method: "POST",
        headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      },
    );
    if (!res.ok) {
      console.warn(
        `[${context}] revalidate ${coloringImageId} → ${res.status}: ${await res.text().catch(() => "")}`,
      );
    }
  } catch (err) {
    console.warn(`[${context}] revalidate ${coloringImageId} threw:`, err);
  }
};
