/**
 * In-process region-store generation for the worker.
 *
 * The CC web app runs this during its after() server-action hook, but on
 * Vercel Pro that's capped at 300s which isn't enough for complex images
 * (500+ regions, 4 parallel AI palette variants). Running here on the
 * Hetzner box has no timeout, plenty of RAM, and the worker already holds
 * the DB + R2 credentials.
 *
 * Ported from apps/chunky-crayon-web/app/actions/generate-regions.ts.
 * Keep prompts + palette in sync with the web app's copy if they change.
 */
import { put } from "@one-colored-pixel/storage";
import {
  generateRegionStoreLogic,
  type GenerateRegionStoreResult,
} from "@one-colored-pixel/coloring-core";
import { db, Brand } from "@one-colored-pixel/db";
import { regionStoreConfig } from "./_prompts.js";

/**
 * Generate the region store for a coloring image and persist it.
 * Mirrors the CC web app's generateRegionStore server action but runs
 * in-process on the worker.
 */
export async function generateRegionStoreLocal(
  coloringImageId: string,
  svgUrl: string,
  sceneContext?: { title: string; description: string; tags: string[] },
): Promise<GenerateRegionStoreResult> {
  console.log(
    `[region-store] starting generation for ${coloringImageId} (${svgUrl})`,
  );

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
    console.error(
      `[region-store] generation failed for ${coloringImageId}:`,
      result.error,
    );
    return result;
  }

  // R2 and Prisma have historically hung silently on the Hetzner worker
  // when CPU+network is saturated (browser + Remotion + 4 parallel AI
  // calls all running concurrently). Wrap each with an explicit timeout
  // + log so we fail loudly instead of dying quietly.
  const withTimeout = <T>(p: Promise<T>, ms: number, label: string) =>
    Promise.race<T>([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        ),
      ),
    ]);

  const regionMapFileName = `uploads/coloring-images/${coloringImageId}/regions.bin.gz`;
  console.log(
    `[region-store] uploading region map to R2 for ${coloringImageId} (${result.regionMapGzipped.byteLength} bytes)`,
  );
  const { url: regionMapUrl } = await withTimeout(
    put(regionMapFileName, result.regionMapGzipped, {
      access: "public",
      contentType: "application/gzip",
      allowOverwrite: true,
    }),
    60_000,
    "R2 put regions.bin.gz",
  );
  console.log(`[region-store] R2 upload done: ${regionMapUrl}`);

  // Retry the DB write — the Playwright+Remotion flow can starve the event
  // loop during 3-min CPU-heavy region gen, which starves the Prisma-Neon
  // keepalive ping, which lets Neon drop the WebSocket. The first write
  // then hangs on a dead socket and hits our 30s timeout. Retrying forces
  // Prisma to tear down the dead connection and establish a fresh one.
  //
  // 3 attempts with backoff (1s, 3s) — plenty for a transient socket
  // issue, still fails fast if something genuinely broken.
  console.log(`[region-store] writing DB row for ${coloringImageId}`);
  const writeDb = () =>
    db.coloringImage.update({
      where: { id: coloringImageId, brand: Brand.CHUNKY_CRAYON },
      data: {
        regionMapUrl,
        regionMapWidth: result.width,
        regionMapHeight: result.height,
        regionsJson: JSON.stringify(result.regionsJson),
        regionsGeneratedAt: new Date(),
      },
    });

  const maxAttempts = 3;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await withTimeout(
        writeDb(),
        30_000,
        `db.coloringImage.update attempt ${attempt}/${maxAttempts}`,
      );
      lastError = null;
      if (attempt > 1) {
        console.log(
          `[region-store] DB write succeeded on attempt ${attempt} for ${coloringImageId}`,
        );
      }
      break;
    } catch (err) {
      lastError = err;
      console.warn(
        `[region-store] DB write attempt ${attempt}/${maxAttempts} failed for ${coloringImageId}:`,
        err instanceof Error ? err.message : err,
      );
      if (attempt < maxAttempts) {
        // Force the engine to drop the stale connection so the next call
        // establishes a new socket. $disconnect is safe even if mid-query
        // because we've already caught the timeout.
        await db.$disconnect().catch(() => {});
        await new Promise((r) => setTimeout(r, attempt * 2_000));
      }
    }
  }
  if (lastError) {
    throw lastError;
  }

  console.log(
    `[region-store] saved for ${coloringImageId}: ${result.regionsJson.regions.length} regions, ${result.regionMapGzipped.byteLength} gz bytes`,
  );

  return result;
}
