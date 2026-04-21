#!/usr/bin/env tsx

/**
 * Generate a single random coloring image via the running dev server.
 *
 * Requires `pnpm dev` to be running on localhost:3000. Hits the dev-only
 * endpoint `/api/dev/generate-coloring-from-description`, which wraps
 * `createColoringImage` and avoids `server-only` import issues when called
 * from a plain Node process.
 *
 * Usage:
 *   pnpm tsx scripts/generate-random-coloring.ts [TYPE] [--description="..."]
 *
 * TYPE: USER (default) | SYSTEM | DAILY
 *
 * Set DEV_BASE_URL to point at a non-default host.
 */

import { GenerationType } from '@one-colored-pixel/db';
import { getRandomDescriptionSmart as getRandomDescription } from '@/utils/random';

const DEV_BASE = process.env.DEV_BASE_URL ?? 'http://localhost:3000';
const ENDPOINT = `${DEV_BASE}/api/dev/generate-coloring-from-description`;

const main = async () => {
  const args = process.argv.slice(2);
  const generationType = (args.find((a) => !a.startsWith('--')) ??
    GenerationType.USER) as GenerationType;
  const descriptionArg = args
    .find((a) => a.startsWith('--description='))
    ?.slice('--description='.length);

  if (!Object.values(GenerationType).includes(generationType)) {
    console.error(`❌ Invalid generation type: ${generationType}`);
    console.error(`Valid types: ${Object.values(GenerationType).join(', ')}`);
    process.exit(1);
  }

  const description = descriptionArg || getRandomDescription();

  console.log(`🎨 Generating coloring image via ${ENDPOINT}`);
  console.log(`📝 Description: ${description}`);
  console.log(`🔖 Type: ${generationType}\n`);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, generationType }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    id?: string;
    title?: string;
    description?: string;
    url?: string;
    svgUrl?: string;
    qrCodeUrl?: string;
    elapsedMs?: number;
  };

  if (!res.ok || !data.success) {
    console.error(
      `❌ Failed: ${data.error ?? `HTTP ${res.status}`}\n${JSON.stringify(data, null, 2)}`,
    );
    process.exit(1);
  }

  console.log('✅ Generated successfully!');
  console.log(`📄 Title: ${data.title}`);
  console.log(`🔗 Image URL: ${data.url}`);
  console.log(`🎯 SVG URL: ${data.svgUrl}`);
  console.log(`📱 QR Code URL: ${data.qrCodeUrl}`);
  console.log(`🆔 ID: ${data.id}`);
  console.log(`⏱  Elapsed: ${((data.elapsedMs ?? 0) / 1000).toFixed(1)}s`);
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
