#!/usr/bin/env tsx

/**
 * Top up combo-page content before launching new combos.
 *
 * For each entry in COMBO_PAGES that has fewer than the threshold of
 * matching images, this script POSTs to the dev image-generation endpoint
 * with prompts built from the combo's dimensions (theme + age + occasion
 * or context). Caps at MAX_PER_RUN images per combo per run to keep cost
 * predictable.
 *
 * Requires `pnpm dev` to be running on localhost:3000 (or set DEV_BASE_URL).
 *
 * Usage:
 *   pnpm tsx scripts/backfill-combo-pages.ts                   # all combos
 *   pnpm tsx scripts/backfill-combo-pages.ts --combo <slug>    # one combo
 *   pnpm tsx scripts/backfill-combo-pages.ts --dry-run         # show prompts, no generation
 *   pnpm tsx scripts/backfill-combo-pages.ts --threshold 10    # custom threshold (default 6)
 *
 * Run before adding a combo to COMBO_PAGES on main. The page handler
 * silently 404s for slugs not in COMBO_PAGES, so it is safe to commit
 * the config first and run the backfill afterwards on the dev branch.
 */

import { GenerationType } from '@one-colored-pixel/db';
import { COMBO_PAGES, type ComboPage } from '@/lib/seo/combo-pages';
import { getComboCount } from '@/app/data/gallery';
import { GALLERY_CATEGORIES, getCategoryBySlug } from '@/constants';
import { getHolidayEventBySlug } from '@/lib/seo/holidays';
import { getCraftContextBySlug } from '@/lib/seo/craft-contexts';
import {
  getSpecificAgeBySlug,
  getAgeBracketBySlug,
} from '@/lib/seo/age-brackets';

const DEV_BASE = process.env.DEV_BASE_URL ?? 'http://localhost:3000';
const ENDPOINT = `${DEV_BASE}/api/dev/generate-coloring-from-description`;
const DEFAULT_THRESHOLD = 6;
const MAX_PER_RUN = 10;

type CliArgs = {
  comboSlug?: string;
  dryRun: boolean;
  threshold: number;
};

const parseArgs = (): CliArgs => {
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
  if (!cat) return combo.categorySlug;
  return cat.tags[0] ?? cat.slug;
};

const occasionPhrase = (combo: ComboPage): string => {
  if (!combo.occasionSlug) return '';
  const event = getHolidayEventBySlug(combo.occasionSlug);
  if (!event) return combo.occasionSlug;
  return event.name.toLowerCase();
};

const contextPhrase = (combo: ComboPage): string => {
  if (!combo.contextSlug) return '';
  const ctx = getCraftContextBySlug(combo.contextSlug);
  if (!ctx) return combo.contextSlug;
  return ctx.name.toLowerCase();
};

const buildPrompts = (combo: ComboPage, count: number): string[] => {
  const theme = themeNoun(combo);
  const occasion = occasionPhrase(combo);
  const context = contextPhrase(combo);
  const age = ageDescriptor(combo);

  // Seed list of variations per group. The endpoint AI-derives tags from
  // the description, so we make sure the dimension keywords appear in
  // every prompt.
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

const generateOne = async (description: string): Promise<boolean> => {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description,
      generationType: GenerationType.SYSTEM,
      purposeKey: 'combo-backfill',
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`   ❌ ${res.status} ${body.slice(0, 200)}`);
    return false;
  }
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    id?: string;
    title?: string;
  };
  if (!data.success) {
    console.error(`   ❌ ${JSON.stringify(data).slice(0, 200)}`);
    return false;
  }
  console.log(`   ✅ ${data.id} — ${data.title ?? '(no title)'}`);
  return true;
};

const runCombo = async (
  combo: ComboPage,
  threshold: number,
  dryRun: boolean,
): Promise<void> => {
  const count = await getComboCount({
    categorySlug: combo.categorySlug,
    difficulty: combo.difficulty,
    extraTagsAny: combo.extraTagsAny,
  });

  const need = Math.max(0, threshold - count);
  const toGenerate = Math.min(need, MAX_PER_RUN);

  console.log(
    `\n${combo.slug} — have ${count}, need ${threshold} → generate ${toGenerate}`,
  );

  if (toGenerate === 0) {
    console.log('   ✓ at or above threshold');
    return;
  }

  const prompts = buildPrompts(combo, toGenerate);

  if (dryRun) {
    prompts.forEach((p, i) => console.log(`   [${i + 1}] ${p}`));
    return;
  }

  for (let i = 0; i < prompts.length; i += 1) {
    console.log(`   [${i + 1}/${prompts.length}] ${prompts[i]}`);
    // eslint-disable-next-line no-await-in-loop
    await generateOne(prompts[i]);
  }
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
  console.log(`Endpoint: ${ENDPOINT}`);

  // Sanity: make sure GALLERY_CATEGORIES is wired up (catches stale imports).
  console.log(`Categories loaded: ${GALLERY_CATEGORIES.length}`);

  for (const combo of combos) {
    // eslint-disable-next-line no-await-in-loop
    await runCombo(combo, threshold, dryRun);
  }
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});

// Suppress unused-var lints for re-exported lookups that may become handy
// when extending the prompt builder.
void getSpecificAgeBySlug;
