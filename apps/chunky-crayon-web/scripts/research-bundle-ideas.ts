/**
 * Bundle theme research + scaffold.
 *
 * Runs Perplexity Sonar to propose 3 fresh themed bundle ideas that
 * (a) match the Chunky Crayon brand (ages 3-8, recurring 3-4 hero
 * cast, 10 pages, kid-safe), (b) don't overlap with bundles we
 * already have or already have planned, and (c) aren't over-saturated
 * on Etsy / Amazon. Each candidate comes with a tagline + 4 hero
 * sketches + a one-line per-page idea so you can pick on aesthetic
 * grounds without needing to flesh out the spec yourself.
 *
 * Flow:
 *   1. Read existing HERO_BUNDLES → grab slugs + names so we can tell
 *      Perplexity what NOT to repeat.
 *   2. Perplexity Sonar: ask for 3 candidate themes with rationale.
 *   3. Pretty-print → ask user "1, 2, 3, or skip" via stdin.
 *   4. On pick → Claude flesh-out: full Hero[] (signatureDetails +
 *      referenceSheetPrompt + funFact for each) + 10 pagePrompts +
 *      pageCast.
 *   5. Pretty-print the scaffolded profile → ask "write to profiles.ts
 *      now (y/N)".
 *   6. On confirm → splice the new HeroBundle export into
 *      `packages/coloring-core/src/bundles/profiles.ts` AND add the
 *      export + HERO_BUNDLES entry. Print next-step command for the
 *      orchestrator.
 *
 * Env vars required:
 *   PERPLEXITY_API_KEY      — for the trend research call
 *   ANTHROPIC_API_KEY       — for the heroes + page prompts flesh-out
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/research-bundle-ideas.ts \
 *     dotenv_config_path=.env.local
 *
 *   # Bias the research toward a vibe / season / audience hint:
 *   ... --hint="cozy autumn, animal characters, ages 4-7"
 *
 *   # Skip the auto-write step entirely (print only):
 *   ... --no-write
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { generateText, generateObject } from 'ai';
import { perplexity } from '@ai-sdk/perplexity';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { HERO_BUNDLES } from '@one-colored-pixel/coloring-core';

const PERPLEXITY_MODEL = 'sonar';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

const PROFILES_PATH = join(
  __dirname,
  '../../../packages/coloring-core/src/bundles/profiles.ts',
);
const INDEX_PATH = join(
  __dirname,
  '../../../packages/coloring-core/src/index.ts',
);

const candidateSchema = z.object({
  themeName: z
    .string()
    .describe('Catchy 2-4 word title (e.g. "Pirate Treasure Hunt")'),
  slug: z
    .string()
    .describe('kebab-case slug, no brand words, e.g. "pirate-treasure-hunt"'),
  tagline: z
    .string()
    .describe(
      'One sentence parent-friendly hook describing what kids will color',
    ),
  rationale: z
    .string()
    .describe(
      'Why this theme works for ages 3-8 and how it differs from the existing slate. Cite a trend if you found one.',
    ),
  heroSketches: z
    .array(
      z.object({
        name: z.string(),
        species: z.string(),
        oneLiner: z.string(),
      }),
    )
    .min(3)
    .max(4),
  pageIdeas: z
    .array(z.string())
    .length(10)
    .describe('One sentence per page, 10 total. Action-oriented scenes.'),
});

const candidatesSchema = z.object({
  candidates: z.array(candidateSchema).length(3),
});

type Candidate = z.infer<typeof candidateSchema>;

const heroSchema = z.object({
  id: z.string().describe('kebab-case, unique within bundle'),
  name: z.string(),
  species: z.string(),
  signatureDetails: z
    .array(z.string())
    .min(4)
    .max(6)
    .describe(
      'Concise visual anchors that MUST appear on every page. Each one is a checkbox in the QA gate.',
    ),
  referenceSheetPrompt: z
    .string()
    .describe(
      "Single paragraph (~150-200 words) gpt-image-2 prompt for this hero's model sheet. Plain white bg, line art, no shading.",
    ),
  funFact: z.string().describe('1 short kid-friendly personality line.'),
});

const fleshedSchema = z.object({
  heroes: z.array(heroSchema).min(3).max(4),
  pageCast: z
    .record(z.string(), z.array(z.string()))
    .describe(
      "Object keyed by page number (string '1' through '10'), value = array of hero ids that appear on that page. Empty array = incidentals only.",
    ),
  pagePrompts: z
    .array(z.string())
    .length(10)
    .describe(
      'Polished page-by-page scene prompts, 1-indexed. Each ~30-50 words.',
    ),
});

type Fleshed = z.infer<typeof fleshedSchema>;

async function ask(prompt: string): Promise<string> {
  const rl = createInterface({ input, output });
  const answer = await rl.question(prompt);
  rl.close();
  return answer.trim();
}

async function researchCandidates(
  hint: string | undefined,
): Promise<Candidate[]> {
  const existingSlate = Object.values(HERO_BUNDLES)
    .map((b) => b.slug)
    .join(', ');

  const system = `You are a creative director researching new themed coloring book bundles for Chunky Crayon, a children's coloring platform (ages 3-8).

Each bundle is 10 pages with a recurring cast of 3-4 friendly characters. Bundles sell as one-time PDF + online-coloring downloads at £4.99.

Your job: propose 3 NEW bundle themes that:
1. Don't overlap with this existing slate: ${existingSlate}
2. Aren't over-saturated on Etsy/Amazon (if you find a theme with 50+ identical listings, propose a fresh angle on it instead)
3. Have clear, drawable recurring characters (not just settings)
4. Are kid-safe: no scary, violent, romantic, political, or licensed-IP themes
5. Spell things US-neutral (color, vacation, favorite — not colour, holiday, favourite)
6. Avoid em dashes in any copy you write

Search recent Etsy bestseller lists, Amazon kids coloring rankings, Pinterest trends, and TikTok kid-content trends to ground your proposals.`;

  const userPrompt = `Propose 3 candidate bundle themes.${
    hint ? ` Bias the proposals toward this direction: ${hint}.` : ''
  }

For EACH candidate provide:
- themeName, slug, tagline, rationale (with trend citation if found)
- 3-4 heroSketches: name, species, one personality line each
- 10 pageIdeas: one sentence per page, action-oriented scenes featuring the cast

Output strict JSON matching the schema. No commentary outside the JSON.`;

  console.log('[research] querying Perplexity Sonar...');

  // Sonar's structured-output adherence is unreliable; use plain
  // generateText then ask Claude to re-shape into the schema.
  const { text: sonarText } = await generateText({
    model: perplexity(PERPLEXITY_MODEL),
    system,
    prompt: userPrompt,
    temperature: 0.8,
    providerOptions: {
      perplexity: { search_recency_filter: 'month' },
    },
  });

  console.log(
    `[research] Sonar returned ${sonarText.length} chars; reshaping with Claude...`,
  );

  const { object } = await generateObject({
    model: anthropic(CLAUDE_MODEL),
    schema: candidatesSchema,
    system: `You convert messy research notes into strict JSON matching the provided schema. Preserve every concrete detail; do NOT invent new themes. If the source has 3 themes, the output has 3 themes.`,
    prompt: `Research notes:\n\n${sonarText}\n\nReshape into the schema. Keep the original themes' content; only fix structure / formatting / spelling.`,
  });

  return object.candidates;
}

function printCandidates(candidates: Candidate[]): void {
  candidates.forEach((c, i) => {
    console.log(`\n${'='.repeat(72)}`);
    console.log(`[${i + 1}] ${c.themeName}  (slug: ${c.slug})`);
    console.log(`${'='.repeat(72)}`);
    console.log(`Tagline: ${c.tagline}`);
    console.log(`\nWhy: ${c.rationale}`);
    console.log(`\nHeroes:`);
    c.heroSketches.forEach((h) => {
      console.log(`  - ${h.name} (${h.species}): ${h.oneLiner}`);
    });
    console.log(`\nPages:`);
    c.pageIdeas.forEach((p, j) => console.log(`  ${j + 1}. ${p}`));
  });
  console.log(`\n${'='.repeat(72)}\n`);
}

async function fleshOutCandidate(c: Candidate): Promise<Fleshed> {
  console.log(
    `[flesh-out] expanding ${c.slug} into a full HeroBundle profile...`,
  );

  const system = `You write polished HeroBundle profiles for Chunky Crayon themed coloring bundles. Style match the existing bundles: friendly cartoon line art, plain white reference-sheet backgrounds, no shading, kid-safe ages 3-8.

For each hero:
- 4-6 signatureDetails: concise visual anchors (e.g. "horn shaped like a candy cane", "three small ridge-bumps along the back"). Each becomes a QA checkbox.
- referenceSheetPrompt: one paragraph ~150-200 words. Always say: "centered on a plain white background", "facing slightly to the side", "Children's coloring book reference sheet for a single hero character." NO scenery, NO color, NO shading.
- funFact: one fun personality line.

For pageCast: an object with keys "1"-"10" (strings), values = array of hero ids that appear. Most pages should have 2-3 heroes; occasional solo or full-cast pages.

For pagePrompts: polished scene prompts (~30-50 words each), 1-indexed, action-oriented, mention which heroes appear by name.

Rules:
- US-neutral spelling (color not colour)
- No em dashes
- No "AI" anywhere
- Hero ids are kebab-case (e.g. "stardust-unicorn")`;

  const prompt = `Theme: ${c.themeName}
Slug: ${c.slug}
Tagline: ${c.tagline}

Hero sketches:
${c.heroSketches
  .map((h) => `- ${h.name} (${h.species}): ${h.oneLiner}`)
  .join('\n')}

Page ideas:
${c.pageIdeas.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Flesh this out into a full HeroBundle profile.`;

  const { object } = await generateObject({
    model: anthropic(CLAUDE_MODEL),
    schema: fleshedSchema,
    system,
    prompt,
  });

  return object;
}

function formatProfileEntry(c: Candidate, f: Fleshed): string {
  const constName = c.slug.toUpperCase().replace(/-/g, '_');

  const heroesBlock = f.heroes
    .map(
      (h) => `    {
      id: ${JSON.stringify(h.id)},
      name: ${JSON.stringify(h.name)},
      species: ${JSON.stringify(h.species)},
      signatureDetails: [
${h.signatureDetails.map((d) => `        ${JSON.stringify(d)},`).join('\n')}
      ],
      referenceSheetPrompt: ${JSON.stringify(h.referenceSheetPrompt)},
      funFact: ${JSON.stringify(h.funFact)},
    },`,
    )
    .join('\n');

  const pageCastBlock = Object.entries(f.pageCast)
    .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
    .map(
      ([page, ids]) =>
        `    ${page}: [${ids.map((id) => JSON.stringify(id)).join(', ')}],`,
    )
    .join('\n');

  const pagePromptsBlock = f.pagePrompts
    .map((p) => `    ${JSON.stringify(p)},`)
    .join('\n');

  return `export const ${constName}: HeroBundle = {
  slug: ${JSON.stringify(c.slug)},
  heroes: [
${heroesBlock}
  ],
  pageCast: {
${pageCastBlock}
  },
  pagePrompts: [
${pagePromptsBlock}
  ],
};
`;
}

function spliceIntoProfilesFile(c: Candidate, entry: string): void {
  const constName = c.slug.toUpperCase().replace(/-/g, '_');

  // 1. Append the new export right before the HERO_BUNDLES record.
  const profilesSrc = readFileSync(PROFILES_PATH, 'utf8');
  const heroBundlesIdx = profilesSrc.indexOf('export const HERO_BUNDLES');
  if (heroBundlesIdx === -1) {
    throw new Error(
      'Could not find `export const HERO_BUNDLES` anchor in profiles.ts',
    );
  }
  const before = profilesSrc.slice(0, heroBundlesIdx);
  const after = profilesSrc.slice(heroBundlesIdx);
  const updatedProfiles = `${before}${entry}\n${after}`;

  // 2. Add the constName into the HERO_BUNDLES record. We look for
  //    the closing `};` of that record and inject one line before it.
  const recordOpen = updatedProfiles.indexOf('export const HERO_BUNDLES');
  const recordClose = updatedProfiles.indexOf('};', recordOpen);
  if (recordClose === -1) {
    throw new Error('Could not find closing `};` of HERO_BUNDLES record');
  }
  const recordEntryLine = `  [${constName}.slug]: ${constName},\n`;
  const finalProfiles =
    updatedProfiles.slice(0, recordClose) +
    recordEntryLine +
    updatedProfiles.slice(recordClose);

  writeFileSync(PROFILES_PATH, finalProfiles);
  console.log(`[write] profiles.ts: added ${constName} export + record entry`);

  // 3. Add the export to packages/coloring-core/src/index.ts.
  const indexSrc = readFileSync(INDEX_PATH, 'utf8');
  if (indexSrc.includes(`  ${constName},`)) {
    console.log(`[write] index.ts: ${constName} already exported, skipping`);
    return;
  }
  // Find the existing bundle exports block, splice the new const into
  // the same { ... } group.
  const exportAnchor = '  SPACE_ADVENTURE_CREW,';
  const exportIdx = indexSrc.indexOf(exportAnchor);
  if (exportIdx === -1) {
    console.warn(
      `[write] WARNING: could not find SPACE_ADVENTURE_CREW anchor in index.ts. You'll need to add the export manually.`,
    );
    return;
  }
  const insertAt = exportIdx + exportAnchor.length;
  const updatedIndex =
    indexSrc.slice(0, insertAt) +
    `\n  ${constName},` +
    indexSrc.slice(insertAt);
  writeFileSync(INDEX_PATH, updatedIndex);
  console.log(`[write] index.ts: added ${constName} export`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const hint = args
    .find((a) => a.startsWith('--hint='))
    ?.split('=')
    .slice(1)
    .join('=');
  const noWrite = args.includes('--no-write');

  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not set');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  console.log('\n=== Bundle theme research ===\n');
  if (hint) console.log(`Hint: ${hint}\n`);

  const candidates = await researchCandidates(hint);
  printCandidates(candidates);

  const choice = await ask(
    'Pick a candidate to flesh out (1, 2, 3) or "skip" to abort: ',
  );
  const idx = parseInt(choice, 10) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx >= candidates.length) {
    console.log('No candidate picked. Exiting.');
    return;
  }
  const picked = candidates[idx]!;
  console.log(`\n→ Fleshing out: ${picked.themeName} (${picked.slug})\n`);

  const fleshed = await fleshOutCandidate(picked);

  console.log(`\n${'='.repeat(72)}`);
  console.log(`Scaffolded profile: ${picked.slug}`);
  console.log(`${'='.repeat(72)}\n`);
  console.log('Heroes:');
  fleshed.heroes.forEach((h) => {
    console.log(`\n  ${h.name} (${h.id}, ${h.species})`);
    h.signatureDetails.forEach((d) => console.log(`    - ${d}`));
    console.log(`    funFact: "${h.funFact}"`);
  });
  console.log(`\nPage cast:`);
  Object.entries(fleshed.pageCast)
    .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
    .forEach(([p, ids]) => console.log(`  ${p}: [${ids.join(', ')}]`));
  console.log(`\nPage prompts:`);
  fleshed.pagePrompts.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

  if (noWrite) {
    console.log(
      `\n[--no-write] skipping auto-write. Copy the entry into profiles.ts manually.`,
    );
    return;
  }

  const confirm = await ask(
    `\nWrite this to packages/coloring-core/src/bundles/profiles.ts (and add export to index.ts)? (y/N): `,
  );
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('Aborted. Nothing written.');
    return;
  }

  const entry = formatProfileEntry(picked, fleshed);
  spliceIntoProfilesFile(picked, entry);

  console.log(`\n=== Done. ===\n`);
  console.log(`Next steps:`);
  console.log(`  1. cd packages/coloring-core && pnpm build`);
  console.log(
    `  2. Review the new entry in profiles.ts (sanity-check the heroes)`,
  );
  console.log(
    `  3. Dry-run the launcher:\n     cd apps/chunky-crayon-web\n     pnpm tsx -r dotenv/config scripts/launch-bundle.ts \\`,
  );
  console.log(
    `       --slug=${picked.slug} \\\n       --name=${JSON.stringify(picked.themeName)} \\\n       --tagline=${JSON.stringify(picked.tagline)} \\\n       --dry \\\n       dotenv_config_path=.env.local`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
