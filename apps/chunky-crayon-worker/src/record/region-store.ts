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
import { getPgPool } from "../lib/pgPool.js";

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

  // Bypass Prisma for this write. The PrismaNeon WebSocket adapter goes
  // half-open after the event loop stalls during the 3-min region-gen
  // burst (4 palette variants run serially via Gemini). When that
  // happens, db.coloringImage.update hangs on the dead socket
  // indefinitely, and the documented "$disconnect + retry" pattern
  // doesn't recover because $disconnect itself waits for pending
  // queries on the same dead socket.
  //
  // Solution: use a direct pg.Pool against DATABASE_URL_DIRECT for this
  // one write. pg.Pool acquires a fresh TCP connection per query, so a
  // stale connection from a prior burst doesn't affect new writes.
  // The Prisma client stays as-is for everything else.
  //
  // Falls back to the Prisma path with retries if the direct pool fails
  // for any reason (e.g. DATABASE_URL_DIRECT misconfigured).
  console.log(`[region-store] writing DB row for ${coloringImageId}`);

  try {
    const pool = getPgPool();
    await withTimeout(
      pool.query(
        `UPDATE coloring_images
           SET "regionMapUrl" = $1,
               "regionMapWidth" = $2,
               "regionMapHeight" = $3,
               "regionsJson" = $4,
               "regionsGeneratedAt" = NOW()
         WHERE id = $5 AND brand = $6`,
        [
          regionMapUrl,
          result.width,
          result.height,
          JSON.stringify(result.regionsJson),
          coloringImageId,
          Brand.CHUNKY_CRAYON,
        ],
      ),
      30_000,
      "pgPool UPDATE coloring_images regions",
    );
  } catch (directErr) {
    console.warn(
      `[region-store] direct pg write failed for ${coloringImageId}, falling back to Prisma:`,
      directErr instanceof Error ? directErr.message : directErr,
    );

    // Fallback path — same retry-with-disconnect logic as before.
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
          `db.coloringImage.update fallback attempt ${attempt}/${maxAttempts}`,
        );
        lastError = null;
        if (attempt > 1) {
          console.log(
            `[region-store] Prisma fallback DB write succeeded on attempt ${attempt} for ${coloringImageId}`,
          );
        }
        break;
      } catch (err) {
        lastError = err;
        console.warn(
          `[region-store] Prisma fallback attempt ${attempt}/${maxAttempts} failed for ${coloringImageId}:`,
          err instanceof Error ? err.message : err,
        );
        if (attempt < maxAttempts) {
          await db.$disconnect().catch(() => {});
          await new Promise((r) => setTimeout(r, attempt * 2_000));
        }
      }
    }
    if (lastError) {
      throw lastError;
    }
  }

  console.log(
    `[region-store] saved for ${coloringImageId}: ${result.regionsJson.regions.length} regions, ${result.regionMapGzipped.byteLength} gz bytes`,
  );

  return result;
}
