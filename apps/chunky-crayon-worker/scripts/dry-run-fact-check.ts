/**
 * Sonar fact-check dry-run on 5 hand-written myth candidates.
 *
 * Why: before researching 200+ catalogue items via Sonar, we need to
 * answer two questions:
 *   1. Does the standardised verification prompt actually produce
 *      useful, well-cited verdicts? (or does Sonar bullshit confidently)
 *   2. What does each call cost, so we can bracket the total catalogue
 *      research budget before committing.
 *
 * Output:
 *   - Logs each verdict to stdout for eyeball review
 *   - Writes the full results array to tmp/fact-check-dry-run.json
 *   - Logs token usage per call so we can map to dollar cost
 *
 * Run from the worker dir:
 *   pnpm exec tsx scripts/dry-run-fact-check.ts
 *
 * Required env: PERPLEXITY_API_KEY (already in .env for daily-scene)
 */

import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { factCheckContentReel } from "../src/video/content-reel/shared/factCheck";
import type { ContentReel } from "../src/video/content-reel/shared/types";

const OUTPUT_PATH = join(process.cwd(), "tmp", "fact-check-dry-run.json");

/**
 * Five myth candidates spanning a deliberate range:
 *   - One we expect 'high / publish' (well-established kid-dev myth)
 *   - One we expect 'medium' (correct but with caveats)
 *   - One we expect 'high / publish' but in a less-famous area
 *   - One we expect 'drop' (a genuinely contested claim)
 *   - One controversy (claim that floats between true and false)
 *
 * Goal: see how Sonar handles confidence calibration. If everything
 * comes back 'high / publish', the prompt is too lenient. If everything
 * comes back 'medium', it's too cautious. We want spread.
 */
const MYTH_CANDIDATES: ContentReel[] = [
  {
    id: "myth-coloring-inside-lines",
    kind: "myth",
    hook: "Coloring inside the lines is what teachers are watching for.",
    payoff:
      "Researchers found that scribbling and free-form coloring develop fine-motor skills just as effectively, and outside-the-lines work better predicts later creativity scores.",
    centerBlock: "False",
    coverTeaser:
      "True or false: kids must color inside the lines to develop properly.",
    sourceTitle:
      "Journal of Child Development, scribbling vs. structured coloring",
    sourceUrl: "https://srcd.onlinelibrary.wiley.com/journal/14678624",
    category: "fine-motor",
  },
  {
    id: "myth-screens-before-bed",
    kind: "myth",
    hook: "A bit of screen time before bed helps kids wind down.",
    payoff:
      "Studies on melatonin suppression show even 30 minutes of bright-screen exposure within an hour of bedtime delays sleep onset by 30+ minutes in children.",
    centerBlock: "False",
    coverTeaser:
      "True or false: a bit of screen time before bed helps kids wind down.",
    sourceTitle: "AAP / Sleep Research Society",
    sourceUrl:
      "https://www.aap.org/en/patient-care/healthy-active-living-for-families/media-and-children/",
    category: "sleep",
  },
  {
    id: "myth-sugar-hyperactivity",
    kind: "myth",
    hook: "Sugar makes kids hyperactive — every parent knows it.",
    payoff:
      "Double-blind studies have repeatedly failed to find any link between sugar intake and hyperactivity in children. The effect parents report is a perception bias around birthday parties and sweets.",
    centerBlock: "False",
    coverTeaser: "True or false: sugar makes kids hyperactive.",
    sourceTitle: "JAMA meta-analysis on sugar and behavior",
    sourceUrl: "https://jamanetwork.com/journals/jama",
    category: "common-misconception",
  },
  {
    id: "myth-classical-music-iq",
    kind: "myth",
    hook: "Playing classical music to your baby raises their IQ.",
    payoff:
      "The Mozart effect was based on a tiny 1993 study on adults that didn't replicate. There's no evidence classical music boosts infant IQ.",
    centerBlock: "False",
    coverTeaser: "True or false: classical music raises a baby's IQ.",
    sourceTitle: "Nature follow-up studies on the Mozart effect",
    sourceUrl: "https://www.nature.com/",
    category: "brain-development",
  },
  {
    id: "myth-creativity-fixed-by-school",
    kind: "myth",
    hook: "Either your kid is creative or they aren't.",
    payoff:
      "Longitudinal studies show creativity scores fluctuate substantially based on environment and practice through adolescence — divergent thinking is trainable.",
    centerBlock: "False",
    coverTeaser:
      "True or false: creativity is something you're born with or you aren't.",
    sourceTitle: "Torrance Tests of Creative Thinking longitudinal data",
    sourceUrl: "https://www.ststesting.com/ngifted.html",
    category: "creativity",
  },
];

async function main() {
  await mkdir(join(process.cwd(), "tmp"), { recursive: true });

  console.log(`[dry-run] verifying ${MYTH_CANDIDATES.length} myth candidates`);
  const results: Array<{
    id: string;
    candidate: ContentReel;
    verdict: Awaited<ReturnType<typeof factCheckContentReel>> | null;
    error: string | null;
    durationMs: number;
  }> = [];

  for (const candidate of MYTH_CANDIDATES) {
    const start = Date.now();
    console.log(`\n[dry-run] ${candidate.id}`);
    console.log(`  hook: ${candidate.hook}`);
    console.log(`  payoff: ${candidate.payoff}`);

    try {
      const verdict = await factCheckContentReel(candidate);
      const durationMs = Date.now() - start;
      console.log(
        `  verdict: ${verdict.confidence} / ${verdict.recommendation}`,
      );
      console.log(`  source: ${verdict.strongestSource.title}`);
      if (verdict.concerns) {
        console.log(`  concerns: ${verdict.concerns}`);
      }
      console.log(
        `  tokens: in=${verdict.meta?.promptTokens ?? "?"} out=${
          verdict.meta?.completionTokens ?? "?"
        } finish=${verdict.meta?.finishReason ?? "?"} (${durationMs}ms)`,
      );
      results.push({
        id: candidate.id,
        candidate,
        verdict,
        error: null,
        durationMs,
      });
    } catch (err) {
      const durationMs = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ERROR: ${message} (${durationMs}ms)`);
      results.push({
        id: candidate.id,
        candidate,
        verdict: null,
        error: message,
        durationMs,
      });
    }
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n[dry-run] wrote results to ${OUTPUT_PATH}`);

  // Summary
  const verdicts = results.filter((r) => r.verdict);
  const totalIn = verdicts.reduce(
    (n, r) => n + (r.verdict?.meta?.promptTokens ?? 0),
    0,
  );
  const totalOut = verdicts.reduce(
    (n, r) => n + (r.verdict?.meta?.completionTokens ?? 0),
    0,
  );
  console.log(
    `\n[dry-run] summary: ${verdicts.length}/${results.length} succeeded`,
  );
  console.log(`[dry-run] tokens (all calls): in=${totalIn} out=${totalOut}`);

  // Sonar-pro pricing per perplexity.ai docs (subject to change):
  //   $1 per 1M input tokens, $1 per 1M output tokens, $5 per 1k searches
  // We can't see search count from the SDK directly; assume 1 search/call.
  const inputCostUsd = (totalIn / 1_000_000) * 1;
  const outputCostUsd = (totalOut / 1_000_000) * 1;
  const searchCostUsd = (verdicts.length / 1000) * 5;
  const total = inputCostUsd + outputCostUsd + searchCostUsd;
  console.log(
    `[dry-run] estimated cost: $${total.toFixed(4)} (input $${inputCostUsd.toFixed(4)} + output $${outputCostUsd.toFixed(4)} + search $${searchCostUsd.toFixed(4)})`,
  );
  console.log(
    `[dry-run] per-call avg: $${(total / Math.max(verdicts.length, 1)).toFixed(4)}`,
  );
  console.log(
    `[dry-run] projected for 250 catalogue items: $${(total * (250 / Math.max(verdicts.length, 1))).toFixed(2)} (verification only — research is separate)`,
  );
}

main().catch((err) => {
  console.error("[dry-run] failed:", err);
  process.exit(1);
});
