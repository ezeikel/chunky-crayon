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
