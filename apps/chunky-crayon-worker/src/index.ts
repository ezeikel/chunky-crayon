import "dotenv/config";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { recordColoringSession } from "./record/session.js";
import { renderDemoReel } from "./video/render.js";

const WORKER_OUT_DIR = "/tmp/chunky-crayon-worker";

/**
 * Compute final output length in frames, mirroring DemoReel's section math.
 * Keep in sync with GENERATION_SPEED in DemoReel.tsx.
 */
const GENERATION_SPEED = 8;
const TAIL_HOLD_MS = 1500;

function computeOutputFrames(
  fps: number,
  markers: {
    typeStartMs: number;
    submitMs: number;
    redirectMs: number;
    sweepDoneMs: number;
  },
): number {
  const msToFrames = (ms: number) => Math.round((ms / 1000) * fps);
  const typing = msToFrames(markers.submitMs - markers.typeStartMs);
  const waitingSource = msToFrames(markers.redirectMs - markers.submitMs);
  const waiting = Math.max(1, Math.round(waitingSource / GENERATION_SPEED));
  const reveal = msToFrames(markers.sweepDoneMs - markers.redirectMs);
  const tail = msToFrames(TAIL_HOLD_MS);
  return typing + waiting + reveal + tail;
}

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
 * Body: {
 *   webm_filename: string;
 *   prompt: string;
 *   recording_duration_ms: number;
 *   flow_markers: FlowMarkers;
 * }
 *
 * All fields required — copy them straight from a previous /publish/next
 * response. Without the markers we can't do fast-forward.
 */
app.post("/publish/render-only", async (c) => {
  const body = await c.req.json<{
    webm_filename: string;
    prompt: string;
    recording_duration_ms: number;
    flow_markers: {
      typeStartMs: number;
      submitMs: number;
      redirectMs: number;
      brushReadyMs: number;
      sweepDoneMs: number;
    };
  }>();
  if (!body.webm_filename || !body.flow_markers)
    return c.json({ error: "webm_filename and flow_markers required" }, 400);

  const port = parseInt(process.env.PORT ?? "3030", 10);
  const recordedVideoUrl = `http://localhost:${port}/tmp/${body.webm_filename}`;
  const fps = 30;
  const durationInFrames = computeOutputFrames(fps, body.flow_markers);

  const outputPath = resolve(WORKER_OUT_DIR, `${Date.now()}-render-only.mp4`);
  await renderDemoReel({
    recordedVideoUrl,
    prompt: body.prompt,
    recordingDurationMs: body.recording_duration_ms,
    flowMarkers: body.flow_markers,
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
 * End-to-end record → render → post flow.
 *
 * POST /publish/next
 * Body: { prompt: string, dry_run?: boolean, sweep?: 'diagonal' | 'horizontal' }
 *
 * Every run drives the full homepage → create → reveal flow. Costs one
 * image generation (~5p) per call. For iterating on Remotion without
 * re-recording, use POST /publish/render-only against an existing webm.
 */
app.post("/publish/next", async (c) => {
  const body = await c.req.json<{
    prompt: string;
    dry_run?: boolean;
    sweep?: "diagonal" | "horizontal";
  }>();

  if (!body.prompt) {
    return c.json({ error: "prompt is required" }, 400);
  }

  await mkdir(WORKER_OUT_DIR, { recursive: true });

  // 1. Playwright — drive the homepage create flow and record the reveal.
  const origin = process.env.CC_ORIGIN ?? "http://localhost:3000";
  const recording = await recordColoringSession({
    prompt: body.prompt,
    origin,
    sweep: body.sweep ?? "diagonal",
    outDir: WORKER_OUT_DIR,
  });

  // 2. Remotion — composite the raw webm into a time-remapped reel.
  //    Sections: typing (1×) + waiting (8× ff) + reveal (1×) + tail hold.
  //    Serve the webm to the headless Chromium via the /tmp file server.
  const port = parseInt(process.env.PORT ?? "3030", 10);
  const webmName = recording.webmPath.split("/").pop();
  const recordedVideoUrl = `http://localhost:${port}/tmp/${webmName}`;

  const fps = 30;
  const durationInFrames = computeOutputFrames(fps, recording.flowMarkers);

  const outputPath = resolve(WORKER_OUT_DIR, `${Date.now()}-reel.mp4`);
  await renderDemoReel({
    recordedVideoUrl,
    prompt: body.prompt,
    recordingDurationMs: recording.durationMs,
    flowMarkers: recording.flowMarkers,
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
