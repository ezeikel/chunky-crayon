import "dotenv/config";
// MUST stay above every other import. @sentry/node patches the runtime on
// init (HTTP, fs, etc.) — anything imported before this won't be traced.
import { Sentry } from "./instrument.js";
import { Hono, type Context } from "hono";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { recordColoringSession } from "./record/session.js";
import { recordImageColoringSession } from "./record/image-session.js";
import { renderDemoReel, renderImageDemoReel } from "./video/render.js";
import { trimWebmToMp4, trimReelForStory } from "./record/trim.js";
import { generateRegionStoreLocal } from "./record/region-store.js";
import { generateBackgroundMusicLocal } from "./record/background-music.js";
import { generateColoredReferenceLocal } from "./record/colored-reference.js";
import { generateFillPointsLocal } from "./record/fill-points.js";
import { db } from "@one-colored-pixel/db";
import { put } from "@one-colored-pixel/storage";
import { generateReelScript } from "./script/generate.js";
import { generateVoiceClip } from "./voice/elevenlabs.js";

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
    });
    console.log("[/publish/reel] script:", script);

    const kidPath = resolve(WORKER_OUT_DIR, `${Date.now()}-kid.mp3`);
    const adultPath = resolve(WORKER_OUT_DIR, `${Date.now() + 1}-adult.mp3`);
    const kidVoiceId = process.env.ELEVENLABS_KID_VOICE_ID;
    const adultVoiceId = process.env.ELEVENLABS_ADULT_VOICE_ID;

    if (kidVoiceId && adultVoiceId) {
      await Promise.all([
        generateVoiceClip({
          text: script.kidLine,
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
      prompt: "photo upload",
      imageTitle: imageRow?.title,
    });

    const kidPath = resolve(WORKER_OUT_DIR, `${Date.now()}-kid.mp3`);
    const adultPath = resolve(WORKER_OUT_DIR, `${Date.now() + 1}-adult.mp3`);
    const kidVoiceId = process.env.ELEVENLABS_KID_VOICE_ID;
    const adultVoiceId = process.env.ELEVENLABS_ADULT_VOICE_ID;

    if (kidVoiceId && adultVoiceId) {
      await Promise.all([
        generateVoiceClip({
          text: script.kidLine,
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

const port = parseInt(process.env.PORT ?? "3030", 10);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`[chunky-crayon-worker] listening on http://0.0.0.0:${port}`);
});
