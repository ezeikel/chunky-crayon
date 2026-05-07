/**
 * Probe an audio file's duration in seconds via ffprobe.
 *
 * Used by the content-reel + V2 demo-reel publish paths to size visual
 * beats around the actual voice clip length. Without this we hardcode
 * fixed beat durations (e.g. 6s typing scene) and a 6.5s voice gets
 * cut off mid-sentence — exactly the bug we hit on demo reels' first
 * voiceover.
 *
 * The worker already shells to ffmpeg for video trimming, so ffprobe
 * is reliably on PATH in production. Returns the float seconds; throws
 * on failure so the caller can fall back to a default voice duration
 * rather than silently rendering bad timing.
 */

import { spawn } from "node:child_process";

export function probeAudioDurationSecs(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (b) => (stdout += b.toString()));
    proc.stderr.on("data", (b) => (stderr += b.toString()));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `ffprobe exited ${code}: ${stderr.slice(-500)} (file=${filePath})`,
          ),
        );
        return;
      }
      const secs = parseFloat(stdout.trim());
      if (Number.isNaN(secs) || secs <= 0) {
        reject(
          new Error(`ffprobe returned invalid duration: ${stdout.trim()}`),
        );
        return;
      }
      resolve(secs);
    });
    proc.on("error", reject);
  });
}

/**
 * Probe with a fallback. Logs + returns `fallback` if ffprobe fails so
 * the render still goes out — slightly bad timing beats no reel at all.
 */
export async function probeAudioDurationOrFallback(
  filePath: string,
  fallback: number,
  tag = "[probeAudioDuration]",
): Promise<number> {
  try {
    return await probeAudioDurationSecs(filePath);
  } catch (err) {
    console.warn(
      `${tag} probe failed for ${filePath}, using fallback ${fallback}s:`,
      err instanceof Error ? err.message : err,
    );
    return fallback;
  }
}
