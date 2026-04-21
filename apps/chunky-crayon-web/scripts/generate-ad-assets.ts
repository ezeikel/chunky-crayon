#!/usr/bin/env tsx

/**
 * Generate coloring pages (and optionally colored variants) for every
 * campaign declared in lib/ads/campaigns.ts. Writes the URLs to
 * ad-assets.json which the /dev/ads pages read at render time.
 *
 * Requires the Next.js dev server running on localhost:3000 (or set
 * DEV_BASE_URL). Hits two dev-only endpoints:
 *   - POST /api/dev/generate-coloring-from-description
 *   - POST /api/dev/generate-colored-variant
 *
 * Usage:
 *   pnpm tsx scripts/generate-ad-assets.ts
 *   pnpm tsx scripts/generate-ad-assets.ts --only=trex
 *   pnpm tsx scripts/generate-ad-assets.ts --force
 *   pnpm tsx scripts/generate-ad-assets.ts --colored-only
 */

import { writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { campaigns } from '../lib/ads/campaigns';
import type { AdAsset, CampaignAsset } from '../lib/ads/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '..', 'ad-assets.json');
const DEV_BASE = process.env.DEV_BASE_URL ?? 'http://localhost:3000';
const GENERATE_ENDPOINT = `${DEV_BASE}/api/dev/generate-coloring-from-description`;
const COLORED_ENDPOINT = `${DEV_BASE}/api/dev/generate-colored-variant`;

// Unique asset keys from campaigns (multiple campaigns can share one asset)
const uniqueAssets = Array.from(
  new Map(campaigns.map((c) => [c.asset.key, c.asset])).values(),
);

async function loadExisting(): Promise<AdAsset[]> {
  try {
    const raw = await readFile(OUTPUT_PATH, 'utf8');
    return JSON.parse(raw) as AdAsset[];
  } catch {
    return [];
  }
}

async function save(assets: AdAsset[]) {
  await writeFile(OUTPUT_PATH, `${JSON.stringify(assets, null, 2)}\n`);
}

async function generateColoringPage(
  asset: CampaignAsset,
): Promise<Omit<AdAsset, 'generatedAt' | 'coloredUrl'>> {
  const res = await fetch(GENERATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: asset.prompt,
      generationType: 'USER',
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    id?: string;
    title?: string;
    description?: string;
    url?: string;
    svgUrl?: string;
  };

  if (!res.ok || !data.success || !data.id || !data.url || !data.svgUrl) {
    throw new Error(
      `[${asset.key}] ${data.error ?? `HTTP ${res.status}`}: ${JSON.stringify(
        data,
      )}`,
    );
  }

  return {
    key: asset.key,
    id: data.id,
    title: data.title ?? asset.prompt,
    description: data.description ?? asset.prompt,
    url: data.url,
    svgUrl: data.svgUrl,
  };
}

async function generateColoredVariant(asset: AdAsset): Promise<string> {
  const res = await fetch(COLORED_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: asset.url, id: asset.id }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    url?: string;
  };

  if (!res.ok || !data.success || !data.url) {
    throw new Error(
      `[${asset.key}:colored] ${data.error ?? `HTTP ${res.status}`}: ${JSON.stringify(
        data,
      )}`,
    );
  }

  return data.url;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const only = [...args].find((a) => a.startsWith('--only='))?.slice(7);
  const force = args.has('--force');
  const coloredOnly = args.has('--colored-only');

  const existing = await loadExisting();
  const byKey = new Map(existing.map((a) => [a.key, a]));

  const targets = only
    ? uniqueAssets.filter((a) => a.key === only)
    : uniqueAssets;

  if (only && targets.length === 0) {
    console.error(`❌ --only=${only} matched no campaign asset`);
    process.exit(1);
  }

  console.log(`🛰  dev server: ${DEV_BASE}\n`);

  // Pass 1 — base coloring pages
  if (!coloredOnly) {
    for (const asset of targets) {
      if (!force && byKey.has(asset.key)) {
        const existingAsset = byKey.get(asset.key)!;
        console.log(
          `⏭️  ${asset.key}: already generated ${existingAsset.generatedAt} (--force to regenerate)`,
        );
        continue;
      }

      console.log(`🎨 ${asset.key}: generating line art…`);
      const started = Date.now();
      const base = await generateColoringPage(asset);
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`✅ ${asset.key}: line art done in ${seconds}s`);

      byKey.set(asset.key, {
        ...base,
        generatedAt: new Date().toISOString(),
      });
      await save([...byKey.values()]);
    }
  }

  // Pass 2 — colored variants (for assets that declare generateColoredVariant)
  for (const asset of targets) {
    if (!asset.generateColoredVariant) continue;

    const base = byKey.get(asset.key);
    if (!base) {
      console.log(
        `⏭️  ${asset.key}: no base asset yet, skipping colored variant`,
      );
      continue;
    }

    if (!force && base.coloredUrl) {
      console.log(
        `⏭️  ${asset.key}:colored — already generated (--force to regenerate)`,
      );
      continue;
    }

    console.log(
      `🖍  ${asset.key}: generating colored variant via GPT Image edit…`,
    );
    const started = Date.now();
    const coloredUrl = await generateColoredVariant(base);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`✅ ${asset.key}:colored done in ${seconds}s → ${coloredUrl}`);

    byKey.set(asset.key, { ...base, coloredUrl });
    await save([...byKey.values()]);
  }

  console.log(`\n📝 wrote ${byKey.size} asset(s) to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('❌ generate-ad-assets failed:', err);
  process.exit(1);
});
