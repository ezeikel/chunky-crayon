/**
 * Claude HEADLINE-COPY module for the poster generator.
 *
 * Drafts on-brand App Store / Play Store poster copy (HEADLINE + optional
 * SUBHEAD) for each captured screen, then merges the result into a
 * `headlines.json` that `posters.config.ts` reads at render time.
 *
 * ── Client / model / env (per the shared research brief) ───────────────
 * The repo does NOT use @anthropic-ai/sdk directly for generation. It uses
 * the Vercel AI SDK with the Anthropic provider, exactly as the worker does:
 *   - `import { anthropic } from "@ai-sdk/anthropic"`            (provider)
 *   - `import { generateObject } from "ai"`                      (helper)
 * See apps/chunky-crayon-worker/src/video/content-reel/shared/teaser.ts:20-21
 * and apps/chunky-crayon-worker/src/script/generate.ts:1-2,79-101.
 *
 * Model id: `claude-sonnet-4-6` — already the current sonnet in active worker
 * use (teaser.ts:96, research.ts:244). We reuse it rather than introducing a
 * new constant or SDK.
 *
 * Env: `ANTHROPIC_API_KEY`, read implicitly by the @ai-sdk/anthropic provider
 * (no createAnthropic({ apiKey }) call needed — same as the worker).
 *
 * ── Copy rules (HARD, from project memory) ─────────────────────────────
 *   - NEVER the word "AI" in marketing copy. Rewrite around outcomes.
 *   - NO em dashes. Use commas or fresh sentences.
 *   - US/UK-neutral spelling (color, vacation). Avoid UK-only words.
 *   - Kid + parent audience, playful but parent-trustworthy. Brand voice is
 *     "we" (Chunky Crayon, like Bluey having socials).
 *   - "Better screen time" positioning. Printed PDFs are screen-free; the
 *     in-app experience is better screen time. Don't overclaim "no screens".
 *
 * These are enforced TWICE: once in the prompt (so the model writes clean
 * copy) and once as a post-generation validator (so a stray violation is
 * caught, not shipped). The model WRITING this copy is fine; the literal
 * WORD "AI" in the OUTPUT is what's banned.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// ESM module ("type": "module") — __dirname does not exist; derive it.
const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── Model id (brief: reuse the worker's current sonnet) ──────────────────
const MODEL_ID = "claude-sonnet-4-6";

// ───────────────────────────────────────────────────────────────────────
// Public types
// ───────────────────────────────────────────────────────────────────────

/**
 * One screen the headline writer should draft copy for.
 * `name` is the panel key (e.g. "home", "gallery"); `role` is a short
 * human description of what the screen does so the model has context even
 * without seeing the shot; `screenshotPath` is optional — when present the
 * shot is attached as an image block so the model SEES the screen.
 */
export type ScreenDescriptor = {
  /** Stable panel key, matches the capture file stem (minus the NN- prefix). */
  name: string;
  /** Short description of what this screen is / does, for model context. */
  role: string;
  /** Absolute path to the captured PNG, optionally attached as an image. */
  screenshotPath?: string;
};

/** Drafted copy for one screen. */
export type ScreenHeadline = {
  name: string;
  /** Punchy headline, about 6 words max. */
  headline: string;
  /** Optional supporting line, about 12 words max. */
  subhead?: string;
};

/** The shape written to headlines.json (keyed by screen name). */
export type HeadlinesFile = {
  generatedAt: string;
  model: string;
  headlines: Record<string, { headline: string; subhead?: string }>;
};

// ───────────────────────────────────────────────────────────────────────
// Structured-output schema (validated by generateObject)
// ───────────────────────────────────────────────────────────────────────

const headlineItemSchema = z.object({
  name: z
    .string()
    .describe("The exact screen name you were given. Echo it back verbatim."),
  headline: z
    .string()
    .describe(
      "A punchy poster headline, about 6 words max. Title-case or sentence case. No trailing period. No quotes.",
    ),
  subhead: z
    .string()
    .optional()
    .describe(
      "An optional supporting line, about 12 words max. Omit if the headline already stands alone. No trailing period.",
    ),
});

// NOTE: deliberately NOT using z.array().min()/.length() — the brief / project
// memory flag that Anthropic rejects array minItems > 1 in generateObject
// schemas. Count is described in text and validated at runtime below.
const headlinesResponseSchema = z.object({
  screens: z.array(headlineItemSchema),
});

// ───────────────────────────────────────────────────────────────────────
// Prompt (Claude-4 style: literal instructions, XML tags, few-shot)
// ───────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You write App Store and Google Play poster copy for Chunky Crayon, a coloring app for kids aged 3 to 8 and the parents who hand them the tablet.

You write in the brand's voice and you follow every rule literally.

<voice>
- We speak as "we" (Chunky Crayon), the way Bluey would run its own socials: warm, playful, a little cheeky, but always trustworthy to a parent.
- Talk to parents AND delight kids. Parent-trustworthy first, never babyish.
- Concrete outcomes and feelings, not features or jargon.
</voice>

<hard_rules>
- NEVER use the word "AI" (or "A.I.", "artificial intelligence") anywhere. Write around the outcome instead.
- NEVER use em dashes (—). Use a comma or a fresh sentence.
- Use US/UK-neutral spelling: "color", "vacation", "favorite". Avoid UK-only words like "half-term", "holiday" (in the UK sense), "rubbish", "mum".
- Positioning is "better screen time", not "no screens". The in-app experience is screen time you can feel good about. Printed pages are the screen-free part. Do NOT claim the whole product is screen-free, "no charging", or "no internet".
- No prices, discounts, "#1", awards, rankings, superlatives, or competitor comparisons (Apple and Google reject promotional overlay claims).
- No emojis, no hashtags, no exclamation-mark stacking, no URLs.
</hard_rules>

<format>
- HEADLINE: about 6 words max, punchy, the hook a parent reads in half a second.
- SUBHEAD: about 12 words max, optional. Only add one if it earns its place. Omit it otherwise.
- No trailing punctuation on either line. No surrounding quotes.
</format>

<good_examples>
These are on-brand. Match this tone and length.
- "Color something new every day"
- "Their masterpieces, saved forever"
- "Screen time you can feel good about"
- "A fresh coloring page each morning"
- "Big imaginations, no mess to clean up"
</good_examples>

<task>
You will receive a list of screens. For each screen you get its name and a short description of what it shows. Some screens also include the actual screenshot image so you can see it. Write one HEADLINE and an optional SUBHEAD per screen. Return them in the same order, echoing each screen's name back exactly.
</task>`;

/**
 * Build the per-run user prompt listing every screen. Screenshots, when
 * present, are attached separately as image content parts (see below) so the
 * text prompt just enumerates names + roles in order.
 */
const buildUserPrompt = (screens: ScreenDescriptor[]): string => {
  const list = screens
    .map(
      (s, i) =>
        `<screen index="${i + 1}">\n  <name>${s.name}</name>\n  <role>${s.role}</role>\n</screen>`,
    )
    .join("\n");

  return [
    "<screens>",
    list,
    "</screens>",
    "",
    "Write copy for every screen above, in order. Echo each screen's <name> verbatim into the `name` field. Follow every hard rule.",
  ].join("\n");
};

// ───────────────────────────────────────────────────────────────────────
// Copy-rule validator (defense in depth — also enforced in the prompt)
// ───────────────────────────────────────────────────────────────────────

/** Words that, when present in output, indicate a copy-rule violation. */
const BANNED_WORD_PATTERNS: { test: RegExp; reason: string }[] = [
  { test: /\bA\.?\s?I\.?\b/i, reason: 'contains the banned word "AI"' },
  {
    test: /\bartificial intelligence\b/i,
    reason: 'mentions "artificial intelligence"',
  },
  { test: /[—–]/, reason: "contains an em dash or en dash" },
  // UK-only vocabulary to steer away from (US/UK-neutral preferred).
  { test: /\bhalf-?term\b/i, reason: 'uses UK-only word "half-term"' },
  {
    test: /\bmum\b/i,
    reason: 'uses UK spelling "mum" (prefer "mom" or "parent")',
  },
];

/** Returns an array of human-readable violation reasons (empty = clean). */
export const findCopyViolations = (text: string): string[] => {
  const reasons: string[] = [];
  for (const { test, reason } of BANNED_WORD_PATTERNS) {
    if (test.test(text)) reasons.push(reason);
  }
  return reasons;
};

const WORD_LIMIT_HEADLINE = 8; // ~6 target, small tolerance
const WORD_LIMIT_SUBHEAD = 16; // ~12 target, small tolerance

const wordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

// ───────────────────────────────────────────────────────────────────────
// Screenshot → image content part
// ───────────────────────────────────────────────────────────────────────

/**
 * Read a screenshot and return an AI-SDK image content part, or null if the
 * path is missing / unreadable (we degrade gracefully to text-only context).
 */
const toImagePart = async (
  screenshotPath: string,
): Promise<{ type: "image"; image: string; mediaType: string } | null> => {
  try {
    const bytes = await fs.readFile(screenshotPath);
    const base64 = bytes.toString("base64");
    return {
      type: "image",
      image: `data:image/png;base64,${base64}`,
      mediaType: "image/png",
    };
  } catch {
    return null;
  }
};

// ───────────────────────────────────────────────────────────────────────
// generateHeadlines
// ───────────────────────────────────────────────────────────────────────

/**
 * Draft a HEADLINE (+ optional SUBHEAD) per screen using Claude.
 *
 * Attaches each screen's screenshot as a base64 image block when a
 * `screenshotPath` is provided, so the model can see the screen. Validates
 * the returned copy against the hard COPY RULES and throws on any violation
 * rather than shipping bad copy silently.
 *
 * @param screens   The screens to draft copy for.
 * @param opts.temperature  Sampling temperature (default 0.6).
 */
export async function generateHeadlines(
  screens: ScreenDescriptor[],
  opts: { temperature?: number } = {},
): Promise<ScreenHeadline[]> {
  if (screens.length === 0) return [];

  // Build the multimodal user message: the enumerated text prompt, then one
  // labelled image part per screen that has a readable screenshot.
  const textPart = { type: "text" as const, text: buildUserPrompt(screens) };

  const imageParts: (
    | { type: "text"; text: string }
    | { type: "image"; image: string; mediaType: string }
  )[] = [];
  for (const s of screens) {
    if (!s.screenshotPath) continue;
    const img = await toImagePart(s.screenshotPath);
    if (img) {
      imageParts.push({
        type: "text",
        text: `<screenshot name="${s.name}">`,
      });
      imageParts.push(img);
    }
  }

  const { object } = await generateObject({
    model: anthropic(MODEL_ID),
    schema: headlinesResponseSchema,
    system: SYSTEM_PROMPT,
    temperature: opts.temperature ?? 0.6,
    messages: [
      {
        role: "user",
        content: [textPart, ...imageParts],
      },
    ],
  });

  // Map results back to the input order by name (the model echoes names).
  const byName = new Map(object.screens.map((s) => [s.name, s]));

  const results: ScreenHeadline[] = screens.map((s) => {
    const drafted = byName.get(s.name);
    if (!drafted) {
      throw new Error(
        `Headline generation returned no copy for screen "${s.name}".`,
      );
    }

    const headline = drafted.headline.trim().replace(/^["'`]+|["'`]+$/g, "");
    const subhead = drafted.subhead?.trim().replace(/^["'`]+|["'`]+$/g, "");

    // ── Validate against hard copy rules ──────────────────────────────
    const combined = [headline, subhead].filter(Boolean).join(" ");
    const violations = findCopyViolations(combined);
    if (violations.length > 0) {
      throw new Error(
        `Copy-rule violation on screen "${s.name}" (${violations.join(
          ", ",
        )}): "${combined}"`,
      );
    }
    if (wordCount(headline) > WORD_LIMIT_HEADLINE) {
      throw new Error(
        `Headline for "${s.name}" is too long (${wordCount(
          headline,
        )} words, limit ${WORD_LIMIT_HEADLINE}): "${headline}"`,
      );
    }
    if (subhead && wordCount(subhead) > WORD_LIMIT_SUBHEAD) {
      throw new Error(
        `Subhead for "${s.name}" is too long (${wordCount(
          subhead,
        )} words, limit ${WORD_LIMIT_SUBHEAD}): "${subhead}"`,
      );
    }

    return {
      name: s.name,
      headline,
      ...(subhead ? { subhead } : {}),
    };
  });

  return results;
}

// ───────────────────────────────────────────────────────────────────────
// Writer — merge results into headlines.json that posters.config.ts reads
// ───────────────────────────────────────────────────────────────────────

/**
 * Merge drafted headlines into a headlines.json file, preserving any
 * existing entries for screens not in this batch. `posters.config.ts` reads
 * this file and maps each panel's copy onto its template fields.
 *
 * @param headlines  The drafted copy to write.
 * @param outPath    Absolute path to headlines.json (defaults to the
 *                   tool's own src/headlines.json next to this module).
 * @returns The path written.
 */
export async function writeHeadlinesJson(
  headlines: ScreenHeadline[],
  outPath: string = path.join(HERE, "headlines.json"),
): Promise<string> {
  // Merge with any existing file so re-running for a subset of screens does
  // not clobber the rest.
  let existing: HeadlinesFile["headlines"] = {};
  try {
    const raw = await fs.readFile(outPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<HeadlinesFile>;
    if (parsed.headlines) existing = parsed.headlines;
  } catch {
    // No existing file (or unparseable) — start fresh.
  }

  for (const h of headlines) {
    existing[h.name] = {
      headline: h.headline,
      ...(h.subhead ? { subhead: h.subhead } : {}),
    };
  }

  const file: HeadlinesFile = {
    generatedAt: new Date().toISOString(),
    model: MODEL_ID,
    headlines: existing,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  return outPath;
}
