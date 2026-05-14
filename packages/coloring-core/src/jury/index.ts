/**
 * Multi-judge jury for AI-as-judge workflows.
 *
 * Runs the same JSON-judgement prompt past N models in parallel, validates
 * each output against a Zod schema, votes a winner, and optionally
 * escalates to a tie-break model on disagreement.
 *
 * Why we do this in three places (now consolidated here):
 *   - Comic-strip QC: single-judge missed real continuity bugs because the
 *     same model that can't see the bug can't judge it either. Different
 *     model families have different blind spots.
 *   - Kid-safety moderation: cheap tier-1 panel catches the obvious cases,
 *     Opus-4.7 with adaptive thinking handles the edges only when needed.
 *   - Image-difficulty rating: same shape, different schema + system.
 *
 * Design intent:
 *   - `tier1` is configurable (cheap models for high-volume, top-tier
 *     for hard reasoning tasks).
 *   - `tieBreak` is optional — kid-safety uses Opus for ties; comic-strip
 *     uses pure 2-of-3 with no escalation.
 *   - `escalationTrigger` lets each use case decide what counts as a
 *     "split" worth escalating. Default = no unanimous agreement.
 *   - Returns the per-judge verdicts so callers can log dissent for
 *     retrospective without re-running the panel.
 *
 * Image-input gotcha: Claude's content-API caps base64 image input at
 * ~5MB. We resize PNGs larger than 3.5MB before handing them to Claude
 * models; other providers accept the original.
 */

import { generateText, type LanguageModel } from "ai";
import sharp from "sharp";
import type { z } from "zod";

import { models } from "../models";

// Claude content-API cap for base64 images. ~5MB raw → ~6.7MB base64.
// Cap at 3.5MB raw (≈4.7MB base64) to leave headroom.
const CLAUDE_IMAGE_BYTE_CAP = 3.5 * 1024 * 1024;

/**
 * Stable judge identifier used in verdicts + logs. Add new variants as
 * we extend the model registry; the runtime model is resolved via the
 * `JUDGE_REGISTRY` below.
 */
export type JudgeId =
  | "haiku-4.5"
  | "opus-4.7"
  | "gpt-5.4-mini"
  | "gpt-5.5"
  | "gemini-3-flash"
  | "gemini-3.1-pro";

type RegistryEntry = {
  // The Vercel AI SDK's per-provider language-model union types are
  // deliberately broad — typing this strictly would mean a synthetic union
  // we can't easily construct. Internal helper, accept any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
  /** True = this provider needs the Claude image cap respected. */
  needsClaudeImageCap: boolean;
};

const JUDGE_REGISTRY: Record<JudgeId, RegistryEntry> = {
  "haiku-4.5": { model: models.haiku45, needsClaudeImageCap: true },
  "opus-4.7": { model: models.opus47, needsClaudeImageCap: true },
  "gpt-5.4-mini": { model: models.gpt54mini, needsClaudeImageCap: false },
  "gpt-5.5": { model: models.gpt55, needsClaudeImageCap: false },
  "gemini-3-flash": { model: models.analytics, needsClaudeImageCap: false },
  "gemini-3.1-pro": { model: models.gemini3Pro, needsClaudeImageCap: false },
};

export type JudgeVerdict<TResult> =
  | {
      judge: JudgeId;
      ok: true;
      result: TResult;
      rawText: string;
      elapsedMs: number;
    }
  | {
      judge: JudgeId;
      ok: false;
      error: string;
      rawText?: string;
      elapsedMs: number;
    };

export type VotedVerdict<TResult> = {
  /** True if ≥2 tier-1 (or tie-break) judges' `getPassed` returned true. */
  passed: boolean;
  /** Per-tier-1-judge verdicts in the order given by `tier1`. */
  verdicts: ReadonlyArray<JudgeVerdict<TResult>>;
  /** If a tier-2 tie-break ran, its verdict. Otherwise undefined. */
  tieBreakVerdict?: JudgeVerdict<TResult>;
  /** Count of judges that returned ok + passed (excluding tie-break). */
  passingCount: number;
  /** Count of judges that errored or whose ok JSON failed `getPassed`. */
  failingCount: number;
  /** True when the tie-break path ran. */
  escalated: boolean;
};

type JuryImage = { buffer: Buffer; description?: string };

export type JuryConfig<TResult> = {
  /** System prompt fed to every judge. */
  system: string;
  /** User prompt text. */
  prompt: string;
  /** Optional image inputs. Claude judges get a downsampled copy if oversized. */
  images?: ReadonlyArray<JuryImage>;
  /** Zod schema each judge's JSON output must match. */
  schema: z.ZodSchema<TResult>;
  /** Given a parsed verdict, return whether this judge votes pass. */
  getPassed: (result: TResult) => boolean;
  /** Tier-1 panel — usually 3 models. Order is preserved in `verdicts`. */
  tier1: ReadonlyArray<JudgeId>;
  /**
   * Optional tie-break model. Runs only when `escalationTrigger` returns
   * true for the tier-1 verdicts. The tie-break's `getPassed` decides
   * the final `passed` outcome instead of the majority.
   */
  tieBreak?: JudgeId;
  /**
   * Decides whether to escalate to `tieBreak`. Default: escalate when
   * tier-1 verdicts don't unanimously pass or unanimously fail. Pass a
   * stricter trigger (e.g. "any judge says clearly_unsafe") for safety
   * use cases.
   */
  escalationTrigger?: (
    tier1Verdicts: ReadonlyArray<JudgeVerdict<TResult>>,
    passing: number,
    failing: number,
  ) => boolean;
};

/**
 * Default escalation trigger: escalate when tier-1 verdicts aren't
 * unanimous. Override for use cases where any single failure should
 * trigger a second look.
 */
const defaultEscalationTrigger = <TResult>(
  verdicts: ReadonlyArray<JudgeVerdict<TResult>>,
  passing: number,
  failing: number,
): boolean => {
  const total = verdicts.length;
  return passing !== total && failing !== total;
};

/**
 * If a PNG buffer would blow Claude's 5MB image cap once base64-encoded,
 * resize it down. Operates only on PNG buffers; pass-through everything
 * already small enough. Quality loss is irrelevant for judgement — the
 * model just needs to see what's in the image.
 */
async function downsamplePngForClaude(buffer: Buffer): Promise<Buffer> {
  if (buffer.byteLength <= CLAUDE_IMAGE_BYTE_CAP) return buffer;
  let resized = buffer;
  let scale = 0.5;
  // Hard ceiling at 4 attempts (eighth size) — nothing realistic should
  // need more.
  for (let i = 0; i < 4; i += 1) {
    const meta = await sharp(resized).metadata();
    if (!meta.width || !meta.height) {
      throw new Error("sharp could not read image dimensions");
    }
    resized = await sharp(resized)
      .resize(Math.round(meta.width * scale), Math.round(meta.height * scale))
      .png({ quality: 80 })
      .toBuffer();
    if (resized.byteLength <= CLAUDE_IMAGE_BYTE_CAP) return resized;
    scale = 0.5;
  }
  return resized;
}

/**
 * Build the per-judge message content blocks. Claude judges get
 * downsampled PNGs (5MB cap); other providers get the original.
 */
async function buildContent(
  prompt: string,
  images: ReadonlyArray<JuryImage> | undefined,
  needsClaudeCap: boolean,
) {
  if (!images || images.length === 0) {
    return [{ type: "text" as const, text: prompt }];
  }
  const imageBlocks = await Promise.all(
    images.map(async (img) => {
      const buf = needsClaudeCap
        ? await downsamplePngForClaude(img.buffer)
        : img.buffer;
      return { type: "image" as const, image: new Uint8Array(buf) };
    }),
  );
  return [{ type: "text" as const, text: prompt }, ...imageBlocks];
}

/**
 * Run a single judge — used internally by `runJury` for both tier-1 panel
 * members and the optional tie-break. Wraps `generateText` so we can
 * preserve the raw response when JSON parsing fails (generateObject
 * swallows the raw text behind an opaque ZodError).
 */
async function runSingleJudge<TResult>(
  judge: JudgeId,
  config: JuryConfig<TResult>,
  model: LanguageModel,
  needsClaudeCap: boolean,
): Promise<JudgeVerdict<TResult>> {
  const start = Date.now();
  try {
    const content = await buildContent(
      config.prompt,
      config.images,
      needsClaudeCap,
    );
    const { text } = await generateText({
      model,
      system: config.system,
      messages: [{ role: "user", content }],
    });
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      return {
        judge,
        ok: false as const,
        error: `JSON parse failed: ${parseErr instanceof Error ? parseErr.message : "unknown"}`,
        rawText: text,
        elapsedMs: Date.now() - start,
      };
    }
    const validated = config.schema.safeParse(parsed);
    if (!validated.success) {
      return {
        judge,
        ok: false as const,
        error: `schema mismatch: ${validated.error.issues
          .map((i) => `${i.path.join(".")} ${i.message}`)
          .join("; ")}`,
        rawText: text,
        elapsedMs: Date.now() - start,
      };
    }
    return {
      judge,
      ok: true as const,
      result: validated.data,
      rawText: text,
      elapsedMs: Date.now() - start,
    };
  } catch (err) {
    return {
      judge,
      ok: false as const,
      error: err instanceof Error ? err.message : "unknown error",
      elapsedMs: Date.now() - start,
    };
  }
}

/**
 * Run the same prompt past `tier1` judges in parallel. If
 * `escalationTrigger` returns true on the tier-1 outcome, additionally
 * run `tieBreak` (if provided). Returns a structured verdict with all
 * per-judge results so callers can log dissent.
 *
 * The final `passed` field:
 *   - If tie-break ran: tie-break's `getPassed` is the answer.
 *   - Otherwise: majority of tier-1 judges' `getPassed`.
 *
 * Schema-validation failures count as a failing vote, not an error
 * propagated up — the jury keeps voting with the verdicts it has.
 */
export async function runJury<TResult>(
  config: JuryConfig<TResult>,
): Promise<VotedVerdict<TResult>> {
  if (config.tier1.length === 0) {
    throw new Error("runJury: tier1 must contain at least one judge");
  }

  const tier1Verdicts = await Promise.all(
    config.tier1.map((judge) => {
      const entry = JUDGE_REGISTRY[judge];
      if (!entry) {
        throw new Error(`runJury: unknown judge ${judge}`);
      }
      return runSingleJudge(
        judge,
        config,
        entry.model,
        entry.needsClaudeImageCap,
      );
    }),
  );

  const passingCount = tier1Verdicts.filter(
    (v) => v.ok && config.getPassed(v.result),
  ).length;
  const failingCount = tier1Verdicts.length - passingCount;

  const trigger = config.escalationTrigger ?? defaultEscalationTrigger;
  const shouldEscalate = Boolean(
    config.tieBreak && trigger(tier1Verdicts, passingCount, failingCount),
  );

  if (shouldEscalate && config.tieBreak) {
    const entry = JUDGE_REGISTRY[config.tieBreak];
    if (!entry) {
      throw new Error(`runJury: unknown tieBreak judge ${config.tieBreak}`);
    }
    const tieBreakVerdict = await runSingleJudge(
      config.tieBreak,
      config,
      entry.model,
      entry.needsClaudeImageCap,
    );
    const tieBreakPassed = tieBreakVerdict.ok
      ? config.getPassed(tieBreakVerdict.result)
      : false;
    return {
      passed: tieBreakPassed,
      verdicts: tier1Verdicts,
      tieBreakVerdict,
      passingCount,
      failingCount,
      escalated: true,
    };
  }

  return {
    passed: passingCount >= Math.ceil(tier1Verdicts.length / 2),
    verdicts: tier1Verdicts,
    passingCount,
    failingCount,
    escalated: false,
  };
}
