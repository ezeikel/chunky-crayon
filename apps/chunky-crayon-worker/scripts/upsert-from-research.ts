/**
 * Re-upsert ContentReel rows from a saved research-{kind}-verified.json
 * audit dump, applying the LATEST id-slug logic. Useful when:
 *   - The Sonar drafts were good but we changed the slug rule and the
 *     old IDs ("1", "2", "3") need to be replaced.
 *   - We want to re-import a previous run without paying for new
 *     research + verification calls.
 *
 * Run:
 *   pnpm exec tsx scripts/upsert-from-research.ts --file tmp/research-myth-verified.json
 *
 * Required env: DATABASE_URL.
 */

import "dotenv/config";

import { readFile } from "node:fs/promises";

import { db } from "@one-colored-pixel/db";

import { toPrismaCreate } from "../src/video/content-reel/shared/db";
import type {
  ContentReel,
  ContentReelKind,
} from "../src/video/content-reel/shared/types";

type AuditEntry = {
  reel: ContentReel & { id?: string };
  verdict: {
    confidence: "high" | "medium" | "low";
    recommendation: "publish" | "revise" | "drop";
    verifiedClaim: string;
    strongestSource: { title: string; url: string; year: number | null };
    concerns: string | null;
  } | null;
  error: string | null;
};

function slugifyHook(hook: string, kind: ContentReelKind): string {
  const slug = hook
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${kind}-${slug}`;
}

async function main() {
  const args = process.argv.slice(2);
  const fileFlag = args.indexOf("--file");
  if (fileFlag === -1 || !args[fileFlag + 1]) {
    throw new Error(
      "usage: upsert-from-research --file tmp/research-myth-verified.json",
    );
  }
  const path = args[fileFlag + 1];
  const raw = await readFile(path, "utf-8");
  const entries: AuditEntry[] = JSON.parse(raw);

  const publishable = entries.filter(
    (e) =>
      e.verdict?.confidence === "high" &&
      e.verdict?.recommendation === "publish",
  );

  console.log(
    `[upsert] ${publishable.length}/${entries.length} entries cleared HIGH/publish`,
  );

  let upserted = 0;
  for (const { reel, verdict } of publishable) {
    if (!verdict) continue;
    const reelWithSource: ContentReel = {
      ...reel,
      id: slugifyHook(reel.hook, reel.kind),
      sourceTitle: verdict.strongestSource.title || reel.sourceTitle,
      sourceUrl: verdict.strongestSource.url || reel.sourceUrl,
      factCheckedAt: new Date().toISOString().slice(0, 10),
      factCheckConfidence: "high",
      factCheckNotes: verdict.concerns ?? undefined,
    };
    const data = toPrismaCreate(reelWithSource);
    await db.contentReel.upsert({
      where: { id: reelWithSource.id },
      create: data,
      update: data,
    });
    console.log(`[upsert] ${reelWithSource.id}`);
    upserted++;
  }

  console.log(`\n[upsert] done. ${upserted} rows upserted.`);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("[upsert] failed:", err);
  await db.$disconnect();
  process.exit(1);
});
