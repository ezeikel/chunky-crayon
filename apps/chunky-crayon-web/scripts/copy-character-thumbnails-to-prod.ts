/**
 * Copy the Character Builder species / trait / voice tiles from the
 * dev R2 bucket to the prod R2 bucket.
 *
 * Sibling of `copy-profile-avatars-to-prod.ts` — same shape, same
 * env-file convention, same `--force` flag. Needed because
 * `remove-character-thumbnail-backgrounds.ts` writes RGBA versions
 * back to dev R2 (where it has creds); prod needs the same RGBA
 * versions or the live Character Builder picker still shows the
 * old opaque-white tiles.
 *
 * Idempotent: HEAD-checks each key in prod first, skips if present.
 * Pass `--force` to overwrite (use after running the bg-strip pass
 * so prod gets the new RGBA versions over the old opaque ones).
 *
 * Credentials:
 *   - Dev R2:  .env.local
 *   - Prod R2: .env.production.local
 *
 * Usage (from apps/chunky-crayon-web):
 *   pnpm tsx scripts/copy-character-thumbnails-to-prod.ts --force
 *   pnpm tsx scripts/copy-character-thumbnails-to-prod.ts --dry-run
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import {
  SPECIES_OPTIONS,
  TRAIT_OPTIONS,
  VOICE_TILES,
} from '../lib/characters/picker-catalog';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');

// ─── Parse env files ────────────────────────────────────────────────────────

const parseEnv = (path: string): Record<string, string> => {
  const text = readFileSync(path, 'utf8');
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
};

const cwd = process.cwd();
const devEnv = parseEnv(join(cwd, '.env.local'));
const prodEnv = parseEnv(join(cwd, '.env.production.local'));

const need = (
  env: Record<string, string>,
  label: string,
  key: string,
): string => {
  const v = env[key];
  if (!v) throw new Error(`${label}: missing env var ${key}`);
  return v;
};

const buildClient = (
  env: Record<string, string>,
  label: string,
): { client: S3Client; bucket: string } => ({
  client: new S3Client({
    region: 'auto',
    endpoint: need(env, label, 'R2_ENDPOINT'),
    credentials: {
      accessKeyId: need(env, label, 'R2_ACCESS_KEY_ID'),
      secretAccessKey: need(env, label, 'R2_SECRET_ACCESS_KEY'),
    },
  }),
  bucket: need(env, label, 'R2_BUCKET'),
});

const dev = buildClient(devEnv, 'dev');
const prod = buildClient(prodEnv, 'prod');

// ─── Catalog → keys ─────────────────────────────────────────────────────────

const jobs: { key: string }[] = [];
for (const s of SPECIES_OPTIONS) {
  if (s.thumbnailKey) jobs.push({ key: s.thumbnailKey });
}
for (const t of TRAIT_OPTIONS) {
  if (t.thumbnailKey) jobs.push({ key: t.thumbnailKey });
}
for (const v of VOICE_TILES) {
  if (v.thumbnailKey) jobs.push({ key: v.thumbnailKey });
}

// ─── Copy ───────────────────────────────────────────────────────────────────

const existsInProd = async (key: string): Promise<boolean> => {
  try {
    await prod.client.send(
      new HeadObjectCommand({ Bucket: prod.bucket, Key: key }),
    );
    return true;
  } catch {
    return false;
  }
};

const streamToBuffer = async (body: unknown): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  // @ts-expect-error -- body is iterable at runtime
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const copyOne = async (job: {
  key: string;
}): Promise<'copied' | 'skipped' | 'dry'> => {
  if (!FORCE && (await existsInProd(job.key))) return 'skipped';
  if (DRY_RUN) return 'dry';

  const get = await dev.client.send(
    new GetObjectCommand({ Bucket: dev.bucket, Key: job.key }),
  );
  if (!get.Body) throw new Error(`dev R2 returned empty body for ${job.key}`);
  const buf = await streamToBuffer(get.Body);

  await prod.client.send(
    new PutObjectCommand({
      Bucket: prod.bucket,
      Key: job.key,
      Body: buf,
      ContentType: get.ContentType ?? 'image/png',
    }),
  );
  return 'copied';
};

const main = async () => {
  console.log(
    `[copy-char-thumbs] ${jobs.length} thumbnails, dev=${dev.bucket} -> prod=${prod.bucket}${DRY_RUN ? ' (DRY RUN)' : ''}${FORCE ? ' (FORCE)' : ''}`,
  );
  let copied = 0;
  let skipped = 0;
  for (const job of jobs) {
    const result = await copyOne(job);
    if (result === 'copied') copied += 1;
    else if (result === 'skipped') skipped += 1;
    console.log(`[copy-char-thumbs] ${result.padEnd(7)} ${job.key}`);
  }
  console.log(
    `[copy-char-thumbs] done. copied=${copied} skipped=${skipped} total=${jobs.length}`,
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
