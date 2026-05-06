/**
 * Bundle page QA gate.
 *
 * Every generated bundle page passes through this judge before it's
 * eligible to be marked READY. The judge runs Claude Sonnet 4.6 vision
 * over the page line art and checks:
 *
 *   1. **Signature details** — for each hero that should be on this page,
 *      are all their non-negotiable visual identifiers present? (e.g.
 *      "Rex's headphones", "Zip's wrist bands")
 *
 *   2. **Anatomy** — for every animal in the image, are limb counts
 *      anatomically correct? (no third leg, no extra arm, no missing tail)
 *
 *   3. **Cast count** — does the image have the expected number of named
 *      characters? Flags hallucinated extras (we hit this on page 10:
 *      a 5th unprompted dino appeared).
 *
 * Output is structured JSON. A page only auto-passes when every check
 * comes back green; otherwise it's flagged for human review in the bundle
 * QA admin UI.
 *
 * Cost: ~$0.015/page on Sonnet 4.6 with prompt caching.
 *
 * Mirrors the pattern in lib/ads/judge.ts (Anthropic generateObject +
 * image input + ephemeral cache on the system prompt).
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import type { Hero, HeroBundle } from "./profiles";

// Opus 4.7 — flagship reasoning model. Vision QA is the highest-stakes step
// in the bundle pipeline (a missed defect ships in a paid product), so cost
// per call (~3-5x Sonnet) is justified.
const QA_MODEL_ID = "claude-opus-4-7";

const heroCheckSchema = z.object({
  heroId: z
    .string()
    .describe('The hero id from the bundle profile (e.g. "rex", "zip").'),
  detected: z
    .boolean()
    .describe(
      "True if a character matching this hero is visibly present on the page.",
    ),
  signatureDetails: z
    .array(
      z.object({
        detail: z.string().describe("The signature detail being checked."),
        present: z
          .boolean()
          .describe(
            "True if this detail is clearly visible and on-model in the image.",
          ),
        notes: z
          .string()
          .describe(
            "Brief explanation of what you see. If absent, say what is there instead.",
          ),
      }),
    )
    .describe(
      "One entry per signature detail from the hero profile, in order.",
    ),
});

const anatomyIssueSchema = z.object({
  animal: z
    .string()
    .describe(
      'Which animal has the issue — name the species and rough position ("the T-rex on the left").',
    ),
  issue: z
    .string()
    .describe(
      'What is anatomically wrong. E.g. "appears to have three legs", "missing tail", "second tail growing from back".',
    ),
});

export const qaResultSchema = z.object({
  passed: z
    .boolean()
    .describe(
      "Overall pass/fail. Pass requires: every expected hero detected, every signature detail present, no anatomy issues, no hallucinated cast members.",
    ),
  topIssue: z
    .string()
    .nullable()
    .describe(
      "Single most important reason for failure, or null if passed. One short sentence.",
    ),
  heroChecks: z
    .array(heroCheckSchema)
    .describe("One entry per hero expected on this page."),
  anatomyIssues: z
    .array(anatomyIssueSchema)
    .describe(
      "Empty if anatomy is clean. Otherwise list each issue separately.",
    ),
  expectedCastCount: z
    .number()
    .int()
    .describe("Number of named characters expected (sum of hero list)."),
  detectedCastCount: z
    .number()
    .int()
    .describe(
      "Number of named characters you can clearly see. Incidentals (background pterodactyls, generic small dinos) do NOT count toward this number — only hero-style featured animals.",
    ),
  hallucinatedCharacters: z
    .array(z.string())
    .describe(
      "Featured characters present in the image that are NOT in the expected hero list. Empty if none. Each entry: short description of the unexpected character.",
    ),
});

export type QAResult = z.infer<typeof qaResultSchema>;

const QA_SYSTEM_PROMPT = `You are a strict quality reviewer for a children's coloring book bundle. Each page in the bundle features a fixed cast of recurring hero characters with specific signature details. Your job is to verify each page is on-model.

You must return structured JSON matching the provided schema. For every check be objective and specific. Do NOT be charitable on identity-defining details: if a signature detail is genuinely missing, wrong shape, or replaced with something different, mark it absent.

Pose-aware allowance: Coloring book pages show characters in dynamic poses where parts of the body can be partially occluded (a hand tucked behind the body, a tail wrapped around feet, a back partially hidden by a prop). When evaluating a signature detail:

- If the detail is fully visible and matches the spec → \`present: true\`.
- If the detail is fully visible but clearly the wrong shape, missing, or replaced (e.g. headphones absent entirely, polka dots replaced by stripes, smooth armor replaced by spiky scales) → \`present: false\`.
- If the detail is partially occluded by the pose but the visible portion matches the spec, AND the overall character silhouette / proportions / other unobscured features match the reference image → \`present: true\` with a note explaining what is visible.
- Only mark \`present: false\` for occlusion when the detail SHOULD be in clear view for the requested pose but is missing or wrong.

A page is only \`passed: true\` when ALL of the following hold:
- Every expected hero appears (detected = true).
- Every signature detail per hero is present (per the pose-aware rule above).
- anatomyIssues is empty (genuine anatomy issues — extra leg, missing tail, second tail — not occlusion).
- hallucinatedCharacters is empty.
- expectedCastCount === detectedCastCount.

Featured vs incidental: Hero characters are the named recurring cast. Incidental animals (background birds, anonymous small dinos in a crowd, silhouettes) are NOT counted as cast. Only count featured, foreground, named characters in detectedCastCount.`;

function heroChecklistText(heroes: readonly Hero[]): string {
  if (heroes.length === 0) {
    return `No hero characters expected on this page (incidentals only). Skip the heroChecks array (empty). Still verify anatomy and absence of hallucinated featured characters.`;
  }
  return heroes
    .map((h) => {
      const details = h.signatureDetails
        .map((d, i) => `   ${i + 1}. ${d}`)
        .join("\n");
      return `- **${h.id}** (${h.name}, ${h.species}). Signature details:\n${details}`;
    })
    .join("\n");
}

/**
 * Run the QA gate on a generated bundle page.
 *
 * @param pageImage - Buffer of the rendered line-art PNG to QA
 * @param bundle - Bundle profile (so we know the heroes + their signatures)
 * @param pageNumber - 1-indexed page number — looks up which heroes to expect
 * @param heroRefs - Optional reference-sheet images for the heroes on this
 *                   page. Including them gives Claude visual context for what
 *                   "on-model" means; recommended.
 */
export async function qaBundlePage(
  pageImage: Buffer,
  bundle: HeroBundle,
  pageNumber: number,
  heroRefs?: ReadonlyArray<{ heroId: string; image: Buffer }>,
): Promise<QAResult> {
  const expectedHeroIds = bundle.pageCast[pageNumber] ?? [];
  const expectedHeroes = expectedHeroIds
    .map((id) => bundle.heroes.find((h) => h.id === id))
    .filter((h): h is Hero => h !== undefined);

  const userIntro = `Bundle: ${bundle.slug}
Page: ${pageNumber}
Expected cast on this page (${expectedHeroes.length} hero${expectedHeroes.length === 1 ? "" : "es"}):

${heroChecklistText(expectedHeroes)}

I'm attaching:
1. The generated page line art (the artwork to review).
${heroRefs && heroRefs.length > 0 ? "2. Reference sheets for the expected heroes — these show what each hero MUST look like on this page." : ""}

Review the page and return your QA verdict as structured JSON.`;

  const messageContent: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: Uint8Array; mediaType: string }
  > = [
    { type: "text", text: userIntro },
    {
      type: "image",
      image: new Uint8Array(pageImage),
      mediaType: "image/png",
    },
  ];

  if (heroRefs && heroRefs.length > 0) {
    for (const ref of heroRefs) {
      messageContent.push({
        type: "text",
        text: `Reference for hero "${ref.heroId}":`,
      });
      messageContent.push({
        type: "image",
        image: new Uint8Array(ref.image),
        mediaType: "image/png",
      });
    }
  }

  // generateText + manual JSON parse instead of generateObject. AI SDK v6's
  // generateObject sometimes routes nested Zod schemas through Anthropic's
  // tool-use mode in a way that wraps the result in a $PARAMETER_NAME
  // envelope, then fails Zod validation. Asking for raw JSON output and
  // validating ourselves sidesteps the SDK glue.
  const schemaJson = JSON.stringify(
    {
      passed: "boolean",
      topIssue: "string | null",
      heroChecks:
        "[{heroId, detected, signatureDetails: [{detail, present, notes}]}]",
      anatomyIssues: "[{animal, issue}]",
      expectedCastCount: "number",
      detectedCastCount: "number",
      hallucinatedCharacters: "[string]",
    },
    null,
    2,
  );

  const jsonInstruction = `\n\nReturn your response as a single JSON object (no markdown fence, no commentary) matching this shape:\n\n${schemaJson}\n\nAll fields are required. heroChecks must include one entry per expected hero, with one signatureDetails entry per detail listed in the hero's profile above (preserve order).`;

  const { text } = await generateText({
    model: anthropic(QA_MODEL_ID),
    system: QA_SYSTEM_PROMPT + jsonInstruction,
    messages: [{ role: "user", content: messageContent }],
    providerOptions: {
      anthropic: {
        cacheControl: { type: "ephemeral" },
      },
    },
  });

  const cleaned = text
    .trim()
    .replace(/^```json\n?/, "")
    .replace(/\n?```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Failed to parse QA JSON. Raw response (first 500 chars): ${text.slice(0, 500)}`,
    );
  }

  return qaResultSchema.parse(parsed);
}
