/**
 * publishOrganicPost — voice → render → cover → R2 → DB writeback.
 *
 * The organic engine REUSES the ContentReel reel renderer + cover by
 * mapping an OrganicPost row onto the in-memory ContentReel shape. The
 * only impedance mismatch is the category enum (organic adds news
 * categories the cover/template don't know), so we map each organic
 * category to its nearest ContentReel category purely for template +
 * cover purposes. The actual copy (hook/payoff/centerBlock/coverTeaser)
 * passes through unchanged.
 *
 * Mirrors content-reel/publish.ts step-for-step; see that file for the
 * ffprobe-duration + detached-render rationale.
 */

import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { db } from "@one-colored-pixel/db";
import { put } from "@one-colored-pixel/storage";
import type { OrganicPost as PrismaOrganicPost } from "@one-colored-pixel/db";

import { buildContentReelCover } from "../video/content-reel/shared/cover.js";
import type {
  ContentReel,
  ContentReelCategory,
  ContentReelTemplate,
} from "../video/content-reel/shared/types.js";
import { renderContentReel } from "../video/render.js";
import { generateVoiceClip } from "../voice/elevenlabs.js";

const WORKER_OUT_DIR = "/tmp/chunky-crayon-worker";

// Organic category (SCREAMING_SNAKE from Prisma) -> the nearest existing
// ContentReel category, used ONLY to pick a cover/template treatment. The
// reel copy itself is unaffected by this mapping.
const ORGANIC_TO_REEL_CATEGORY: Record<string, ContentReelCategory> = {
  SCHOOL_POLICY: "attention",
  SCREEN_TIME: "screen-time",
  READING_LITERACY: "creativity",
  CHILDCARE_COST: "attention",
  SCHOOL_FOOD: "attention",
  HOMEWORK: "parenting-tip",
  TEACHER_SUPPORT: "family-bonding",
  CHILDHOOD_PLAY: "creativity",
  BABY_NAMES: "family-bonding",
  MILESTONES: "brain-development",
  CREATIVITY: "creativity",
  NOSTALGIA: "family-bonding",
};

const TEMPLATE_FROM_DB: Record<string, ContentReelTemplate> = {
  SHOCK: "shock",
  WARM: "warm",
  QUIET: "quiet",
};

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
        reject(new Error(`ffprobe exited ${code}: ${stderr.slice(-500)}`));
        return;
      }
      const secs = parseFloat(stdout.trim());
      if (Number.isNaN(secs) || secs <= 0) {
        reject(new Error(`ffprobe invalid duration: ${stdout.trim()}`));
        return;
      }
      resolve(secs);
    });
    proc.on("error", reject);
  });
}

/** The render template — content-reel trio plus the organic news template. */
type OrganicRenderTemplate = ContentReelTemplate | "news";

/** Map an OrganicPost row to the in-memory ContentReel the renderer wants. */
function toReelShape(row: PrismaOrganicPost): {
  reel: ContentReel;
  template: OrganicRenderTemplate;
} {
  // NEWS posts use the dedicated news template (readable key-detail card,
  // no giant hero word). DATASET posts behave like a stat/fact reel and
  // use a content-reel template (warm by default, or an explicit override).
  const template: OrganicRenderTemplate =
    row.engine === "NEWS"
      ? "news"
      : row.templateOverride
        ? TEMPLATE_FROM_DB[row.templateOverride]
        : "warm";
  const reel: ContentReel = {
    id: row.id,
    // Organic posts aren't stat/fact/tip/myth; "fact" gives the calmest
    // reveal treatment for the DATASET path. News ignores kind entirely.
    kind: "fact",
    hook: row.hook,
    payoff: row.payoff,
    centerBlock: row.centerBlock,
    coverTeaser: row.coverTeaser ?? undefined,
    sourceTitle: row.sourceTitle ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
    category: ORGANIC_TO_REEL_CATEGORY[row.category] ?? "creativity",
    // Cover/template treatment for the content-reel path. For news, the
    // cover still uses a content-reel template under the hood (it doesn't
    // render the hero word), so map to a real ContentReelTemplate.
    templateOverride:
      template === "news" ? "warm" : (template as ContentReelTemplate),
  };
  return { reel, template };
}

export type PublishOrganicPostOptions = {
  id: string;
  port: number;
};

export type PublishOrganicPostResult = {
  id: string;
  reelUrl: string;
  coverUrl: string;
  durationSecs: number;
};

export async function publishOrganicPost(
  opts: PublishOrganicPostOptions,
): Promise<PublishOrganicPostResult> {
  const { id, port } = opts;
  const tag = `[publishOrganicPost:${id}]`;

  const row = await db.organicPost.findUnique({ where: { id } });
  if (!row) throw new Error(`OrganicPost not found: ${id}`);
  if (row.safetyVerdict !== "APPROVED") {
    throw new Error(`${tag} refusing to publish non-approved post`);
  }

  const { reel, template } = toReelShape(row);
  console.log(`${tag} engine=${row.engine} template=${template}`);

  // Voice — reuse the content-reel voice cast.
  const hookVoiceId =
    process.env.ELEVENLABS_CONTENT_REEL_HOOK_VOICE_ID ??
    process.env.ELEVENLABS_KID_VOICE_ID;
  const payoffVoiceId =
    process.env.ELEVENLABS_CONTENT_REEL_PAYOFF_VOICE_ID ??
    process.env.ELEVENLABS_ADULT_VOICE_ID;
  if (!hookVoiceId || !payoffVoiceId) {
    throw new Error(`${tag} ElevenLabs voice IDs not set`);
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
      voiceId: hookVoiceId,
      outputPath: hookPath,
    }),
    generateVoiceClip({
      text: reel.payoff,
      voiceId: payoffVoiceId,
      outputPath: payoffPath,
    }),
  ]);
  const [hookSecs, payoffSecs] = await Promise.all([
    probeAudioDurationSecs(hookPath),
    probeAudioDurationSecs(payoffPath),
  ]);

  const outputPath = path.resolve(WORKER_OUT_DIR, `${stamp}-${id}-reel.mp4`);
  await renderContentReel({
    template,
    reel: reel as unknown as Record<string, unknown>,
    hookVoiceUrl: `http://localhost:${port}/tmp/${path.basename(hookPath)}`,
    hookVoiceSeconds: hookSecs,
    payoffVoiceUrl: `http://localhost:${port}/tmp/${path.basename(payoffPath)}`,
    payoffVoiceSeconds: payoffSecs,
    outputPath,
  });

  // News posts get the dedicated news cover (no hero-number block, "Tap to
  // watch" pill); dataset posts use their content-reel template's cover.
  const coverBuf = await buildContentReelCover({
    reel,
    template: template === "news" ? "news" : (reel.templateOverride ?? "warm"),
  });

  const reelKey = `organic-posts/${row.engine.toLowerCase()}/${id}-${stamp}.mp4`;
  const coverKey = `organic-posts/${row.engine.toLowerCase()}/${id}-${stamp}-cover.jpg`;
  const reelBuf = await readFile(outputPath);
  const [{ url: reelUrl }, { url: coverUrl }] = await Promise.all([
    put(reelKey, reelBuf, { contentType: "video/mp4", access: "public" }),
    put(coverKey, coverBuf, { contentType: "image/jpeg", access: "public" }),
  ]);
  console.log(`${tag} uploaded reel=${reelUrl}`);

  await db.organicPost.update({
    where: { id },
    data: { reelUrl, coverUrl, postedAt: new Date() },
  });

  return {
    id,
    reelUrl,
    coverUrl,
    durationSecs: hookSecs + 1.5 + payoffSecs + 1.5,
  };
}
