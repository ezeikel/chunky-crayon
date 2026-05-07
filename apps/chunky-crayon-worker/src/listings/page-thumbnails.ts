/**
 * Loader for a bundle's persisted page line-art images. Used by Hero +
 * PageGrid templates to embed thumbnails as data URIs (Satori can't
 * fetch over the network).
 *
 * Pulls the 10 ColoringImage rows (bundleId match, ordered by bundleOrder)
 * + downloads each .webp from R2 + base64-encodes for inline embedding.
 *
 * Module-level cache by bundleId keeps batch renders cheap. Manual cache
 * bust via `clearThumbnailCache(bundleId)` if a page is regenerated.
 */

import { db } from "@one-colored-pixel/db";
import sharp from "sharp";

export type PageThumbnail = {
  bundleOrder: number; // 1-indexed
  dataUri: string;
  url: string; // canonical R2 URL (for ref / debug)
};

// Resize thumbnails before embedding to keep Satori's per-render budget
// tight. Hero displays them at ≤480px; PageGrid at ~570px. 600px max
// preserves quality without bloating the inline base64.
const THUMB_MAX_PX = 600;

const _cache = new Map<string, PageThumbnail[]>();

export async function loadBundlePageThumbnails(
  bundleId: string,
): Promise<PageThumbnail[]> {
  const cached = _cache.get(bundleId);
  if (cached) return cached;

  const rows = await db.coloringImage.findMany({
    where: {
      bundleId,
      status: "READY",
    },
    select: { bundleOrder: true, url: true },
    orderBy: { bundleOrder: "asc" },
  });

  const thumbs = await Promise.all(
    rows
      .filter(
        (r): r is { bundleOrder: number; url: string } =>
          r.bundleOrder !== null && r.url !== null,
      )
      .map(async (r) => {
        const res = await fetch(r.url);
        if (!res.ok) {
          throw new Error(
            `[thumbnails] fetch failed for page ${r.bundleOrder}: ${res.status} (${r.url})`,
          );
        }
        const raw = Buffer.from(await res.arrayBuffer());
        // Always normalise to PNG before inlining. Satori's webp decoding
        // path raised "u is not iterable" on the page .webp files we
        // generated through sharp earlier — converting upstream sidesteps
        // the issue, and PNG is the safe-everywhere format for Satori.
        const png = await sharp(raw)
          .resize({ width: THUMB_MAX_PX, withoutEnlargement: true })
          .png()
          .toBuffer();
        return {
          bundleOrder: r.bundleOrder,
          url: r.url,
          dataUri: `data:image/png;base64,${png.toString("base64")}`,
        };
      }),
  );

  _cache.set(bundleId, thumbs);
  return thumbs;
}

export function clearThumbnailCache(bundleId?: string): void {
  if (bundleId) _cache.delete(bundleId);
  else _cache.clear();
}
