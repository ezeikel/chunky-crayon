/**
 * Multi-judge jury for the comic-strip pipeline.
 *
 * Runs the same JSON-judgement prompt past three vision-capable models
 * in parallel — Claude Opus 4.7, GPT-5.5, Gemini 3.1 Pro — then computes
 * a vote on whether the strip / script / panel passes.
 *
 * Why three providers:
 *   - Single-judge QC was missing real bugs (cast substitution, prop
 *     ghosts) because the same model that can't see the bug can't
 *     judge it either.
 *   - Different model families have different blind spots — Gemini
 *     spots cast inconsistency that Claude misses; Claude spots voice
 *     drift that GPT misses; etc.
 *   - 2/3 vote = passes. Disagreements get logged for retrospective.
 *
 * Used by judgeScript, judgePanel, and judgeWholeStrip.
 *
 * Image-input gotcha: Claude's content-API caps base64 image input at
 * 5MB. Our 2x2 strip composite is ~5.6MB raw → 7.8MB base64 — over
 * the cap. downsamplePngForClaude() resizes any oversized PNG before
 * we hand it to the Claude judge so the call doesn't 400 instantly.
 * The other providers accept the original.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import sharp from "sharp";
import type { z } from "zod";

const OPUS_MODEL = anthropic("claude-opus-4-7");
const GPT_MODEL = openai("gpt-5.5");
const GEMINI_MODEL = google("gemini-3.1-pro-preview");

// Claude content-API cap for base64 images. Approx 5MB raw → 6.7MB
// base64. We cap at 3.5MB raw (≈4.7MB base64) to leave headroom.
const CLAUDE_IMAGE_BYTE_CAP = 3.5 * 1024 * 1024;

/**
 * If a PNG buffer would blow Claude's 5MB image cap once base64-encoded,
 * resize it down. Operates only on PNG buffers; pass-through everything
 * already small enough. Quality loss is irrelevant for judgement — the
 * model just needs to see what's in the panel/strip.
 */
async function downsamplePngForClaude(buffer: Buffer): Promise<Buffer> {
  if (buffer.byteLength <= CLAUDE_IMAGE_BYTE_CAP) return buffer;
  // Halve the dimensions; if still too big after one pass, halve again.
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
    scale = 0.5; // halve again on next pass
  }
  return resized;
}

export type JudgeId = "opus-4.7" | "gpt-5.5" | "gemini-3.1-pro";

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
  /** True if ≥2 of 3 judges set passed === true (or each judge's `getPassed` returns true). */
  passed: boolean;
  /** Per-judge raw verdict objects, in the order: opus, gpt, gemini. */
  verdicts: ReadonlyArray<JudgeVerdict<TResult>>;
  /** Count of judges that returned ok + passed. */
  passingCount: number;
  /** Count of judges that errored or whose ok JSON failed `getPassed`. */
  failingCount: number;
};

type JudgeInput = {
  /** System prompt — same for all 3 judges. */
  system: string;
  /** User prompt text. */
  prompt: string;
  /** Optional image inputs. Claude gets a downsampled copy if oversized. */
  images?: ReadonlyArray<{ buffer: Buffer; description?: string }>;
};

/**
 * Run the same prompt past all 3 judges in parallel. Each one returns
 * raw text; the caller passes a Zod schema to validate + parse it.
 *
 * Implementation note: we use generateText (not generateObject) so we
 * can log the raw response when JSON parsing fails. generateObject
 * swallows the raw text and you get an opaque ZodError. With manual
 * JSON.parse + safeParse we always have the actual model output to
 * debug from.
 */
export async function judgeWithThree<TResult>(
  input: JudgeInput,
  schema: z.ZodSchema<TResult>,
  /** Given a parsed verdict, return whether this judge votes pass. */
  getPassed: (result: TResult) => boolean,
): Promise<VotedVerdict<TResult>> {
  const callModels: Array<{
    judge: JudgeId;
    // Vercel AI SDK's per-provider language-model union types are deliberately
    // broad — typing this strictly would mean a synthetic union we can't easily
    // construct. For an internal jury helper, accept any.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any;
    /** True = this provider needs the Claude image cap respected. */
    needsClaudeImageCap: boolean;
  }> = [
    { judge: "opus-4.7", model: OPUS_MODEL, needsClaudeImageCap: true },
    { judge: "gpt-5.5", model: GPT_MODEL, needsClaudeImageCap: false },
    {
      judge: "gemini-3.1-pro",
      model: GEMINI_MODEL,
      needsClaudeImageCap: false,
    },
  ];

  // Pre-build the per-judge image arrays so each judge gets the right size.
  const buildContent = async (needsClaudeCap: boolean) => {
    const imageBlocks =
      input.images && input.images.length > 0
        ? await Promise.all(
            input.images.map(async (img) => {
              const buf = needsClaudeCap
                ? await downsamplePngForClaude(img.buffer)
                : img.buffer;
              return { type: "image" as const, image: new Uint8Array(buf) };
            }),
          )
        : [];
    return [{ type: "text" as const, text: input.prompt }, ...imageBlocks];
  };

  const verdicts = await Promise.all(
    callModels.map(async ({ judge, model, needsClaudeImageCap }) => {
      const start = Date.now();
      try {
        const content = await buildContent(needsClaudeImageCap);
        const { text } = await generateText({
          model,
          system: input.system,
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
        const validated = schema.safeParse(parsed);
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
          error: err instanceof Error ? err.message : "unknown",
          elapsedMs: Date.now() - start,
        };
      }
    }),
  );

  const passingCount = verdicts.filter(
    (v) => v.ok && getPassed(v.result),
  ).length;
  const failingCount = verdicts.length - passingCount;
  const passed = passingCount >= 2;

  return { passed, verdicts, passingCount, failingCount };
}
