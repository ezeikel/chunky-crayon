/**
 * Comic strip pipeline (Hetzner worker).
 *
 * One run produces one 4-panel strip:
 *   1. Pick a theme (avoiding recent repeats)
 *   2. Claude Opus 4.7 writes a script (JSON: title, theme, panels[4], caption)
 *   3. Script QC (Claude Opus 4.7 — text-only) — re-roll up to 2x
 *   4. For each panel: gpt-image-2 generates the image, conditioned on the
 *      participating cast members' R2 reference PNGs
 *   5. Per-panel image QC (Claude Opus 4.7 vision) — respin up to 2x per panel
 *   6. Composite a 2x2 strip.png + carousel slides
 *   7. Upload everything to R2 + persist DB row (status READY)
 *
 * Failure modes:
 *   - Script never passes QC after retries → mark QC_FAILED, alert, stop
 *   - A panel never passes QC after retries → mark QC_FAILED, alert, stop
 *   - Anything else → throw, kickoff handler alerts and the cron sees a 5xx
 *
 * Posting is a separate concern: the row sits at READY until the social
 * cron picks it up (mirrors ContentReel pattern).
 */

import { generateObject, generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import OpenAI from "openai";
import sharp from "sharp";
import {
  COMIC_STRIP_CAST,
  COMIC_SCRIPT_SYSTEM,
  createComicScriptPrompt,
  buildPanelImagePrompt,
  scriptQcResultSchema,
  SCRIPT_QC_SYSTEM,
  createScriptQcPrompt,
  panelQcResultSchema,
  PANEL_QC_SYSTEM,
  createPanelQcPrompt,
  type ComicCastId,
  type PanelScript,
  type PanelQcResult,
} from "@one-colored-pixel/coloring-core";
import {
  db,
  Brand,
  ComicStripStatus,
  ComicStripTheme,
} from "@one-colored-pixel/db";
import { put } from "@one-colored-pixel/storage";
import { sendAdminAlert } from "../lib/email.js";
import { z } from "zod";

const WRITER_MODEL = anthropic("claude-opus-4-7");
const QC_MODEL = anthropic("claude-opus-4-7");
const IMAGE_MODEL = "gpt-image-2";
const IMAGE_SIZE = "1024x1024" as const;
const SCRIPT_RETRIES = 2;
const PANEL_RETRIES = 3;

// =============================================================================
// Theme rotation
// =============================================================================

const ALL_THEMES: readonly ComicStripTheme[] = [
  "RULE_BREAKING",
  "SNACK_TIME",
  "WEATHER",
  "ART_MISHAP",
  "BEDTIME",
  "HOLIDAY",
  "FRIENDSHIP",
  "WEEKEND",
  "SCHOOL",
  "ADVENTURE",
];

async function pickTheme(): Promise<ComicStripTheme> {
  const recent = await db.comicStrip.findMany({
    where: { brand: Brand.CHUNKY_CRAYON },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { theme: true },
  });
  const recentSet = new Set(recent.map((r) => r.theme));
  const eligible = ALL_THEMES.filter((t) => !recentSet.has(t));
  const pool = eligible.length > 0 ? eligible : ALL_THEMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

// =============================================================================
// Script generation + QC
// =============================================================================

const scriptSchema = z.object({
  title: z.string().min(3).max(80),
  theme: z.enum(ALL_THEMES as [ComicStripTheme, ...ComicStripTheme[]]),
  logline: z.string(),
  panels: z
    .array(
      z.object({
        panel: z.number().int().min(1).max(4),
        cast: z
          .array(z.enum(["colo", "pip", "smudge", "sticky"]))
          .min(1)
          .max(2),
        setting: z.string(),
        action: z.string(),
        expressions: z.string(),
        dialogue: z
          .array(
            z.object({
              speaker: z.enum(["colo", "pip", "smudge", "sticky"]),
              text: z.string().max(60),
            }),
          )
          .nullable(),
        visualGag: z.string().nullable(),
      }),
    )
    .length(4),
  caption: z.string(),
});
type Script = z.infer<typeof scriptSchema>;

async function writeScript(theme: ComicStripTheme): Promise<Script> {
  const recent = await db.comicStrip.findMany({
    where: { brand: Brand.CHUNKY_CRAYON },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { title: true, theme: true },
  });

  const { object } = await generateObject({
    model: WRITER_MODEL,
    system: COMIC_SCRIPT_SYSTEM,
    prompt: createComicScriptPrompt(
      theme,
      recent.map((r) => r.title),
      recent.map((r) => r.theme),
    ),
    schema: scriptSchema,
  });
  return object;
}

async function judgeScript(script: Script) {
  const { text } = await generateText({
    model: QC_MODEL,
    system: SCRIPT_QC_SYSTEM,
    prompt: createScriptQcPrompt(script),
  });

  let parsed: unknown;
  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error(
      `[comic-strip] script QC raw text could not be parsed as JSON:\n---\n${text}\n---`,
    );
    throw err;
  }

  const result = scriptQcResultSchema.safeParse(parsed);
  if (!result.success) {
    console.error(
      `[comic-strip] script QC parsed but failed schema:\n---\n${text}\n---\nIssues:`,
      result.error.issues,
    );
    throw new Error("script QC schema validation failed");
  }
  return result.data;
}

async function writeAndApproveScript(theme: ComicStripTheme): Promise<Script> {
  for (let attempt = 0; attempt <= SCRIPT_RETRIES; attempt += 1) {
    const script = await writeScript(theme);
    const verdict = await judgeScript(script);
    console.log(
      `[comic-strip] script attempt ${attempt + 1}: passed=${verdict.passed}, issues=${verdict.issues.length}`,
    );
    if (verdict.passed) return script;
    console.warn(`[comic-strip] script rejected:`, verdict.issues);
  }
  throw new Error(
    `[comic-strip] script failed QC after ${SCRIPT_RETRIES + 1} attempts`,
  );
}

// =============================================================================
// Panel image generation + QC
// =============================================================================

async function fetchAsFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const buf = await res.arrayBuffer();
  const ext = url.split(".").pop()?.toLowerCase() || "png";
  return new File([buf], `${name}.${ext}`, { type: `image/${ext}` });
}

async function generatePanelImage(
  client: OpenAI,
  panel: PanelScript,
): Promise<Buffer> {
  const refs = await Promise.all(
    panel.cast.map((id) => {
      const member = COMIC_STRIP_CAST.find((c) => c.id === id);
      if (!member) throw new Error(`Unknown cast id: ${id}`);
      return fetchAsFile(member.referenceImageUrl, `ref-${id}`);
    }),
  );

  const prompt = buildPanelImagePrompt(panel);
  const result = await client.images.edit({
    model: IMAGE_MODEL,
    image: refs,
    prompt,
    size: IMAGE_SIZE,
    quality: "high",
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`no image returned for panel ${panel.panel}`);
  return Buffer.from(b64, "base64");
}

async function judgePanel(
  panel: PanelScript,
  imageBuffer: Buffer,
): Promise<PanelQcResult> {
  // Use generateText + manual JSON parse so we can log Claude's raw output
  // when validation fails. generateObject swallows the raw text, making the
  // "{}" failures impossible to debug.
  const { text } = await generateText({
    model: QC_MODEL,
    system: PANEL_QC_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: createPanelQcPrompt(panel) },
          { type: "image", image: imageBuffer },
        ],
      },
    ],
  });

  let parsed: unknown;
  try {
    // Strip optional markdown fence if Claude wraps it
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error(
      `[comic-strip] panel ${panel.panel} QC raw text could not be parsed as JSON:\n---\n${text}\n---`,
    );
    throw err;
  }

  const result = panelQcResultSchema.safeParse(parsed);
  if (!result.success) {
    console.error(
      `[comic-strip] panel ${panel.panel} QC parsed but failed schema:\n---\n${text}\n---\nIssues:`,
      result.error.issues,
    );
    throw new Error(`panel ${panel.panel} QC schema validation failed`);
  }
  return result.data;
}

async function generateAndApprovePanel(
  client: OpenAI,
  panel: PanelScript,
): Promise<{
  buffer: Buffer;
  qc: PanelQcResult;
  attempts: number;
  qcPassed: boolean;
}> {
  let lastBuffer: Buffer | null = null;
  let lastQc: PanelQcResult | null = null;
  for (let attempt = 0; attempt <= PANEL_RETRIES; attempt += 1) {
    const buffer = await generatePanelImage(client, panel);
    const qc = await judgePanel(panel, buffer);
    console.log(
      `[comic-strip] panel ${panel.panel} attempt ${attempt + 1}: passed=${qc.passed}, issues=${qc.issues.length}`,
    );
    lastBuffer = buffer;
    lastQc = qc;
    if (qc.passed) {
      return { buffer, qc, attempts: attempt + 1, qcPassed: true };
    }
    console.warn(`[comic-strip] panel ${panel.panel} rejected:`, qc.issues);
  }
  // All retries exhausted — keep the last attempt as a partial. The strip
  // gets marked QC_FAILED at the row level so social-posting skips it,
  // but the assets stay in R2 for manual inspection / admin override.
  console.warn(
    `[comic-strip] panel ${panel.panel} exhausted ${PANEL_RETRIES + 1} attempts; keeping last attempt as partial`,
  );
  if (!lastBuffer || !lastQc) {
    throw new Error(`panel ${panel.panel} produced no buffers`);
  }
  return {
    buffer: lastBuffer,
    qc: lastQc,
    attempts: PANEL_RETRIES + 1,
    qcPassed: false,
  };
}

// =============================================================================
// Compositing + persistence
// =============================================================================

async function assembleStrip(panelBuffers: Buffer[]): Promise<Buffer> {
  return await sharp({
    create: { width: 2048, height: 2048, channels: 3, background: "#ffffff" },
  })
    .composite([
      { input: panelBuffers[0], top: 0, left: 0 },
      { input: panelBuffers[1], top: 0, left: 1024 },
      { input: panelBuffers[2], top: 1024, left: 0 },
      { input: panelBuffers[3], top: 1024, left: 1024 },
    ])
    .png()
    .toBuffer();
}

function makeSlug(theme: ComicStripTheme, title: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${theme.toLowerCase().replace(/_/g, "-")}-${titleSlug}-${date}`;
}

async function uploadPanel(
  slug: string,
  panelNumber: number,
  buffer: Buffer,
): Promise<string> {
  const { url } = await put(
    `comic-strips/${slug}/panel-${panelNumber}.png`,
    buffer,
    { contentType: "image/png" },
  );
  return url;
}

async function uploadAssembled(slug: string, buffer: Buffer): Promise<string> {
  const { url } = await put(`comic-strips/${slug}/strip.png`, buffer, {
    contentType: "image/png",
  });
  return url;
}

// =============================================================================
// Top-level pipeline
// =============================================================================

export async function runComicStripCron(): Promise<void> {
  const start = Date.now();
  let stripId: string | null = null;
  try {
    console.log("[comic-strip] picking theme...");
    const theme = await pickTheme();
    console.log(`[comic-strip] theme=${theme}`);

    console.log("[comic-strip] writing + judging script...");
    const script = await writeAndApproveScript(theme);
    console.log(
      `[comic-strip] script approved: "${script.title}" (${script.theme})`,
    );

    const slug = makeSlug(theme, script.title);

    // Insert GENERATING row early so we can update it as we go and
    // surface progress in admin UI later.
    const row = await db.comicStrip.create({
      data: {
        slug,
        title: script.title,
        scriptJson: script,
        theme,
        caption: script.caption,
        status: ComicStripStatus.GENERATING,
        brand: Brand.CHUNKY_CRAYON,
      },
    });
    stripId = row.id;
    console.log(`[comic-strip] row created id=${row.id} slug=${slug}`);

    console.log("[comic-strip] generating panels...");
    const client = new OpenAI();
    const panelBuffers: Buffer[] = [];
    const qcRecords: Array<{
      panel: number;
      attempts: number;
      qc: PanelQcResult;
      qcPassed: boolean;
    }> = [];

    for (const panel of script.panels) {
      console.log(
        `[comic-strip] panel ${panel.panel} cast=${panel.cast.join(",")}`,
      );
      const { buffer, qc, attempts, qcPassed } = await generateAndApprovePanel(
        client,
        panel,
      );
      panelBuffers.push(buffer);
      qcRecords.push({ panel: panel.panel, attempts, qc, qcPassed });
    }

    console.log("[comic-strip] uploading panels...");
    const [panel1Url, panel2Url, panel3Url, panel4Url] = await Promise.all(
      panelBuffers.map((buf, i) => uploadPanel(slug, i + 1, buf)),
    );

    console.log("[comic-strip] assembling 2x2 strip...");
    const stripBuffer = await assembleStrip(panelBuffers);
    const assembledUrl = await uploadAssembled(slug, stripBuffer);

    // If any panel exhausted retries, mark the strip QC_FAILED so the
    // social cron skips it — but the panels are persisted so the admin
    // can inspect / override / regenerate individual panels.
    const anyPanelFailedQc = qcRecords.some((r) => !r.qcPassed);
    const finalStatus = anyPanelFailedQc
      ? ComicStripStatus.QC_FAILED
      : ComicStripStatus.READY;

    await db.comicStrip.update({
      where: { id: row.id },
      data: {
        panel1Url,
        panel2Url,
        panel3Url,
        panel4Url,
        assembledUrl,
        qcResults: qcRecords,
        status: finalStatus,
      },
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (anyPanelFailedQc) {
      const failedPanels = qcRecords
        .filter((r) => !r.qcPassed)
        .map((r) => r.panel);
      console.warn(
        `[comic-strip] done in ${elapsed}s — slug=${slug} status=QC_FAILED (panels failing QC: ${failedPanels.join(",")})`,
      );
      await sendAdminAlert({
        subject: `Comic strip QC partial: "${script.title}"`,
        body: `Strip generated but some panels exhausted QC retries. Manual review required.\n\nSlug: ${slug}\nTitle: ${script.title}\nFailed panels: ${failedPanels.join(", ")}\nStrip URL: ${assembledUrl}`,
      }).catch(() => {});
    } else {
      console.log(
        `[comic-strip] done in ${elapsed}s — slug=${slug} title="${script.title}"`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[comic-strip] FAILED:", err);
    if (stripId) {
      await db.comicStrip
        .update({
          where: { id: stripId },
          data: { status: ComicStripStatus.QC_FAILED },
        })
        .catch(() => {
          // best-effort, don't mask the original error
        });
    }
    await sendAdminAlert({
      subject: "Comic strip cron failed",
      body: `Comic strip generation failed.\n\nError: ${message}\n\nStrip id: ${stripId ?? "(none)"}`,
    }).catch(() => {});
    throw err;
  }
}
