/**
 * Smoke-test for the content-reel Satori cover generator.
 *
 * Renders one cover per template using the spike sample stats and writes
 * the JPEG buffers to `tmp/content-reel-cover-preview/` so we can eyeball
 * them outside of Studio. Run from the worker dir:
 *
 *   pnpm exec tsx scripts/preview-content-reel-covers.ts
 *
 * Throws on Satori / Sharp failure so the smoke-test exits non-zero if a
 * template breaks. Not wired into the publish path yet — that lands when
 * the content-reel publish route is built.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { buildContentReelCover } from "../src/video/content-reel/shared/cover";
import {
  SHOCK_STAT_SAMPLE,
  WARM_STAT_SAMPLE,
  QUIET_STAT_SAMPLE,
  WARM_MYTH_SAMPLE,
} from "../src/video/content-reel/spike/sample-stats";

const OUTPUT_DIR = join(process.cwd(), "tmp", "content-reel-cover-preview");

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const cases = [
    { template: "shock" as const, reel: SHOCK_STAT_SAMPLE },
    { template: "warm" as const, reel: WARM_STAT_SAMPLE },
    { template: "quiet" as const, reel: QUIET_STAT_SAMPLE },
    // Myth fixture renders through the Warm template — same plasma palette,
    // different reveal beat (VerdictStamp). Confirms cover pill text picks
    // the kind-aware "Tap to see the answer" copy.
    { template: "warm" as const, reel: WARM_MYTH_SAMPLE },
  ];

  for (const { template, reel } of cases) {
    const start = Date.now();
    const buf = await buildContentReelCover({ template, reel });
    const ms = Date.now() - start;
    const outPath = join(OUTPUT_DIR, `${template}-${reel.id}.jpg`);
    await writeFile(outPath, buf);
    console.log(
      `[preview] ${template.padEnd(5)} → ${outPath} (${buf.byteLength} bytes, ${ms}ms)`,
    );
  }
}

main().catch((err) => {
  console.error("[preview] failed:", err);
  process.exit(1);
});
