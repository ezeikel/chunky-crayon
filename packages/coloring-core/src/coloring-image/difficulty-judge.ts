/**
 * AI-as-judge difficulty rating for a coloring page image.
 *
 * Used in two places:
 *   1. The daily-image cron pipeline (worker) — judges each new image
 *      right after generation so it lands in the gallery with the right
 *      difficulty tag.
 *   2. The backfill judging script (apps/chunky-crayon-web/scripts/
 *      judge-image-difficulty.ts) — re-rates historical rows.
 *
 * Three judges (Haiku 4.5 + Gemini 3 Flash + GPT 5.4-mini) vote in
 * parallel; on disagreement we escalate to Opus 4.7. Identical rubric
 * for both call sites so dev-tool ratings and live-cron ratings are
 * comparable.
 *
 * Restricted to BEGINNER / INTERMEDIATE / ADVANCED. EXPERT is reserved
 * for adult mandala output (Coloring Habitat); kids' pages never
 * legitimately land there.
 */

import { z } from "zod";
import { runJury } from "../jury";

export type JudgedDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

const difficultyJudgementSchema = z.object({
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  reasoning: z.string().max(280),
});

type DifficultyJudgement = z.infer<typeof difficultyJudgementSchema>;

const DIFFICULTY_SYSTEM = `You rate the visual complexity of a child's coloring page on a 3-tier scale. The page is line art, no fill. Look at the image and pick exactly one tier.

Rate by what a child of each age range can comfortably color, NOT by aesthetic preference:

BEGINNER (ages 3-6, toddler/preschool)
- One main subject, large simple shapes
- ~5-10 distinct colorable areas total
- Thick uniform outlines, plenty of empty space
- No fine detail, no patterns inside shapes, no scale texture
- Example: a single chubby cartoon dinosaur smiling, with a sun and a small mountain. Body is a few large enclosed shapes.

INTERMEDIATE (ages 6-10, primary school)
- Multiple elements / a scene with 2-4 subjects
- ~12-20 distinct colorable areas
- Some patterned details on clothing/skin/objects (simple stripes, dots, spots)
- Bold outlines but slightly varied line weight allowed
- Example: a T-Rex with simple spot patterns standing among 3 palm trees, a small pterodactyl, and a small egg in the foreground.

ADVANCED (ages 8-12, older children)
- Dense composition with many elements
- ~25-40 distinct colorable areas
- Decorative patterns throughout (zigzag, swirls, geometric)
- Background filled with detail (leaves, scales, decorative skies)
- Still a kids' coloring page — friendly cartoon faces, NOT adult zentangle/mandala
- Example: a stegosaurus with patterned plates and scales next to a T-Rex and three pterodactyls, set in a prehistoric landscape with ferns and a nest of patterned eggs.

Output JSON: {"difficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED", "reasoning": "one short sentence explaining your call"}.`;

const DIFFICULTY_PROMPT = `Rate the difficulty tier of the attached coloring page using the rubric in the system prompt. Reply with JSON only.`;

export type DifficultyJudgeResult = {
  difficulty: JudgedDifficulty;
  source: "tier1" | "tier2" | "fallback";
  reasoning: string;
};

/**
 * Pick the majority difficulty from the panel verdicts. Returns null if
 * no class has ≥2 votes (in which case the caller should fall back to
 * the tie-break verdict or BEGINNER).
 */
function pickMajority(
  ratings: ReadonlyArray<DifficultyJudgement | null>,
): JudgedDifficulty | null {
  const tally: Record<string, number> = {};
  for (const r of ratings) {
    if (!r) continue;
    tally[r.difficulty] = (tally[r.difficulty] ?? 0) + 1;
  }
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  const [topClass, topCount] = sorted[0];
  if (topCount >= 2) return topClass as JudgedDifficulty;
  return null;
}

/**
 * Rate a coloring page image. Pass a PNG buffer (the jury downsamples
 * for Claude as needed). Returns the consensus difficulty plus which
 * tier produced it — useful for logging escalation rates.
 *
 * Failure modes (none throw):
 *   - All judges error → returns BEGINNER, source='fallback'.
 *   - No tier-1 majority + no tie-break verdict → returns BEGINNER,
 *     source='fallback'.
 */
export async function judgeColoringImageDifficulty(
  imageBuffer: Buffer,
): Promise<DifficultyJudgeResult> {
  const verdict = await runJury<DifficultyJudgement>({
    system: DIFFICULTY_SYSTEM,
    prompt: DIFFICULTY_PROMPT,
    images: [{ buffer: imageBuffer }],
    schema: difficultyJudgementSchema,
    // For difficulty rating there's no binary pass — every verdict is
    // valid. The native `passed` field doesn't apply; we use it only to
    // drive the escalation trigger below.
    getPassed: () => true,
    tier1: ["haiku-4.5", "gemini-3-flash", "gpt-5.4-mini"],
    tieBreak: "opus-4.7",
    escalationTrigger: (verdicts) => {
      // Escalate when the panel doesn't have a clear majority for one
      // difficulty class. Schema-failed or errored verdicts count as
      // "no opinion" — they don't block escalation.
      const successful = verdicts.filter(
        (v): v is typeof v & { ok: true } => v.ok,
      );
      if (successful.length < 2) return true;
      const tally: Record<string, number> = {};
      for (const v of successful) {
        tally[v.result.difficulty] = (tally[v.result.difficulty] ?? 0) + 1;
      }
      const topCount = Math.max(...Object.values(tally));
      return topCount < 2;
    },
  });

  if (verdict.escalated && verdict.tieBreakVerdict?.ok) {
    return {
      difficulty: verdict.tieBreakVerdict.result.difficulty,
      source: "tier2",
      reasoning: verdict.tieBreakVerdict.result.reasoning,
    };
  }

  const ratings = verdict.verdicts.map((v) => (v.ok ? v.result : null));
  const majority = pickMajority(ratings);
  if (majority) {
    const example = ratings.find((r) => r?.difficulty === majority);
    return {
      difficulty: majority,
      source: "tier1",
      reasoning: example?.reasoning ?? "(tier-1 majority)",
    };
  }

  return {
    difficulty: "BEGINNER",
    source: "fallback",
    reasoning: "no tier-1 majority and no tie-break verdict",
  };
}
