/**
 * publishContentReel — orchestration: voice → render → cover → R2 → DB.
 *
 * Lives outside `index.ts` so the route handler stays a thin wrapper
 * (per the project's "server actions are the source of truth, routes
 * are wrappers" pattern). Tests / scripts / future re-render endpoints
 * can call this directly.
 *
 * Inputs: a ContentReel row id + the worker's local HTTP port (so the
 * Remotion render can fetch voice clips from /tmp/<file>).
 *
 * Outputs: { reelUrl, coverUrl } and writes both onto the row, marks
 * postedAt = now. Throws on any step's failure — caller decides whether
 * to alert vs retry.
 */

import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { db } from "@one-colored-pixel/db";
import { put } from "@one-colored-pixel/storage";

import { fromPrisma } from "../video/content-reel/shared/db.js";
import { templateForContentReel } from "../video/content-reel/shared/types.js";
import { buildContentReelCover } from "../video/content-reel/shared/cover.js";
import { renderContentReel } from "../video/render.js";
import { generateVoiceClip } from "../voice/elevenlabs.js";

const WORKER_OUT_DIR = "/tmp/chunky-crayon-worker";

/**
 * Probe an audio file's duration in seconds via ffprobe. The worker
 * already shells to ffmpeg for video trimming, so ffprobe is reliably
 * on PATH in production. Returns the float seconds; throws on failure
 * so the caller can fall back to a default voice duration.
 */
function probeAudioDurationSecs(filePath: string): Promise<number> {
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

export type PublishContentReelOptions = {
  /** ContentReel.id from the DB. */
  id: string;
  /** Worker's local HTTP port — used to serve voice clips into Remotion. */
  port: number;
};

export type PublishContentReelResult = {
  id: string;
  reelUrl: string;
  coverUrl: string;
  template: "shock" | "warm" | "quiet";
  durationSecs: number;
};

export async function publishContentReel(
  opts: PublishContentReelOptions,
): Promise<PublishContentReelResult> {
  const { id, port } = opts;
  const tag = `[publishContentReel:${id}]`;

  // ── 1. Read the row ──────────────────────────────────────────────
  const row = await db.contentReel.findUnique({ where: { id } });
  if (!row) throw new Error(`ContentReel not found: ${id}`);

  const reel = fromPrisma(row);
  const template = templateForContentReel(reel);
  console.log(`${tag} kind=${reel.kind} template=${template}`);

  // ── 2. Voice synthesis ──────────────────────────────────────────
  // ElevenLabs IDs come from the same env vars as demo reels — we keep
  // the same voice cast so audiences hear one consistent brand voice
  // across content + demo reels.
  const kidVoiceId = process.env.ELEVENLABS_KID_VOICE_ID;
  const adultVoiceId = process.env.ELEVENLABS_ADULT_VOICE_ID;
  if (!kidVoiceId || !adultVoiceId) {
    throw new Error(
      `${tag} ELEVENLABS_KID_VOICE_ID / ADULT_VOICE_ID must be set`,
    );
  }
  await mkdir(WORKER_OUT_DIR, { recursive: true });
  const stamp = Date.now();
  const hookPath = path.resolve(WORKER_OUT_DIR, `${stamp}-${id}-hook.mp3`);
  const payoffPath = path.resolve(
    WORKER_OUT_DIR,
    `${stamp + 1}-${id}-payoff.mp3`,
  );
  await Promise.all([
    generateVoiceClip({
      text: reel.hook,
      voiceId: kidVoiceId,
      outputPath: hookPath,
    }),
    generateVoiceClip({
      text: reel.payoff,
      voiceId: adultVoiceId,
      outputPath: payoffPath,
    }),
  ]);

  const [hookSecs, payoffSecs] = await Promise.all([
    probeAudioDurationSecs(hookPath),
    probeAudioDurationSecs(payoffPath),
  ]);
  console.log(
    `${tag} voice ready: hook=${hookSecs.toFixed(2)}s payoff=${payoffSecs.toFixed(2)}s`,
  );

  // ── 3. Render mp4 ────────────────────────────────────────────────
  const outputPath = path.resolve(WORKER_OUT_DIR, `${stamp}-${id}-reel.mp4`);
  const hookVoiceUrl = `http://localhost:${port}/tmp/${path.basename(hookPath)}`;
  const payoffVoiceUrl = `http://localhost:${port}/tmp/${path.basename(payoffPath)}`;

  await renderContentReel({
    template,
    // Pass the full reel so the in-template renderer reads kind/hook/etc.
    reel: reel as unknown as Record<string, unknown>,
    hookVoiceUrl,
    hookVoiceSeconds: hookSecs,
    payoffVoiceUrl,
    payoffVoiceSeconds: payoffSecs,
    outputPath,
  });

  // ── 4. Build cover JPEG ─────────────────────────────────────────
  const coverBuf = await buildContentReelCover({ reel, template });

  // ── 5. R2 upload ────────────────────────────────────────────────
  const reelKey = `content-reels/${reel.kind}/${id}-${stamp}.mp4`;
  const coverKey = `content-reels/${reel.kind}/${id}-${stamp}-cover.jpg`;
  const reelBuf = await readFile(outputPath);
  const [{ url: reelUrl }, { url: coverUrl }] = await Promise.all([
    put(reelKey, reelBuf, { contentType: "video/mp4", access: "public" }),
    put(coverKey, coverBuf, { contentType: "image/jpeg", access: "public" }),
  ]);
  console.log(`${tag} uploaded reel=${reelUrl} cover=${coverUrl}`);

  // ── 6. DB writeback ─────────────────────────────────────────────
  // postedAt is set HERE (render success), not later (platform post).
  // The 30d dedup window is render-based, not post-based, so a render
  // counts even if a platform post fails. Platform results land in
  // socialPostResults via a follow-up update from the cron route.
  await db.contentReel.update({
    where: { id },
    data: {
      reelUrl,
      coverUrl,
      postedAt: new Date(),
    },
  });

  return {
    id,
    reelUrl,
    coverUrl,
    template,
    durationSecs: hookSecs + 1.5 + payoffSecs + 1.5, // hook + reveal + payoff + outro
  };
}
