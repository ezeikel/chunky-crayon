/**
 * Tips discovery job — the dynamic, recurring replacement for the old
 * hardcoded dataset ingest. Mirrors news-discover.ts: pull recent posted
 * tips for dedup, run coloring-core discoverTip (Perplexity → fetch →
 * ground → verify → quality), brand-safety gate, upsert an OrganicPost.
 *
 * Tips are stored as engine=DATASET so the publish picker's NEWS<->DATASET
 * rotation keeps the feed varied (a news reel then a tips reel). Confidence
 * is HIGH because the claim is grounded in + verified against a real source.
 */

import { db } from "@one-colored-pixel/db";
import {
  discoverTip,
  vetOrganicPost,
  type OrganicCategory,
} from "@one-colored-pixel/coloring-core/organic";

// kebab-case (coloring-core) -> SCREAMING_SNAKE (Prisma OrganicCategory).
const CATEGORY_TO_DB: Record<OrganicCategory, string> = {
  "school-policy": "SCHOOL_POLICY",
  "screen-time": "SCREEN_TIME",
  "reading-literacy": "READING_LITERACY",
  "childcare-cost": "CHILDCARE_COST",
  "school-food": "SCHOOL_FOOD",
  homework: "HOMEWORK",
  "teacher-support": "TEACHER_SUPPORT",
  "childhood-play": "CHILDHOOD_PLAY",
  "baby-names": "BABY_NAMES",
  milestones: "MILESTONES",
  creativity: "CREATIVITY",
  nostalgia: "NOSTALGIA",
};

export type TipsDiscoverResult =
  | { ok: true; id: string; approved: boolean }
  | { ok: false; reason: string };

export async function runTipsDiscover(
  brand: "CHUNKY_CRAYON" | "COLORING_HABITAT" = "CHUNKY_CRAYON",
): Promise<TipsDiscoverResult> {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const recentRows = await db.organicPost.findMany({
    where: { brand, engine: "DATASET", createdAt: { gte: since } },
    select: { sourceUrl: true, sourceTitle: true, hook: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const excludeUrls = recentRows
    .map((r) => r.sourceUrl)
    .filter((u): u is string => !!u);
  const recent = recentRows.map((r) => ({
    title: r.sourceTitle ?? r.hook,
    detail: r.hook,
  }));

  const discovered = await discoverTip({ excludeUrls, recent });
  if (!discovered) {
    return { ok: false, reason: "no_publishable_tip" };
  }
  const { content } = discovered;

  const safety = await vetOrganicPost({
    hook: content.hook,
    payoff: content.payoff,
    sourceTitle: content.sourceTitle,
  });

  const created = await db.organicPost.create({
    data: {
      engine: "DATASET",
      hook: content.hook,
      payoff: content.payoff,
      centerBlock: content.centerBlock,
      coverTeaser: content.coverTeaser ?? null,
      sourceTitle: content.sourceTitle ?? null,
      sourceUrl: content.sourceUrl ?? null,
      category: CATEGORY_TO_DB[content.category] as never,
      safetyVerdict: (safety.approved ? "APPROVED" : "BLOCKED") as never,
      safetyNotes: safety.reason,
      // Grounded + verified against a real source -> HIGH confidence.
      factCheckedAt: new Date(),
      factCheckConfidence: "HIGH" as never,
      factCheckNotes: `tip grounded via ${safety.via}`,
      brand,
    },
  });

  console.log(
    `[tips-discover] created ${created.id} approved=${safety.approved} (${safety.reason})`,
  );
  return { ok: true, id: created.id, approved: safety.approved };
}
