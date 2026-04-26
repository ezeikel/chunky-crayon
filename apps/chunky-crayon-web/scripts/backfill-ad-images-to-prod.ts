#!/usr/bin/env tsx

/**
 * One-off backfill: copy the 3 ad coloring images from dev R2 + dev Neon
 * branch into prod R2 + prod Neon branch.
 *
 * Why this exists: ad-assets.json was generated against dev. The 3 ad
 * coloring images (trex, foxes, dragon) live in:
 *   - dev R2 bucket:    chunky-crayon-dev
 *   - dev Neon branch:  br-wandering-salad-a4a9ibmz
 * Meta ads send users to prod (chunkycrayon.com), so /start needs to be
 * able to show these exact images to visitors arriving from an ad. This
 * script copies the R2 objects + inserts the DB rows on prod.
 *
 * Idempotent: checks R2 HEAD and DB SELECT before writing. --dry-run to
 * preview without side effects.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-ad-images-to-prod.ts --dry-run
 *   pnpm tsx scripts/backfill-ad-images-to-prod.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { neon } from '@neondatabase/serverless';
import { adPurposeKey } from '../lib/coloring-image-purpose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

const AD_ASSETS_PATH = resolve(__dirname, '..', 'ad-assets.json');

const DEV_BUCKET = 'chunky-crayon-dev';
const PROD_BUCKET = 'chunky-crayon-prod';
const PROD_PUBLIC_URL = 'https://assets.chunkycrayon.com';

// Alt text falls back to the title; description is used for SEO.
type AdAsset = {
  key: 'trex' | 'foxes' | 'dragon';
  id: string;
  title: string;
  description: string;
  url: string;
  svgUrl: string;
  coloredUrl?: string;
  generatedAt: string;
};

// R2 credentials are the same across envs (one Cloudflare account, two
// buckets). Prod DB is accessed via PROD_DATABASE_URL which must be
// exported by the caller (e.g. `vercel env pull --environment=production
// /tmp/p.env && source /tmp/p.env`). We deliberately don't read
// DATABASE_URL from .env.local to avoid accidentally writing to dev.
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function makeR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: requireEnv('R2_ENDPOINT'),
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });
}

async function objectExists(
  s3: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw err;
  }
}

function keyFromDevUrl(devUrl: string): string {
  // dev URL format: https://pub-<id>.r2.dev/uploads/coloring-images/<id>/image.webp
  // or            : https://pub-<id>.r2.dev/uploads/ad-variants/<id>-colored.png
  const u = new URL(devUrl);
  return u.pathname.replace(/^\/+/, '');
}

async function copyObject(
  s3: S3Client,
  devUrl: string,
  dryRun: boolean,
): Promise<{ key: string; prodUrl: string; skipped: boolean }> {
  const key = keyFromDevUrl(devUrl);
  const prodUrl = `${PROD_PUBLIC_URL}/${key}`;

  const alreadyThere = await objectExists(s3, PROD_BUCKET, key);
  if (alreadyThere) {
    console.log(`   ⏭  ${key} already in prod bucket`);
    return { key, prodUrl, skipped: true };
  }

  if (dryRun) {
    console.log(`   [dry-run] would copy ${key}`);
    return { key, prodUrl, skipped: false };
  }

  // Download from dev via its public URL (faster than S3 GetObject +
  // avoids needing dev-bucket-scoped credentials to differ).
  const res = await fetch(devUrl);
  if (!res.ok) throw new Error(`GET ${devUrl} → ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  // Guess content type from extension. R2 doesn't auto-detect.
  const ext = key.split('.').pop()?.toLowerCase();
  const contentType =
    ext === 'svg'
      ? 'image/svg+xml'
      : ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : 'application/octet-stream';

  await s3.send(
    new PutObjectCommand({
      Bucket: PROD_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  console.log(`   ✅ copied ${key} (${buffer.length} bytes, ${contentType})`);
  return { key, prodUrl, skipped: false };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('🧪 dry-run: no writes will occur');

  const prodDb = requireEnv('PROD_DATABASE_URL');
  // Prod compute endpoint for project black-voice-61962689, branch
  // br-morning-leaf-a4gj86x5. Update this if the compute is recycled.
  if (!prodDb.includes('ep-green-dew-a4dehzjx')) {
    console.warn(
      '⚠️  PROD_DATABASE_URL does not target the known prod compute endpoint. Double-check before continuing.',
    );
  }
  const sql = neon(prodDb);
  const s3 = makeR2Client();

  const assets = JSON.parse(
    await readFile(AD_ASSETS_PATH, 'utf8'),
  ) as AdAsset[];
  const adIds = new Set(['trex', 'foxes', 'dragon']);
  const targets = assets.filter((a) => adIds.has(a.key));

  console.log(`\n📦 backfilling ${targets.length} coloring image(s) to prod\n`);

  for (const asset of targets) {
    console.log(`─── ${asset.key} · ${asset.id} · ${asset.title}`);

    // 1. Copy every R2 object (webp, svg, optional colored variant) into
    //    prod bucket at the same key. Returns the prod-hosted URL.
    const webp = await copyObject(s3, asset.url, dryRun);
    const svg = await copyObject(s3, asset.svgUrl, dryRun);
    const colored = asset.coloredUrl
      ? await copyObject(s3, asset.coloredUrl, dryRun)
      : null;

    // 2. Upsert the DB row. This script is idempotent across schema
    //    changes — if the row exists from a prior run, we overwrite the
    //    marketing-purpose columns (generationType, purposeKey,
    //    showInCommunity) so the new SYSTEM + 'ad:<key>' convention
    //    propagates to prod without needing a separate backfill.
    const generatedAt = new Date(asset.generatedAt);
    const purposeKey = adPurposeKey(asset.key);

    if (dryRun) {
      console.log(`   [dry-run] would upsert db row ${asset.id}`);
      continue;
    }

    await sql`
      INSERT INTO coloring_images (
        id, title, description, alt,
        url, "svgUrl",
        "coloredReferenceUrl",
        "createdAt", "updatedAt",
        "generationType", "purposeKey", "showInCommunity",
        brand
      ) VALUES (
        ${asset.id},
        ${asset.title},
        ${asset.description},
        ${asset.title},
        ${webp.prodUrl},
        ${svg.prodUrl},
        ${colored?.prodUrl ?? null},
        ${generatedAt},
        ${generatedAt},
        'SYSTEM',
        ${purposeKey},
        false,
        'CHUNKY_CRAYON'
      )
      ON CONFLICT (id) DO UPDATE SET
        "generationType" = 'SYSTEM',
        "purposeKey" = ${purposeKey},
        "showInCommunity" = false,
        "updatedAt" = ${generatedAt}
    `;
    console.log(`   ✅ upserted db row ${asset.id} (${purposeKey})`);

    // Trigger the post-creation pipeline on the worker. Since this
    // script INSERTs the row directly (bypassing createColoringImage),
    // the pipeline never auto-fires for these images — that's why the
    // first batch landed in prod with regionMapUrl/regionsJson/
    // backgroundMusicUrl all NULL. Fire-and-forget — worker writes back
    // to the DB on its own.
    const workerUrl = requireEnv('CHUNKY_CRAYON_WORKER_URL');
    const workerSecret = process.env.WORKER_SECRET;
    const headers = {
      'Content-Type': 'application/json',
      ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
    };
    const endpoints = [
      'region-store',
      'fill-points',
      'colored-reference',
      'background-music',
    ];
    await Promise.allSettled(
      endpoints.map((endpoint) =>
        fetch(`${workerUrl}/generate/${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ imageId: asset.id }),
          signal: AbortSignal.timeout(10_000),
        }).then(async (res) => {
          const text = await res.text().catch(() => '');
          console.log(
            `   ↪︎ ${endpoint}: ${res.status} ${text.slice(0, 120)}`,
          );
        }),
      ),
    );
  }

  console.log('\n✨ done');
}

main().catch((err) => {
  console.error('❌ backfill failed:', err);
  process.exit(1);
});
