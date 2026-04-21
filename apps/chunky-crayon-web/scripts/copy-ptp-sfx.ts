#!/usr/bin/env tsx

/**
 * One-off: copy licensed transition SFX from PTP's R2 bucket into CC's
 * R2. Runs against either the dev or prod bucket depending on --env=.
 *
 * PTP sources these from Epidemic Sound (licensed). We reuse them for
 * CC ad videos — transitions are generic whooshes, no brand context.
 *
 * Usage:
 *   pnpm tsx scripts/copy-ptp-sfx.ts                 # dev bucket
 *   pnpm tsx scripts/copy-ptp-sfx.ts --env=prod      # prod bucket
 *
 * Prod mode requires R2_*_PROD env vars present (override defaults).
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

// Apply prod overrides BEFORE importing the storage package (which reads
// env at module-init).
const args = new Set(process.argv.slice(2));
const target = [...args].find((a) => a.startsWith('--env='))?.slice(6) ?? 'dev';

if (target === 'prod') {
  const bucket = process.env.R2_BUCKET_PROD;
  const publicUrl = process.env.R2_PUBLIC_URL_PROD;
  if (!bucket || !publicUrl) {
    console.error(
      '❌ --env=prod requires R2_BUCKET_PROD and R2_PUBLIC_URL_PROD in .env.local',
    );
    process.exit(1);
  }
  process.env.R2_BUCKET = bucket;
  process.env.R2_PUBLIC_URL = publicUrl;
} else if (target !== 'dev') {
  console.error(`❌ invalid --env=${target}, must be dev or prod`);
  process.exit(1);
}

// PTP prod R2 public URL. These 3 MP3s are licensed transition whooshes
// sourced from Epidemic Sound, reusable for any video with scene cuts.
const PTP_SFX_URLS = [
  'https://assets.parkingticketpal.com/social/sfx/transition/transition-01.mp3',
  'https://assets.parkingticketpal.com/social/sfx/transition/transition-02.mp3',
  'https://assets.parkingticketpal.com/social/sfx/transition/transition-03.mp3',
];

async function main() {
  // Dynamic import so env overrides above run before module init.
  const { put } = await import('@one-colored-pixel/storage');
  console.log(
    `🎯 Copying ${PTP_SFX_URLS.length} transition SFX → ${target} (${process.env.R2_BUCKET}, ${process.env.R2_PUBLIC_URL})\n`,
  );

  for (const sourceUrl of PTP_SFX_URLS) {
    const filename = sourceUrl.split('/').pop()!;
    const key = `social/sfx/transition/${filename}`;

    console.log(`📥 fetching ${filename}…`);
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${sourceUrl}: ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    console.log(`   ${(buffer.length / 1024).toFixed(0)}KB`);

    console.log(`📤 uploading to ${key}…`);
    const { url } = await put(key, buffer, { contentType: 'audio/mpeg' });
    console.log(`✅ ${url}\n`);
  }

  console.log(`📁 Done — ${PTP_SFX_URLS.length} files in ${target} R2.`);
}

main().catch((err) => {
  console.error('❌ copy-ptp-sfx failed:', err);
  process.exit(1);
});
