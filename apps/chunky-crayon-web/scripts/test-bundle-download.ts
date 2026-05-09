/**
 * Smoke-test the bundle download endpoint end-to-end.
 *
 * Prerequisites (set up once before running this):
 *   1. Dev server running on :3000 (pnpm dev in apps/chunky-crayon-web)
 *   2. A BundlePurchase row exists in dev DB. Inserted via SQL:
 *      INSERT INTO bundle_purchases (...) VALUES ('test_purchase_dino_001', ...)
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/test-bundle-download.ts \
 *     dotenv_config_path=.env.local
 */

import { writeFile } from 'fs/promises';
import { signBundleDownloadToken } from '@/lib/bundle-download-token';

const PURCHASE_ID = 'test_purchase_dino_001';
const SLUG = 'dino-dance-party';
const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

async function run() {
  console.log(`[test] signing token for purchase ${PURCHASE_ID}...`);
  const token = await signBundleDownloadToken(PURCHASE_ID);
  console.log(`[test] token: ${token.slice(0, 32)}...`);

  // Hit the endpoint with the token (guest-flow simulation)
  const downloadUrl = `${BASE}/api/bundles/${SLUG}/download?token=${encodeURIComponent(token)}`;
  console.log(`[test] GET ${downloadUrl}`);

  const start = Date.now();
  const res = await fetch(downloadUrl);
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  if (!res.ok) {
    const body = await res.text();
    console.error(`[test] FAILED in ${elapsed}s: ${res.status} ${body}`);
    process.exit(1);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  console.log(
    `[test] ${res.status} ${res.headers.get('content-type')} ${(buf.length / 1024).toFixed(1)}KB in ${elapsed}s`,
  );
  console.log(
    `[test] Content-Disposition: ${res.headers.get('content-disposition')}`,
  );

  const outPath = `/tmp/${SLUG}-via-endpoint.pdf`;
  await writeFile(outPath, buf);
  console.log(`[test] wrote ${outPath}`);

  // Hit again — should be cache-served (faster, same bytes)
  console.log(`\n[test] second hit (should be cache-served)...`);
  const start2 = Date.now();
  const res2 = await fetch(downloadUrl);
  const elapsed2 = ((Date.now() - start2) / 1000).toFixed(2);
  const buf2 = Buffer.from(await res2.arrayBuffer());
  console.log(
    `[test] ${res2.status} ${(buf2.length / 1024).toFixed(1)}KB in ${elapsed2}s`,
  );

  if (buf.length !== buf2.length) {
    console.warn(
      `[test] WARN: byte length differs between hits (${buf.length} vs ${buf2.length})`,
    );
  }

  // Token-mismatch: refuse a token signed for a purchase that doesn't
  // belong to this slug.
  console.log(`\n[test] negative test: bad token...`);
  const badRes = await fetch(
    `${BASE}/api/bundles/${SLUG}/download?token=garbage`,
  );
  console.log(`[test] bad token: ${badRes.status}`);

  // No-auth: no session, no token.
  console.log(`\n[test] negative test: no auth...`);
  const noAuthRes = await fetch(`${BASE}/api/bundles/${SLUG}/download`);
  console.log(`[test] no auth: ${noAuthRes.status}`);
}

run().catch((e) => {
  console.error('[test]', e);
  process.exit(1);
});
