/**
 * Dev/CI one-off runner for the daily blog cron pipeline.
 *
 * Lets us run the full pipeline against a single topic locally without
 * hitting the worker HTTP route or burning the 06:00 UTC scheduled
 * slot. Especially useful when iterating on voice refs / SERP research
 * / keyword clustering wiring.
 *
 * Usage:
 *
 *   npx tsx --env-file=.env src/scripts/run-blog-cron.ts \
 *     --topic="Benefits of coloring for child development" \
 *     --dry-run
 *
 *   npx tsx --env-file=.env src/scripts/run-blog-cron.ts \
 *     --topic="dinosaur"        # substring match, picks first hit
 *
 *   npx tsx --env-file=.env src/scripts/run-blog-cron.ts
 *     # no flags = same behavior as the cron (random uncovered topic)
 *
 * Flags:
 *   --topic="..."   Pin the run to a specific BLOG_TOPICS entry. Exact
 *                   match preferred; substring match falls back. If
 *                   nothing matches, the run aborts.
 *   --dry-run       Skip meta/image generation and the Sanity write.
 *                   Logs the assembled system prompt, user prompt, and
 *                   generated content so we can eyeball voice/structure
 *                   end-to-end without producing a real post.
 */

import { runBlogCron } from "../blog/pipeline.js";

function parseArgs(argv: string[]) {
  let topic: string | undefined;
  let dryRun = false;
  for (const raw of argv) {
    if (raw === "--dry-run" || raw === "--dryRun") {
      dryRun = true;
      continue;
    }
    if (raw.startsWith("--topic=")) {
      // Strip wrapping quotes if the shell preserved them.
      topic = raw.slice("--topic=".length).replace(/^['"]|['"]$/g, "");
      continue;
    }
    if (raw === "--topic") {
      // No value attached — fall through, the next iteration will pick
      // it up via the `--topic=` branch only. Bail on this form to keep
      // the parser simple; encourage --topic="..." instead.
      continue;
    }
  }
  return { topic, dryRun };
}

async function main() {
  const { topic, dryRun } = parseArgs(process.argv.slice(2));
  console.log(
    `[run-blog-cron] starting (topic=${topic ? `"${topic}"` : "<random uncovered>"}, dryRun=${dryRun})`,
  );
  await runBlogCron({ topicOverride: topic, dryRun });
  console.log(`[run-blog-cron] finished`);
}

main().catch((err) => {
  console.error("[run-blog-cron] uncaught error:", err);
  process.exit(1);
});
