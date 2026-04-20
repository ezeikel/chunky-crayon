import { spawn } from "node:child_process";
import { resolve } from "node:path";

/**
 * Trim a segment from a webm using ffmpeg. Re-encodes to ensure clean cut
 * boundaries (stream-copy can leave a few leading black frames when the
 * requested time doesn't land exactly on a keyframe).
 *
 * Output is MP4 (H.264 + AAC) — decodes faster in Remotion than webm and
 * lets us include audio if we later capture it.
 */
export async function trimWebmToMp4(opts: {
  sourcePath: string;
  outputPath: string;
  /** Start time in seconds. */
  startSec: number;
  /** Duration in seconds. */
  durationSec: number;
}): Promise<string> {
  const { sourcePath, outputPath, startSec, durationSec } = opts;
  await runFfmpeg([
    "-y",
    "-ss",
    String(startSec),
    "-i",
    sourcePath,
    "-t",
    String(durationSec),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an", // no audio
    outputPath,
  ]);
  return resolve(outputPath);
}

/**
 * Trim the full demo reel mp4 down to 60 seconds for IG / FB Stories.
 *
 * Instagram Stories hard-caps at 60s via the Graph API v22.0+ — uploading
 * our 69s reel as media_type=STORIES fails with error 2207082. Reels can
 * go up to 90s so the full file stays as the primary. This helper
 * produces a sibling *-story.mp4 file that keeps the first 60s (intro
 * card + typing + most of the reveal) — the most attention-grabbing
 * part anyway.
 *
 * Stream-copy (no re-encode) for speed — the source mp4 already has the
 * right codec (H.264 yuv420p, +faststart).
 */
export async function trimReelForStory(opts: {
  sourcePath: string;
  outputPath: string;
  /** Max duration in seconds for the story cut. Defaults to 60. */
  durationSec?: number;
}): Promise<string> {
  const { sourcePath, outputPath, durationSec = 60 } = opts;
  await runFfmpeg([
    "-y",
    "-i",
    sourcePath,
    "-t",
    String(durationSec),
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
  return resolve(outputPath);
}

async function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (buf) => {
      stderr += buf.toString();
    });
    proc.on("error", rejectPromise);
    proc.on("close", (code) => {
      if (code === 0) return resolvePromise();
      rejectPromise(
        new Error(
          `ffmpeg exited ${code}\nargs: ${args.join(" ")}\nstderr:\n${stderr.slice(-2000)}`,
        ),
      );
    });
  });
}
