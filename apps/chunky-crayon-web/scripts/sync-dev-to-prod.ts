/**
 * Mirror the landing-backfill output from dev (DB + R2) to prod, so we
 * don't pay twice to regenerate the same images.
 *
 * Scope: ONLY rows that look like landing-backfill output, identified by
 * `sourcePrompt LIKE 'landing-backfill:%'`. Every other dev row stays
 * dev-only — this script never touches user content, the daily image
 * cron output, or anything outside the backfill purpose key.
 *
 * Pattern matches scripts/clone-seasonal-packs-to-prod.ts:
 *   - Two PrismaNeon adapters, two clients — reads dev, writes prod
 *   - R2 cloning fetches via the dev public URL and re-uploads via
 *     `put()` to whatever R2_BUCKET the caller's env points to. So
 *     the caller switches R2_* env to prod values before invoking.
 *
 * Idempotent: if a row with the same id already exists on prod, skip.
 * Safe to re-run after partial failures.
 *
 * Credential separation:
 *   - DATABASE_URL_DEV  required
 *   - DATABASE_URL_PROD required (must differ from DEV)
 *   - R2_* env vars     should be the PROD bucket's values
 *
 * Suggested prod-env source:
 *   vercel env pull .env.prod.local --environment=production --cwd apps/chunky-crayon-web
 *
 * Usage:
 *   pnpm tsx scripts/sync-dev-to-prod.ts --dry-run
 *   pnpm tsx scripts/sync-dev-to-prod.ts --slug calming-coloring-pages-for-kids-with-adhd --dry-run
 *   pnpm tsx scripts/sync-dev-to-prod.ts --apply
 */

import { put } from '@one-colored-pixel/storage';
import { PrismaClient } from '@one-colored-pixel/db';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const SOURCE_PROMPT_PREFIX = 'landing-backfill:';

type Args = {
  slug?: string;
  dryRun: boolean;
  apply: boolean;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { dryRun: false, apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--slug') args.slug = argv[++i];
  }
  // Default to dry-run if neither flag passed — explicit --apply is the
  // only way to write to prod.
  if (!args.apply) args.dryRun = true;
  return args;
}

const extractR2Key = (publicUrl: string): string => {
  // R2 public URLs look like:
  //   https://pub-<hash>.r2.dev/uploads/.../image.webp
  //   https://assets.chunkycrayon.com/uploads/.../image.webp
  // We just want the path after the host.
  const u = new URL(publicUrl);
  return u.pathname.replace(/^\//, '');
};

const guessContentType = (key: string): string => {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
};

const cloneAsset = async (
  sourceUrl: string,
  dryRun: boolean,
): Promise<string> => {
  const key = extractR2Key(sourceUrl);
  if (dryRun) {
    console.log(`    [dry-run] would clone ${key}`);
    return sourceUrl; // Caller won't use this in dry-run
  }
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`fetch failed (${res.status}) ${sourceUrl}`);
  }
  const contentType = res.headers.get('content-type') ?? guessContentType(key);
  const buf = Buffer.from(await res.arrayBuffer());
  const { url } = await put(key, buf, { contentType, access: 'public' });
  return url;
};

async function main() {
  const args = parseArgs();

  const devUrl = process.env.DATABASE_URL_DEV;
  const prodUrl = process.env.DATABASE_URL_PROD;
  if (!devUrl || !prodUrl) {
    console.error(
      '[sync] DATABASE_URL_DEV and DATABASE_URL_PROD must both be set\n' +
        '       (DATABASE_URL alone is dev-only; you need both URLs explicit)',
    );
    process.exit(1);
  }
  if (devUrl === prodUrl) {
    console.error('[sync] refusing: DATABASE_URL_DEV === DATABASE_URL_PROD');
    process.exit(1);
  }
  if (!process.env.R2_BUCKET) {
    console.error('[sync] R2_BUCKET must be set (and should point at PROD)');
    process.exit(1);
  }

  console.log(
    `[sync] mode: ${args.dryRun ? 'DRY RUN (no writes)' : 'APPLY (writing to prod)'}\n` +
      `[sync] dev DB → prod DB; R2 writes go to bucket: ${process.env.R2_BUCKET}\n` +
      (args.slug ? `[sync] filtered to slug: ${args.slug}\n` : ''),
  );

  const devDb = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: devUrl }),
  });
  const prodDb = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: prodUrl }),
  });

  const whereClause = args.slug
    ? { sourcePrompt: { startsWith: `${SOURCE_PROMPT_PREFIX}${args.slug}:` } }
    : { sourcePrompt: { startsWith: SOURCE_PROMPT_PREFIX } };

  const totals = { copied: 0, skipped: 0, failed: 0 };

  try {
    const rows = await devDb.coloringImage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });
    console.log(
      `[sync] ${rows.length} candidate row${rows.length === 1 ? '' : 's'} on dev\n`,
    );

    for (const row of rows) {
      try {
        const existing = await prodDb.coloringImage.findUnique({
          where: { id: row.id },
          select: { id: true },
        });
        if (existing) {
          console.log(`  [skip] ${row.id} — already on prod`);
          totals.skipped += 1;
          continue;
        }

        const slug = row.sourcePrompt
          ?.replace(SOURCE_PROMPT_PREFIX, '')
          .split(':')[0];
        console.log(
          `  [copy] ${row.id} (${slug}) "${row.title.slice(0, 50)}…"`,
        );

        // Clone each populated R2 URL in parallel
        const [url, svgUrl, qrCodeUrl] = await Promise.all([
          row.url ? cloneAsset(row.url, args.dryRun) : null,
          row.svgUrl ? cloneAsset(row.svgUrl, args.dryRun) : null,
          row.qrCodeUrl ? cloneAsset(row.qrCodeUrl, args.dryRun) : null,
        ]);

        if (args.dryRun) {
          console.log(`    [dry-run] would insert row into prod DB`);
        } else {
          // Explicit field enumeration (matches clone-seasonal-packs-to-prod.ts):
          // spreading the dev row hits Prisma's JsonValue/Input mismatch on
          // socialPostResults and a few relation fields. We also only care
          // about the gallery-visible fields — derived assets (regions,
          // music, demo reel) don't exist on backfill rows.
          await prodDb.coloringImage.create({
            data: {
              id: row.id, // reuse ID so R2 keys + future joins match
              title: row.title,
              description: row.description,
              alt: row.alt,
              tags: row.tags,
              difficulty: row.difficulty,
              generationType: row.generationType,
              brand: row.brand,
              status: row.status,
              showInCommunity: row.showInCommunity,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
              sourcePrompt: row.sourcePrompt,
              slugBase: row.slugBase,
              url,
              svgUrl,
              qrCodeUrl,
            },
          });
        }
        totals.copied += 1;
      } catch (err) {
        console.error(
          `  [fail] ${row.id}:`,
          err instanceof Error ? err.message : err,
        );
        totals.failed += 1;
      }
    }
  } finally {
    await devDb.$disconnect();
    await prodDb.$disconnect();
  }

  console.log(
    `\n[sync] done. copied=${totals.copied} skipped=${totals.skipped} failed=${totals.failed}`,
  );
}

main().catch((err) => {
  console.error('[sync] fatal:', err);
  process.exit(1);
});
