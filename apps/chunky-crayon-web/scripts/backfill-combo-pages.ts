#!/usr/bin/env tsx

/**
 * Top up combo-page content before launching new combos.
 *
 * Mirrors `backfill-landings.ts` for combo pages
 * (/coloring-pages-for/[slug]). For each entry in COMBO_PAGES that has
 * fewer than the threshold of matching images, generates new ones with
 * prompts built from the combo's dimensions (theme + age + occasion
 * or context). Caps at MAX_PER_RUN images per combo per run.
 *
 * Per-image pipeline (the AI + R2 work) lives in
 * `packages/coloring-core/src/backfill/` — shared with
 * `backfill-landings.ts`. This script owns:
 *   - Scene prompt building (combo-specific: theme + age + occasion/context)
 *   - DB row create + update (tags = union(category.tags, extraTagsAny))
 *   - Coverage counting (by the same where-clause as the page renders)
 *
 * Runs directly against the dev Neon branch + dev R2 bucket. No dev
 * server required (earlier version POSTed to /api/dev/...; consolidated
 * away in favor of the same lean pipeline landings uses).
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/backfill-combo-pages.ts
 *   pnpm tsx --env-file=.env.local scripts/backfill-combo-pages.ts --combo=<slug>
 *   pnpm tsx --env-file=.env.local scripts/backfill-combo-pages.ts --dry-run
 *   pnpm tsx --env-file=.env.local scripts/backfill-combo-pages.ts --threshold=10
 *
 * Env: OPENAI_API_KEY, DATABASE_URL (dev), R2_*
 */

import OpenAI from 'openai';
import {
  db,
  GenerationType,
  Brand,
  Difficulty as PrismaDifficulty,
  Prisma,
} from '@one-colored-pixel/db';
import {
  generateAndStoreColoringImage,
  cleanTitle,
} from '@one-colored-pixel/coloring-core';
import { COMBO_PAGES, type ComboPage } from '@/lib/seo/combo-pages';
import { GALLERY_CATEGORIES, getCategoryBySlug } from '@/constants';
import { getAgeBracketBySlug } from '@/lib/seo/age-brackets';
import { BRAND } from '@/lib/db';

const QUALITY: 'low' | 'medium' | 'high' = 'low';
const DEFAULT_THRESHOLD = 6;
const MAX_PER_RUN = 10;
const PURPOSE_KEY_PREFIX = 'combo-backfill';

type Args = {
  comboSlug?: string;
  dryRun: boolean;
  threshold: number;
};

const parseArgs = (): Args => {
  const args = process.argv.slice(2);
  return {
    comboSlug: args
      .find((a) => a.startsWith('--combo='))
      ?.slice('--combo='.length),
    dryRun: args.includes('--dry-run'),
    threshold: Number(
      args
        .find((a) => a.startsWith('--threshold='))
        ?.slice('--threshold='.length) ?? DEFAULT_THRESHOLD,
    ),
  };
};

// ===== Where-clause that mirrors the live combo page filter =====
// Must stay in sync with getComboCount/getComboImages in app/data/gallery.ts.
// We re-derive here rather than import the cached helpers so we can run
// outside the Next runtime (cacheLife() requires it).

const buildWhere = (combo: ComboPage): Prisma.ColoringImageWhereInput => {
  const andClauses: Prisma.ColoringImageWhereInput[] = [];
  if (combo.categorySlug) {
    const category = getCategoryBySlug(combo.categorySlug);
    if (!category) return { id: '__missing-category__' };
    andClauses.push({
      OR: [
        { tags: { hasSome: category.tags } },
        ...category.tags.map((tag) => ({
          OR: [
            { title: { contains: tag, mode: 'insensitive' as const } },
            { description: { contains: tag, mode: 'insensitive' as const } },
          ],
        })),
      ],
    });
  }
  if (combo.extraTagsAny && combo.extraTagsAny.length > 0) {
    andClauses.push({ tags: { hasSome: combo.extraTagsAny } });
  }
  return {
    brand: BRAND,
    status: 'READY',
    userId: null,
    ...(combo.difficulty ? { difficulty: combo.difficulty } : {}),
    ...(andClauses.length > 0 ? { AND: andClauses } : {}),
  };
};

// ===== Scene prompts derived from combo dimensions =====

const ageDescriptor = (combo: ComboPage): string => {
  if (combo.specificAge != null) {
    const age = combo.specificAge;
    if (age <= 4) return 'simple bold lines for a young child';
    if (age <= 6) return 'kindergarten-friendly outlines with moderate detail';
    if (age <= 8) return 'early-elementary detail level';
    return 'moderate detail for older kids';
  }
  if (combo.ageBracket) {
    const bracket = getAgeBracketBySlug(combo.ageBracket);
    switch (bracket?.slug) {
      case 'for-toddlers':
        return 'big chunky shapes for toddlers, very simple';
      case 'for-kids':
        return 'kid-friendly outlines, moderate detail';
      case 'for-tweens':
        return 'detailed scene for tweens';
      case 'for-adults':
        return 'intricate detailed line art for adults';
      default:
        return '';
    }
  }
  return '';
};

const themeNoun = (combo: ComboPage): string => {
  if (!combo.categorySlug) return '';
  const cat = getCategoryBySlug(combo.categorySlug);
  return cat?.tags[0] ?? combo.categorySlug;
};

const occasionPhrase = (combo: ComboPage): string => {
  if (!combo.occasionSlug) return '';
  return combo.occasionSlug.replace(/-/g, ' ');
};

const contextPhrase = (combo: ComboPage): string => {
  if (!combo.contextSlug) return '';
  return combo.contextSlug.replace(/-/g, ' ');
};

const buildPrompts = (combo: ComboPage, count: number): string[] => {
  const theme = themeNoun(combo);
  const occasion = occasionPhrase(combo);
  const context = contextPhrase(combo);
  const age = ageDescriptor(combo);

  const variations = [
    occasion ? `${theme || 'whimsical character'} celebrating ${occasion}` : '',
    occasion ? `${theme || 'cheerful scene'} with ${occasion} decorations` : '',
    context ? `${theme || 'happy scene'} for ${context}` : '',
    context ? `quiet ${theme || 'animal'} activity scene, ${context}` : '',
    theme ? `${theme} doing something playful` : '',
    theme ? `${theme} portrait, friendly expression` : '',
    occasion ? `magical ${occasion} celebration scene` : '',
    context ? `relaxing activity scene, ${context}` : '',
  ].filter((v) => v.length > 0);

  const prompts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const base = variations[i % variations.length];
    const seed = Math.floor(Math.random() * 1000);
    const ageClause = age ? `, ${age}` : '';
    prompts.push(`${base}${ageClause} (seed ${seed})`);
  }
  return prompts;
};

// ===== Tag union — theme tags + occasion/context tags =====
// We tag the new row with both sets so it matches the combo's filter
// (which AND-intersects them). Without this, prompts that talk about
// "rainy days" but where the AI tagger doesn't notice would never match
// the rainy-days combo.

const tagsForCombo = (combo: ComboPage): string[] => {
  const tags = new Set<string>();
  if (combo.categorySlug) {
    const cat = getCategoryBySlug(combo.categorySlug);
    if (cat) cat.tags.forEach((t) => tags.add(t));
  }
  if (combo.extraTagsAny) {
    combo.extraTagsAny.forEach((t) => tags.add(t));
  }
  return Array.from(tags);
};

// ===== Per-image orchestration =====

const backfillOneImage = async (
  openai: OpenAI,
  combo: ComboPage,
  description: string,
): Promise<string> => {
  const difficulty: PrismaDifficulty =
    combo.difficulty ?? PrismaDifficulty.BEGINNER;

  // Insert row first so we get a stable id for the R2 paths + QR URL.
  // Start as GENERATING so a mid-run failure (OpenAI billing limit,
  // R2 outage, etc.) leaves the row visibly broken instead of pretending
  // to be a real image — gallery filters exclude non-READY rows.
  const row = await db.coloringImage.create({
    data: {
      // cleanTitle strips the leading article, trailing period, AND the
      // "(seed NNN)" uniqueness suffix that buildPrompts appends to the prompt
      // — that suffix used to leak into the title and read as an artifact to a
      // kid. The seed still lives in `description`/`sourcePrompt` for uniqueness.
      title: cleanTitle(description),
      description,
      alt: description,
      tags: tagsForCombo(combo),
      difficulty,
      generationType: GenerationType.SYSTEM,
      sourcePrompt: `${PURPOSE_KEY_PREFIX}:${combo.slug}: ${description}`,
      brand: Brand.CHUNKY_CRAYON,
      showInCommunity: true,
      status: 'GENERATING',
    },
  });

  try {
    const { url, svgUrl, qrCodeUrl } = await generateAndStoreColoringImage(
      openai,
      {
        description,
        difficulty,
        rowId: row.id,
        options: { quality: QUALITY },
      },
    );

    await db.coloringImage.update({
      where: { id: row.id },
      data: { url, svgUrl, qrCodeUrl, status: 'READY' },
    });

    return row.id;
  } catch (err) {
    // Mark the row FAILED so subsequent coverage counts / gallery filters
    // exclude it. We could delete instead, but keeping the row preserves
    // the audit trail for prompt debugging.
    await db.coloringImage
      .update({
        where: { id: row.id },
        data: {
          status: 'FAILED',
          failureReason:
            err instanceof Error ? err.message.slice(0, 500) : 'unknown',
        },
      })
      .catch(() => {});
    throw err;
  }
};

const runCombo = async (
  openai: OpenAI,
  combo: ComboPage,
  threshold: number,
  dryRun: boolean,
): Promise<{ created: number; failed: number }> => {
  const result = { created: 0, failed: 0 };
  const count = await db.coloringImage.count({ where: buildWhere(combo) });
  const need = Math.max(0, threshold - count);
  const toGenerate = Math.min(need, MAX_PER_RUN);

  console.log(
    `\n${combo.slug} — have ${count}, need ${threshold} → generate ${toGenerate}`,
  );

  if (toGenerate === 0) {
    console.log('   ✓ at or above threshold');
    return result;
  }

  const prompts = buildPrompts(combo, toGenerate);

  if (dryRun) {
    prompts.forEach((p, i) => console.log(`   [${i + 1}] ${p}`));
    return result;
  }

  for (let i = 0; i < prompts.length; i += 1) {
    const scene = prompts[i];
    const start = Date.now();
    try {
      // eslint-disable-next-line no-await-in-loop
      const id = await backfillOneImage(openai, combo, scene);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `   [${i + 1}/${prompts.length}] ${id} (${elapsed}s) — ${scene.slice(0, 60)}${scene.length > 60 ? '…' : ''}`,
      );
      result.created += 1;
    } catch (err) {
      console.error(
        `   [${i + 1}/${prompts.length}] FAILED:`,
        err instanceof Error ? err.message : err,
      );
      result.failed += 1;
    }
  }

  return result;
};

const main = async () => {
  const { comboSlug, dryRun, threshold } = parseArgs();
  const combos = comboSlug
    ? COMBO_PAGES.filter((c) => c.slug === comboSlug)
    : COMBO_PAGES;

  if (combos.length === 0) {
    console.error(`No combo found matching --combo=${comboSlug ?? ''}`);
    process.exit(1);
  }

  console.log(
    `Backfill: ${combos.length} combo${combos.length === 1 ? '' : 's'}, threshold ${threshold}${
      dryRun ? ' (DRY RUN)' : ''
    }`,
  );
  console.log(`Categories loaded: ${GALLERY_CATEGORIES.length}`);

  if (!dryRun && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const totals = { created: 0, failed: 0 };
  for (const combo of combos) {
    // eslint-disable-next-line no-await-in-loop
    const r = await runCombo(openai, combo, threshold, dryRun);
    totals.created += r.created;
    totals.failed += r.failed;
  }

  console.log(
    `\n[backfill] done. created=${totals.created} failed=${totals.failed}`,
  );
};

main()
  .catch((err) => {
    console.error('[backfill] fatal:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
