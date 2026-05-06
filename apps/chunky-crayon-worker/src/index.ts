import "dotenv/config";
// MUST stay above every other import. @sentry/node patches the runtime on
// init (HTTP, fs, etc.) — anything imported before this won't be traced.
import { Sentry } from "./instrument.js";
import { Hono, type Context } from "hono";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { recordColoringSession } from "./record/session.js";
import { recordImageColoringSession } from "./record/image-session.js";
import {
  renderDemoReel,
  renderImageDemoReel,
  renderTextDemoReelV2,
  renderImageDemoReelV2,
  renderVoiceDemoReelV2,
} from "./video/render.js";
import { trimWebmToMp4, trimReelForStory } from "./record/trim.js";
import { generateRegionStoreLocal } from "./record/region-store.js";
import { generateBackgroundMusicLocal } from "./record/background-music.js";
import { generateColoredReferenceLocal } from "./record/colored-reference.js";
import { generateFillPointsLocal } from "./record/fill-points.js";
import { revalidateVercelCache } from "./coloring-image/revalidate.js";
import { db } from "@one-colored-pixel/db";
import { put } from "@one-colored-pixel/storage";
import { generateReelScript } from "./script/generate.js";
import { shortenPromptForReel } from "./script/short-prompt.js";
import { generateVoiceClip } from "./voice/elevenlabs.js";
import {
  buildVoiceReelFixtures,
  synthesiseVoiceAnswers,
} from "./voice/voice-reel-fixtures.js";
import { proxyToLocal } from "./video/v2/proxy.js";
import { buildDemoReelCover } from "./video/v2/cover.js";
import { pickBestPalette } from "./video/v2/palette.js";
import { streamSSE } from "hono/streaming";
import {
  streamColoringImage,
  type StreamColoringImageInput,
} from "./coloring-image/stream.js";
import {
  startColoringImageJob,
  type StartJobInput,
} from "./coloring-image/jobs.js";
import { subscribe } from "./coloring-image/listener.js";
import { runBlogCron } from "./blog/pipeline.js";
import { runDailyImageCron } from "./coloring-image/daily-pipeline.js";
import {
  generateBundlePage,
  BundlePageQAFailedError,
} from "./bundles/generate-page.js";
import { generateAllBundlePages } from "./bundles/generate-all.js";
import { getBundleProfile } from "@one-colored-pixel/coloring-core";

const WORKER_OUT_DIR = "/tmp/chunky-crayon-worker";

// Section pacing — keep in sync with DemoReel.tsx.
const INTRO_SECS = 2.0;
const OUTRO_SECS = 2.0;
// Post-submit padding — a short tail on the typing clip so the viewer sees
// the submit click register before we cut to the reveal.
const POST_SUBMIT_PAD_SECS = 0.4;
// Post-sweep padding — brief hold on the finished coloured image.
const POST_SWEEP_PAD_SECS = 1.5;

const app = new Hono();
app.use("*", logger());

// Catch any uncaught error from a route handler and forward to Sentry
// before returning the 500. Without this, Hono swallows + logs but
// nothing reaches our error tracker — exactly the visibility gap that
// hid the silent region-store/fillPoints failures.
app.onError((err, c) => {
  Sentry.captureException(err, {
    extra: {
      method: c.req.method,
      path: c.req.path,
      url: c.req.url,
    },
  });
  console.error(`[onError] ${c.req.method} ${c.req.path}:`, err);
  return c.json(
    {
      error: err instanceof Error ? err.message : "Internal server error",
    },
    500,
  );
});

// Bearer auth for /publish/* and /generate/* — only trusted callers
// (crons + the CC web app's after() hook) should hit these.
const bearerAuth = async (
  c: Context,
  next: () => Promise<void>,
): Promise<Response | void> => {
  const secret = process.env.WORKER_SECRET;
  if (!secret) return next(); // local dev convenience
  if (c.req.header("authorization") !== `Bearer ${secret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
};
app.use("/publish/*", bearerAuth);
app.use("/generate/*", bearerAuth);
// /jobs/* is the canvas-as-loader pipeline trigger (Vercel POSTs after
// inserting the GENERATING row). /sse/* is the browser-facing streaming
// endpoint — it sees the worker through a Vercel SSE passthrough that
// already auth-checks the user, so /sse here trusts that proxy. Bearer
// covers /sse anyway in case anything else tries to hit it directly.
app.use("/jobs/*", bearerAuth);
app.use("/sse/*", bearerAuth);

app.get("/health", (c) =>
  c.json({ status: "ok", service: "chunky-crayon-worker" }),
);

// Serve files from the worker output dir with Range support — Remotion's
// headless Chromium needs this to load locally-generated webm/mp3 during
// render (file:// is blocked as cross-origin).
app.get("/tmp/:filename", async (c) => {
  const filename = c.req.param("filename");
  const filePath = `${WORKER_OUT_DIR}/${filename}`;
  try {
    const stats = await stat(filePath);
    const data = await readFile(filePath);
    const ext = filename.split(".").pop() ?? "";
    const contentType =
      ext === "mp4"
        ? "video/mp4"
        : ext === "webm"
          ? "video/webm"
          : ext === "mp3"
            ? "audio/mpeg"
            : ext === "wav"
              ? "audio/wav"
              : ext === "svg"
                ? "image/svg+xml"
                : ext === "webp"
                  ? "image/webp"
                  : ext === "jpg" || ext === "jpeg"
                    ? "image/jpeg"
                    : ext === "png"
                      ? "image/png"
                      : ext === "gz"
                        ? "application/gzip"
                        : ext === "json"
                          ? "application/json"
                          : "application/octet-stream";

    const range = c.req.header("range");
    if (range && (ext === "mp4" || ext === "webm")) {
      const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stats.size - 1;
      const chunk = data.subarray(start, end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stats.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunk.length.toString(),
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stats.size.toString(),
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

/**
 * Fire-and-forget region store generation for a freshly-created coloring
 * image. Returns 202 immediately and runs generation in the background so
 * the calling serverless function (CC web after() hook) can exit.
 *
 * The CC web app used to do this inline in after(), but Vercel's CPU
 * contention silently drops long after() tasks — see the `cmo72yn9k…`
 * incident (image 2h old, no region store, no logs). Hetzner box has no
 * timeout, no drops, and persists until the DB write lands.
 *
 * On success: writes regionMapUrl/regionsJson/regionsGeneratedAt to DB.
 * The client's existing checkRegionStoreReady poll picks it up.
 *
 * POST /generate/region-store
 * Body: { imageId: string }
 */
app.post("/generate/region-store", async (c) => {
  const body = await c.req
    .json<{ imageId?: string }>()
    .catch(() => ({ imageId: undefined }));
  const imageId = body.imageId;
  if (!imageId) {
    return c.json({ error: "imageId is required" }, 400);
  }

  // Quick existence check. We DON'T require svgUrl here — it may still be
  // being generated by CC (create flow traces raster → uploads SVG → only
  // then completes, ~90-180s). The background task below polls for it.
  const image = await db.coloringImage.findFirst({
    where: { id: imageId },
    select: { id: true, regionMapUrl: true },
  });
  if (!image) {
    return c.json({ error: `Image ${imageId} not found` }, 404);
  }
  if (image.regionMapUrl) {
    return c.json({ ok: true, already_generated: true });
  }

  // Kick off the actual work. We don't await — return 202 to the caller
  // right away. The background task polls for svgUrl, generates, writes.
  void (async () => {
    const keepaliveTimer = setInterval(() => {
      db.$queryRaw`SELECT 1`.catch((err) => {
        console.warn(
          "[region-store keepalive] Neon ping failed:",
          err instanceof Error ? err.message : err,
        );
      });
    }, 60_000);

    try {
      // Wait for svgUrl — CC's create flow traces the raster to SVG after
      // the image row is inserted. In prod this takes 90-180s. Poll up
      // to 4 min before giving up.
      console.log(`[generate/region-store] waiting for svgUrl: ${imageId}`);
      const pollUntil = Date.now() + 4 * 60_000;
      let row: {
        svgUrl: string | null;
        title: string | null;
        description: string | null;
        tags: string[];
      } | null = null;
      while (Date.now() < pollUntil) {
        row = await db.coloringImage.findUnique({
          where: { id: imageId },
          select: {
            svgUrl: true,
            title: true,
            description: true,
            tags: true,
          },
        });
        if (row?.svgUrl) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!row?.svgUrl) {
        console.error(
          `[generate/region-store] svgUrl never appeared for ${imageId} after 4min — aborting`,
        );
        return;
      }

      console.log(
        `[generate/region-store] start imageId=${imageId} title="${row.title}"`,
      );
      const result = await generateRegionStoreLocal(imageId, row.svgUrl, {
        title: row.title ?? "",
        description: row.description ?? "",
        tags: (row.tags as string[]) ?? [],
      });
      if (result.success) {
        console.log(
          `[generate/region-store] done imageId=${imageId} regions=${result.regionsJson.regions.length}`,
        );
        await revalidateVercelCache(imageId, "generate/region-store");
      } else {
        console.error(
          `[generate/region-store] FAILED imageId=${imageId} error=${result.error}`,
        );
      }
    } catch (err) {
      console.error(
        `[generate/region-store] THREW imageId=${imageId}:`,
        err instanceof Error ? (err.stack ?? err.message) : err,
      );
    } finally {
      clearInterval(keepaliveTimer);
    }
  })();

  return c.json({ ok: true, accepted: true, imageId }, 202);
});

/**
 * Fire-and-forget background-music generation. Same architecture as
 * /generate/region-store — replaces the inline ElevenLabs music call
 * inside the CC web app's after() hook so it survives Vercel after()
 * drops.
 *
 * On success: writes backgroundMusicUrl to DB. The web app's poll for
 * coloring-image data picks it up.
 *
 * POST /generate/background-music
 * Body: { imageId: string }
 */
app.post("/generate/background-music", async (c) => {
  const body = await c.req
    .json<{ imageId?: string }>()
    .catch(() => ({ imageId: undefined }));
  const imageId = body.imageId;
  if (!imageId) {
    return c.json({ error: "imageId is required" }, 400);
  }

  const image = await db.coloringImage.findFirst({
    where: { id: imageId },
    select: { id: true, backgroundMusicUrl: true },
  });
  if (!image) {
    return c.json({ error: `Image ${imageId} not found` }, 404);
  }
  if (image.backgroundMusicUrl) {
    return c.json({ ok: true, already_generated: true });
  }

  void (async () => {
    const keepaliveTimer = setInterval(() => {
      db.$queryRaw`SELECT 1`.catch((err) => {
        console.warn(
          "[background-music keepalive] Neon ping failed:",
          err instanceof Error ? err.message : err,
        );
      });
    }, 60_000);

    try {
      console.log(`[generate/background-music] start imageId=${imageId}`);
      const result = await generateBackgroundMusicLocal(imageId);
      if (result.success) {
        console.log(
          `[generate/background-music] done imageId=${imageId} url=${result.backgroundMusicUrl}`,
        );
        await revalidateVercelCache(imageId, "generate/background-music");
      } else {
        console.error(
          `[generate/background-music] FAILED imageId=${imageId} error=${result.error}`,
        );
      }
    } catch (err) {
      Sentry.captureException(err, {
        extra: { imageId, op: "background-music" },
      });
      console.error(
        `[generate/background-music] THREW imageId=${imageId}:`,
        err instanceof Error ? (err.stack ?? err.message) : err,
      );
    } finally {
      clearInterval(keepaliveTimer);
    }
  })();

  return c.json({ ok: true, accepted: true, imageId }, 202);
});

/**
 * Fire-and-forget colored-reference generation. Same architecture as
 * /generate/region-store. Replaces the inline Gemini image-to-image
 * call inside the CC web app's after() hook.
 *
 * On success: writes coloredReferenceUrl to DB.
 *
 * POST /generate/colored-reference
 * Body: { imageId: string }
 */
app.post("/generate/colored-reference", async (c) => {
  const body = await c.req
    .json<{ imageId?: string }>()
    .catch(() => ({ imageId: undefined }));
  const imageId = body.imageId;
  if (!imageId) {
    return c.json({ error: "imageId is required" }, 400);
  }

  const image = await db.coloringImage.findFirst({
    where: { id: imageId },
    select: { id: true, coloredReferenceUrl: true },
  });
  if (!image) {
    return c.json({ error: `Image ${imageId} not found` }, 404);
  }
  if (image.coloredReferenceUrl) {
    return c.json({ ok: true, already_generated: true });
  }

  void (async () => {
    const keepaliveTimer = setInterval(() => {
      db.$queryRaw`SELECT 1`.catch((err) => {
        console.warn(
          "[colored-reference keepalive] Neon ping failed:",
          err instanceof Error ? err.message : err,
        );
      });
    }, 60_000);

    try {
      console.log(`[generate/colored-reference] start imageId=${imageId}`);
      const result = await generateColoredReferenceLocal(imageId);
      if (result.success) {
        console.log(
          `[generate/colored-reference] done imageId=${imageId} url=${result.url}`,
        );
        await revalidateVercelCache(imageId, "generate/colored-reference");
      } else {
        console.error(
          `[generate/colored-reference] FAILED imageId=${imageId} error=${result.error}`,
        );
      }
    } catch (err) {
      Sentry.captureException(err, {
        extra: { imageId, op: "colored-reference" },
      });
      console.error(
        `[generate/colored-reference] THREW imageId=${imageId}:`,
        err instanceof Error ? (err.stack ?? err.message) : err,
      );
    } finally {
      clearInterval(keepaliveTimer);
    }
  })();

  return c.json({ ok: true, accepted: true, imageId }, 202);
});

/**
 * Fire-and-forget region fill-points generation. Same architecture as
 * /generate/region-store. Replaces the inline AI call inside the CC web
 * app's after() hook for the legacy paint-bucket Magic Fill path.
 *
 * On success: writes fillPointsJson + fillPointsGeneratedAt to DB.
 *
 * POST /generate/fill-points
 * Body: { imageId: string }
 */
app.post("/generate/fill-points", async (c) => {
  const body = await c.req
    .json<{ imageId?: string }>()
    .catch(() => ({ imageId: undefined }));
  const imageId = body.imageId;
  if (!imageId) {
    return c.json({ error: "imageId is required" }, 400);
  }

  const image = await db.coloringImage.findFirst({
    where: { id: imageId },
    select: { id: true, fillPointsJson: true },
  });
  if (!image) {
    return c.json({ error: `Image ${imageId} not found` }, 404);
  }
  if (image.fillPointsJson) {
    return c.json({ ok: true, already_generated: true });
  }

  void (async () => {
    const keepaliveTimer = setInterval(() => {
      db.$queryRaw`SELECT 1`.catch((err) => {
        console.warn(
          "[fill-points keepalive] Neon ping failed:",
          err instanceof Error ? err.message : err,
        );
      });
    }, 60_000);

    try {
      console.log(`[generate/fill-points] start imageId=${imageId}`);
      const result = await generateFillPointsLocal(imageId);
      if (result.success) {
        console.log(`[generate/fill-points] done imageId=${imageId}`);
        await revalidateVercelCache(imageId, "generate/fill-points");
      } else {
        console.error(
          `[generate/fill-points] FAILED imageId=${imageId} error=${result.error}`,
        );
      }
    } catch (err) {
      Sentry.captureException(err, {
        extra: { imageId, op: "fill-points" },
      });
      console.error(
        `[generate/fill-points] THREW imageId=${imageId}:`,
        err instanceof Error ? (err.stack ?? err.message) : err,
      );
    } finally {
      clearInterval(keepaliveTimer);
    }
  })();

  return c.json({ ok: true, accepted: true, imageId }, 202);
});

/**
 * End-to-end record → render → upload flow. Costs ~1 image gen + voiceover
 * + music credits per call, plus a Remotion render.
 *
 * POST /publish/reel
 * Body: {
 *   prompt?: string,          // short, on-camera prompt. Falls back to CC daily-scene if omitted.
 *   dry_run?: boolean,        // skip R2 upload + DB write; return local tmp URL only.
 *   sweep?: 'diagonal' | 'horizontal',
 * }
 *
 * If `prompt` is omitted we ask CC for a fresh scene description via
 * /api/dev/next-scene-prompt (same pipeline that powers the daily homepage
 * image — Perplexity Sonar + Claude cleanup + content safety + dedup).
 *
 * On success (non-dry-run) the final mp4 is uploaded to R2 and written back
 * to coloringImage.demoReelUrl for the social post handler to pick up.
 */

/**
 * POST /generate/coloring-image-stream
 *
 * SSE streaming endpoint for user-facing coloring-image generation.
 *
 * Body (JSON):
 *   prompt:             fully-baked prompt (Vercel side adds style block + closed-contours)
 *   referenceImageUrls: up to 4 R2 URLs of style reference images
 *   size?:              defaults '1024x1024'
 *   quality?:           defaults 'high'
 *   partialImages?:     defaults 3 (OpenAI may emit fewer)
 *
 * Emits SSE events:
 *   event: partial          data: { type: 'partial', index, b64_json }
 *   event: image_completed  data: { type: 'image_completed', b64_json }
 *   event: error            data: { type: 'error', message }
 *
 * Vercel side handles auth + credit debit + post-completion persist.
 * This endpoint is a thin OpenAI streaming adapter only — see
 * coloring-image/stream.ts for the rationale.
 */
app.post("/generate/coloring-image-stream", async (c) => {
  const body = await c.req
    .json<Partial<StreamColoringImageInput>>()
    .catch(() => ({}) as Partial<StreamColoringImageInput>);

  if (!body.prompt || typeof body.prompt !== "string") {
    return c.json({ error: "prompt required" }, 400);
  }

  const hasRefs =
    Array.isArray(body.referenceImageUrls) &&
    body.referenceImageUrls.length > 0;
  const hasInline =
    Array.isArray(body.imagesInline) && body.imagesInline.length > 0;

  if (!hasRefs && !hasInline) {
    return c.json(
      {
        error:
          "either referenceImageUrls (text/voice path) or imagesInline (photo path) required",
      },
      400,
    );
  }
  if (hasRefs && body.referenceImageUrls!.length > 4) {
    return c.json({ error: "max 4 reference images" }, 400);
  }
  if (hasInline && body.imagesInline!.length > 4) {
    return c.json({ error: "max 4 inline images" }, 400);
  }

  const input: StreamColoringImageInput = {
    prompt: body.prompt,
    referenceImageUrls: body.referenceImageUrls,
    imagesInline: body.imagesInline,
    size: body.size,
    quality: body.quality,
    partialImages: body.partialImages,
  };

  console.log(
    `[/generate/coloring-image-stream] starting: ${
      hasInline
        ? `inlineImages=${body.imagesInline!.length}`
        : `refs=${body.referenceImageUrls!.length}`
    } q=${input.quality ?? "high"}`,
  );

  return streamSSE(
    c,
    async (stream) => {
      try {
        await streamColoringImage(stream, input);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          "[/generate/coloring-image-stream] error during stream:",
          message,
        );
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ type: "error", message }),
        });
      }
    },
    async (err, stream) => {
      // Hono's onError — fired if streamSSE itself blows up before our
      // handler. Best-effort emit, then the stream closes.
      console.error(
        "[/generate/coloring-image-stream] hono onError:",
        err.message,
      );
      try {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ type: "error", message: err.message }),
        });
      } catch {
        /* connection already gone */
      }
    },
  );
});

/**
 * POST /generate/blog-post
 *
 * Daily blog cron, fire-and-forget. Vercel's /api/blog/generate is now a
 * thin trigger that POSTs here and returns 202; this endpoint runs the
 * full pipeline (Sanity covered-topic check → Claude meta + content +
 * image prompt → openai.images.edit gpt-image-2 → Sanity upload →
 * publish post). Worker has no timeout, so v2's ~3-4min latency is fine.
 *
 * Failures are surfaced via sendAdminAlert (Resend); Vercel never sees
 * the result of the actual work, just the 202 ack.
 */
app.post("/generate/blog-post", async (c) => {
  console.log("[/generate/blog-post] kickoff");

  // Don't await — fire and forget. Pipeline owns its own error handling
  // and admin alerts. Returning 202 immediately keeps Vercel's cron
  // function under 1s.
  runBlogCron().catch((err) => {
    // Should never reach here — runBlogCron catches everything — but
    // guard anyway so an uncaught throw doesn't crash the worker.
    console.error("[/generate/blog-post] uncaught:", err);
  });

  return c.json({ ok: true, accepted: true }, 202);
});

/**
 * POST /generate/daily-image
 *
 * Daily coloring-image cron, fire-and-forget. Vercel's
 * /api/coloring-image/generate is a thin trigger that POSTs here and
 * returns 202; this endpoint runs the full pipeline (Perplexity Sonar
 * scene gen + Claude cleanup + dedup + content blocklist + gpt-image-2
 * + metadata vision call + SVG trace + R2 upload + Prisma row insert
 * + region-store/background-music/colored-reference/fill-points).
 *
 * Failures alert via Resend; Vercel never sees the result of the work.
 */
app.post("/generate/daily-image", async (c) => {
  console.log("[/generate/daily-image] kickoff");

  // Neon WebSocket keepalive — same rationale as /publish/reel above.
  // The daily-cron pipeline sits ~3.5min idle between the row insert
  // (right after metadata) and the region-store DB write (after R2
  // upload). The PrismaNeon adapter's WebSocket gets dropped during
  // that gap and the next update hangs on a half-open socket — we
  // saw exactly this on the first prod run: region-store update timed
  // out after 30s with attempt 1/3, never recovered.
  //
  // 60s SELECT 1 keeps the socket warm. We start it on kickoff and
  // clear it after the pipeline resolves so Neon's compute can
  // auto-suspend between jobs.
  const keepaliveTimer = setInterval(() => {
    db.$queryRaw`SELECT 1`.catch((err) => {
      console.warn(
        "[keepalive] Neon ping failed:",
        err instanceof Error ? err.message : err,
      );
    });
  }, 60_000);

  // Don't await — fire and forget. But chain a .finally() so we still
  // clear the interval after the pipeline resolves (or rejects).
  runDailyImageCron()
    .catch((err) => {
      console.error("[/generate/daily-image] uncaught:", err);
    })
    .finally(() => {
      clearInterval(keepaliveTimer);
    });

  return c.json({ ok: true, accepted: true }, 202);
});

/**
 * POST /generate/bundle-page
 *
 * Generate a single page of a coloring bundle (e.g. Dino Dance Party page 7).
 * Synchronous — caller waits for QA-gated retry loop to finish (~3-15 min
 * depending on retry count). Use this from admin UI for individual page
 * regenerates; use /generate/bundle-all-pages for the initial 10-page run.
 *
 * Body: { bundleSlug, pageNumber, forceRegenerate? }
 */
app.post("/generate/bundle-page", async (c) => {
  const body = await c.req.json<{
    bundleSlug: string;
    pageNumber: number;
    forceRegenerate?: boolean;
  }>();

  const profile = getBundleProfile(body.bundleSlug);
  if (!profile) {
    return c.json({ error: `Unknown bundle slug: ${body.bundleSlug}` }, 404);
  }
  const pagePrompt = profile.pagePrompts[body.pageNumber - 1];
  if (!pagePrompt) {
    return c.json(
      { error: `No prompt for page ${body.pageNumber} in ${body.bundleSlug}` },
      400,
    );
  }

  const bundleRow = await db.bundle.findUnique({
    where: { slug: body.bundleSlug },
    select: { id: true },
  });
  if (!bundleRow) {
    return c.json(
      { error: `Bundle row not seeded yet: ${body.bundleSlug}` },
      404,
    );
  }

  if (!body.forceRegenerate) {
    const existing = await db.coloringImage.findFirst({
      where: {
        bundleId: bundleRow.id,
        bundleOrder: body.pageNumber,
        status: "READY",
      },
      select: { id: true, url: true, svgUrl: true },
    });
    if (existing) {
      return c.json({
        ok: true,
        coloringImageId: existing.id,
        url: existing.url,
        svgUrl: existing.svgUrl,
        skipped: true,
        reason: "page already exists — pass forceRegenerate=true to overwrite",
      });
    }
  }

  const heroRefsBaseUrl = `${process.env.R2_PUBLIC_URL}/bundles/${body.bundleSlug}/hero-refs`;

  try {
    const result = await generateBundlePage({
      bundle: profile,
      bundleId: bundleRow.id,
      pageNumber: body.pageNumber,
      pagePrompt,
      heroRefsBaseUrl,
    });
    return c.json({
      ok: true,
      coloringImageId: result.coloringImageId,
      url: result.url,
      svgUrl: result.svgUrl,
      qaPassed: result.qaPassed,
      qaAttempts: result.qaAttempts,
      attemptUrls: result.attemptUrls,
    });
  } catch (err) {
    if (err instanceof BundlePageQAFailedError) {
      return c.json(
        {
          error: "QA exhausted after 3 attempts",
          topIssue: err.lastQA.topIssue,
          heroChecks: err.lastQA.heroChecks,
          anatomyIssues: err.lastQA.anatomyIssues,
          attemptUrls: err.attemptUrls,
        },
        422,
      );
    }
    throw err;
  }
});

/**
 * POST /generate/bundle-all-pages
 *
 * Fire-and-forget batch run of every page in a bundle. Returns 202
 * immediately — wall-clock is ~30-45 min. Idempotent: existing READY
 * pages skip unless forceRegenerate=true.
 *
 * Body: { bundleSlug, startFrom?, stopAt?, forceRegenerate? }
 */
app.post("/generate/bundle-all-pages", async (c) => {
  const body = await c.req.json<{
    bundleSlug: string;
    startFrom?: number;
    stopAt?: number;
    forceRegenerate?: boolean;
  }>();

  const profile = getBundleProfile(body.bundleSlug);
  if (!profile) {
    return c.json({ error: `Unknown bundle slug: ${body.bundleSlug}` }, 404);
  }
  const bundleRow = await db.bundle.findUnique({
    where: { slug: body.bundleSlug },
    select: { id: true },
  });
  if (!bundleRow) {
    return c.json(
      { error: `Bundle row not seeded yet: ${body.bundleSlug}` },
      404,
    );
  }

  const heroRefsBaseUrl = `${process.env.R2_PUBLIC_URL}/bundles/${body.bundleSlug}/hero-refs`;

  // Same Neon-keepalive pattern as /generate/daily-image — bundle batch
  // runs idle ~3-15 min between page generations during QA + retry, more
  // than enough to lose the WebSocket if we don't ping.
  const keepaliveTimer = setInterval(() => {
    db.$queryRaw`SELECT 1`.catch((err) => {
      console.warn(
        "[keepalive] Neon ping failed:",
        err instanceof Error ? err.message : err,
      );
    });
  }, 60_000);

  generateAllBundlePages({
    bundle: profile,
    bundleId: bundleRow.id,
    pagePrompts: profile.pagePrompts,
    heroRefsBaseUrl,
    startFrom: body.startFrom,
    stopAt: body.stopAt,
    forceRegenerate: body.forceRegenerate,
  })
    .then((result) => {
      console.log(
        `[/generate/bundle-all-pages] done — ${result.generated}/${profile.pagePrompts.length} generated, ${result.skipped} skipped, ${result.failed} failed`,
      );
    })
    .catch((err) => {
      console.error("[/generate/bundle-all-pages] uncaught:", err);
      Sentry.captureException(err, {
        extra: { bundleSlug: body.bundleSlug },
      });
    })
    .finally(() => clearInterval(keepaliveTimer));

  return c.json({ ok: true, accepted: true }, 202);
});

app.post("/publish/reel", async (c) => {
  // Neon WebSocket keepalive — scoped to this handler only.
  //
  // The PrismaNeon adapter maintains a single WebSocket to Neon. Between
  // Playwright phases the worker sits idle for 3-4 min (e.g. between the
  // region-store upload and Playwright finishing the sweep). If the
  // socket goes idle for too long Neon drops it, and the next DB call
  // hangs on a half-open connection — we saw this as a silent 30s
  // timeout on db.coloringImage.update right after R2 upload.
  //
  // A 60s SELECT 1 keeps the socket warm. We only run it during a reel
  // job — starting on handler entry, clearing in the finally — so it
  // doesn't prevent Neon's compute from auto-suspending between jobs
  // (which would rack up compute-hours charges).
  const keepaliveTimer = setInterval(() => {
    db.$queryRaw`SELECT 1`.catch((err) => {
      console.warn(
        "[keepalive] Neon ping failed:",
        err instanceof Error ? err.message : err,
      );
    });
  }, 60_000);

  try {
    return await runPublishReel(c);
  } finally {
    clearInterval(keepaliveTimer);
  }
});

async function runPublishReel(c: Context) {
  const body = await c.req
    .json<{
      prompt?: string;
      dry_run?: boolean;
      sweep?: "diagonal" | "horizontal";
    }>()
    .catch(
      () =>
        ({}) as {
          prompt?: string;
          dry_run?: boolean;
          sweep?: "diagonal" | "horizontal";
        },
    );

  const ccOrigin = process.env.CC_ORIGIN ?? "http://localhost:3000";
  const workerSecret = process.env.WORKER_SECRET;
  let prompt = body.prompt;
  if (!prompt) {
    console.log(
      `[/publish/reel] no prompt supplied — fetching scene from ${ccOrigin}/api/dev/next-scene-prompt`,
    );
    // Perplexity + Claude cleanup + dedup can take 30–90s. Default undici
    // timeout would kill this; give it a generous 3min budget.
    const r = await fetch(`${ccOrigin}/api/dev/next-scene-prompt`, {
      method: "POST",
      headers: workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {},
      signal: AbortSignal.timeout(180_000),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return c.json(
        { error: `scene fetch failed (${r.status}): ${txt.slice(0, 200)}` },
        502,
      );
    }
    const { full, short } = (await r.json()) as {
      full: string;
      short: string;
    };
    prompt = short;
    console.log(`[/publish/reel] got scene:`);
    console.log(`  full:  ${full}`);
    console.log(`  short: ${short} ← typed on camera`);
  }

  await mkdir(WORKER_OUT_DIR, { recursive: true });

  // 1. Playwright — drive the homepage create flow and record the reveal.
  const recording = await recordColoringSession({
    prompt: prompt as string,
    origin: ccOrigin,
    sweep: body.sweep ?? "diagonal",
    outDir: WORKER_OUT_DIR,
    onImageCreated: (id) => {
      // Kick region-store generation via our OWN HTTP endpoint.
      //
      // Why not call generateRegionStoreLocal() directly? Two reasons:
      //
      //   1. Isolation — the /generate/region-store handler spawns the
      //      work in its own async chain, separate from the Playwright
      //      recording session's call stack. When CPU-heavy region gen
      //      (~3 min) starved the shared event loop, the setInterval
      //      keepalive couldn't fire and Neon dropped the socket; the
      //      subsequent DB write hung forever. Going through the
      //      endpoint forces a fresh spawn each time.
      //
      //   2. Single code path — CC web, retry UI, and this recording
      //      all now hit the same endpoint. One place to harden.
      //
      // Fire-and-forget. The Playwright session's region-store poll
      // picks up the DB write once the endpoint's background task
      // completes.
      console.log(`[/publish/reel] kicking /generate/region-store for ${id}`);
      const workerSecret = process.env.WORKER_SECRET;
      fetch(`http://127.0.0.1:3030/generate/region-store`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
        },
        body: JSON.stringify({ imageId: id }),
        signal: AbortSignal.timeout(15_000),
      })
        .then(async (res) => {
          const text = await res.text().catch(() => "");
          console.log(
            `[/publish/reel] /generate/region-store ack for ${id}: ${res.status} ${text.slice(0, 200)}`,
          );
        })
        .catch((err) => {
          console.error(
            `[/publish/reel] /generate/region-store kick failed for ${id}:`,
            err instanceof Error ? err.message : err,
          );
        });
    },
  });

  // 2. Fetch the image's ambient sound URL from the DB, and use its title
  //    to prompt a better voiceover script. Every backfilled image has an
  //    ambient track; we layer it as ducked music in Remotion.
  const imageRow = await db.coloringImage.findUnique({
    where: { id: recording.imageId },
    select: { backgroundMusicUrl: true, title: true },
  });
  console.log(
    `[/publish/reel] backgroundMusicUrl(raw): ${imageRow?.backgroundMusicUrl ?? "(none)"}  title: ${imageRow?.title ?? "(none)"}`,
  );

  const port = parseInt(process.env.PORT ?? "3030", 10);

  // Download the ambient mp3 locally so Remotion's headless Chromium loads it
  // via our /tmp server (avoids CORS/cross-origin hangs + timeouts that crash
  // the compositor).
  let backgroundMusicUrl: string | undefined;
  if (imageRow?.backgroundMusicUrl) {
    try {
      const res = await fetch(imageRow.backgroundMusicUrl);
      if (!res.ok) throw new Error(`ambient fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const ambientPath = resolve(WORKER_OUT_DIR, `${Date.now()}-ambient.mp3`);
      const { writeFile } = await import("node:fs/promises");
      await writeFile(ambientPath, buf);
      backgroundMusicUrl = `http://localhost:${port}/tmp/${ambientPath.split("/").pop()}`;
      console.log(
        `[/publish/reel] ambient proxied: ${backgroundMusicUrl} (${buf.length} bytes)`,
      );
    } catch (err) {
      console.warn(
        "[/publish/reel] ambient download failed (continuing without music):",
        err,
      );
    }
  }

  // 3. Generate voiceover: script via Claude, TTS via ElevenLabs.
  //    Non-fatal if it fails — reel still renders, just silent voice layer.
  let kidVoiceUrl: string | undefined;
  let adultVoiceUrl: string | undefined;
  try {
    console.log("[/publish/reel] generating reel script via Claude");
    const script = await generateReelScript({
      prompt: prompt as string,
      imageTitle: imageRow?.title,
      mode: "text",
    });
    console.log("[/publish/reel] script:", script);

    const kidPath = resolve(WORKER_OUT_DIR, `${Date.now()}-kid.mp3`);
    const adultPath = resolve(WORKER_OUT_DIR, `${Date.now() + 1}-adult.mp3`);
    const kidVoiceId = process.env.ELEVENLABS_KID_VOICE_ID;
    const adultVoiceId = process.env.ELEVENLABS_ADULT_VOICE_ID;

    if (kidVoiceId && adultVoiceId) {
      await Promise.all([
        generateVoiceClip({
          text: script.earlyLine,
          voiceId: kidVoiceId,
          outputPath: kidPath,
        }),
        generateVoiceClip({
          text: script.adultLine,
          voiceId: adultVoiceId,
          outputPath: adultPath,
        }),
      ]);
      kidVoiceUrl = `http://localhost:${port}/tmp/${kidPath.split("/").pop()}`;
      adultVoiceUrl = `http://localhost:${port}/tmp/${adultPath.split("/").pop()}`;
      console.log(
        `[/publish/reel] voice clips ready: kid=${kidVoiceUrl} adult=${adultVoiceUrl}`,
      );
    } else {
      console.log(
        "[/publish/reel] skipping voiceover — ELEVENLABS_*_VOICE_ID not set",
      );
    }
  } catch (err) {
    console.error(
      "[/publish/reel] voiceover generation failed (continuing):",
      err,
    );
  }

  // 4. Trim the raw webm to just the two segments we want in the reel.
  //    Everything else (post-submit loading, region-store polling) gets cut
  //    entirely — keeps Remotion's frame cache tiny and render fast.
  const fps = 30;
  const { typeStartMs, submitMs, brushReadyMs, sweepDoneMs, redirectMs } =
    recording.flowMarkers;

  // Typing clip: from typing start through just past submit click.
  const typingStartSec = typeStartMs / 1000;
  const typingEndSec = submitMs / 1000 + POST_SUBMIT_PAD_SECS;
  const typingDurationSec = typingEndSec - typingStartSec;

  // Reveal clip: from brush-ready (=sweep start) through sweep done + hold.
  const revealStartSec = brushReadyMs / 1000;
  const revealEndSec = sweepDoneMs / 1000 + POST_SWEEP_PAD_SECS;
  const revealDurationSec = revealEndSec - revealStartSec;

  console.log(
    `[/publish/reel] trimming typing clip [${typingStartSec.toFixed(1)}s → ${typingEndSec.toFixed(1)}s] (${typingDurationSec.toFixed(1)}s)`,
  );
  console.log(
    `[/publish/reel] trimming reveal clip [${revealStartSec.toFixed(1)}s → ${revealEndSec.toFixed(1)}s] (${revealDurationSec.toFixed(1)}s)`,
  );
  void redirectMs; // intentionally unused — we keep the marker for future cuts

  const typingPath = resolve(WORKER_OUT_DIR, `${Date.now()}-typing.mp4`);
  const revealPath = resolve(WORKER_OUT_DIR, `${Date.now() + 1}-reveal.mp4`);
  await Promise.all([
    trimWebmToMp4({
      sourcePath: recording.webmPath,
      outputPath: typingPath,
      startSec: typingStartSec,
      durationSec: typingDurationSec,
    }),
    trimWebmToMp4({
      sourcePath: recording.webmPath,
      outputPath: revealPath,
      startSec: revealStartSec,
      durationSec: revealDurationSec,
    }),
  ]);

  const typingVideoUrl = `http://localhost:${port}/tmp/${typingPath.split("/").pop()}`;
  const revealVideoUrl = `http://localhost:${port}/tmp/${revealPath.split("/").pop()}`;
  const typingDurationFrames = Math.round(typingDurationSec * fps);
  const revealDurationFrames = Math.round(revealDurationSec * fps);

  // 5. Serve PDF preview PNG via the /tmp static server (if captured).
  let pdfPreviewUrl: string | undefined;
  if (recording.pdfPreviewPng) {
    const pdfPngPath = resolve(WORKER_OUT_DIR, `${Date.now()}-pdf-preview.png`);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(pdfPngPath, recording.pdfPreviewPng);
    pdfPreviewUrl = `http://localhost:${port}/tmp/${pdfPngPath.split("/").pop()}`;
    console.log(
      `[/publish/reel] PDF preview proxied: ${pdfPreviewUrl} (${recording.pdfPreviewPng.byteLength} bytes)`,
    );
  }

  // 6. Remotion — composite trimmed clips with intro/outro cards, ambient
  //    music, two-voice narration, and optional PDF preview.
  const PDF_PREVIEW_SECS = pdfPreviewUrl ? 2.5 : 0;
  const introFrames = Math.round(INTRO_SECS * fps);
  const pdfPreviewFrames = Math.round(PDF_PREVIEW_SECS * fps);
  const outroFrames = Math.round(OUTRO_SECS * fps);
  const durationInFrames =
    introFrames +
    typingDurationFrames +
    revealDurationFrames +
    pdfPreviewFrames +
    outroFrames;

  const outputPath = resolve(WORKER_OUT_DIR, `${Date.now()}-reel.mp4`);
  await renderDemoReel({
    typingVideoUrl,
    revealVideoUrl,
    prompt: prompt as string,
    typingDurationFrames,
    revealDurationFrames,
    durationInFrames,
    outputPath,
    backgroundMusicUrl,
    kidVoiceUrl,
    adultVoiceUrl,
    pdfPreviewUrl,
  });

  // 6. Upload mp4 + cover to R2, persist URLs on the coloringImage row so
  //    the CC social post handler can read both. Skipped on dry-run.
  const localUrl = `http://localhost:${port}/tmp/${outputPath.split("/").pop()}`;
  let publishedUrl: string | undefined;
  let publishedCoverUrl: string | undefined;
  let publishedStoryUrl: string | undefined;
  if (!body.dry_run) {
    try {
      const mp4Buffer = await readFile(outputPath);
      const stamp = Date.now();
      const r2Key = `reels/demo/${recording.imageId}-${stamp}.mp4`;
      const { url } = await put(r2Key, mp4Buffer, {
        contentType: "video/mp4",
        access: "public",
      });
      publishedUrl = url;

      if (recording.coverJpeg) {
        const coverKey = `reels/demo/${recording.imageId}-${stamp}-cover.jpg`;
        const { url: coverUrl } = await put(coverKey, recording.coverJpeg, {
          contentType: "image/jpeg",
          access: "public",
        });
        publishedCoverUrl = coverUrl;
        console.log(
          `[/publish/reel] cover uploaded to R2: ${coverUrl} (${recording.coverJpeg.byteLength} bytes)`,
        );
      } else {
        console.warn("[/publish/reel] no cover JPEG to upload");
      }

      // Trim a 60s copy for IG / FB Stories. Stories reject videos >60s
      // with error 2207082; our reel is ~69s. Stream-copy trim — ~1s.
      // Non-fatal: if this fails, the story post handler falls back to
      // the full reel URL (which will fail to post but that's OK —
      // better than blocking the whole reel upload).
      try {
        const storyPath = `${WORKER_OUT_DIR}/${recording.imageId}-${stamp}-story.mp4`;
        await trimReelForStory({
          sourcePath: outputPath,
          outputPath: storyPath,
          durationSec: 60,
        });
        const storyBuffer = await readFile(storyPath);
        const storyKey = `reels/demo/${recording.imageId}-${stamp}-story.mp4`;
        const { url: storyUrl } = await put(storyKey, storyBuffer, {
          contentType: "video/mp4",
          access: "public",
        });
        publishedStoryUrl = storyUrl;
        console.log(
          `[/publish/reel] story (60s) uploaded to R2: ${storyUrl} (${storyBuffer.byteLength} bytes)`,
        );
      } catch (storyErr) {
        console.error(
          "[/publish/reel] story trim/upload failed (non-fatal):",
          storyErr instanceof Error ? storyErr.message : storyErr,
        );
      }

      await db.coloringImage.update({
        where: { id: recording.imageId },
        data: {
          demoReelUrl: url,
          ...(publishedCoverUrl ? { demoReelCoverUrl: publishedCoverUrl } : {}),
          ...(publishedStoryUrl ? { demoReelStoryUrl: publishedStoryUrl } : {}),
        },
      });
      console.log(`[/publish/reel] uploaded mp4 to R2: ${url}`);
    } catch (err) {
      console.error("[/publish/reel] R2 upload / DB write failed:", err);
      return c.json(
        {
          error: "upload_failed",
          details: err instanceof Error ? err.message : String(err),
          localUrl,
        },
        500,
      );
    }
  }

  // Strip the JPEG buffer from `recording` before serialising — it's
  // multi-MB binary that bloats the JSON response and isn't useful to
  // the caller (it's already uploaded to R2).
  const { coverJpeg: _coverJpeg, ...recordingPublic } = recording;
  void _coverJpeg;

  return c.json({
    ok: true,
    dry_run: !!body.dry_run,
    recording: recordingPublic,
    output: {
      mp4Path: outputPath,
      localUrl,
      publishedUrl,
      publishedCoverUrl,
      durationSecs: durationInFrames / fps,
    },
  });
}

/**
 * Image-mode variant of /publish/reel — drives the photo-upload create
 * flow using a curated kid-safe photo from PhotoLibraryEntry, then
 * composites through the ImageDemoReel Remotion composition.
 *
 * POST /publish/image-reel
 * Body: {
 *   photoUrl?: string,        // override library pick (testing only)
 *   dry_run?: boolean,
 *   sweep?: 'diagonal' | 'horizontal',
 * }
 *
 * On success the final mp4 lands on coloringImage.demoReelUrl — same
 * field as the text variant, so the downstream social post handler is
 * variant-agnostic.
 */
app.post("/publish/image-reel", async (c) => {
  const keepaliveTimer = setInterval(() => {
    db.$queryRaw`SELECT 1`.catch((err) => {
      console.warn(
        "[keepalive] Neon ping failed:",
        err instanceof Error ? err.message : err,
      );
    });
  }, 60_000);

  try {
    return await runPublishImageReel(c);
  } finally {
    clearInterval(keepaliveTimer);
  }
});

async function runPublishImageReel(c: Context) {
  const body = await c.req
    .json<{
      photoUrl?: string;
      dry_run?: boolean;
      sweep?: "diagonal" | "horizontal";
    }>()
    .catch(
      () =>
        ({}) as {
          photoUrl?: string;
          dry_run?: boolean;
          sweep?: "diagonal" | "horizontal";
        },
    );

  const ccOrigin = process.env.CC_ORIGIN ?? "http://localhost:3000";

  // Pick a library entry unless one was passed in. Raw SQL keeps this
  // independent of the Prisma client regeneration cycle — the worker
  // can tolerate a still-generating client during rollout.
  let photoUrl = body.photoUrl;
  let libraryEntryId: string | null = null;
  if (!photoUrl) {
    const rows = await db.$queryRaw<
      Array<{ id: string; url: string }>
    >`SELECT id, url
      FROM photo_library_entries
      WHERE brand = 'CHUNKY_CRAYON'
        AND safe = true
      ORDER BY "lastUsed" ASC NULLS FIRST, random()
      LIMIT 1`;
    if (rows.length === 0) {
      return c.json(
        {
          error:
            "photo_library_empty — run `pnpm ts-node apps/chunky-crayon-web/scripts/seed-photo-library.ts` first",
        },
        500,
      );
    }
    libraryEntryId = rows[0].id;
    photoUrl = rows[0].url;
    console.log(
      `[/publish/image-reel] picked library entry ${libraryEntryId}: ${photoUrl}`,
    );
  }

  await mkdir(WORKER_OUT_DIR, { recursive: true });

  // 1. Playwright — drive the image-upload create flow.
  const recording = await recordImageColoringSession({
    photoUrl: photoUrl as string,
    origin: ccOrigin,
    sweep: body.sweep ?? "diagonal",
    outDir: WORKER_OUT_DIR,
    onImageCreated: (id) => {
      console.log(
        `[/publish/image-reel] starting in-process region-store gen for ${id}`,
      );
      (async () => {
        const pollUntil = Date.now() + 4 * 60_000;
        let row: {
          svgUrl: string | null;
          title: string | null;
          description: string | null;
          tags: string[];
        } | null = null;
        while (Date.now() < pollUntil) {
          row = await db.coloringImage.findUnique({
            where: { id },
            select: {
              svgUrl: true,
              title: true,
              description: true,
              tags: true,
            },
          });
          if (row?.svgUrl) break;
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (!row?.svgUrl) {
          console.warn(
            `[/publish/image-reel] svgUrl never appeared for ${id} — skipping region gen`,
          );
          return;
        }
        try {
          await generateRegionStoreLocal(id, row.svgUrl, {
            title: row.title ?? "",
            description: row.description ?? "",
            tags: (row.tags as string[]) ?? [],
          });
        } catch (err) {
          console.error(
            `[/publish/image-reel] region-store gen failed for ${id}:`,
            err instanceof Error ? err.message : err,
          );
        }
      })();
    },
  });

  // 2. Fetch the image's ambient sound + title (same as text variant).
  const imageRow = await db.coloringImage.findUnique({
    where: { id: recording.imageId },
    select: { backgroundMusicUrl: true, title: true },
  });

  const port = parseInt(process.env.PORT ?? "3030", 10);

  let backgroundMusicUrl: string | undefined;
  if (imageRow?.backgroundMusicUrl) {
    try {
      const res = await fetch(imageRow.backgroundMusicUrl);
      if (!res.ok) throw new Error(`ambient fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const ambientPath = resolve(WORKER_OUT_DIR, `${Date.now()}-ambient.mp3`);
      const { writeFile } = await import("node:fs/promises");
      await writeFile(ambientPath, buf);
      backgroundMusicUrl = `http://localhost:${port}/tmp/${ambientPath.split("/").pop()}`;
    } catch (err) {
      console.warn(
        "[/publish/image-reel] ambient download failed (continuing without music):",
        err,
      );
    }
  }

  // 3. Voiceover — reuse the text-variant generator with an "image" hint.
  let kidVoiceUrl: string | undefined;
  let adultVoiceUrl: string | undefined;
  try {
    const script = await generateReelScript({
      prompt: imageRow?.title ?? "photo upload",
      imageTitle: imageRow?.title,
      mode: "image",
    });

    const kidPath = resolve(WORKER_OUT_DIR, `${Date.now()}-kid.mp3`);
    const adultPath = resolve(WORKER_OUT_DIR, `${Date.now() + 1}-adult.mp3`);
    const kidVoiceId = process.env.ELEVENLABS_KID_VOICE_ID;
    const adultVoiceId = process.env.ELEVENLABS_ADULT_VOICE_ID;

    if (kidVoiceId && adultVoiceId) {
      // Image mode: earlyVoice is "adult" so both lines use adult voice id.
      const earlyVoiceId =
        script.earlyVoice === "adult" ? adultVoiceId : kidVoiceId;
      await Promise.all([
        generateVoiceClip({
          text: script.earlyLine,
          voiceId: earlyVoiceId,
          outputPath: kidPath,
        }),
        generateVoiceClip({
          text: script.adultLine,
          voiceId: adultVoiceId,
          outputPath: adultPath,
        }),
      ]);
      kidVoiceUrl = `http://localhost:${port}/tmp/${kidPath.split("/").pop()}`;
      adultVoiceUrl = `http://localhost:${port}/tmp/${adultPath.split("/").pop()}`;
    }
  } catch (err) {
    console.error(
      "[/publish/image-reel] voiceover generation failed (continuing):",
      err,
    );
  }

  // 4. Trim the raw webm. In image-mode the "typing" markers represent
  //    the UPLOAD phase (photo-tab → Use This click).
  const fps = 30;
  const { typeStartMs, submitMs, brushReadyMs, sweepDoneMs } =
    recording.flowMarkers;

  // Upload clip: photo-mode-tab through "Use This" click + a short tail
  // so the AI description reads on screen.
  const UPLOAD_TAIL_SECS = 1.5;
  const uploadStartSec = typeStartMs / 1000;
  const uploadEndSec = submitMs / 1000 + UPLOAD_TAIL_SECS;
  const uploadDurationSec = uploadEndSec - uploadStartSec;

  // Reveal clip: same as text variant.
  const POST_SWEEP_PAD_SECS = 1.5;
  const revealStartSec = brushReadyMs / 1000;
  const revealEndSec = sweepDoneMs / 1000 + POST_SWEEP_PAD_SECS;
  const revealDurationSec = revealEndSec - revealStartSec;

  const uploadPath = resolve(WORKER_OUT_DIR, `${Date.now()}-upload.mp4`);
  const revealPath = resolve(WORKER_OUT_DIR, `${Date.now() + 1}-reveal.mp4`);
  await Promise.all([
    trimWebmToMp4({
      sourcePath: recording.webmPath,
      outputPath: uploadPath,
      startSec: uploadStartSec,
      durationSec: uploadDurationSec,
    }),
    trimWebmToMp4({
      sourcePath: recording.webmPath,
      outputPath: revealPath,
      startSec: revealStartSec,
      durationSec: revealDurationSec,
    }),
  ]);

  const uploadVideoUrl = `http://localhost:${port}/tmp/${uploadPath.split("/").pop()}`;
  const revealVideoUrl = `http://localhost:${port}/tmp/${revealPath.split("/").pop()}`;
  const uploadDurationFrames = Math.round(uploadDurationSec * fps);
  const revealDurationFrames = Math.round(revealDurationSec * fps);

  // 5. PDF preview
  let pdfPreviewUrl: string | undefined;
  if (recording.pdfPreviewPng) {
    const pdfPngPath = resolve(WORKER_OUT_DIR, `${Date.now()}-pdf-preview.png`);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(pdfPngPath, recording.pdfPreviewPng);
    pdfPreviewUrl = `http://localhost:${port}/tmp/${pdfPngPath.split("/").pop()}`;
  }

  // 5b. Source photo — download the R2 URL locally and serve it through
  //     the /tmp proxy so Remotion's headless Chromium can fetch it
  //     reliably (direct R2 fetches have intermittent TLS timeouts
  //     inside the render context).
  let sourcePhotoProxiedUrl: string | undefined;
  try {
    const res = await fetch(photoUrl as string);
    if (!res.ok) throw new Error(`source-photo fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext =
      (photoUrl as string).match(/\.(jpg|jpeg|png|webp)(?:\?|$)/i)?.[1] ??
      "jpg";
    const photoPath = resolve(
      WORKER_OUT_DIR,
      `${Date.now()}-source-photo.${ext}`,
    );
    const { writeFile } = await import("node:fs/promises");
    await writeFile(photoPath, buf);
    sourcePhotoProxiedUrl = `http://localhost:${port}/tmp/${photoPath
      .split("/")
      .pop()}`;
  } catch (err) {
    console.warn(
      "[/publish/image-reel] source-photo proxy failed (continuing without preview card):",
      err instanceof Error ? err.message : err,
    );
  }

  // 6. Render ImageDemoReel
  const PDF_PREVIEW_SECS_VAL = pdfPreviewUrl ? 2.5 : 0;
  const PHOTO_PREVIEW_SECS_VAL = sourcePhotoProxiedUrl ? 2.0 : 0;
  const INTRO_SECS_LOCAL = 2.0;
  const OUTRO_SECS_LOCAL = 2.0;
  const introFrames = Math.round(INTRO_SECS_LOCAL * fps);
  const photoPreviewFrames = Math.round(PHOTO_PREVIEW_SECS_VAL * fps);
  const pdfPreviewFrames = Math.round(PDF_PREVIEW_SECS_VAL * fps);
  const outroFrames = Math.round(OUTRO_SECS_LOCAL * fps);
  const durationInFrames =
    introFrames +
    photoPreviewFrames +
    uploadDurationFrames +
    revealDurationFrames +
    pdfPreviewFrames +
    outroFrames;

  const outputPath = resolve(WORKER_OUT_DIR, `${Date.now()}-image-reel.mp4`);
  await renderImageDemoReel({
    sourcePhotoUrl: sourcePhotoProxiedUrl,
    uploadVideoUrl,
    revealVideoUrl,
    uploadDurationFrames,
    revealDurationFrames,
    durationInFrames,
    outputPath,
    backgroundMusicUrl,
    kidVoiceUrl,
    adultVoiceUrl,
    pdfPreviewUrl,
  });

  // 7. Upload to R2 + persist on the coloringImage row (same fields as
  //    text variant — downstream social post handler is agnostic).
  const localUrl = `http://localhost:${port}/tmp/${outputPath.split("/").pop()}`;
  let publishedUrl: string | undefined;
  let publishedCoverUrl: string | undefined;
  if (!body.dry_run) {
    try {
      const mp4Buffer = await readFile(outputPath);
      const stamp = Date.now();
      const r2Key = `reels/image/${recording.imageId}-${stamp}.mp4`;
      const { url } = await put(r2Key, mp4Buffer, {
        contentType: "video/mp4",
        access: "public",
      });
      publishedUrl = url;

      if (recording.coverJpeg) {
        const coverKey = `reels/image/${recording.imageId}-${stamp}-cover.jpg`;
        const { url: coverUrl } = await put(coverKey, recording.coverJpeg, {
          contentType: "image/jpeg",
          access: "public",
        });
        publishedCoverUrl = coverUrl;
      }

      await db.coloringImage.update({
        where: { id: recording.imageId },
        data: {
          demoReelUrl: url,
          ...(publishedCoverUrl ? { demoReelCoverUrl: publishedCoverUrl } : {}),
        },
      });

      // Mark the library entry as used so the rotation picks a different
      // one next time.
      if (libraryEntryId) {
        await db.$executeRaw`UPDATE photo_library_entries
          SET "lastUsed" = NOW()
          WHERE id = ${libraryEntryId}`;
      }
    } catch (err) {
      console.error("[/publish/image-reel] R2 upload / DB write failed:", err);
      return c.json(
        {
          error: "upload_failed",
          details: err instanceof Error ? err.message : String(err),
          localUrl,
        },
        500,
      );
    }
  }

  const { coverJpeg: _coverJpeg, ...recordingPublic } = recording;
  void _coverJpeg;

  return c.json({
    ok: true,
    dry_run: !!body.dry_run,
    variant: "image",
    libraryEntryId,
    sourcePhotoUrl: photoUrl,
    recording: recordingPublic,
    output: {
      mp4Path: outputPath,
      localUrl,
      publishedUrl,
      publishedCoverUrl,
      durationSecs: durationInFrames / fps,
    },
  });
}

/**
 * POST /publish/v2
 *
 * Demo Reels V2 renderer. The web app's `produce-v2` cron has already
 * generated the source image; this endpoint reads the row, builds
 * inputProps, renders the V2 composition via Remotion, uploads the mp4
 * to R2, and writes `demoReelUrl` back to the row.
 *
 * Per-variant work:
 *   - text  → just pass row's description as the typed prompt
 *   - image → also fetch sourcePhotoUrl from photo_library_entries (the
 *             produce-v2 route already bumped lastUsed; we look up the
 *             most-recent entry by joining on photoLibraryEntryId — see
 *             Phase 5 of the demo-reels-v2 plan for the schema decision)
 *   - voice → synthesise plausible kid utterances from title/description
 *             via Claude, generate Q2 + A1 + A2 audio via ElevenLabs,
 *             upload all to R2 under voice-reel/<imageId>/
 *
 * All R2-hosted assets (regionMapUrl, svgUrl, finishedImageUrl, etc.) are
 * proxied through `localhost:<port>/tmp/<file>` because Remotion's headless
 * Chromium can't fetch our prod R2 directly (no CORS headers — same
 * problem the V1 path solves).
 *
 * Render time: ~60-120s wall clock per reel on the Hetzner box. We don't
 * await the full render in the Hono handler — the produce-v2 fetch has
 * a 45s timeout, after which it gives up but we keep going. The handler
 * still returns 200 once render+upload complete, which the caller may
 * ignore.
 */
type V2Variant = "text" | "image" | "voice";
const isV2Variant = (v: unknown): v is V2Variant =>
  v === "text" || v === "image" || v === "voice";

type V2Row = {
  id: string;
  title: string | null;
  description: string | null;
  url: string;
  svgUrl: string;
  regionMapUrl: string;
  regionMapWidth: number | null;
  regionMapHeight: number | null;
  regionsJson: unknown;
  backgroundMusicUrl: string | null;
};

// Poll the DB until svgUrl + url + regionMapUrl + regionsJson are all
// populated, or until `timeoutMs` elapses. Returns:
//   - null if the row doesn't exist (404)
//   - { notReady: {...} } if the row exists but timed out unready (400)
//   - V2Row if ready
const waitForRowReady = async (
  coloringImageId: string,
  timeoutMs: number,
): Promise<V2Row | { notReady: Record<string, boolean> } | null> => {
  const startedAt = Date.now();
  let lastFlags: Record<string, boolean> = {};
  let attempts = 0;

  while (Date.now() - startedAt < timeoutMs) {
    attempts++;
    const row = await db.coloringImage.findUnique({
      where: { id: coloringImageId },
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        svgUrl: true,
        regionMapUrl: true,
        regionMapWidth: true,
        regionMapHeight: true,
        regionsJson: true,
        backgroundMusicUrl: true,
      },
    });
    if (!row) return null;

    const flags = {
      hasSvg: !!row.svgUrl,
      hasUrl: !!row.url,
      hasRegionMap: !!row.regionMapUrl,
      hasRegionsJson: !!row.regionsJson,
    };
    lastFlags = flags;

    if (
      flags.hasSvg &&
      flags.hasUrl &&
      flags.hasRegionMap &&
      flags.hasRegionsJson
    ) {
      if (attempts > 1) {
        console.log(
          `[/publish/v2] row ready for ${coloringImageId} after ${attempts} polls (${Math.round((Date.now() - startedAt) / 1000)}s)`,
        );
      }
      return row as V2Row;
    }

    // Log on first miss so it's clear we're waiting (not crashing).
    if (attempts === 1) {
      console.log(
        `[/publish/v2] row ${coloringImageId} not ready yet, polling: ${JSON.stringify(flags)}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  return { notReady: lastFlags };
};

/**
 * Generate the per-render audio bundle (background music + kid + adult
 * voiceover) for a V2 reel. Mirrors the V1 flow at /publish/reel — every
 * render gets its own ambient track (proxied from the row's
 * `backgroundMusicUrl`) and its own freshly-TTS'd voice clips.
 *
 * Non-fatal: any individual piece can fail and we still return what we have.
 * Reels render fine without music or without voice; they just feel less
 * polished. Failure cases are logged (Sentry catches uncaughts via onError).
 */
const buildV2ReelAudio = async (args: {
  imageId: string;
  prompt: string;
  imageTitle: string | null;
  ambientUrl: string | null;
  port: number;
  /**
   * 'text' / 'image' / 'voice' — only used for log prefixes and to skip
   * the kid voiceover for the voice variant (which already has its own
   * Q1/Q2/A1/A2 conversation audio).
   */
  variant: V2Variant;
}): Promise<{
  backgroundMusicUrl?: string;
  kidVoiceUrl?: string;
  adultVoiceUrl?: string;
}> => {
  const { imageId, prompt, imageTitle, ambientUrl, port, variant } = args;
  const tag = `[/publish/v2:${variant}]`;

  let backgroundMusicUrl: string | undefined;
  if (ambientUrl) {
    try {
      const res = await fetch(ambientUrl);
      if (!res.ok) throw new Error(`ambient fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const ambientPath = resolve(
        WORKER_OUT_DIR,
        `${Date.now()}-${imageId}-ambient.mp3`,
      );
      await writeFile(ambientPath, buf);
      backgroundMusicUrl = `http://localhost:${port}/tmp/${ambientPath.split("/").pop()}`;
      console.log(
        `${tag} ambient proxied: ${backgroundMusicUrl} (${buf.length} bytes)`,
      );
    } catch (err) {
      console.warn(
        `${tag} ambient download failed (continuing without music):`,
        err,
      );
    }
  }

  let kidVoiceUrl: string | undefined;
  let adultVoiceUrl: string | undefined;
  try {
    // Voice reel already has its own Q1/Q2/A1/A2 conversation audio — it
    // only needs the adult outro line, no kid early line. Treat voice as
    // "text" for script generation; we'll just discard script.earlyLine.
    const scriptMode = variant === "image" ? "image" : "text";
    const script = await generateReelScript({
      prompt,
      imageTitle,
      mode: scriptMode,
    });
    console.log(`${tag} script:`, script);

    const kidVoiceId = process.env.ELEVENLABS_KID_VOICE_ID;
    const adultVoiceId = process.env.ELEVENLABS_ADULT_VOICE_ID;
    if (!kidVoiceId || !adultVoiceId) {
      console.log(`${tag} skipping voiceover — ELEVENLABS_*_VOICE_ID not set`);
      return { backgroundMusicUrl };
    }

    const stamp = Date.now();
    const adultPath = resolve(WORKER_OUT_DIR, `${stamp}-${imageId}-adult.mp3`);

    if (variant === "voice") {
      await generateVoiceClip({
        text: script.adultLine,
        voiceId: adultVoiceId,
        outputPath: adultPath,
      });
      adultVoiceUrl = `http://localhost:${port}/tmp/${adultPath.split("/").pop()}`;
      console.log(`${tag} adult outro voice ready: ${adultVoiceUrl}`);
    } else {
      // text + image: generate the early line + adult outro in parallel.
      // For image variant, earlyVoice='adult' so the "kid" slot is actually
      // adult-spoken (parent-y reaction to the photo).
      const earlyPath = resolve(
        WORKER_OUT_DIR,
        `${stamp + 1}-${imageId}-early.mp3`,
      );
      const earlyVoiceId =
        script.earlyVoice === "adult" ? adultVoiceId : kidVoiceId;
      await Promise.all([
        generateVoiceClip({
          text: script.earlyLine,
          voiceId: earlyVoiceId,
          outputPath: earlyPath,
        }),
        generateVoiceClip({
          text: script.adultLine,
          voiceId: adultVoiceId,
          outputPath: adultPath,
        }),
      ]);
      // Comp prop is still called `kidVoiceUrl` for both variants — only the
      // speaker behind the file changes (kid for text, adult for image).
      kidVoiceUrl = `http://localhost:${port}/tmp/${earlyPath.split("/").pop()}`;
      adultVoiceUrl = `http://localhost:${port}/tmp/${adultPath.split("/").pop()}`;
      console.log(
        `${tag} voice clips ready: early(${script.earlyVoice})=${kidVoiceUrl} adult=${adultVoiceUrl}`,
      );
    }
  } catch (err) {
    console.error(`${tag} voiceover generation failed (continuing):`, err);
  }

  return { backgroundMusicUrl, kidVoiceUrl, adultVoiceUrl };
};

app.post("/publish/v2", async (c) => {
  const body = await c.req
    .json<{ coloringImageId?: string; variant?: string }>()
    .catch(() => ({}) as { coloringImageId?: string; variant?: string });

  const { coloringImageId, variant } = body;

  if (!coloringImageId || typeof coloringImageId !== "string") {
    return c.json({ error: "coloringImageId required" }, 400);
  }
  if (!isV2Variant(variant)) {
    return c.json(
      { error: `variant must be text|image|voice, got ${String(variant)}` },
      400,
    );
  }

  // produce-v2 fires this endpoint immediately after creating the row,
  // but the derived assets (svg trace, region store, colored webp) are
  // generated asynchronously by other worker endpoints over the next
  // ~3-5min. Poll until the row has everything we need, then proceed.
  // Bail after 8min — by then something is wrong upstream and the caller
  // is long gone anyway (45s ack timeout on the web side).
  const row = await waitForRowReady(coloringImageId, 8 * 60 * 1000);
  if (!row) {
    return c.json({ error: `coloringImage ${coloringImageId} not found` }, 404);
  }
  if ("notReady" in row) {
    return c.json(
      {
        error: "row not ready for reel render after timeout",
        details: row.notReady,
      },
      400,
    );
  }

  console.log(
    `[/publish/v2] starting render: variant=${variant} coloringImageId=${coloringImageId} title="${row.title}"`,
  );

  await mkdir(WORKER_OUT_DIR, { recursive: true });

  // Proxy R2 URLs through localhost so Remotion's headless Chromium can
  // fetch them. Same pattern as V1 (ambient.mp3 proxy at line ~600).
  const proxyOpts = { cacheDir: WORKER_OUT_DIR, port };
  const [proxiedSvg, proxiedRegionMap, proxiedFinishedImage] =
    await Promise.all([
      proxyToLocal(row.svgUrl, proxyOpts),
      proxyToLocal(row.regionMapUrl, proxyOpts),
      proxyToLocal(row.url, proxyOpts),
    ]);

  const stamp = Date.now();
  const outputPath = `${WORKER_OUT_DIR}/${row.id}-v2-${variant}-${stamp}.mp4`;

  // The `regionsJson` column is `String` in Prisma (Postgres `text`), not
  // `Json`. Prisma returns it as a raw string — the comp's loadFixture
  // expects a parsed object with `.regions: [...]`. Parse here so each
  // variant branch passes the right shape.
  const parsedRegionsJson =
    typeof row.regionsJson === "string"
      ? JSON.parse(row.regionsJson)
      : row.regionsJson;

  // Pick the healthiest palette variant ONCE so the cover thumbnail and
  // the on-camera Magic Brush reveal stay visually consistent. Default
  // is `realistic` — most natural-looking thumbnail for social — with
  // automatic fallback when that variant collapsed to <3 distinct hexes
  // during region-store generation. See `palette.ts` for the heuristic.
  const palettePick = pickBestPalette(parsedRegionsJson, {
    preferred: "realistic",
    minDistinctColors: 3,
  });
  console.log(
    `[/publish/v2] palette: chose "${palettePick.variant}" (${palettePick.distinctColors} distinct${palettePick.fellBack ? `; fell back from realistic` : ""}) — counts=${JSON.stringify(palettePick.counts)}`,
  );
  const bestPalette = palettePick.variant;

  // Resolve the ~8-word "kid-typed" version of this image's title +
  // description. Same string is:
  //   - typed into the on-screen textarea (text variant only)
  //   - read verbatim by the kid voiceover (text + image variants)
  // Voice variant gets its own A1/A2 conversation audio, so we don't use
  // shortPrompt for that variant's script generation. Compute once anyway
  // because reelAudio still needs *some* prompt for the adult outro line.
  const shortPrompt = await shortenPromptForReel({
    title: row.title,
    description: row.description,
  });
  console.log(
    `[/publish/v2] shortPrompt resolved: "${shortPrompt}" (variant=${variant})`,
  );

  // Generate the per-render audio bundle (ambient music + kid + adult
  // voice) before kicking off the render — same flow as V1's /publish/reel.
  // The comp passes through audio URLs as inputProps; `undefined` skips
  // the corresponding `<Audio>` tag inside the reel composition.
  const reelAudio = await buildV2ReelAudio({
    imageId: row.id,
    prompt: shortPrompt,
    imageTitle: row.title,
    ambientUrl: row.backgroundMusicUrl,
    port,
    variant,
  });

  // Branch on variant: build the right inputProps + call the right
  // renderer. Audio fixtures (voice variant) generate before render so
  // the comp's delayRender boundary doesn't time out fetching them.
  try {
    if (variant === "text") {
      const { TEXT_REEL_DURATION_FRAMES, TEXT_REEL_FPS } = await import(
        "./video/v2/TextDemoReelV2.js"
      );
      await renderTextDemoReelV2({
        prompt: shortPrompt,
        finishedImageUrl: proxiedFinishedImage,
        regionMapUrl: proxiedRegionMap,
        regionMapWidth: row.regionMapWidth ?? 1024,
        regionMapHeight: row.regionMapHeight ?? 1024,
        regionsJson: parsedRegionsJson,
        svgUrl: proxiedSvg,
        paletteVariant: bestPalette,
        backgroundMusicUrl: reelAudio.backgroundMusicUrl,
        kidVoiceUrl: reelAudio.kidVoiceUrl,
        adultVoiceUrl: reelAudio.adultVoiceUrl,
        outputPath,
        durationInFrames: TEXT_REEL_DURATION_FRAMES,
        fps: TEXT_REEL_FPS,
      });
    } else if (variant === "image") {
      const { IMAGE_REEL_DURATION_FRAMES, IMAGE_REEL_FPS } = await import(
        "./video/v2/ImageDemoReelV2.js"
      );
      // Look up which photo this image came from. produce-v2 stores
      // photo_library_entries.id alongside the image generation; here we
      // find the most-recent library entry whose lastUsed timestamp
      // matches this image's createdAt, falling back to a random kid-safe
      // photo if no exact match. Cron flow guarantees the match in
      // practice.
      const libraryRow = await db.$queryRaw<
        Array<{ id: string; url: string }>
      >`SELECT id, url
        FROM photo_library_entries
        WHERE brand = 'CHUNKY_CRAYON' AND safe = true
        ORDER BY "lastUsed" DESC NULLS LAST
        LIMIT 1`;
      const photoUrl = libraryRow[0]?.url;
      if (!photoUrl) {
        return c.json({ error: "no photo library entries available" }, 500);
      }
      const proxiedPhoto = await proxyToLocal(photoUrl, proxyOpts);

      await renderImageDemoReelV2({
        sourcePhotoUrl: proxiedPhoto,
        photoFilename: "photo.jpg",
        finishedImageUrl: proxiedFinishedImage,
        regionMapUrl: proxiedRegionMap,
        regionMapWidth: row.regionMapWidth ?? 1024,
        regionMapHeight: row.regionMapHeight ?? 1024,
        regionsJson: parsedRegionsJson,
        svgUrl: proxiedSvg,
        paletteVariant: bestPalette,
        backgroundMusicUrl: reelAudio.backgroundMusicUrl,
        kidVoiceUrl: reelAudio.kidVoiceUrl,
        adultVoiceUrl: reelAudio.adultVoiceUrl,
        outputPath,
        durationInFrames: IMAGE_REEL_DURATION_FRAMES,
        fps: IMAGE_REEL_FPS,
      });
    } else {
      // voice variant — synthesise the conversation, generate audio,
      // proxy through localhost, render.
      const { VOICE_REEL_DURATION_FRAMES, VOICE_REEL_FPS } = await import(
        "./video/v2/VoiceDemoReelV2.js"
      );

      const answers = await synthesiseVoiceAnswers({
        title: row.title ?? "",
        description: row.description ?? "",
      });
      console.log(
        `[/publish/v2] voice answers synthesised: A1="${answers.firstAnswer}" A2="${answers.secondAnswer}"`,
      );

      const fixtures = await buildVoiceReelFixtures({
        imageId: row.id,
        firstAnswer: answers.firstAnswer,
        secondAnswer: answers.secondAnswer,
        outDir: WORKER_OUT_DIR,
      });

      // Proxy all four audio URLs (Q1 + Q2 + A1 + A2) through localhost.
      const [pQ1, pQ2, pA1, pA2] = await Promise.all([
        proxyToLocal(fixtures.q1AudioUrl, proxyOpts),
        proxyToLocal(fixtures.q2AudioUrl, proxyOpts),
        proxyToLocal(fixtures.a1AudioUrl, proxyOpts),
        proxyToLocal(fixtures.a2AudioUrl, proxyOpts),
      ]);

      await renderVoiceDemoReelV2({
        firstAnswer: answers.firstAnswer,
        secondAnswer: answers.secondAnswer,
        finishedImageUrl: proxiedFinishedImage,
        regionMapUrl: proxiedRegionMap,
        regionMapWidth: row.regionMapWidth ?? 1024,
        regionMapHeight: row.regionMapHeight ?? 1024,
        regionsJson: parsedRegionsJson,
        svgUrl: proxiedSvg,
        paletteVariant: bestPalette,
        q1AudioUrl: pQ1,
        q2AudioUrl: pQ2,
        a1AudioUrl: pA1,
        a2AudioUrl: pA2,
        backgroundMusicUrl: reelAudio.backgroundMusicUrl,
        adultVoiceUrl: reelAudio.adultVoiceUrl,
        outputPath,
        durationInFrames: VOICE_REEL_DURATION_FRAMES,
        fps: VOICE_REEL_FPS,
      });
    }
  } catch (err) {
    console.error(`[/publish/v2] render failed:`, err);
    return c.json(
      {
        error: "render_failed",
        details: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }

  // Upload mp4 + cover JPEG to R2 + write demoReelUrl/CoverUrl/StoryUrl.
  // Same shape as V1 path so the per-platform post crons work unchanged.
  // Cover + story aren't blocking — if either fails, we still ship the reel
  // and let post-time fallbacks handle missing fields (post route already
  // handles `?? undefined` for cover and falls back to demoReelUrl for story).
  let publishedUrl: string;
  let publishedCoverUrl: string | undefined;
  try {
    const mp4Buffer = await readFile(outputPath);
    const r2Key = `reels/demo-v2/${row.id}-${stamp}-${variant}.mp4`;
    const { url } = await put(r2Key, mp4Buffer, {
      contentType: "video/mp4",
      access: "public",
    });
    publishedUrl = url;
    console.log(`[/publish/v2] uploaded mp4 to R2: ${url}`);

    // Cover: build the same flat-fill region-store composite the viewer
    // sees at the end of the Magic Brush sweep — line art over palette
    // colours. Mirrors V1's runtime canvas composite (drawing canvas +
    // image canvas multiply blend) but reconstructed in pure Node from
    // the same R2 inputs the Remotion comp uses.
    //
    // Falls back gracefully on failure; post route already handles a
    // missing demoReelCoverUrl by using a default IG/FB video frame.
    try {
      const jpegBuf = await buildDemoReelCover({
        regionMapUrl: row.regionMapUrl,
        regionMapWidth: row.regionMapWidth ?? 1024,
        regionMapHeight: row.regionMapHeight ?? 1024,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        regionsJson: parsedRegionsJson as any,
        svgUrl: row.svgUrl,
        paletteVariant: bestPalette,
      });
      const coverKey = `reels/demo-v2/${row.id}-${stamp}-${variant}-cover.jpg`;
      const { url: coverUrl } = await put(coverKey, jpegBuf, {
        contentType: "image/jpeg",
        access: "public",
      });
      publishedCoverUrl = coverUrl;
      console.log(
        `[/publish/v2] uploaded cover to R2: ${coverUrl} (${jpegBuf.byteLength} bytes, region-store fill)`,
      );
    } catch (err) {
      console.warn(
        "[/publish/v2] cover upload failed (continuing without):",
        err instanceof Error ? err.message : err,
      );
    }

    await db.coloringImage.update({
      where: { id: row.id },
      data: {
        demoReelUrl: url,
        // V2 reels are ~28s — well under IG Stories' 60s cap. Use the same
        // URL for stories; no separate trim like V1 needed.
        demoReelStoryUrl: url,
        ...(publishedCoverUrl ? { demoReelCoverUrl: publishedCoverUrl } : {}),
        // Writeback drives the produce-v2 cron's rotation: read the most
        // recent demoReelVariant value, pick the next in cycle.
        demoReelVariant:
          variant === "text" ? "TEXT" : variant === "image" ? "IMAGE" : "VOICE",
      },
    });
  } catch (err) {
    console.error(`[/publish/v2] R2 upload / DB write failed:`, err);
    return c.json(
      {
        error: "upload_failed",
        details: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }

  return c.json({
    ok: true,
    variant,
    coloringImageId,
    title: row.title,
    rendered: true,
    publishedUrl,
    publishedCoverUrl,
  });
});

/**
 * POST /jobs/content-reel/publish
 *
 * Render + publish a single ContentReel by id. Caller (Vercel daily
 * cron) supplies just `{ id }`; worker reads the row, generates voice
 * clips via ElevenLabs, renders the appropriate Remotion template (Shock /
 * Warm / Quiet, dispatched per category), builds a Satori cover JPEG,
 * uploads both to R2, writes back reelUrl/coverUrl/postedAt onto the row.
 *
 * Mirrors /publish/v2's shape but for the simpler stat/fact/tip/myth
 * pipeline — no Playwright recording, no canvas reveal, no region
 * store. Just voice + Remotion + Satori.
 *
 * Body: { id: string }
 * Returns: { reelUrl, coverUrl, template, durationSecs }
 */
/**
 * POST /jobs/content-reel/refresh-fact-checks
 *
 * Weekly cron — re-verifies any ContentReel row whose factCheckedAt is
 * older than 180 days. Items downgraded to LOW or `recommendation: drop`
 * go inactive automatically because the publish gate filters them out;
 * the worker logs a warning so operators see the breadcrumb.
 *
 * Returns the refresh summary (totals, drops list) so the Vercel cron
 * can include it in any admin alerting downstream.
 */
app.post("/jobs/content-reel/refresh-fact-checks", async (c) => {
  const { refreshStaleFactChecks } = await import(
    "./content-reel/refreshFactChecks.js"
  );
  try {
    const summary = await refreshStaleFactChecks();
    return c.json({ ok: true, ...summary });
  } catch (err) {
    console.error(`[/jobs/content-reel/refresh-fact-checks] failed:`, err);
    return c.json(
      {
        ok: false,
        error: "refresh_failed",
        details: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});

/**
 * POST /jobs/content-reel/pick-and-publish
 *
 * Daily-publish entrypoint — Vercel cron triggers this once per day.
 * Worker reads the DB, picks today's reel via rotation + 30d dedup,
 * then runs the full publish pipeline (voice → render → cover → R2 →
 * DB writeback).
 *
 * Body (optional): { brand?: "CHUNKY_CRAYON" | "COLORING_HABITAT" }
 *
 * Returns 202 with job acceptance immediately; full render runs detached
 * so the Vercel cron's <60s window doesn't block the worker. Caller
 * receives reelUrl/coverUrl on the row when DB writeback completes.
 */
app.post("/jobs/content-reel/pick-and-publish", async (c) => {
  const body = (await c.req
    .json<{ brand?: unknown }>()
    .catch(() => ({}) as { brand?: unknown })) as { brand?: unknown };
  const brand =
    body.brand === "COLORING_HABITAT" ? "COLORING_HABITAT" : "CHUNKY_CRAYON";

  const { pickTodaysContentReel } = await import("./content-reel/pick.js");
  const { publishContentReel } = await import("./content-reel/publish.js");
  const port = parseInt(process.env.PORT ?? "3030", 10);

  const reel = await pickTodaysContentReel({ brand });
  if (!reel) {
    console.warn(
      `[/jobs/content-reel/pick-and-publish] no candidates for brand=${brand}`,
    );
    return c.json({ ok: false, error: "no_candidates" }, 200);
  }

  // Detached render — same fire-and-forget pattern as daily-image. The
  // ack response confirms the worker accepted the job; the render runs
  // in the background and updates the row when complete.
  publishContentReel({ id: reel.id, port }).catch((err) => {
    console.error(
      `[/jobs/content-reel/pick-and-publish] detached publish failed for ${reel.id}:`,
      err,
    );
  });

  return c.json(
    {
      ok: true,
      accepted: true,
      id: reel.id,
      kind: reel.kind,
    },
    202,
  );
});

app.post("/jobs/content-reel/publish", async (c) => {
  const body = (await c.req
    .json<{
      id?: unknown;
      hookVoiceId?: unknown;
      payoffVoiceId?: unknown;
    }>()
    .catch(
      () =>
        ({}) as {
          id?: unknown;
          hookVoiceId?: unknown;
          payoffVoiceId?: unknown;
        },
    )) as {
    id?: unknown;
    hookVoiceId?: unknown;
    payoffVoiceId?: unknown;
  };
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return c.json({ error: "id required (string)" }, 400);
  }
  const hookVoiceIdOverride =
    typeof body.hookVoiceId === "string" ? body.hookVoiceId : undefined;
  const payoffVoiceIdOverride =
    typeof body.payoffVoiceId === "string" ? body.payoffVoiceId : undefined;

  // Lazy import — keeps the dotted Remotion bundler off the cold path
  // for routes that don't render content reels.
  const { publishContentReel } = await import("./content-reel/publish.js");
  const port = parseInt(process.env.PORT ?? "3030", 10);

  try {
    const result = await publishContentReel({
      id,
      port,
      hookVoiceIdOverride,
      payoffVoiceIdOverride,
    });
    return c.json({ ok: true, ...result });
  } catch (err) {
    console.error(`[/jobs/content-reel/publish] failed:`, err);
    return c.json(
      {
        error: "publish_failed",
        details: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});

/**
 * POST /jobs/coloring-image/start
 *
 * Canvas-as-loader entrypoint. Vercel side has already:
 *   - auth-checked the user
 *   - debited credits
 *   - INSERT'd a coloring_images row with status=GENERATING
 *   - built the fully-baked OpenAI prompt + style refs
 *
 * Body: StartJobInput (see coloring-image/jobs.ts).
 *
 * Returns 202 immediately. The OpenAI stream + persist runs detached so
 * that browser tab close / refresh don't kill generation. Browsers watch
 * progress via /sse/coloring-image/:id (proxied through Vercel).
 */
app.post("/jobs/coloring-image/start", async (c) => {
  const body = await c.req
    .json<Partial<StartJobInput>>()
    .catch(() => ({}) as Partial<StartJobInput>);

  if (!body.coloringImageId || typeof body.coloringImageId !== "string") {
    return c.json({ error: "coloringImageId required" }, 400);
  }
  if (!body.prompt || typeof body.prompt !== "string") {
    return c.json({ error: "prompt required" }, 400);
  }
  if (
    !body.brand ||
    (body.brand !== "CHUNKY_CRAYON" && body.brand !== "COLORING_HABITAT")
  ) {
    return c.json(
      { error: "brand must be CHUNKY_CRAYON or COLORING_HABITAT" },
      400,
    );
  }
  if (typeof body.creditCost !== "number" || body.creditCost < 0) {
    return c.json({ error: "creditCost must be a non-negative number" }, 400);
  }

  const hasRefs =
    Array.isArray(body.referenceImageUrls) &&
    body.referenceImageUrls.length > 0;
  const hasInline =
    Array.isArray(body.imagesInline) && body.imagesInline.length > 0;
  if (!hasRefs && !hasInline) {
    return c.json(
      {
        error:
          "either referenceImageUrls (text/voice) or imagesInline (photo) required",
      },
      400,
    );
  }

  const input: StartJobInput = {
    coloringImageId: body.coloringImageId,
    prompt: body.prompt,
    referenceImageUrls: body.referenceImageUrls,
    imagesInline: body.imagesInline,
    description: body.description ?? "",
    locale: body.locale,
    brand: body.brand,
    creditCost: body.creditCost,
    size: body.size,
    quality: body.quality,
    partialImages: body.partialImages,
  };

  console.log(
    `[/jobs/coloring-image/start] queued ${input.coloringImageId} (${
      hasInline
        ? `inline=${body.imagesInline!.length}`
        : `refs=${body.referenceImageUrls!.length}`
    })`,
  );

  startColoringImageJob(input);

  return c.json({ ok: true, coloringImageId: input.coloringImageId }, 202);
});

/**
 * GET /sse/coloring-image/:id
 *
 * Browser-facing SSE — proxied through Vercel `/api/coloring-image/[id]/events`
 * (which auth-checks the user). Emits an event every time the row's
 * pg_notify fires, plus an initial event with current row state so a
 * late-arriving subscriber doesn't have to wait for the next update.
 *
 * Closes when status hits READY or FAILED.
 *
 * Event shape:
 *   { type: 'state', status, streamingPartialUrl, streamingProgress,
 *     url, svgUrl, failureReason }
 */
app.get("/sse/coloring-image/:id", async (c) => {
  const id = c.req.param("id");
  if (!id) return c.json({ error: "id required" }, 400);

  return streamSSE(c, async (stream) => {
    type Unsub = () => void;
    // Hold the unsubscribe in a ref-style object so TS doesn't narrow
    // away its callable type after the closure assignment inside subscribe().
    const unsubRef: { fn: Unsub | null } = { fn: null };
    let closed = false;

    const readAndEmit = async (): Promise<"keep" | "stop"> => {
      const row = await db.coloringImage.findUnique({
        where: { id },
        select: {
          status: true,
          streamingPartialUrl: true,
          streamingProgress: true,
          url: true,
          svgUrl: true,
          failureReason: true,
        },
      });

      if (!row) {
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ type: "error", message: "not_found" }),
        });
        return "stop";
      }

      await stream.writeSSE({
        event: "state",
        data: JSON.stringify({ type: "state", ...row }),
      });

      // Terminal states close the stream — caller's EventSource sees the
      // close and stops trying to reconnect. State is already in the row,
      // so refreshing the page reads it directly without reopening SSE.
      if (row.status === "READY" || row.status === "FAILED") {
        return "stop";
      }
      return "keep";
    };

    // Initial emit — covers the case where the browser opens SSE after
    // the worker already advanced past 1+ partials, so we don't show a
    // blank canvas until the next notify lands.
    try {
      const initial = await readAndEmit();
      if (initial === "stop") return;
    } catch (err) {
      console.error(`[/sse/${id}] initial read failed:`, err);
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        }),
      });
      return;
    }

    // Hold the stream open until terminal-state OR client disconnects.
    // streamSSE resolves the inner promise => closes the response. We
    // gate progression on a manual deferred so notify-driven re-emits
    // can flag completion.
    const done = new Promise<void>((resolve) => {
      const handle = async () => {
        if (closed) return;
        try {
          const next = await readAndEmit();
          if (next === "stop") {
            closed = true;
            resolve();
          }
        } catch (err) {
          console.error(`[/sse/${id}] re-read failed:`, err);
          // Don't close — let the next notify retry. Browsers tolerate
          // intermittent gaps.
        }
      };

      void subscribe(id, handle).then((u: Unsub) => {
        if (closed) {
          // We already finished (e.g. row was terminal on initial read);
          // unsubscribe immediately.
          u();
          return;
        }
        unsubRef.fn = u;
      });

      // Hard cap — browsers also have their own EventSource timeout, but
      // a worker holding open dead connections forever is a leak waiting
      // to happen. 10 min covers worst-case generation + a buffer.
      setTimeout(
        () => {
          if (closed) return;
          closed = true;
          resolve();
        },
        10 * 60 * 1000,
      );
    });

    await done;
    if (unsubRef.fn) unsubRef.fn();
  });
});

const port = parseInt(process.env.PORT ?? "3030", 10);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`[chunky-crayon-worker] listening on http://0.0.0.0:${port}`);
});
