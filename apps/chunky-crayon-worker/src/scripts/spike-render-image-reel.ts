/**
 * Spike: render the ImageDemoReel composition from an existing webm
 * without re-running the full Playwright + photo-to-coloring flow.
 *
 * Why this exists: a full /publish/image-reel run on local dev is ~20
 * minutes (photo-to-coloring + region-store gen are slow off the
 * Hetzner box). This script takes a webm you already have and the
 * approximate flow markers (derived from your worker logs) and does
 * the trim + Remotion render in ~1 minute — enough to see the new
 * composition play end-to-end.
 *
 * Usage:
 *   cd apps/chunky-crayon-worker
 *   npx tsx --env-file=../chunky-crayon-web/.env.local src/scripts/spike-render-image-reel.ts \
 *     /tmp/chunky-crayon-worker/page@024337b20c820dd65c58389a57a8f3d6.webm
 *
 * The output mp4 lands next to the webm. Open with QuickTime to inspect.
 */
import "dotenv/config";
import { resolve, dirname, basename } from "node:path";
import { stat } from "node:fs/promises";
import { trimWebmToMp4 } from "../record/trim.js";
import { renderImageDemoReel } from "../video/render.js";

// Flow marker estimates for run-1 webm (derived from worker logs).
// All values are seconds from the start of the recording.
//
// Run 1 log excerpts (for reference):
//   [image-record] homepage loaded (4.4s)
//   [image-record] clicking photo mode tab              → typeStartMs
//   [image-record] AI description shown (11.7s since photo tab)
//   [image-record] submit clicked
//   [image-record] redirected to image ... (77.3s since submit)
//   [image-record] line art painted (80.1s)
//   [image-record] starting diagonal sweep              → brushReadyMs
//   [image-record] sweep finished (479.4s)              → sweepDoneMs
const DEFAULT_MARKERS_SECS = {
  typeStart: 5.0, // photo-tab click, right after homepage loaded (4.4s)
  submit: 8.0, // "Use This" click — ~3s after photo tab
  brushReady: 280.0, // rough — after 80s line art + region store wait + brush setup
  sweepDone: 479.4, // exact from log
};

const UPLOAD_TAIL_SECS = 1.5;
const POST_SWEEP_PAD_SECS = 1.5;
const FPS = 30;

const main = async () => {
  const webmPath = process.argv[2];
  if (!webmPath) {
    console.error("usage: spike-render-image-reel <webm-path>");
    process.exit(1);
  }

  await stat(webmPath); // throws if missing
  const outDir = dirname(webmPath);
  const stamp = Date.now();

  const uploadStartSec = DEFAULT_MARKERS_SECS.typeStart;
  const uploadEndSec = DEFAULT_MARKERS_SECS.submit + UPLOAD_TAIL_SECS;
  const uploadDurationSec = uploadEndSec - uploadStartSec;

  const revealStartSec = DEFAULT_MARKERS_SECS.brushReady;
  const revealEndSec = DEFAULT_MARKERS_SECS.sweepDone + POST_SWEEP_PAD_SECS;
  const revealDurationSec = revealEndSec - revealStartSec;

  console.log(
    `[spike] upload clip: ${uploadStartSec}s → ${uploadEndSec}s (${uploadDurationSec.toFixed(1)}s)`,
  );
  console.log(
    `[spike] reveal clip: ${revealStartSec}s → ${revealEndSec}s (${revealDurationSec.toFixed(1)}s)`,
  );

  const uploadPath = resolve(outDir, `${stamp}-spike-upload.mp4`);
  const revealPath = resolve(outDir, `${stamp}-spike-reveal.mp4`);

  console.log(`[spike] trimming upload clip → ${uploadPath}`);
  await trimWebmToMp4({
    sourcePath: webmPath,
    outputPath: uploadPath,
    startSec: uploadStartSec,
    durationSec: uploadDurationSec,
  });

  console.log(`[spike] trimming reveal clip → ${revealPath}`);
  await trimWebmToMp4({
    sourcePath: webmPath,
    outputPath: revealPath,
    startSec: revealStartSec,
    durationSec: revealDurationSec,
  });

  const port = 3030;
  // Start a tiny static server so Remotion's headless Chromium can fetch
  // the trimmed mp4s over HTTP (file:// is blocked). We piggy-back on
  // the worker's existing /tmp server convention; if the worker isn't
  // running we spin up a minimal server here.
  const http = await import("node:http");
  const { createReadStream } = await import("node:fs");
  const server = http
    .createServer((req, res) => {
      if (!req.url?.startsWith("/tmp/")) {
        res.statusCode = 404;
        res.end();
        return;
      }
      const name = req.url.slice("/tmp/".length);
      const p = resolve(outDir, name);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", "video/mp4");
      createReadStream(p)
        .on("error", () => {
          res.statusCode = 404;
          res.end();
        })
        .pipe(res);
    })
    .listen(3031, "0.0.0.0");

  const uploadVideoUrl = `http://localhost:3031/tmp/${basename(uploadPath)}`;
  const revealVideoUrl = `http://localhost:3031/tmp/${basename(revealPath)}`;

  // Optional source-photo URL (pass as argv[3]) to preview the photo
  // preview card. A local file is ideal since the tiny static server
  // above serves anything under the outDir.
  let sourcePhotoUrl: string | undefined;
  const sourcePhotoArg = process.argv[3];
  if (sourcePhotoArg) {
    const copiedName = `${stamp}-spike-source-photo${basename(sourcePhotoArg).match(/\.[a-z]+$/i)?.[0] ?? ".jpg"}`;
    const copiedPath = resolve(outDir, copiedName);
    const { copyFile } = await import("node:fs/promises");
    await copyFile(sourcePhotoArg, copiedPath);
    sourcePhotoUrl = `http://localhost:3031/tmp/${copiedName}`;
    console.log(`[spike] source photo: ${sourcePhotoUrl}`);
  }

  const uploadDurationFrames = Math.round(uploadDurationSec * FPS);
  const revealDurationFrames = Math.round(revealDurationSec * FPS);
  const introFrames = Math.round(2.0 * FPS);
  const photoPreviewFrames = sourcePhotoUrl ? Math.round(2.0 * FPS) : 0;
  const outroFrames = Math.round(2.0 * FPS);
  const durationInFrames =
    introFrames +
    photoPreviewFrames +
    uploadDurationFrames +
    revealDurationFrames +
    outroFrames;

  const outputPath = resolve(outDir, `${stamp}-spike-image-reel.mp4`);
  console.log(`[spike] rendering → ${outputPath}`);

  try {
    await renderImageDemoReel({
      sourcePhotoUrl,
      uploadVideoUrl,
      revealVideoUrl,
      uploadDurationFrames,
      revealDurationFrames,
      durationInFrames,
      outputPath,
    });
    console.log(`[spike] DONE — open ${outputPath} in QuickTime to review`);
    console.log(`[spike] (${(durationInFrames / FPS).toFixed(1)}s total)`);
  } finally {
    server.close();
  }

  process.exit(0);
};

main().catch((err) => {
  console.error("[spike] fatal:", err);
  process.exit(1);
});

void FPS; // silence unused
