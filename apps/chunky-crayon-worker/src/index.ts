import "dotenv/config";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { recordColoringSession } from "./record/session.js";
import { renderDemoReel } from "./video/render.js";

const WORKER_OUT_DIR = "/tmp/chunky-crayon-worker";

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

/**
 * Dev-only: re-render an existing recording without re-recording. Lets us
 * iterate on the Remotion composition without burning a 2.5min generation.
 *
 * POST /publish/render-only
 * Body: { webm_filename: string, prompt?: string, duration_ms?: number }
 */
app.post("/publish/render-only", async (c) => {
  const body = await c.req.json<{
    webm_filename: string;
    prompt?: string;
    duration_ms?: number;
  }>();
  if (!body.webm_filename)
    return c.json({ error: "webm_filename required" }, 400);

  const port = parseInt(process.env.PORT ?? "3030", 10);
  const recordedVideoUrl = `http://localhost:${port}/tmp/${body.webm_filename}`;
  const fps = 30;
  const durationInFrames = Math.ceil(
    (((body.duration_ms ?? 30_000) + 1500) / 1000) * fps,
  );

  const outputPath = resolve(WORKER_OUT_DIR, `${Date.now()}-render-only.mp4`);
  await renderDemoReel({
    recordedVideoUrl,
    prompt: body.prompt ?? "A cute panda with a flower crown",
    durationInFrames,
    outputPath,
  });

  return c.json({ ok: true, outputPath });
});

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
 * End-to-end record → render → post flow. Skeleton only — at this stage it
 * just runs the Playwright recording and returns the webm path. Remotion
 * composition, voiceover, and social posting get layered on in follow-ups.
 *
 * POST /publish/next
 * Body: { image_id: string, dry_run?: boolean, sweep?: 'diagonal' | 'horizontal' }
 */
app.post("/publish/next", async (c) => {
  const body = await c.req.json<{
    image_id?: string;
    prompt?: string;
    use_create_flow?: boolean;
    dry_run?: boolean;
    sweep?: "diagonal" | "horizontal";
  }>();

  if (!body.use_create_flow && !body.image_id) {
    return c.json(
      { error: "image_id is required (or pass use_create_flow + prompt)" },
      400,
    );
  }
  if (body.use_create_flow && !body.prompt) {
    return c.json(
      { error: "prompt is required when use_create_flow is true" },
      400,
    );
  }

  await mkdir(WORKER_OUT_DIR, { recursive: true });

  // 1. Playwright — drive /create flow (or skip to coloring page) and record.
  const origin = process.env.CC_ORIGIN ?? "http://localhost:3000";
  const recording = await recordColoringSession({
    imageId: body.image_id,
    origin,
    sweep: body.sweep ?? "diagonal",
    outDir: WORKER_OUT_DIR,
    createFlow: body.use_create_flow ? { prompt: body.prompt! } : undefined,
  });

  // 2. Remotion — composite the raw webm with a caption overlay.
  //    Serve the webm to the headless Chromium via the /tmp file server below.
  const port = parseInt(process.env.PORT ?? "3030", 10);
  const webmName = recording.webmPath.split("/").pop();
  const recordedVideoUrl = `http://localhost:${port}/tmp/${webmName}`;

  // Use the actual recording length + a small tail-hold so the final colored
  // image stays on screen for ~1.5s before the video ends.
  const fps = 30;
  const tailHoldMs = 1500;
  const durationInFrames = Math.ceil(
    ((recording.durationMs + tailHoldMs) / 1000) * fps,
  );

  const outputPath = resolve(WORKER_OUT_DIR, `${Date.now()}-reel.mp4`);
  await renderDemoReel({
    recordedVideoUrl,
    prompt: body.prompt ?? "A cute panda with a flower crown",
    durationInFrames,
    outputPath,
  });

  return c.json({
    ok: true,
    dry_run: !!body.dry_run,
    recording,
    output: {
      mp4Path: outputPath,
      url: `http://localhost:${port}/tmp/${outputPath.split("/").pop()}`,
    },
    note: "record + render only — voiceover/music/social posting still to land",
  });
});

const port = parseInt(process.env.PORT ?? "3030", 10);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`[chunky-crayon-worker] listening on http://0.0.0.0:${port}`);
});
