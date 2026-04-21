#!/usr/bin/env tsx

/**
 * Render every campaign in lib/ads/campaigns.ts at Meta feed / Stories /
 * Pinterest dimensions via Playwright + save PNGs to public/ads/.
 *
 * Requires the Next.js dev server running on localhost:3000.
 *
 * Filename pattern: <campaign.id>--<format>.png
 *   e.g. impossible-request-trex--meta-feed.png
 *
 * Usage:
 *   pnpm tsx scripts/export-ads.ts                 # all campaigns, all formats
 *   pnpm tsx scripts/export-ads.ts --only=trex     # single campaign
 *   pnpm tsx scripts/export-ads.ts --format=meta-feed   # single format
 */

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { campaigns } from '../lib/ads/campaigns';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, '..', 'public', 'ads');
const DEV_BASE = process.env.DEV_BASE_URL ?? 'http://localhost:3000';

type Format = {
  key: 'meta-feed' | 'stories' | 'pinterest';
  width: number;
  height: number;
  label: string;
};

const FORMATS: Format[] = [
  { key: 'meta-feed', width: 1080, height: 1350, label: 'Meta Feed 4:5' },
  { key: 'stories', width: 1080, height: 1920, label: 'Stories 9:16' },
  { key: 'pinterest', width: 1000, height: 1500, label: 'Pinterest 2:3' },
];

async function main() {
  const args = new Set(process.argv.slice(2));
  const only = [...args].find((a) => a.startsWith('--only='))?.slice(7);
  const formatFilter = [...args]
    .find((a) => a.startsWith('--format='))
    ?.slice(9) as Format['key'] | undefined;

  const targets = only ? campaigns.filter((c) => c.id === only) : campaigns;
  const formats = formatFilter
    ? FORMATS.filter((f) => f.key === formatFilter)
    : FORMATS;

  if (only && targets.length === 0) {
    console.error(`❌ --only=${only} matched no campaign`);
    process.exit(1);
  }
  if (formatFilter && formats.length === 0) {
    console.error(`❌ --format=${formatFilter} invalid`);
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`🛰  dev server: ${DEV_BASE}`);
  console.log(
    `📐 ${targets.length} campaigns × ${formats.length} formats = ${
      targets.length * formats.length
    } screenshots\n`,
  );

  const browser = await chromium.launch({ headless: true });
  try {
    for (const campaign of targets) {
      for (const format of formats) {
        const filename = `${campaign.id}--${format.key}.png`;
        const outPath = resolve(OUTPUT_DIR, filename);
        const url = `${DEV_BASE}/dev/ads/${campaign.id}`;

        const started = Date.now();
        const context = await browser.newContext({
          viewport: { width: format.width, height: format.height },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        // Give any async images a beat
        await page.waitForTimeout(300);
        await page.screenshot({
          path: outPath,
          type: 'png',
          clip: { x: 0, y: 0, width: format.width, height: format.height },
        });
        await context.close();
        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        console.log(
          `✅ ${campaign.id} → ${format.label}  (${elapsed}s)  → public/ads/${filename}`,
        );
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n📁 All exports in: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('❌ export-ads failed:', err);
  process.exit(1);
});
