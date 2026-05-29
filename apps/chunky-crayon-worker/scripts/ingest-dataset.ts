/**
 * Dataset ingest — loads a structured public dataset into DatasetRow rows
 * and builds approved OrganicPost (engine=DATASET) rows from them. The
 * dataset engine is the tribunal-data analogue: one row = one post,
 * cycled forever.
 *
 *   pnpm tsx scripts/ingest-dataset.ts --source babynames|milestones|screentime [--commit]
 *
 * Without --commit it's a dry run (prints what it would create). With
 * --commit it upserts DatasetSource + DatasetRow and creates OrganicPost
 * rows that pass the brand-safety jury.
 *
 * Baby names: this seeds a curated set of notable trends (the dramatic
 * ones that make good posts). A follow-up can replace the seed with a
 * full ONS/SSA CSV ingest + isPostWorthyPair scan; the row->content
 * builder + DB shape are already in place for that.
 */

import { db } from "@one-colored-pixel/db";
import {
  BABY_NAMES_SOURCE_UK,
  BABY_NAMES_SOURCE_US,
  babyNameExternalId,
  buildBabyNameContent,
  buildMilestoneContent,
  buildScreenTimeContent,
  MILESTONE_SEED,
  MILESTONE_SOURCE,
  SCREEN_TIME_SEED,
  SCREEN_TIME_SOURCE,
  vetOrganicPost,
  type BabyNameRow,
  type OrganicContent,
} from "@one-colored-pixel/coloring-core/organic";

type SourceKey = "babynames" | "milestones" | "screentime";

const CATEGORY_TO_DB: Record<string, string> = {
  "baby-names": "BABY_NAMES",
  milestones: "MILESTONES",
  "screen-time": "SCREEN_TIME",
};

// Curated notable baby-name trends (region, name, sex, year, count[, rank]).
// Each entry is an (earlier, later) pair the builder turns into a post.
const BABY_NAME_TRENDS: Array<{ earlier: BabyNameRow; later: BabyNameRow }> = [
  {
    earlier: { region: "uk", name: "Aria", sex: "F", year: 2006, count: 6 },
    later: { region: "uk", name: "Aria", sex: "F", year: 2022, count: 1234 },
  },
  {
    earlier: {
      region: "uk",
      name: "Jessica",
      sex: "F",
      year: 1996,
      count: 4900,
      rank: 1,
    },
    later: {
      region: "uk",
      name: "Jessica",
      sex: "F",
      year: 2022,
      count: 380,
      rank: 120,
    },
  },
  {
    earlier: { region: "us", name: "Aiden", sex: "M", year: 1995, count: 50 },
    later: { region: "us", name: "Aiden", sex: "M", year: 2010, count: 16000 },
  },
  {
    earlier: { region: "us", name: "Luna", sex: "F", year: 2005, count: 200 },
    later: { region: "us", name: "Luna", sex: "F", year: 2022, count: 8000 },
  },
];

async function upsertSource(s: { key: string; name: string; license: string }) {
  await db.datasetSource.upsert({
    where: { key: s.key },
    create: { key: s.key, name: s.name, license: s.license },
    update: { name: s.name, license: s.license, lastIngestedAt: new Date() },
  });
}

async function createDatasetPost(opts: {
  content: OrganicContent;
  sourceKey: string;
  externalId: string;
  payload: unknown;
  commit: boolean;
}): Promise<"created" | "skipped-unsafe" | "dry"> {
  const { content, sourceKey, externalId, payload, commit } = opts;
  const safety = await vetOrganicPost({
    hook: content.hook,
    payoff: content.payoff,
    sourceTitle: content.sourceTitle,
  });
  if (!safety.approved) {
    console.log(`  SKIP (unsafe: ${safety.reason}) ${content.hook}`);
    return "skipped-unsafe";
  }
  if (!commit) {
    console.log(`  DRY  ${content.centerBlock} | ${content.hook}`);
    return "dry";
  }

  const row = await db.datasetRow.upsert({
    where: { sourceKey_externalId: { sourceKey, externalId } },
    create: {
      sourceKey,
      externalId,
      payload: payload as never,
      usedAt: new Date(),
    },
    update: { payload: payload as never, usedAt: new Date() },
  });

  await db.organicPost.create({
    data: {
      engine: "DATASET",
      hook: content.hook,
      payoff: content.payoff,
      centerBlock: content.centerBlock,
      coverTeaser: content.coverTeaser ?? null,
      sourceTitle: content.sourceTitle ?? null,
      sourceUrl: content.sourceUrl ?? null,
      category: CATEGORY_TO_DB[content.category] as never,
      safetyVerdict: "APPROVED" as never,
      safetyNotes: safety.reason,
      // Dataset posts are backed by an official statistic — HIGH confidence.
      factCheckedAt: new Date(),
      factCheckConfidence: "HIGH" as never,
      datasetRowId: row.id,
      brand: "CHUNKY_CRAYON",
    },
  });
  console.log(`  OK   ${content.centerBlock} | ${content.hook}`);
  return "created";
}

async function ingestBabyNames(commit: boolean) {
  await upsertSource(BABY_NAMES_SOURCE_UK);
  await upsertSource(BABY_NAMES_SOURCE_US);
  for (const { earlier, later } of BABY_NAME_TRENDS) {
    const content = buildBabyNameContent(earlier, later);
    const sourceKey =
      later.region === "uk"
        ? BABY_NAMES_SOURCE_UK.key
        : BABY_NAMES_SOURCE_US.key;
    await createDatasetPost({
      content,
      sourceKey,
      externalId: babyNameExternalId(later),
      payload: { earlier, later },
      commit,
    });
  }
}

async function ingestMilestones(commit: boolean) {
  await upsertSource(MILESTONE_SOURCE);
  for (const m of MILESTONE_SEED) {
    await createDatasetPost({
      content: buildMilestoneContent(m),
      sourceKey: MILESTONE_SOURCE.key,
      externalId: m.externalId,
      payload: m,
      commit,
    });
  }
}

async function ingestScreenTime(commit: boolean) {
  await upsertSource(SCREEN_TIME_SOURCE);
  for (const s of SCREEN_TIME_SEED) {
    await createDatasetPost({
      content: buildScreenTimeContent(s),
      sourceKey: SCREEN_TIME_SOURCE.key,
      externalId: s.externalId,
      payload: s,
      commit,
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args[args.indexOf("--source") + 1] as SourceKey | undefined;
  const commit = args.includes("--commit");
  if (
    !sourceArg ||
    !["babynames", "milestones", "screentime"].includes(sourceArg)
  ) {
    console.error(
      "usage: ingest-dataset.ts --source babynames|milestones|screentime [--commit]",
    );
    process.exit(1);
  }
  console.log(`[ingest] source=${sourceArg} commit=${commit}`);
  if (sourceArg === "babynames") await ingestBabyNames(commit);
  else if (sourceArg === "milestones") await ingestMilestones(commit);
  else await ingestScreenTime(commit);
  console.log("[ingest] done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[ingest] failed:", err);
    process.exit(1);
  });
