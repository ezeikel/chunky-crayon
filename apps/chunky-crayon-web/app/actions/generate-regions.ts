'use server';

import { put } from '@one-colored-pixel/storage';
import {
  generateRegionStoreLogic,
  DEFAULT_PALETTE_VARIANT_MODIFIERS,
  type GenerateRegionStoreResult,
} from '@one-colored-pixel/coloring-core';
import {
  REGION_FILL_POINTS_SYSTEM,
  createRegionFillPointsPrompt,
  GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
} from '@/lib/ai';
import { ALL_COLORING_COLORS_EXTENDED } from '@/constants';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';

/**
 * Region store config for Chunky Crayon. Uses the existing CC region fill
 * points prompt as the base and the shared default palette variant modifiers
 * (override per-variant here if CC ever needs a kid-specific twist).
 */
const regionStoreConfig = {
  gridColorMapSystem: GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
  regionFillPointsSystem: REGION_FILL_POINTS_SYSTEM,
  createRegionFillPointsPrompt,
  allColors: ALL_COLORING_COLORS_EXTENDED.map((c) => ({
    hex: c.hex,
    name: c.name,
  })),
  paletteVariantModifiers: DEFAULT_PALETTE_VARIANT_MODIFIERS,
};

/**
 * Generate the full region store for a coloring image and persist it.
 *
 * Pipeline:
 *   1. Fetch the traced SVG from R2
 *   2. Rasterise, detect regions, run 4 palette variants in parallel
 *   3. Upload the gzipped Uint16Array region map to R2
 *   4. Write regionMapUrl/Width/Height, regionsJson, regionsGeneratedAt to DB
 */
export async function generateRegionStore(
  coloringImageId: string,
  svgUrl: string,
  sceneContext?: { title: string; description: string; tags: string[] },
): Promise<GenerateRegionStoreResult> {
  // Fetch the traced SVG bytes
  const svgResponse = await fetch(svgUrl);
  if (!svgResponse.ok) {
    return {
      success: false,
      error: `Failed to fetch SVG: ${svgResponse.status} ${svgResponse.statusText}`,
    };
  }
  const svgBuffer = Buffer.from(await svgResponse.arrayBuffer());

  const result = await generateRegionStoreLogic(
    svgBuffer,
    regionStoreConfig,
    sceneContext,
  );

  if (!result.success) {
    return result;
  }

  // Upload the gzipped region map binary to R2
  const regionMapFileName = `uploads/coloring-images/${coloringImageId}/regions.bin.gz`;
  const { url: regionMapUrl } = await put(
    regionMapFileName,
    result.regionMapGzipped,
    {
      access: 'public',
      contentType: 'application/gzip',
      allowOverwrite: true,
    },
  );

  await db.coloringImage.update({
    where: { id: coloringImageId, brand: BRAND },
    data: {
      regionMapUrl,
      regionMapWidth: result.width,
      regionMapHeight: result.height,
      regionsJson: JSON.stringify(result.regionsJson),
      regionsGeneratedAt: new Date(),
    },
  });

  console.log(
    `[RegionStore] Saved region store for image ${coloringImageId}:`,
    `${result.regionsJson.regions.length} regions,`,
    `${result.regionMapGzipped.byteLength} gz bytes`,
  );

  return result;
}

/**
 * Lightweight server action: has this coloring image had its region store
 * populated yet? Used by ColoringArea to poll after initial page load when
 * the user lands on a freshly-created image (the post-create pipeline runs
 * region-store generation in parallel with the redirect).
 *
 * Deliberately skips 'use cache' so the client always sees fresh DB state.
 */
export async function checkRegionStoreReady(
  coloringImageId: string,
): Promise<{ ready: boolean }> {
  const t0 = Date.now();
  const row = await db.coloringImage.findFirst({
    where: { id: coloringImageId, brand: BRAND },
    select: { regionMapUrl: true, regionsGeneratedAt: true },
  });
  const elapsed = Date.now() - t0;
  const ready = !!row?.regionMapUrl;
  console.log(
    `[checkRegionStoreReady] id=${coloringImageId} ready=${ready} regionMapUrl=${row?.regionMapUrl ?? 'null'} regionsGeneratedAt=${row?.regionsGeneratedAt?.toISOString() ?? 'null'} queryMs=${elapsed}`,
  );
  return { ready };
}

/**
 * Ask the Hetzner worker to (re)generate the region store for an image.
 * Called by the client's retry button when the initial poll times out.
 *
 * Fire-and-forget — returns once the worker acknowledges (~10s budget).
 * The client's existing poll will pick up the new regionMapUrl once the
 * worker's background task completes (~60-90s for typical images).
 */
export async function requestRegionStoreRegeneration(
  coloringImageId: string,
): Promise<{ ok: boolean; error?: string }> {
  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    return { ok: false, error: 'Worker not configured' };
  }

  try {
    const res = await fetch(`${workerUrl}/generate/region-store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      body: JSON.stringify({ imageId: coloringImageId }),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text().catch(() => '');
    console.log(
      `[requestRegionStoreRegeneration] id=${coloringImageId} status=${res.status} body=${text.slice(0, 200)}`,
    );
    if (!res.ok && res.status !== 202) {
      return { ok: false, error: `Worker returned ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[requestRegionStoreRegeneration] id=${coloringImageId} failed:`,
      message,
    );
    return { ok: false, error: message };
  }
}
