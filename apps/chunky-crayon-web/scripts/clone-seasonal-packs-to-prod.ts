/**
 * One-off migration: clone seasonal-pack coloring images from dev to
 * prod — R2 assets AND DB rows. Use after running
 * `seed-seasonal-packs.ts` against dev so prod gets identical assets
 * without paying AI credits twice.
 *
 * How it works per row:
 *   1. For every R2 URL on the source row (url, svgUrl, qrCodeUrl,
 *      regionMapUrl, coloredReferenceUrl, backgroundMusicUrl,
 *      svgTopologyUrl), `fetch()` the asset from dev's public URL
 *      and re-`put()` it to prod's bucket via @one-colored-pixel/storage
 *      (which reads the R2_* env vars). Prod R2's `put()` returns the
 *      new public URL.
 *   2. Insert a new row into prod DB using the source row's values +
 *      rewritten URLs. The ID is reused so the URL path (which
 *      embeds the image ID) stays stable across envs.
 *
 * Idempotent — skips rows whose slug tag (`seasonal-pack-slug:<slug>`)
 * already exists in prod.
 *
 * Env required (all separate from the normal dev workflow):
 *   DATABASE_URL_DEV   — Neon dev branch connection string (READ)
 *   DATABASE_URL_PROD  — Neon prod branch connection string (WRITE)
 *   R2_ENDPOINT / R2_BUCKET / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY /
 *     R2_PUBLIC_URL — PROD R2 creds (the storage package picks these up)
 *
 * Usage:
 *   # pull prod env first (includes PROD R2 creds)
 *   cd apps/chunky-crayon-web
 *   vercel env pull .env.production
 *   # add the two DATABASE_URL_* lines to .env.production by hand:
 *   #   DATABASE_URL_DEV="<dev-neon-pooled-url>"
 *   #   DATABASE_URL_PROD="<prod-neon-pooled-url>"
 *   npx tsx --env-file=.env.production scripts/clone-seasonal-packs-to-prod.ts
 *
 *   # or run for one pack only:
 *   npx tsx --env-file=.env.production scripts/clone-seasonal-packs-to-prod.ts halloween
 */
import { PrismaClient } from '@one-colored-pixel/db';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { put } from '@one-colored-pixel/storage';

// Match packages/db/src/client.ts — Neon needs a WS constructor in Node.
neonConfig.webSocketConstructor = ws;

type PackSlug =
  | 'halloween'
  | 'christmas'
  | 'valentine'
  | 'easter'
  | 'thanksgiving'
  | 'back-to-school';

const ALL_PACK_TAGS: string[] = [
  'seasonal-pack:halloween',
  'seasonal-pack:christmas',
  'seasonal-pack:valentine',
  'seasonal-pack:easter',
  'seasonal-pack:thanksgiving',
  'seasonal-pack:back-to-school',
];

const isPackSlug = (s: string): s is PackSlug =>
  ALL_PACK_TAGS.includes(`seasonal-pack:${s}`);

/** All fields on ColoringImage that store a public R2 URL. */
const R2_URL_FIELDS = [
  'url',
  'svgUrl',
  'qrCodeUrl',
  'backgroundMusicUrl',
  'animationUrl',
  'demoReelUrl',
  'demoReelCoverUrl',
  'svgTopologyUrl',
  'regionMapUrl',
  'coloredReferenceUrl',
] as const;
type R2UrlField = (typeof R2_URL_FIELDS)[number];

/**
 * Turn a public R2 URL into the object key we want to re-use in prod.
 * Example:
 *   https://pub-ab12c34d.r2.dev/uploads/coloring-images/abc/image.svg
 *      ↳ key: "uploads/coloring-images/abc/image.svg"
 */
const extractR2Key = (publicUrl: string): string => {
  // Strip scheme + host: keep everything after the third slash
  const m = publicUrl.match(/^https?:\/\/[^/]+\/(.+)$/);
  if (!m) throw new Error(`cannot parse R2 URL: ${publicUrl}`);
  return m[1];
};

const guessContentType = (key: string): string => {
  const ext = key.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'mp3':
      return 'audio/mpeg';
    case 'mp4':
      return 'video/mp4';
    case 'gz':
      return 'application/gzip';
    default:
      return 'application/octet-stream';
  }
};

const cloneAsset = async (sourceUrl: string): Promise<string> => {
  const key = extractR2Key(sourceUrl);
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`fetch failed (${res.status}) ${sourceUrl}`);
  }
  // Prefer the content-type the server returned; fall back to extension.
  const contentType = res.headers.get('content-type') ?? guessContentType(key);
  const buf = Buffer.from(await res.arrayBuffer());
  const { url } = await put(key, buf, {
    contentType,
    access: 'public',
  });
  return url;
};

const main = async () => {
  const devUrl = process.env.DATABASE_URL_DEV;
  const prodUrl = process.env.DATABASE_URL_PROD;
  if (!devUrl || !prodUrl) {
    console.error(
      '[clone] DATABASE_URL_DEV and DATABASE_URL_PROD must both be set',
    );
    process.exit(1);
  }
  if (devUrl === prodUrl) {
    console.error(
      '[clone] refusing: DATABASE_URL_DEV === DATABASE_URL_PROD (you almost shot yourself in the foot)',
    );
    process.exit(1);
  }

  const arg = process.argv[2];
  const filterTags =
    arg && isPackSlug(arg) ? [`seasonal-pack:${arg}`] : ALL_PACK_TAGS;

  console.log(
    `[clone] source tags: ${filterTags.join(', ')}\n` +
      `[clone] dev DB → prod DB (R2 assets cloned to whatever bucket R2_* env points to)`,
  );

  // The CC Prisma client uses the PrismaNeon adapter, so connection
  // strings flow in via the adapter, not via `datasourceUrl`. Two
  // adapters, two clients — reading dev, writing prod.
  const devDb = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: devUrl }),
  });
  const prodDb = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: prodUrl }),
  });

  let cloned = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const sourceRows = await devDb.coloringImage.findMany({
      where: { tags: { hasSome: filterTags } },
    });
    console.log(`[clone] found ${sourceRows.length} rows in dev`);

    for (const row of sourceRows) {
      const slugTag = row.tags.find((t) => t.startsWith('seasonal-pack-slug:'));
      if (!slugTag) {
        console.warn(`[skip] ${row.id}: no seasonal-pack-slug tag`);
        skipped++;
        continue;
      }

      // Idempotency — skip if prod already has this slug
      const existing = await prodDb.coloringImage.findFirst({
        where: { tags: { has: slugTag } },
        select: { id: true },
      });
      if (existing) {
        console.log(
          `[skip] ${slugTag} already exists in prod (${existing.id})`,
        );
        skipped++;
        continue;
      }

      console.log(`[gen]  ${slugTag} — cloning ${row.id}`);

      // Clone every populated R2 URL field in parallel, then collect
      // them into `rewritten`.
      const rewritten: Record<R2UrlField, string | null | undefined> = {
        url: row.url,
        svgUrl: row.svgUrl,
        qrCodeUrl: row.qrCodeUrl,
        backgroundMusicUrl: row.backgroundMusicUrl,
        animationUrl: row.animationUrl,
        demoReelUrl: row.demoReelUrl,
        demoReelCoverUrl: row.demoReelCoverUrl,
        svgTopologyUrl: row.svgTopologyUrl,
        regionMapUrl: row.regionMapUrl,
        coloredReferenceUrl: row.coloredReferenceUrl,
      };

      try {
        await Promise.all(
          R2_URL_FIELDS.map(async (field) => {
            const sourceUrl = row[field];
            if (!sourceUrl) return;
            try {
              rewritten[field] = await cloneAsset(sourceUrl);
            } catch (err) {
              console.error(
                `       asset clone failed (${field}):`,
                err instanceof Error ? err.message : err,
              );
              rewritten[field] = null;
            }
          }),
        );

        await prodDb.coloringImage.create({
          data: {
            id: row.id, // reuse the ID — R2 object keys embed it
            title: row.title,
            description: row.description,
            alt: row.alt,
            tags: row.tags,
            difficulty: row.difficulty,
            generationType: row.generationType,
            brand: row.brand,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            sourcePrompt: row.sourcePrompt,
            animationPrompt: row.animationPrompt,

            url: rewritten.url,
            svgUrl: rewritten.svgUrl,
            qrCodeUrl: rewritten.qrCodeUrl,
            backgroundMusicUrl: rewritten.backgroundMusicUrl,
            animationUrl: rewritten.animationUrl,
            demoReelUrl: rewritten.demoReelUrl,
            demoReelCoverUrl: rewritten.demoReelCoverUrl,
            svgTopologyUrl: rewritten.svgTopologyUrl,
            regionMapUrl: rewritten.regionMapUrl,
            regionMapWidth: row.regionMapWidth,
            regionMapHeight: row.regionMapHeight,
            regionsJson: row.regionsJson,
            regionsGeneratedAt: row.regionsGeneratedAt,
            coloredReferenceUrl: rewritten.coloredReferenceUrl,

            colorMapJson: row.colorMapJson,
            colorMapGeneratedAt: row.colorMapGeneratedAt,
            fillPointsJson: row.fillPointsJson,
            fillPointsGeneratedAt: row.fillPointsGeneratedAt,

            socialPostResults: row.socialPostResults ?? undefined,
          },
        });

        console.log(`[ok]   ${slugTag} → prod row ${row.id}`);
        cloned++;
      } catch (err) {
        console.error(
          `[fail] ${slugTag}:`,
          err instanceof Error ? err.message : err,
        );
        failed++;
      }
    }
  } finally {
    await devDb.$disconnect();
    await prodDb.$disconnect();
  }

  console.log(
    `\n[clone] done — cloned=${cloned} skipped=${skipped} failed=${failed}`,
  );
  process.exit(failed > 0 ? 1 : 0);
};

main().catch((err) => {
  console.error('[clone] fatal:', err);
  process.exit(1);
});
