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

const sceneSchema = z.object({
  id: z.string(),
  setting: z.string(),
  fixedProps: z.array(z.string()),
  panels: z.array(z.number().int().min(1).max(4)).min(1).max(4),
});

const scriptSchema = z.object({
  title: z.string().min(3).max(80),
  theme: z.enum(ALL_THEMES as [ComicStripTheme, ...ComicStripTheme[]]),
  logline: z.string(),
  scenes: z.array(sceneSchema).min(1).max(4),
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
        propStateChange: z.string().nullable(),
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
type Scene = z.infer<typeof sceneSchema>;

/**
 * Find which scene contains a given panel number. Throws if the script's
 * scenes array doesn't cover the panel — which should never happen for a
 * QC-passed script (sceneConsistency Test 1) but is worth defensive-coding
 * since the script is JSON from an LLM.
 */
function sceneForPanel(script: Script, panelNumber: number): Scene {
  const scene = script.scenes.find((s) => s.panels.includes(panelNumber));
  if (!scene) {
    throw new Error(
      `[comic-strip] no scene contains panel ${panelNumber} — scenes: ${JSON.stringify(script.scenes.map((s) => ({ id: s.id, panels: s.panels })))}`,
    );
  }
  return scene;
}

/**
 * Collect prop-state-changes from earlier panels in the same scene so the
 * current panel renders the cumulative state. e.g. if panel 3 ate the cake,
 * panel 4 (same scene) sees ["cake eaten, plate now empty"] and must
 * reflect that.
 */
function cumulativeStateChangesForPanel(
  script: Script,
  panelNumber: number,
  scene: Scene,
): string[] {
  return script.panels
    .filter(
      (p) =>
        p.panel < panelNumber &&
        scene.panels.includes(p.panel) &&
        !!p.propStateChange,
    )
    .map((p) => p.propStateChange as string);
}

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

function bufferToFile(buffer: Buffer, name: string): File {
  // Wrap a Buffer in a File so we can pass it to OpenAI's images.edit
  // alongside fetched cast refs. PNG is the format we always upload.
  // Cast Buffer → Uint8Array so the BlobPart type is satisfied (Buffer's
  // ArrayBufferLike includes SharedArrayBuffer which Blob rejects).
  return new File([new Uint8Array(buffer)], `${name}.png`, {
    type: "image/png",
  });
}

async function generatePanelImage(
  client: OpenAI,
  panel: PanelScript,
  scene: Scene,
  cumulativeStateChanges: readonly string[],
  isSceneStart: boolean,
  priorScenePanelBuffers: readonly Buffer[],
): Promise<Buffer> {
  // Cast reference images (canonical character refs from R2). Always
  // included so the model has the character bible at hand.
  const castRefs = await Promise.all(
    panel.cast.map((id) => {
      const member = COMIC_STRIP_CAST.find((c) => c.id === id);
      if (!member) throw new Error(`Unknown cast id: ${id}`);
      return fetchAsFile(member.referenceImageUrl, `ref-${id}`);
    }),
  );

  // Continuity references — earlier panels of THIS scene, so banner text,
  // furniture, and color palette stay locked. Skip if this panel starts a
  // new scene (those earlier panels belong to a different setting and
  // would mislead the model).
  const continuityRefs = isSceneStart
    ? []
    : priorScenePanelBuffers.map((buf, i) =>
        bufferToFile(buf, `prior-panel-${i + 1}`),
      );

  // gpt-image-2 caps at 16 reference images. Cast (≤2) + continuity (≤3)
  // = 5 max. Plenty of headroom; explicit cap as a safety check.
  const refs = [...castRefs, ...continuityRefs];
  if (refs.length > 16) {
    throw new Error(
      `[comic-strip] panel ${panel.panel} has ${refs.length} refs, over the gpt-image-2 limit of 16`,
    );
  }

  const prompt = buildPanelImagePrompt({
    panel,
    scene,
    cumulativeStateChanges,
    isSceneStart,
  });
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
  scene: Scene,
  cumulativeStateChanges: readonly string[],
  isSceneStart: boolean,
  priorScenePanelBuffers: readonly Buffer[],
): Promise<{
  buffer: Buffer;
  qc: PanelQcResult;
  attempts: number;
  qcPassed: boolean;
}> {
  let lastBuffer: Buffer | null = null;
  let lastQc: PanelQcResult | null = null;
  for (let attempt = 0; attempt <= PANEL_RETRIES; attempt += 1) {
    const buffer = await generatePanelImage(
      client,
      panel,
      scene,
      cumulativeStateChanges,
      isSceneStart,
      priorScenePanelBuffers,
    );
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

    // Track which panel each rendered buffer belongs to so we can hand
    // back the right "prior panels of this scene" continuity refs as we
    // walk through the strip.
    const renderedByPanelNumber = new Map<number, Buffer>();
    let previousScene: Scene | null = null;

    for (const panel of script.panels) {
      const scene = sceneForPanel(script, panel.panel);
      const isSceneStart = !previousScene || previousScene.id !== scene.id;

      // Continuity refs = earlier panels of the same scene that have
      // already rendered. Empty when starting a new scene.
      const priorScenePanelBuffers = isSceneStart
        ? []
        : scene.panels
            .filter((n) => n < panel.panel && renderedByPanelNumber.has(n))
            .map((n) => renderedByPanelNumber.get(n) as Buffer);

      const cumulativeStateChanges = cumulativeStateChangesForPanel(
        script,
        panel.panel,
        scene,
      );

      console.log(
        `[comic-strip] panel ${panel.panel} cast=${panel.cast.join(",")} scene=${scene.id}${isSceneStart ? " (scene-start)" : ""}${priorScenePanelBuffers.length ? ` prior-refs=${priorScenePanelBuffers.length}` : ""}${cumulativeStateChanges.length ? ` state-changes=${cumulativeStateChanges.length}` : ""}`,
      );
      const { buffer, qc, attempts, qcPassed } = await generateAndApprovePanel(
        client,
        panel,
        scene,
        cumulativeStateChanges,
        isSceneStart,
        priorScenePanelBuffers,
      );
      panelBuffers.push(buffer);
      renderedByPanelNumber.set(panel.panel, buffer);
      qcRecords.push({ panel: panel.panel, attempts, qc, qcPassed });
      previousScene = scene;
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
