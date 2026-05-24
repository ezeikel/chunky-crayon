/**
 * Copy the 12 profile-avatar tiles from the dev R2 bucket to the
 * prod R2 bucket.
 *
 * Sibling of `copy-scene-thumbnails-to-prod.ts` — same shape, same
 * env-file convention. `generate-profile-avatars.ts` writes to
 * whichever R2 the active `.env` points at (dev locally), so the
 * generated tiles need to be copied to prod before the avatar
 * picker goes live on chunkycrayon.com. Skipping this step would
 * leave prod requesting URLs against the dev bucket — bandwidth
 * on dev infra, no CDN, no backup.
 *
 * The copy is idempotent: each key is HEAD-checked against the prod
 * bucket first and skipped if present. Safe to re-run any time the
 * catalog adds new avatars + we want them seeded into prod.
 *
 * Credentials:
 *   - Dev R2:  read from `.env.local`
 *   - Prod R2: read from `.env.production.local` (Vercel-pulled
 *     prod creds, present in the worktree per the env-copy memory
 *     rule).
 *
 * Usage (from apps/chunky-crayon-web):
 *   pnpm tsx scripts/copy-profile-avatars-to-prod.ts
 *   pnpm tsx scripts/copy-profile-avatars-to-prod.ts --force    # re-copy all
 *   pnpm tsx scripts/copy-profile-avatars-to-prod.ts --dry-run
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { AVATARS } from '../lib/avatars';

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
    // Strip wrapping quotes the dotenv flavour we use writes.
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
//
// The avatars catalog already stores fully-qualified R2 keys
// (`profile-avatars/<id>.png`) so we don't have to re-derive them
// here — pulling them off `AVATARS` keeps this script in lockstep
// with `generate-profile-avatars.ts`.

type Job = { key: string };

const jobs: Job[] = AVATARS.map((a) => ({ key: a.imageKey }));

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
  // S3 GetObject Body is a Web ReadableStream in Node 18+. Read chunks
  // then concat — works for both Node and Web streams.
  const chunks: Buffer[] = [];
  // @ts-expect-error -- body is iterable at runtime
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const copyOne = async (job: Job): Promise<'copied' | 'skipped' | 'dry'> => {
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
    `[copy-avatars] ${jobs.length} avatars, dev=${dev.bucket} -> prod=${prod.bucket}${DRY_RUN ? ' (DRY RUN)' : ''}${FORCE ? ' (FORCE)' : ''}`,
  );
  let copied = 0;
  let skipped = 0;
  for (const job of jobs) {
    const result = await copyOne(job);
    if (result === 'copied') copied += 1;
    else if (result === 'skipped') skipped += 1;
    console.log(`[copy-avatars] ${result.padEnd(7)} ${job.key}`);
  }
  console.log(
    `[copy-avatars] done. copied=${copied} skipped=${skipped} total=${jobs.length}`,
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
