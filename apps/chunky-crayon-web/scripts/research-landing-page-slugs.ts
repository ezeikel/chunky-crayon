/**
 * Ask Perplexity Sonar for 33 high-volume long-tail "X coloring page" queries
 * to back-fill landing pages at /coloring-pages/{slug}. Outputs JSON to
 * /tmp/landing-page-research.json — manually review, then port the chosen
 * entries into lib/seo/landing-pages.ts.
 *
 * The output is a starting point, not a finished config: each entry needs a
 * human pass for title/description/intro tone, but the slug + search-volume
 * estimate + tag suggestion saves hours of guesswork.
 *
 * Run:
 *   pnpm tsx scripts/research-landing-page-slugs.ts
 */
import { writeFile } from 'node:fs/promises';
import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from '@one-colored-pixel/coloring-core';

const ResearchSchema = z.object({
  queries: z
    .array(
      z.object({
        slug: z
          .string()
          .describe(
            'URL-safe kebab-case slug, e.g. "bold-and-easy-dinosaur-coloring-pages". MUST follow the existing pattern: "bold-and-easy-X-coloring-pages", "easy-X-coloring-pages-for-kids", "simple-X-coloring-pages-for-toddlers", "free-X-coloring-pages-for-kids", "X-coloring-pages-for-preschool", or "cute-X-coloring-pages-for-kids".',
          ),
        query: z
          .string()
          .describe(
            'The Google search query parents/teachers actually type. Should match the slug semantically.',
          ),
        estimatedMonthlyVolume: z
          .number()
          .describe(
            'Best-guess monthly US search volume. Aim for the 1K-20K range.',
          ),
        intent: z
          .enum(['evergreen', 'seasonal', 'character', 'theme', 'age-specific'])
          .describe('Search intent bucket.'),
        seasonalPeak: z
          .string()
          .optional()
          .describe(
            'For seasonal queries, the month(s) when search volume peaks (e.g. "October" for Halloween).',
          ),
        suggestedTags: z
          .array(z.string())
          .describe(
            'Tags from the ColoringImage.tags column that should filter to images matching this query. e.g. ["dinosaur","t-rex","prehistoric"]. Prefer 2-5 specific tags.',
          ),
        targetDifficulty: z
          .enum(['beginner', 'intermediate', 'advanced'])
          .describe(
            'beginner = ages 3-8, intermediate = ages 6-10, advanced = ages 8+.',
          ),
        notes: z
          .string()
          .describe(
            'One-line strategic note: competition level, why this is a good target, any caveats.',
          ),
      }),
    )
    .describe('Exactly 33 high-volume long-tail coloring-page queries.'),
});

const SYSTEM_PROMPT = `You are an SEO researcher for a children's coloring-page website (chunkycrayon.com).

The site already has 7 long-tail landing pages targeting queries like:
- "bold and easy animal coloring pages for kids ages 3-8"
- "easy halloween coloring pages for kids"
- "simple princess coloring pages for toddlers"
- "free unicorn coloring pages for kids"
- "cute dinosaur coloring pages for kids"
- "christmas coloring pages for preschool"
- "bold and easy vehicle coloring pages"

I need 33 MORE long-tail queries to target, covering:
- 8-10 popular animals NOT already in the set (cats, dogs, horses, sea animals, jungle animals, farm animals, birds, butterflies, bugs)
- 8-10 holiday/seasonal queries NOT already covered (valentines, st-patricks, easter, 4th-of-july, back-to-school, thanksgiving, hanukkah, new-year)
- 8-10 themes/characters that are generic enough to not infringe trademarks (superhero, robot, space, ocean, dragon, fairy, ninja, pirate, monster-truck, construction)
- 4-7 age-specific variants (for-2-year-olds, for-3-year-olds, for-4-year-olds, for-preschoolers, for-kindergarten)

For each query, prioritize:
1. Real search volume (1K-20K/month in the US) — favour parent search terms over Pinterest-style descriptors
2. Low-to-medium SEO competition (avoid head-term battles with crayola.com / supercoloring.com)
3. Strong commercial/print intent (people who want a printable, not just inspiration)
4. Avoid trademarked characters (no Disney, Pixar, Pokemon, Marvel, etc.)`;

const USER_PROMPT = `Research the 33 highest-priority long-tail coloring-page queries for chunkycrayon.com to target.

Constraints (critical):
- Match the slug patterns from the system prompt
- Don't duplicate the 7 existing slugs
- Real US search volume estimates, not vanity numbers
- Tags must be lowercase, hyphenated or single words

For each query, return: slug, query, estimatedMonthlyVolume, intent, seasonalPeak (if applicable), suggestedTags, targetDifficulty, notes.`;

async function main() {
  console.log('[research] querying Perplexity Sonar…');
  const start = Date.now();

  const { object } = await generateObject({
    model: models.search,
    schema: ResearchSchema,
    system: SYSTEM_PROMPT,
    prompt: USER_PROMPT,
  });

  const ms = Date.now() - start;
  console.log(`[research] got ${object.queries.length} queries in ${ms}ms`);

  // Sort by volume desc so the highest-impact slugs surface first
  object.queries.sort(
    (a, b) => b.estimatedMonthlyVolume - a.estimatedMonthlyVolume,
  );

  const outputPath = '/tmp/landing-page-research.json';
  await writeFile(outputPath, JSON.stringify(object, null, 2));
  console.log(`[research] wrote ${outputPath}`);

  console.log('\n=== Top 33 queries by estimated volume ===\n');
  object.queries.forEach((q, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. [${q.intent.padEnd(13)}] ${q.estimatedMonthlyVolume.toString().padStart(6)}/mo  ${q.slug}`,
    );
    console.log(`    → "${q.query}"`);
    console.log(`    tags: ${q.suggestedTags.join(', ')}`);
    if (q.seasonalPeak) console.log(`    peak: ${q.seasonalPeak}`);
    console.log(`    ${q.notes}`);
    console.log();
  });
}

main().catch((err) => {
  console.error('[research] failed:', err);
  process.exit(1);
});
