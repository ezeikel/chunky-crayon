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

import { generateObject } from "ai";
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
  wholeStripQcResultSchema,
  WHOLE_STRIP_QC_SYSTEM,
  createWholeStripQcPrompt,
  type ComicCastId,
  type PanelScript,
  type PanelQcResult,
  type ScriptQcResult,
  type WholeStripQcResult,
  type RejectedAttempt,
} from "@one-colored-pixel/coloring-core";
import { judgeWithThree, type VotedVerdict } from "./jury.js";
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
const IMAGE_MODEL = "gpt-image-2";
const IMAGE_SIZE = "1024x1024" as const;
const SCRIPT_RETRIES = 2;
const PANEL_RETRIES = 3;
/**
 * Per-theme: 1 initial draft + SCRIPT_RETRIES revisions = 3 attempts.
 * THEME_RETRIES extra themes mean a stuck theme doesn't kill the whole run —
 * if Opus produces 3 structurally-broken drafts on theme A (e.g.
 * keeps forgetting the rule-keeper in a RULE_BREAKING gag), we reroll to a
 * fresh theme and try again. Total budget: (THEME_RETRIES + 1) themes ×
 * (SCRIPT_RETRIES + 1) script attempts. Defaults give 6 total LLM calls.
 */
const THEME_RETRIES = 1;

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

async function pickTheme(
  excluding: readonly ComicStripTheme[] = [],
): Promise<ComicStripTheme> {
  const recent = await db.comicStrip.findMany({
    where: { brand: Brand.CHUNKY_CRAYON },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { theme: true },
  });
  const blocked = new Set([...recent.map((r) => r.theme), ...excluding]);
  const eligible = ALL_THEMES.filter((t) => !blocked.has(t));
  // Fall back through exclusions in order: prefer eligible (not recent + not excluded),
  // else not-excluded, else any. We never want to throw "no themes available"
  // because the catalogue is small and a duplicate is acceptable in
  // worst-case recovery.
  const pool =
    eligible.length > 0
      ? eligible
      : ALL_THEMES.filter((t) => !excluding.includes(t)).length > 0
        ? ALL_THEMES.filter((t) => !excluding.includes(t))
        : ALL_THEMES;
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

async function writeScript(
  theme: ComicStripTheme,
  priorAttempts: readonly RejectedAttempt[] = [],
): Promise<Script> {
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
      priorAttempts,
    ),
    schema: scriptSchema,
  });
  return object;
}

/**
 * Compress a Script + the dissenting jury verdict into a RejectedAttempt
 * we can feed back into the next writer prompt. We keep panel summaries
 * short — title + one line per panel — so 2-3 prior attempts don't bloat
 * the context window.
 */
function buildRejectedAttempt(
  script: Script,
  juryVerdict: VotedVerdict<ScriptQcResult>,
): RejectedAttempt {
  return {
    title: script.title,
    logline: script.logline,
    panelSummaries: script.panels.map((p) => {
      const cast = p.cast.join("+");
      const dialogueStr = p.dialogue
        ? p.dialogue.map((d) => `${d.speaker}: "${d.text}"`).join(" / ")
        : "(no dialogue)";
      return `${cast} — ${p.action} | ${dialogueStr}`;
    }),
    juryFeedback: summariseDissent(juryVerdict),
  };
}

async function judgeScript(
  script: Script,
): Promise<VotedVerdict<ScriptQcResult>> {
  return judgeWithThree(
    {
      system: SCRIPT_QC_SYSTEM,
      prompt: createScriptQcPrompt(script),
    },
    scriptQcResultSchema,
    (r) => r.passed,
  );
}

/** Combine all dissenting judges' issues into a single suggestion bundle. */
function summariseDissent(verdict: VotedVerdict<ScriptQcResult>): string {
  return verdict.verdicts
    .map((v) => {
      if (!v.ok) return `[${v.judge}] error: ${v.error}`;
      const passed = v.result.passed;
      const issuesStr = v.result.issues.length
        ? v.result.issues.join("; ")
        : "(no issues listed)";
      const sugg = v.result.suggestion
        ? ` suggestion: ${v.result.suggestion}`
        : "";
      return `[${v.judge}] passed=${passed} issues: ${issuesStr}${sugg}`;
    })
    .join("\n");
}

/**
 * Try to produce an approved script for ONE theme, with feedback-aware
 * retries. Each retry sees every prior rejected attempt's jury feedback
 * (compressed via buildRejectedAttempt) so the writer can correct
 * concretely instead of producing minor variants of the same broken draft.
 *
 * Returns null on exhaustion so the caller can decide whether to reroll
 * the theme. Throwing here would force the cron to fail entirely; the
 * theme-reroll loop wants a recoverable signal.
 */
async function writeAndApproveScriptForTheme(theme: ComicStripTheme): Promise<{
  script: Script;
  juryVerdict: VotedVerdict<ScriptQcResult>;
} | null> {
  const priorAttempts: RejectedAttempt[] = [];
  for (let attempt = 0; attempt <= SCRIPT_RETRIES; attempt += 1) {
    const script = await writeScript(theme, priorAttempts);
    const juryVerdict = await judgeScript(script);
    console.log(
      `[comic-strip] theme=${theme} script attempt ${attempt + 1}/${SCRIPT_RETRIES + 1}: jury=${juryVerdict.passingCount}/3 passed=${juryVerdict.passed}${priorAttempts.length ? ` (with ${priorAttempts.length} prior attempt${priorAttempts.length === 1 ? "" : "s"} as feedback)` : ""}`,
    );
    if (juryVerdict.passed) return { script, juryVerdict };
    console.warn(
      `[comic-strip] script rejected by jury:\n${summariseDissent(juryVerdict)}`,
    );
    priorAttempts.push(buildRejectedAttempt(script, juryVerdict));
  }
  return null;
}

/**
 * Try to produce an approved script. Loops over up to (THEME_RETRIES + 1)
 * themes — when one theme exhausts its retries, we pick a fresh theme
 * (excluding any we've already tried) and start over. This handles the
 * failure mode where Opus locks onto a structurally-broken script for
 * one theme: the rule-keeper-presence violation we hit on 2026-05-10 was
 * a RULE_BREAKING-specific issue that fresh-themed retries dodge entirely.
 *
 * Returns the chosen theme alongside the script — the caller needs to
 * persist whichever theme actually produced the approved script, not the
 * theme it started with.
 */
async function writeAndApproveScript(initialTheme: ComicStripTheme): Promise<{
  script: Script;
  juryVerdict: VotedVerdict<ScriptQcResult>;
  theme: ComicStripTheme;
}> {
  const triedThemes: ComicStripTheme[] = [];
  let theme = initialTheme;
  for (let themeAttempt = 0; themeAttempt <= THEME_RETRIES; themeAttempt += 1) {
    triedThemes.push(theme);
    const result = await writeAndApproveScriptForTheme(theme);
    if (result) return { ...result, theme };
    if (themeAttempt < THEME_RETRIES) {
      const next = await pickTheme(triedThemes);
      console.warn(
        `[comic-strip] theme=${theme} exhausted after ${SCRIPT_RETRIES + 1} attempts; rerolling to theme=${next}`,
      );
      theme = next;
    }
  }
  throw new Error(
    `[comic-strip] script failed jury across ${triedThemes.length} themes (${triedThemes.join(", ")}), each ${SCRIPT_RETRIES + 1} attempts`,
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
  priorApprovedPanels: ReadonlyArray<{ panel: PanelScript; buffer: Buffer }>,
): Promise<VotedVerdict<PanelQcResult>> {
  // Order matters: prior approved panels first, then the panel under
  // judgement. The QC prompt tells the judges that earlier images are
  // ground truth and the LAST image is the one to score.
  const images = [
    ...priorApprovedPanels.map((p) => ({ buffer: p.buffer })),
    { buffer: imageBuffer },
  ];
  return judgeWithThree(
    {
      system: PANEL_QC_SYSTEM,
      prompt: createPanelQcPrompt(
        panel,
        priorApprovedPanels.map((p) => p.panel),
      ),
      images,
    },
    panelQcResultSchema,
    (r) => r.passed,
  );
}

async function generateAndApprovePanel(
  client: OpenAI,
  panel: PanelScript,
  scene: Scene,
  cumulativeStateChanges: readonly string[],
  isSceneStart: boolean,
  priorScenePanelBuffers: readonly Buffer[],
  /** Earlier panels of THIS strip that already passed jury — fed to the
   *  judges as continuity ground-truth. NOT the same as priorScenePanelBuffers
   *  (which feeds gpt-image-2 for image generation continuity). */
  priorApprovedPanels: ReadonlyArray<{ panel: PanelScript; buffer: Buffer }>,
): Promise<{
  buffer: Buffer;
  juryVerdict: VotedVerdict<PanelQcResult>;
  attempts: number;
  qcPassed: boolean;
}> {
  let lastBuffer: Buffer | null = null;
  let lastVerdict: VotedVerdict<PanelQcResult> | null = null;
  for (let attempt = 0; attempt <= PANEL_RETRIES; attempt += 1) {
    const buffer = await generatePanelImage(
      client,
      panel,
      scene,
      cumulativeStateChanges,
      isSceneStart,
      priorScenePanelBuffers,
    );
    const juryVerdict = await judgePanel(panel, buffer, priorApprovedPanels);
    console.log(
      `[comic-strip] panel ${panel.panel} attempt ${attempt + 1}: jury=${juryVerdict.passingCount}/3 passed=${juryVerdict.passed}`,
    );
    lastBuffer = buffer;
    lastVerdict = juryVerdict;
    if (juryVerdict.passed) {
      return { buffer, juryVerdict, attempts: attempt + 1, qcPassed: true };
    }
    const issues = juryVerdict.verdicts
      .filter((v) => v.ok && !v.result.passed)
      .map((v) => (v.ok ? `[${v.judge}] ${v.result.issues.join("; ")}` : ""))
      .join("\n");
    console.warn(
      `[comic-strip] panel ${panel.panel} rejected by jury:\n${issues}`,
    );
  }
  console.warn(
    `[comic-strip] panel ${panel.panel} exhausted ${PANEL_RETRIES + 1} attempts; keeping last attempt as partial`,
  );
  if (!lastBuffer || !lastVerdict) {
    throw new Error(`panel ${panel.panel} produced no buffers`);
  }
  return {
    buffer: lastBuffer,
    juryVerdict: lastVerdict,
    attempts: PANEL_RETRIES + 1,
    qcPassed: false,
  };
}

async function judgeWholeStrip(
  title: string,
  script: Script,
  panelBuffers: readonly Buffer[],
): Promise<VotedVerdict<WholeStripQcResult>> {
  return judgeWithThree(
    {
      system: WHOLE_STRIP_QC_SYSTEM,
      prompt: createWholeStripQcPrompt(title, script),
      images: panelBuffers.map((buf) => ({ buffer: buf })),
    },
    wholeStripQcResultSchema,
    (r) => r.passed,
  );
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
    const initialTheme = await pickTheme();
    console.log(`[comic-strip] theme=${initialTheme}`);

    console.log("[comic-strip] writing + judging script with 3-judge jury...");
    const {
      script,
      juryVerdict: scriptJury,
      theme: approvedTheme,
    } = await writeAndApproveScript(initialTheme);
    console.log(
      `[comic-strip] script approved: "${script.title}" (${approvedTheme}${approvedTheme !== initialTheme ? `, rerolled from ${initialTheme}` : ""}) jury=${scriptJury.passingCount}/3`,
    );

    const slug = makeSlug(approvedTheme, script.title);

    // Insert GENERATING row early so we can update it as we go and
    // surface progress in admin UI later.
    const row = await db.comicStrip.create({
      data: {
        slug,
        title: script.title,
        scriptJson: script,
        theme: approvedTheme,
        caption: script.caption,
        status: ComicStripStatus.GENERATING,
        brand: Brand.CHUNKY_CRAYON,
      },
    });
    stripId = row.id;
    console.log(`[comic-strip] row created id=${row.id} slug=${slug}`);

    console.log("[comic-strip] generating panels with 3-judge jury...");
    const client = new OpenAI();
    const panelBuffers: Buffer[] = [];
    const qcRecords: Array<{
      panel: number;
      attempts: number;
      juryVerdict: VotedVerdict<PanelQcResult>;
      qcPassed: boolean;
    }> = [];

    // Track which panel each rendered buffer belongs to so we can hand
    // back the right "prior panels of this scene" continuity refs as we
    // walk through the strip.
    const renderedByPanelNumber = new Map<number, Buffer>();
    // Approved panels = those that passed jury, used as ground truth
    // when judging later panels (cumulative consistency check).
    const approvedPanels: Array<{ panel: PanelScript; buffer: Buffer }> = [];
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
        `[comic-strip] panel ${panel.panel} cast=${panel.cast.join(",")} scene=${scene.id}${isSceneStart ? " (scene-start)" : ""}${priorScenePanelBuffers.length ? ` gen-refs=${priorScenePanelBuffers.length}` : ""}${approvedPanels.length ? ` jury-prior=${approvedPanels.length}` : ""}${cumulativeStateChanges.length ? ` state-changes=${cumulativeStateChanges.length}` : ""}`,
      );
      const { buffer, juryVerdict, attempts, qcPassed } =
        await generateAndApprovePanel(
          client,
          panel,
          scene,
          cumulativeStateChanges,
          isSceneStart,
          priorScenePanelBuffers,
          approvedPanels,
        );
      panelBuffers.push(buffer);
      renderedByPanelNumber.set(panel.panel, buffer);
      qcRecords.push({ panel: panel.panel, attempts, juryVerdict, qcPassed });
      // Only include passed panels in the cumulative-judging context for
      // the next panel. A failed panel's image is still kept (partial)
      // but isn't used as ground truth.
      if (qcPassed) approvedPanels.push({ panel, buffer });
      previousScene = scene;
    }

    console.log("[comic-strip] uploading panels...");
    const [panel1Url, panel2Url, panel3Url, panel4Url] = await Promise.all(
      panelBuffers.map((buf, i) => uploadPanel(slug, i + 1, buf)),
    );

    console.log("[comic-strip] assembling 2x2 strip...");
    const stripBuffer = await assembleStrip(panelBuffers);
    const assembledUrl = await uploadAssembled(slug, stripBuffer);

    // Final jury — judge the whole strip together. Catches "each panel
    // looked fine in isolation but they don't read as a coherent comic".
    const anyPanelFailedQc = qcRecords.some((r) => !r.qcPassed);
    let wholeStripJury: VotedVerdict<WholeStripQcResult> | null = null;
    if (!anyPanelFailedQc) {
      console.log("[comic-strip] judging whole strip with 3-judge jury...");
      wholeStripJury = await judgeWholeStrip(
        script.title,
        script,
        panelBuffers,
      );
      console.log(
        `[comic-strip] whole-strip jury=${wholeStripJury.passingCount}/3 passed=${wholeStripJury.passed}`,
      );
      if (!wholeStripJury.passed) {
        const issues = wholeStripJury.verdicts
          .filter((v) => v.ok && !v.result.passed)
          .map((v) =>
            v.ok ? `[${v.judge}] ${v.result.issues.join("; ")}` : "",
          )
          .join("\n");
        console.warn(`[comic-strip] whole strip rejected by jury:\n${issues}`);
      }
    }

    const finalStatus =
      anyPanelFailedQc || (wholeStripJury && !wholeStripJury.passed)
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
        qcResults: { panels: qcRecords, scriptJury, wholeStripJury },
        status: finalStatus,
      },
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const wholeStripFailed = wholeStripJury !== null && !wholeStripJury.passed;
    if (anyPanelFailedQc || wholeStripFailed) {
      const failedPanels = qcRecords
        .filter((r) => !r.qcPassed)
        .map((r) => r.panel);
      const reason = anyPanelFailedQc
        ? `panels failing jury: ${failedPanels.join(",")}`
        : "whole-strip jury rejected coherence";
      console.warn(
        `[comic-strip] done in ${elapsed}s — slug=${slug} status=QC_FAILED (${reason})`,
      );
      const wholeStripIssues =
        wholeStripJury && !wholeStripJury.passed
          ? wholeStripJury.verdicts
              .filter((v) => v.ok && !v.result.passed)
              .map((v) =>
                v.ok ? `[${v.judge}] ${v.result.issues.join("; ")}` : "",
              )
              .join("\n")
          : "";
      await sendAdminAlert({
        subject: `Comic strip QC partial: "${script.title}"`,
        body: `Strip generated but failed multi-judge QC. Manual review required.\n\nSlug: ${slug}\nTitle: ${script.title}\nReason: ${reason}\n${wholeStripIssues ? `\nWhole-strip jury issues:\n${wholeStripIssues}\n` : ""}\nStrip URL: ${assembledUrl}`,
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
