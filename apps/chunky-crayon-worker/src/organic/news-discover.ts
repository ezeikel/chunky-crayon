/**
 * News discovery job — the recurring Perplexity half of the engine.
 *
 * Per run:
 *   1. Pull recently-seen news URLs from the DB (last 60 days) so
 *      discovery doesn't re-surface a story we already posted.
 *   2. coloring-core discoverNewsStory() → best scored, scripted story.
 *   3. Brand-safety jury gate (kids-app strict). Blocked → discard, log.
 *   4. Upsert an OrganicPost (engine=NEWS) with the safety verdict +
 *      engagement score. APPROVED rows become publishable by the picker.
 *
 * Discovery + scoring + safety all degrade gracefully — a bad run logs
 * and no-ops rather than throwing, so the cron stays quiet on empty days.
 */

import { db } from "@one-colored-pixel/db";
import {
  discoverNewsStory,
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

export type NewsDiscoverResult =
  | { ok: true; id: string; approved: boolean; score: number }
  | { ok: false; reason: string };

export async function runNewsDiscover(
  brand: "CHUNKY_CRAYON" | "COLORING_HABITAT" = "CHUNKY_CRAYON",
): Promise<NewsDiscoverResult> {
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const recent = await db.organicPost.findMany({
    where: { brand, engine: "NEWS", createdAt: { gte: since } },
    select: { sourceUrl: true },
  });
  const excludeUrls = recent
    .map((r) => r.sourceUrl)
    .filter((u): u is string => !!u);

  const discovered = await discoverNewsStory(excludeUrls);
  if (!discovered) {
    return { ok: false, reason: "no_publishable_story" };
  }
  const { content, score } = discovered;

  const safety = await vetOrganicPost({
    hook: content.hook,
    payoff: content.payoff,
    sourceTitle: content.sourceTitle,
  });

  // News carries real-world claims, so a story that cleared the engagement
  // floor + safety jury is treated as MEDIUM confidence by default (the
  // source URL was reachable + Perplexity-grounded). HIGH is reserved for
  // dataset posts backed by an official statistic.
  const created = await db.organicPost.create({
    data: {
      engine: "NEWS",
      hook: content.hook,
      payoff: content.payoff,
      centerBlock: content.centerBlock,
      coverTeaser: content.coverTeaser ?? null,
      sourceTitle: content.sourceTitle ?? null,
      sourceUrl: content.sourceUrl ?? null,
      category: CATEGORY_TO_DB[content.category] as never,
      engagementScore: score,
      safetyVerdict: (safety.approved ? "APPROVED" : "BLOCKED") as never,
      safetyNotes: safety.reason,
      factCheckedAt: new Date(),
      factCheckConfidence: "MEDIUM" as never,
      factCheckNotes: `discovered via ${safety.via}`,
      brand,
    },
  });

  console.log(
    `[news-discover] created ${created.id} approved=${safety.approved} score=${score.toFixed(2)} (${safety.reason})`,
  );
  return { ok: true, id: created.id, approved: safety.approved, score };
}
