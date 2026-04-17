import "dotenv/config";
import { Hono, type Context } from "hono";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { recordColoringSession } from "./record/session.js";
import { renderDemoReel } from "./video/render.js";
import { trimWebmToMp4 } from "./record/trim.js";
import { generateRegionStoreLocal } from "./record/region-store.js";
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

// Bearer auth for /publish/* — only trusted crons should call these.
app.use("/publish/*", async (c, next) => {
  const secret = process.env.WORKER_SECRET;
  if (!secret) return next(); // local dev convenience
  if (c.req.header("authorization") !== `Bearer ${secret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
});

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
      // Generate the region store in-process on the box. Vercel's after()
      // hook times out on complex images (300s Pro cap) — running here
      // has no timeout and plenty of CPU/RAM. The Playwright session's
      // region-store poll will pick up the DB write once this finishes.
      //
      // Fire-and-forget: we don't await here so the recording can
      // continue to the line-art / canvas-sizing waits in parallel.
      console.log(
        `[/publish/reel] starting in-process region-store gen for ${id}`,
      );
      (async () => {
        // svgUrl lands after the redirect (CC traces the raster to SVG +
        // uploads to R2 inside the create flow, then runs image-metadata
        // generation). In practice this takes 90-180s on prod. Poll up
        // to 4 min before giving up.
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
            `[/publish/reel] svgUrl never appeared for ${id} — skipping region gen`,
          );
          return;
        }
        try {
          await generateRegionStoreLocal(id, row.svgUrl, {
            title: row.title ?? "",
            description: row.description ?? "",
            tags: (row.tags as string[]) ?? [],
          });
          console.log(`[/publish/reel] region-store gen done for ${id}`);
        } catch (err) {
          console.error(
            `[/publish/reel] region-store gen failed for ${id}:`,
            err instanceof Error ? err.message : err,
          );
        }
      })();
    },
  });

  // 2. Fetch the image's ambient sound URL from the DB, and use its title
  //    to prompt a better voiceover script. Every backfilled image has an
  //    ambient track; we layer it as ducked music in Remotion.
  const imageRow = await db.coloringImage.findUnique({
    where: { id: recording.imageId },
    select: { ambientSoundUrl: true, title: true },
  });
  console.log(
    `[/publish/reel] ambientSoundUrl(raw): ${imageRow?.ambientSoundUrl ?? "(none)"}  title: ${imageRow?.title ?? "(none)"}`,
  );

  const port = parseInt(process.env.PORT ?? "3030", 10);

  // Download the ambient mp3 locally so Remotion's headless Chromium loads it
  // via our /tmp server (avoids CORS/cross-origin hangs + timeouts that crash
  // the compositor).
  let ambientSoundUrl: string | undefined;
  if (imageRow?.ambientSoundUrl) {
    try {
      const res = await fetch(imageRow.ambientSoundUrl);
      if (!res.ok) throw new Error(`ambient fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const ambientPath = resolve(WORKER_OUT_DIR, `${Date.now()}-ambient.mp3`);
      const { writeFile } = await import("node:fs/promises");
      await writeFile(ambientPath, buf);
      ambientSoundUrl = `http://localhost:${port}/tmp/${ambientPath.split("/").pop()}`;
      console.log(
        `[/publish/reel] ambient proxied: ${ambientSoundUrl} (${buf.length} bytes)`,
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
  // TODO: re-enable pdfPreviewFrames once the Remotion RangeError on
  // Hetzner is resolved. For now, skip the PDF section in the render but
  // still capture the PDF preview PNG for future use.
  const durationInFrames =
    introFrames +
    typingDurationFrames +
    revealDurationFrames +
    // pdfPreviewFrames + // disabled — causes RangeError on Hetzner
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
    ambientSoundUrl,
    kidVoiceUrl,
    adultVoiceUrl,
    // pdfPreviewUrl, // disabled — causes RangeError on Hetzner
  });

  // 6. Upload mp4 + cover to R2, persist URLs on the coloringImage row so
  //    the CC social post handler can read both. Skipped on dry-run.
  const localUrl = `http://localhost:${port}/tmp/${outputPath.split("/").pop()}`;
  let publishedUrl: string | undefined;
  let publishedCoverUrl: string | undefined;
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

      await db.coloringImage.update({
        where: { id: recording.imageId },
        data: {
          demoReelUrl: url,
          ...(publishedCoverUrl ? { demoReelCoverUrl: publishedCoverUrl } : {}),
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

const port = parseInt(process.env.PORT ?? "3030", 10);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`[chunky-crayon-worker] listening on http://0.0.0.0:${port}`);
});
