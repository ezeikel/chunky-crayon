#!/usr/bin/env tsx

/**
 * One-off: generate + upload QR-code SVGs to prod R2 for the 3 ad
 * coloring images (trex, foxes, dragon).
 *
 * Why this exists: backfill-ad-images-to-prod.ts seeded the DB rows but
 * never generated qrCodeUrl, so DownloadPDFButton refuses to render on
 * /start (it requires both svgUrl AND qrCodeUrl). QR generation
 * normally lives inside createColoringImage; this script does the same
 * generation + R2 upload for the 3 already-existing ad rows.
 *
 * Idempotent: HEAD-checks each R2 key before uploading. Does NOT write
 * to the DB — once R2 is populated, run the printed UPDATE statements
 * via Neon MCP (so the change is auditable in transcript, not a
 * silent script side-effect).
 *
 * Usage:
 *   pnpm tsx scripts/backfill-qr-codes-to-prod.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

const PROD_BUCKET = 'chunky-crayon-prod';
const PROD_PUBLIC_URL = 'https://assets.chunkycrayon.com';

// Hardcoded — these are the 3 ad images. IDs verified on prod branch
// br-morning-leaf-a4gj86x5 at backfill time. Re-run safely: HEAD-check
// short-circuits if the SVG is already in R2.
const AD_IMAGE_IDS = [
  'cmo8hw3o40000z36l46efmnwe', // ad:trex
  'cmo8hxg6u0001z36lo1tk80bq', // ad:foxes
  'cmo8hypn80002z36lrab18enu', // ad:dragon
];

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: requireEnv('R2_ENDPOINT'),
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });

  const updates: { id: string; qrCodeUrl: string }[] = [];

  for (const id of AD_IMAGE_IDS) {
    const key = `uploads/coloring-images/${id}/qr-code.svg`;
    const url = `${PROD_PUBLIC_URL}/${key}`;

    let exists = false;
    try {
      await s3.send(new HeadObjectCommand({ Bucket: PROD_BUCKET, Key: key }));
      exists = true;
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status !== 404) throw err;
    }

    if (exists) {
      console.log(`⏭  ${id} already has QR in R2`);
      updates.push({ id, qrCodeUrl: url });
      continue;
    }

    const svg = await QRCode.toString(
      `https://chunkycrayon.com?utm_source=${id}&utm_medium=pdf-qr-code&utm_campaign=coloring-image-pdf`,
      { type: 'svg' },
    );

    await s3.send(
      new PutObjectCommand({
        Bucket: PROD_BUCKET,
        Key: key,
        Body: Buffer.from(svg),
        ContentType: 'image/svg+xml',
      }),
    );
    console.log(`✅ ${id} → ${url}`);
    updates.push({ id, qrCodeUrl: url });
  }

  console.log(
    '\n📋 Run these UPDATEs via Neon MCP on prod branch (br-morning-leaf-a4gj86x5):\n',
  );
  for (const { id, qrCodeUrl } of updates) {
    console.log(
      `UPDATE coloring_images SET "qrCodeUrl" = '${qrCodeUrl}' WHERE id = '${id}';`,
    );
  }
}

main().catch((err) => {
  console.error('❌ failed:', err);
  process.exit(1);
});
