/**
 * Comic-strip jury wrapper around the shared multi-judge module.
 *
 * The actual jury implementation lives in
 * `@one-colored-pixel/coloring-core` so kid-safety moderation,
 * comic-strip QC, and image-difficulty rating all share one code path.
 * This file exists as a thin wrapper to preserve the existing
 * `judgeWithThree<TResult>` signature so the three call sites in
 * `pipeline.ts` (script jury, per-panel jury, whole-strip jury) don't
 * need to touch their call shape.
 *
 * Tier-1 panel for comic strips is intentionally top-tier (Opus 4.7 +
 * GPT-5.5 + Gemini 3.1 Pro), no tie-break — single-judge QC was missing
 * real continuity bugs because the same model that can't see the bug
 * can't judge it either. Different model families have different blind
 * spots and we need maximum accuracy on every panel.
 *
 * Image-input gotcha: Claude's content-API caps base64 image input at
 * ~5MB. The shared module handles downsampling automatically.
 */

import {
  runJury,
  type JudgeId,
  type JudgeVerdict,
  type VotedVerdict,
} from "@one-colored-pixel/coloring-core";
import type { z } from "zod";

export type { JudgeVerdict, VotedVerdict };
// Re-exported for back-compat; comic-strip callers expect this exact set.
export type CommicStripJudgeId = "opus-4.7" | "gpt-5.5" | "gemini-3.1-pro";

const COMIC_STRIP_PANEL: ReadonlyArray<JudgeId> = [
  "opus-4.7",
  "gpt-5.5",
  "gemini-3.1-pro",
];

type JudgeInput = {
  /** System prompt — same for all 3 judges. */
  system: string;
  /** User prompt text. */
  prompt: string;
  /** Optional image inputs. Claude gets a downsampled copy if oversized. */
  images?: ReadonlyArray<{ buffer: Buffer; description?: string }>;
};

/**
 * Run the same prompt past all 3 comic-strip judges in parallel.
 * Preserves the existing API surface — callers pass schema + getPassed
 * exactly as before.
 */
export async function judgeWithThree<TResult>(
  input: JudgeInput,
  schema: z.ZodSchema<TResult>,
  getPassed: (result: TResult) => boolean,
): Promise<VotedVerdict<TResult>> {
  return runJury<TResult>({
    system: input.system,
    prompt: input.prompt,
    images: input.images,
    schema,
    getPassed,
    tier1: COMIC_STRIP_PANEL,
    // No tie-break: comic-strip QC uses pure 2-of-3 majority. The
    // top-tier panel is already maximally informed; an Opus tie-break
    // when Opus is already on the panel would just duplicate one voter.
  });
}
