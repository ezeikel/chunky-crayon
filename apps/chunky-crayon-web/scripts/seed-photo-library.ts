/**
 * Seed PhotoLibraryEntry with kid-safe stock photos used as input for
 * the ImageDemoReel worker flow.
 *
 * Reads scripts/data/photo-library-seed.json, downloads each entry's
 * URL, re-uploads to R2 under public/photo-library/{category}/{id}.jpg,
 * and inserts a PhotoLibraryEntry row.
 *
 * Safe to run multiple times — re-running with the same JSON will
 * skip entries whose URL already exists in the table (deduped on
 * original source URL via `alt` lookup — good enough for a seed).
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   npx tsx scripts/seed-photo-library.ts
 *
 * Environment:
 *   DATABASE_URL               — Neon DEV or PROD connection string
 *   R2_BUCKET / R2_ACCESS_* — via @one-colored-pixel/storage
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { put } from '@one-colored-pixel/storage';
import { db } from '@one-colored-pixel/db';

type SeedEntry = {
  url: string;
  category: string;
  alt: string;
};

const SEED_JSON_PATH = resolve(__dirname, 'data/photo-library-seed.json');

const main = async () => {
  const raw = readFileSync(SEED_JSON_PATH, 'utf-8');
  const entries = JSON.parse(raw) as SeedEntry[];

  console.log(`[seed-photo-library] loaded ${entries.length} entries`);

  let inserted = 0;
  let skipped = 0;

  for (const entry of entries) {
    // Dedupe by alt text — good enough for a seed. For production dedup
    // we'd hash the image bytes but seed is run rarely.
    const existing = await db.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM photo_library_entries WHERE alt = ${entry.alt} LIMIT 1`;
    if (existing.length > 0) {
      console.log(`[seed-photo-library] skip (exists): ${entry.alt}`);
      skipped++;
      continue;
    }

    console.log(`[seed-photo-library] downloading ${entry.url}`);
    const res = await fetch(entry.url);
    if (!res.ok) {
      console.error(
        `[seed-photo-library] fetch failed (${res.status}): ${entry.url}`,
      );
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const key = `public/photo-library/${entry.category}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { url } = await put(key, buf, {
      contentType,
      access: 'public',
    });
    console.log(`[seed-photo-library] uploaded to R2: ${url}`);

    await db.$executeRaw`
      INSERT INTO photo_library_entries (id, url, category, alt, safe, brand, "createdAt", "updatedAt")
      VALUES (
        ${`cl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`},
        ${url},
        ${entry.category},
        ${entry.alt},
        true,
        'CHUNKY_CRAYON',
        NOW(),
        NOW()
      )
    `;
    inserted++;
  }

  console.log(
    `[seed-photo-library] done — inserted=${inserted} skipped=${skipped}`,
  );
  process.exit(0);
};

main().catch((err) => {
  console.error('[seed-photo-library] fatal:', err);
  process.exit(1);
});
