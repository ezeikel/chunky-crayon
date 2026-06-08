/**
 * Daily image cron pipeline (worker-owned, fire-and-forget).
 *
 * Mirrors the path apps/chunky-crayon-web/app/actions/coloring-image.ts
 * takes for `generationType=DAILY`. Vercel's /api/coloring-image/generate
 * is now a thin trigger that POSTs the worker's /generate/daily-image and
 * exits in <1s; this function does the actual work — scene gen → image
 * gen → metadata + SVG trace + WebP encode → DB row → R2 uploads → fire
 * region-store / background-music / colored-reference / fill-points.
 *
 * Failures alert via Resend. Never throws to the route.
 */

import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import sharp from "sharp";
import potrace from "oslllo-potrace";
import QRCode from "qrcode";
import OpenAI from "openai";
import { put, del } from "@one-colored-pixel/storage";
import {
  imageMetadataSchema,
  CLEAN_UP_DESCRIPTION_SYSTEM,
  createImageMetadataSystemPrompt,
  IMAGE_METADATA_PROMPT,
  judgeColoringImageDifficulty,
} from "@one-colored-pixel/coloring-core";
import { db, GenerationType, Brand } from "@one-colored-pixel/db";
import {
  getReferenceImages,
  createColoringImagePrompt,
} from "../blog/cc-image-prompts.js";
import { generateDailyScene } from "./daily-scene.js";
import { sendAdminAlert } from "../lib/email.js";

import { generateRegionStoreLocal } from "../record/region-store.js";
import { generateBackgroundMusicLocal } from "../record/background-music.js";
import { generateColoredReferenceLocal } from "../record/colored-reference.js";
import { generateFillPointsLocal } from "../record/fill-points.js";

const claudeModel = anthropic("claude-sonnet-4-5-20250929");
const visionModel = openai("gpt-5.2");

// =============================================================================
// Image generation (gpt-image-2 with reference images)
// =============================================================================

// Per-difficulty cache so different cron jobs / tiers don't share files.
// Daily cron always uses BEGINNER (social feed targets parents of
// toddlers), but the cache is keyed correctly in case a future caller
// passes a different tier through.
const referenceFilesCache = new Map<string, File[]>();

async function getReferenceFiles(
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" = "BEGINNER",
): Promise<File[]> {
  const urls = getReferenceImages(difficulty).slice(0, 4);
  const cacheKey = urls.join("|");
  const cached = referenceFilesCache.get(cacheKey);
  if (cached) return cached;
  const files = await Promise.all(
    urls.map(async (url, i) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `[daily-pipeline] failed to fetch reference image ${i}: ${response.statusText}`,
        );
      }
      const buf = await response.arrayBuffer();
      const ext = url.endsWith(".webp") ? "webp" : "png";
      return new File([buf], `style-ref-${i}.${ext}`, {
        type: `image/${ext}`,
      });
    }),
  );
  referenceFilesCache.set(cacheKey, files);
  return files;
}

async function generateImage(
  cleanedDescription: string,
): Promise<{ buffer: Buffer; tempUrl: string; tempFileName: string }> {
  const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.

${createColoringImagePrompt(cleanedDescription)}`;

  const styleFiles = await getReferenceFiles();

  const client = new OpenAI();

  // Retry once on timeout/transient OpenAI errors. Single retry is enough —
  // 2026-05-12 cron lost a day to a one-off `images.edit` hang at ~15min.
  const maxAttempts = 2;
  let lastErr: unknown;
  let b64: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await client.images.edit({
        model: "gpt-image-2",
        image: styleFiles,
        prompt: styledPrompt,
        size: "1024x1024",
        quality: "high",
      });
      b64 = result.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("[daily-pipeline] OpenAI returned no image");
      }
      break;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[daily-cron] gpt-image-2 attempt ${attempt}/${maxAttempts} failed: ${msg}`,
      );
      if (attempt === maxAttempts) break;
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }
  if (!b64) {
    throw lastErr instanceof Error
      ? lastErr
      : new Error("[daily-pipeline] gpt-image-2 failed after retries");
  }
  const buffer = Buffer.from(b64, "base64");
  const tempFileName = `temp/${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}.png`;
  const { url: tempUrl } = await put(tempFileName, buffer, {
    access: "public",
  });
  return { buffer, tempUrl, tempFileName };
}

// =============================================================================
// SVG trace (mirrors web utils/traceImage.ts)
// =============================================================================

function traceImage(imageBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    sharp(imageBuffer)
      .flatten({ background: "#ffffff" })
      .resize({ width: 1024 })
      .grayscale()
      .normalize()
      .linear(1.3, -40)
      .threshold(210)
      .toFormat("png")
      .toBuffer(async (err, pngBuffer) => {
        if (err) return reject(err);
        try {
          const traced = await potrace(Buffer.from(pngBuffer), {
            threshold: 200,
            optimizeImage: true,
            turnPolicy: "majority",
          }).trace();
          resolve(traced);
        } catch (potraceErr) {
          reject(potraceErr);
        }
      });
  });
}

// =============================================================================
// Pipeline orchestrator
// =============================================================================

export async function runDailyImageCron(): Promise<void> {
  let tempFileName: string | null = null;

  try {
    // 1. Pick a scene description (Perplexity Sonar + dedup + content blocklist)
    console.log("[daily-cron] generating scene description…");
    const description = await generateDailyScene();

    // 2. Clean up the description (Claude Sonnet)
    console.log("[daily-cron] cleaning description…");
    const { text: cleanedDescription } = await generateText({
      model: claudeModel,
      system: CLEAN_UP_DESCRIPTION_SYSTEM,
      prompt: description,
    });
    console.log(`[daily-cron] cleaned: "${cleanedDescription}"`);

    // 3. Generate the image (gpt-image-2)
    console.log("[daily-cron] generating image (gpt-image-2)…");
    const imageStart = Date.now();
    const {
      buffer: imageBuffer,
      tempUrl,
      tempFileName: tempFile,
    } = await generateImage(cleanedDescription);
    tempFileName = tempFile;
    console.log(`[daily-cron] image done in ${Date.now() - imageStart}ms`);

    // 4. Run metadata + trace + WebP encode + difficulty judge in parallel.
    //
    // Difficulty judge is wrapped in a catch — a flaky vendor must not
    // sink the cron. We default to BEGINNER if every judge errors, which
    // is what the DB column defaults to anyway. judgePromise resolves to
    // null on failure; we treat that as "leave at column default".
    console.log(
      "[daily-cron] running metadata + trace + webp + difficulty judge in parallel…",
    );
    const judgePromise = (async () => {
      try {
        const pngBuffer = await sharp(imageBuffer).png().toBuffer();
        return await judgeColoringImageDifficulty(pngBuffer);
      } catch (judgeErr) {
        const msg =
          judgeErr instanceof Error ? judgeErr.message : String(judgeErr);
        console.warn(`[daily-cron] difficulty judge failed: ${msg}`);
        return null;
      }
    })();
    const [metadataResult, svg, webpBuffer, difficultyResult] =
      await Promise.all([
        generateText({
          model: visionModel,
          output: Output.object({ schema: imageMetadataSchema }),
          system: createImageMetadataSystemPrompt(),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: IMAGE_METADATA_PROMPT },
                { type: "image", image: new URL(tempUrl) },
              ],
            },
          ],
        }),
        traceImage(imageBuffer),
        sharp(imageBuffer).webp().toBuffer(),
        judgePromise,
      ]);

    const imageMetadata = metadataResult.output;
    if (!imageMetadata) {
      throw new Error("[daily-cron] metadata generation returned no output");
    }
    console.log(
      `[daily-cron] metadata: title="${imageMetadata.title}" tags=${imageMetadata.tags.length}`,
    );
    if (difficultyResult) {
      console.log(
        `[daily-cron] difficulty: ${difficultyResult.difficulty} (${difficultyResult.source}) — ${difficultyResult.reasoning.slice(0, 80)}`,
      );
    }

    // 5. Insert DB row (needs metadata + difficulty)
    const coloringImage = await db.coloringImage.create({
      data: {
        title: imageMetadata.title,
        displayTitle: imageMetadata.displayTitle,
        description: imageMetadata.description,
        alt: imageMetadata.alt,
        tags: imageMetadata.tags,
        difficulty: difficultyResult?.difficulty ?? "BEGINNER",
        generationType: GenerationType.DAILY,
        sourcePrompt: description,
        brand: Brand.CHUNKY_CRAYON,
      },
    });
    console.log(`[daily-cron] DB row created: ${coloringImage.id}`);

    // 6. QR code (50ms, needs the row id)
    const qrCodeSvg = await QRCode.toString(
      `https://chunkycrayon.com?utm_source=${coloringImage.id}&utm_medium=pdf-qr-code&utm_campaign=coloring-image-pdf`,
      { type: "svg" },
    );
    const qrCodeSvgBuffer = Buffer.from(qrCodeSvg);
    const imageSvgBuffer = Buffer.from(svg);

    // 7. Upload PNG/SVG/QR in parallel
    const imageFileName = `uploads/coloring-images/${coloringImage.id}/image.webp`;
    const svgFileName = `uploads/coloring-images/${coloringImage.id}/image.svg`;
    const qrCodeFileName = `uploads/coloring-images/${coloringImage.id}/qr-code.svg`;
    const [
      { url: imageBlobUrl },
      { url: imageSvgBlobUrl },
      { url: qrCodeSvgBlobUrl },
    ] = await Promise.all([
      put(imageFileName, webpBuffer, { access: "public" }),
      put(svgFileName, imageSvgBuffer, { access: "public" }),
      put(qrCodeFileName, qrCodeSvgBuffer, { access: "public" }),
    ]);
    console.log(`[daily-cron] R2 uploads done`);

    // 8. Update row with URLs
    const updatedRow = await db.coloringImage.update({
      where: { id: coloringImage.id },
      data: {
        url: imageBlobUrl,
        svgUrl: imageSvgBlobUrl,
        qrCodeUrl: qrCodeSvgBlobUrl,
      },
    });

    // 9. Cleanup temp R2
    if (tempFileName) {
      await del(tempFileName).catch((cleanupErr) =>
        console.warn("[daily-cron] failed to clean up temp file:", cleanupErr),
      );
      tempFileName = null;
    }

    // 10. Fire derived-asset pipeline locally (in-process — no HTTP hop)
    //
    // Same set the web app's requestAllPipelineFromWorker triggers via HTTP.
    // We're already on the worker, so just call the local generators
    // directly. allSettled → one failure does not abort the others.
    console.log("[daily-cron] firing derived-asset pipeline…");
    const sceneContext = {
      title: updatedRow.title ?? "",
      description: updatedRow.description ?? "",
      tags: updatedRow.tags ?? [],
    };
    await Promise.allSettled([
      generateRegionStoreLocal(updatedRow.id, imageSvgBlobUrl, sceneContext),
      generateBackgroundMusicLocal(updatedRow.id),
      generateColoredReferenceLocal(updatedRow.id),
      generateFillPointsLocal(updatedRow.id),
    ]);

    console.log(
      `[daily-cron] success: id=${updatedRow.id} title="${imageMetadata.title}"`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[daily-cron] pipeline failed:", message, stack);

    // Best-effort temp cleanup if we got partway
    if (tempFileName) {
      await del(tempFileName).catch(() => {
        /* swallow — already in error path */
      });
    }

    await sendAdminAlert({
      subject: "Chunky Crayon: Daily image cron failed",
      body: `The daily-image cron pipeline threw on the worker.

Error: ${message}

Stack:
${stack ?? "(no stack)"}

Check Hetzner journalctl for the full trace:
  journalctl -u chunky-crayon-worker --since "1 hour ago" | grep daily-cron`,
    });
  }
}
