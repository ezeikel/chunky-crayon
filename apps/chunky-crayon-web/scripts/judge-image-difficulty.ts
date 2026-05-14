/**
 * AI-judge the difficulty of every backfilled coloring image and update
 * the row's `difficulty` column to match.
 *
 * Pipeline per row:
 *   1. Fetch the PNG (or convert SVG to PNG via sharp if no PNG URL)
 *   2. Send to the cheap-tier jury panel (Haiku-4.5 + Gemini-3-Flash +
 *      GPT-5.4-mini) with the difficulty rubric
 *   3. If the panel disagrees, escalate to Opus 4.7 with adaptive
 *      thinking
 *   4. Pick the majority class (BEGINNER / INTERMEDIATE / ADVANCED)
 *   5. UPDATE coloring_images SET difficulty = <class> WHERE id = <id>
 *
 * Why bother judging when most images came from a BEGINNER reference set?
 *   The backfill generated images from the same beginner reference set
 *   but Claude wrote varied prompts per landing — some scenes ended up
 *   more complex than others (a "T-Rex eating leaves" vs "T-Rex hosting
 *   a tea party with five forest animals"). Per-image judging is more
 *   honest than per-landing static tagging.
 *
 * Usage:
 *   pnpm tsx scripts/judge-image-difficulty.ts --dry-run
 *   pnpm tsx scripts/judge-image-difficulty.ts --slug calming-coloring-pages-for-kids-with-adhd --dry-run
 *   pnpm tsx scripts/judge-image-difficulty.ts --apply --limit 50
 *   pnpm tsx scripts/judge-image-difficulty.ts --apply        # all rows
 *
 * Env: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY,
 *      DATABASE_URL (which DB to read+write — set per env).
 */
import { z } from 'zod';
import sharp from 'sharp';
import { runJury } from '@one-colored-pixel/coloring-core';
import {
  db,
  Difficulty as PrismaDifficulty,
  Brand,
} from '@one-colored-pixel/db';

// Schema each judge must return. Three categories matches the v2
// reference tiers. EXPERT is reserved for adult mandala output (not
// generated on CC) so we don't include it as an option.
const difficultyJudgementSchema = z.object({
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
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

type Args = {
  slug?: string;
  limit?: number;
  apply: boolean;
  dryRun: boolean;
  brand: Brand;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    apply: false,
    dryRun: false,
    brand: Brand.CHUNKY_CRAYON,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--slug') args.slug = argv[++i];
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10);
  }
  if (!args.apply) args.dryRun = true;
  return args;
}

/**
 * Pull the image bytes for a row. Prefer the WebP URL; fall back to
 * rasterising the SVG via sharp if WebP isn't there. Returns PNG bytes
 * suitable for the jury (Claude needs PNG specifically).
 */
async function fetchImageBytes(
  url: string | null,
  svgUrl: string | null,
): Promise<Buffer> {
  // WebP path: rasterise to PNG for the judges.
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`webp fetch failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // Convert to PNG, downscale to 768px max edge — judges don't need
    // full resolution for a complexity rating, and we save tokens.
    return sharp(buf)
      .resize({ width: 768, withoutEnlargement: true })
      .png()
      .toBuffer();
  }
  if (svgUrl) {
    const res = await fetch(svgUrl);
    if (!res.ok) throw new Error(`svg fetch failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return sharp(buf)
      .resize({ width: 768, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();
  }
  throw new Error('row has neither url nor svgUrl');
}

/**
 * Pick the majority difficulty from the panel verdicts. Used when the
 * jury didn't escalate (all 3 agree, or 2-of-3 majority).
 */
function pickMajority(
  ratings: ReadonlyArray<DifficultyJudgement | null>,
): PrismaDifficulty | null {
  const tally: Record<string, number> = {};
  for (const r of ratings) {
    if (!r) continue;
    tally[r.difficulty] = (tally[r.difficulty] ?? 0) + 1;
  }
  // Sort by count desc, take the top class with ≥2 votes.
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  const [topClass, topCount] = sorted[0];
  if (topCount >= 2) return topClass as PrismaDifficulty;
  return null;
}

async function judgeOneImage(
  imageBuffer: Buffer,
): Promise<{
  difficulty: PrismaDifficulty;
  source: 'tier1' | 'tier2';
  reasoning: string;
}> {
  const verdict = await runJury<DifficultyJudgement>({
    system: DIFFICULTY_SYSTEM,
    prompt: DIFFICULTY_PROMPT,
    images: [{ buffer: imageBuffer }],
    schema: difficultyJudgementSchema,
    // For difficulty rating there's no binary pass — every verdict is
    // valid. The native `passed` field doesn't apply. We use it only to
    // drive the escalation trigger below.
    getPassed: () => true,
    tier1: ['haiku-4.5', 'gemini-3-flash', 'gpt-5.4-mini'],
    tieBreak: 'opus-4.7',
    escalationTrigger: (verdicts) => {
      // Escalate when the panel doesn't have a clear majority for one
      // difficulty class. Schema-failed or errored verdicts count as
      // "no opinion" — they don't block escalation.
      const successful = verdicts.filter(
        (v): v is typeof v & { ok: true } => v.ok,
      );
      if (successful.length < 2) return true; // Most of the panel failed
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
      difficulty: verdict.tieBreakVerdict.result.difficulty as PrismaDifficulty,
      source: 'tier2',
      reasoning: verdict.tieBreakVerdict.result.reasoning,
    };
  }
  const ratings = verdict.verdicts.map((v) => (v.ok ? v.result : null));
  const majority = pickMajority(ratings);
  if (majority) {
    const example = ratings.find((r) => r?.difficulty === majority);
    return {
      difficulty: majority,
      source: 'tier1',
      reasoning: example?.reasoning ?? '(tier-1 majority)',
    };
  }
  // No majority and no tie-break verdict — shouldn't happen but bail
  // safely to BEGINNER.
  return {
    difficulty: 'BEGINNER',
    source: 'tier1',
    reasoning: 'fallback: no majority + no tie-break verdict',
  };
}

async function main() {
  const args = parseArgs();
  const where = args.slug
    ? {
        brand: args.brand,
        sourcePrompt: { startsWith: `landing-backfill:${args.slug}:` },
      }
    : {
        brand: args.brand,
        sourcePrompt: { startsWith: 'landing-backfill:' },
      };

  const rows = await db.coloringImage.findMany({
    where,
    select: {
      id: true,
      title: true,
      url: true,
      svgUrl: true,
      difficulty: true,
      sourcePrompt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: args.limit,
  });

  console.log(
    `[judge] ${rows.length} candidate row${rows.length === 1 ? '' : 's'} ${args.dryRun ? '(DRY RUN)' : '(APPLY)'}`,
  );
  if (rows.length === 0) {
    await db.$disconnect();
    return;
  }

  // Cost estimate: ~$0.0015 per tier-1 pass + ~$0.005 if escalated.
  // Assuming 15% escalation rate, expected cost ≈ rows × $0.0023.
  console.log(
    `[judge] estimated cost: $${(rows.length * 0.0023).toFixed(2)} (assuming ~15% tier-2 escalation)`,
  );

  const totals = { judged: 0, escalated: 0, unchanged: 0, failed: 0 };
  const tallyByDiff: Record<string, number> = {};

  for (const row of rows) {
    try {
      const start = Date.now();
      const imageBuffer = await fetchImageBytes(row.url, row.svgUrl);
      const judgement = await judgeOneImage(imageBuffer);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      tallyByDiff[judgement.difficulty] =
        (tallyByDiff[judgement.difficulty] ?? 0) + 1;

      const changed = judgement.difficulty !== row.difficulty;
      const action = args.dryRun
        ? `would update ${row.difficulty} → ${judgement.difficulty}`
        : changed
          ? `updating ${row.difficulty} → ${judgement.difficulty}`
          : `keeping ${row.difficulty}`;
      console.log(
        `[${judgement.source}] ${row.id} (${elapsed}s) ${action} — ${judgement.reasoning.slice(0, 80)}${judgement.reasoning.length > 80 ? '…' : ''}`,
      );

      if (!args.dryRun && changed) {
        await db.coloringImage.update({
          where: { id: row.id },
          data: { difficulty: judgement.difficulty },
        });
      }
      if (!changed) totals.unchanged += 1;
      if (judgement.source === 'tier2') totals.escalated += 1;
      totals.judged += 1;
    } catch (err) {
      console.error(
        `[fail] ${row.id}:`,
        err instanceof Error ? err.message : err,
      );
      totals.failed += 1;
    }
  }

  console.log(`\n[judge] done.`);
  console.log(
    `  judged=${totals.judged} escalated=${totals.escalated} unchanged=${totals.unchanged} failed=${totals.failed}`,
  );
  console.log(`  distribution:`, tallyByDiff);
  await db.$disconnect();
}

main().catch((err) => {
  console.error('[judge] fatal:', err);
  process.exit(1);
});
