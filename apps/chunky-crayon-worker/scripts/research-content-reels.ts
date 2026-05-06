/**
 * Research + verify + upsert ContentReel candidates of a given kind.
 *
 * Pipeline:
 *   1. Sonar brainstorms N drafts via researchCandidates({ kind, count })
 *   2. For each draft, factCheckContentReel verifies the claim
 *   3. Drafts that come back HIGH/publish are upserted into content_reels
 *      with factCheckedAt=now / factCheckConfidence=HIGH
 *   4. Lower-confidence + concerning drafts are saved to a JSON dump for
 *      manual review (we may salvage some by editing + re-checking)
 *
 * Run from the worker dir:
 *   pnpm exec tsx scripts/research-content-reels.ts --kind myth --count 30
 *
 * Required env: PERPLEXITY_API_KEY, DATABASE_URL (worker .env)
 *
 * Cost: ~$0.005-0.01 per Sonar call. 30 myths ≈ 1 research call + 30
 * verify calls = ~$0.20 total. Far cheaper than the original $50 estimate
 * — sonar-pro is doing both passes.
 */

import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { db } from "@one-colored-pixel/db";

import { factCheckContentReel } from "../src/video/content-reel/shared/factCheck";
import {
  draftToContentReel,
  researchCandidates,
} from "../src/video/content-reel/shared/research";
import { toPrismaCreate } from "../src/video/content-reel/shared/db";
import type {
  ContentReel,
  ContentReelKind,
} from "../src/video/content-reel/shared/types";

type CliOpts = { kind: ContentReelKind; count: number };

function parseArgs(): CliOpts {
  const args = process.argv.slice(2);
  let kind: ContentReelKind = "myth";
  let count = 30;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--kind") {
      const v = args[i + 1];
      if (v !== "stat" && v !== "fact" && v !== "tip" && v !== "myth") {
        throw new Error(`--kind must be stat|fact|tip|myth, got '${v}'`);
      }
      kind = v;
      i++;
    } else if (args[i] === "--count") {
      const v = parseInt(args[i + 1] ?? "30", 10);
      if (Number.isNaN(v) || v < 1) {
        throw new Error(
          `--count must be a positive integer, got '${args[i + 1]}'`,
        );
      }
      count = v;
      i++;
    }
  }
  return { kind, count };
}

async function main() {
  const { kind, count } = parseArgs();
  console.log(`[research] kind=${kind} count=${count}`);

  const tmpDir = join(process.cwd(), "tmp");
  await mkdir(tmpDir, { recursive: true });

  // ── 1. Research ───────────────────────────────────────────────────
  console.log(`[research] brainstorming ${count} ${kind} drafts via Sonar...`);
  const tStart = Date.now();
  let drafts;
  try {
    drafts = await researchCandidates({ kind, count });
  } catch (err) {
    console.error(`[research] researchCandidates failed:`, err);
    process.exit(1);
  }
  console.log(
    `[research] got ${drafts.length} drafts in ${Date.now() - tStart}ms`,
  );

  // Save raw drafts before any verification, so we have an audit trail.
  const draftsPath = join(tmpDir, `research-${kind}-drafts.json`);
  await writeFile(draftsPath, JSON.stringify(drafts, null, 2));
  console.log(`[research] saved raw drafts to ${draftsPath}`);

  // ── 2. Verify each ────────────────────────────────────────────────
  type VerifiedItem = {
    reel: ContentReel;
    verdict: Awaited<ReturnType<typeof factCheckContentReel>> | null;
    error: string | null;
    durationMs: number;
  };

  const verified: VerifiedItem[] = [];

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i];
    const reel = draftToContentReel(draft, kind);
    console.log(`\n[research] verifying ${i + 1}/${drafts.length}: ${reel.id}`);
    console.log(`  hook: ${reel.hook}`);
    const start = Date.now();
    try {
      const verdict = await factCheckContentReel(reel);
      const durationMs = Date.now() - start;
      console.log(
        `  verdict: ${verdict.confidence} / ${verdict.recommendation} (${durationMs}ms)`,
      );
      if (verdict.concerns) {
        console.log(`  concerns: ${verdict.concerns.slice(0, 200)}`);
      }
      verified.push({ reel, verdict, error: null, durationMs });
    } catch (err) {
      const durationMs = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ERROR: ${message} (${durationMs}ms)`);
      verified.push({ reel, verdict: null, error: message, durationMs });
    }
  }

  // Save full verification audit trail.
  const verifiedPath = join(tmpDir, `research-${kind}-verified.json`);
  await writeFile(verifiedPath, JSON.stringify(verified, null, 2));
  console.log(`\n[research] saved verification audit to ${verifiedPath}`);

  // ── 3. Upsert publishable items ───────────────────────────────────
  // Per-kind confidence threshold:
  //   stat/fact/myth → HIGH only (peer-reviewed or institutional source
  //                              required; brand-risk if wrong is high)
  //   tip            → MEDIUM accepted (common parenting wisdom is fine;
  //                              Sonar's "no peer-reviewed study found"
  //                              concern is expected for advice-giving
  //                              content). The publish gate still
  //                              filters non-HIGH at posting time, so a
  //                              MEDIUM tip won't auto-post unless
  //                              someone manually upgrades it via review.
  const minConfidence: "high" | "medium" = kind === "tip" ? "medium" : "high";
  const isPublishable = (v: (typeof verified)[number]) => {
    if (!v.verdict || v.verdict.recommendation !== "publish") return false;
    if (minConfidence === "high") return v.verdict.confidence === "high";
    return v.verdict.confidence !== "low";
  };
  const publishable = verified.filter(isPublishable);

  console.log(
    `\n[research] ${publishable.length}/${verified.length} drafts cleared ${minConfidence === "high" ? "HIGH" : "MEDIUM+"}/publish`,
  );

  let upserted = 0;
  for (const { reel, verdict } of publishable) {
    if (!verdict) continue;
    // Promote Sonar's strongestSource onto the row — it's often a better
    // citation than the URL Sonar invented at draft-time.
    const reelWithSource: ContentReel = {
      ...reel,
      sourceTitle: verdict.strongestSource.title || reel.sourceTitle,
      sourceUrl: verdict.strongestSource.url || reel.sourceUrl,
      factCheckedAt: new Date().toISOString().slice(0, 10),
      // Persist Sonar's actual verdict — not always 'high'. Tip rows can
      // legitimately come back 'medium' (no peer-reviewed source, but the
      // advice is widely-supported parenting wisdom). The publish gate
      // still gates HIGH-only, so MEDIUM tips need a manual upgrade
      // before they auto-publish.
      factCheckConfidence: verdict.confidence,
      factCheckNotes: verdict.concerns ?? undefined,
    };
    const data = toPrismaCreate(reelWithSource);
    await db.contentReel.upsert({
      where: { id: reel.id },
      create: data,
      update: data,
    });
    upserted++;
    console.log(`[research] upserted ${reel.id}`);
  }

  // ── 4. Summary ────────────────────────────────────────────────────
  const total = await db.contentReel.count({
    where: { kind: kind.toUpperCase() as "STAT" | "FACT" | "TIP" | "MYTH" },
  });

  console.log(`\n[research] done.`);
  console.log(`[research]   drafts brainstormed: ${drafts.length}`);
  console.log(
    `[research]   verified successfully: ${verified.filter((v) => v.verdict).length}`,
  );
  console.log(`[research]   passed HIGH/publish: ${publishable.length}`);
  console.log(`[research]   upserted to DB: ${upserted}`);
  console.log(`[research]   total ${kind} rows in DB: ${total}`);

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("[research] failed:", err);
  await db.$disconnect();
  process.exit(1);
});
