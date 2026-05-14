#!/usr/bin/env tsx

/**
 * One-off keyword research helper for combo pages.
 *
 * Asks Perplexity Sonar (with web search) to rank candidate slugs by
 * relative search volume across the three combo groups: specific age,
 * occasion, craft context. Prints a candidate shortlist with notes that
 * you can cross-check against Google Search Console + Keyword Planner.
 *
 * The output is a starting point, not a final answer. Treat the volumes
 * as ordinal (higher/lower) rather than absolute. The point is to filter
 * out dead slugs (e.g. "for 11 year olds" likely lower volume than "for
 * 5 year olds") before we hand-write 30-50 combo pages.
 *
 * Usage:
 *   pnpm tsx scripts/research-combo-keywords.ts
 *   pnpm tsx scripts/research-combo-keywords.ts --group=age|occasion|context
 *
 * Requires PERPLEXITY_API_KEY in env.
 */

import { generateText } from 'ai';
import { models } from '@one-colored-pixel/coloring-core';
import { GALLERY_CATEGORIES } from '@/constants';
import { HOLIDAY_EVENTS } from '@/lib/seo/holidays';
import { CRAFT_CONTEXTS } from '@/lib/seo/craft-contexts';
import { SPECIFIC_AGES } from '@/lib/seo/age-brackets';

type Group = 'age' | 'occasion' | 'context';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const group = args
    .find((a) => a.startsWith('--group='))
    ?.slice('--group='.length) as Group | undefined;
  return { group };
};

const sonarAsk = async (prompt: string): Promise<string> => {
  const { text } = await generateText({
    model: models.search,
    prompt,
  });
  return text.trim();
};

const researchAges = async (): Promise<string> => {
  const ages = SPECIFIC_AGES.map((a) => `"${a.label.toLowerCase()}"`).join(
    ', ',
  );
  const prompt = `You are a kids-content SEO analyst. Rank these search phrases by relative monthly Google search volume in the US + UK, from highest to lowest, as a markdown table with columns: phrase | relative_volume (high/medium/low/dead) | notes.

Phrases:
${SPECIFIC_AGES.map((a) => `- coloring pages for ${a.label.toLowerCase()}`).join('\n')}

Then do the same for these theme variants for ages 5 and 6 (the highest-volume kid age):
${GALLERY_CATEGORIES.slice(0, 10)
  .map(
    (c) =>
      `- ${c.name.toLowerCase()} coloring pages for 5 year olds\n- ${c.name.toLowerCase()} coloring pages for 6 year olds`,
  )
  .join('\n')}

Be ruthless — if a phrase looks like nobody searches it (e.g. "coloring pages for 11 year olds"), say "dead". Be specific about which themes have decent volume at which ages.`;
  return sonarAsk(prompt);
};

const researchOccasions = async (): Promise<string> => {
  const prompt = `You are a kids-content SEO analyst. Rank these holiday/occasion coloring page search phrases by relative monthly Google search volume in the US + UK, from highest to lowest. Markdown table: phrase | relative_volume | notes.

Phrases:
${HOLIDAY_EVENTS.flatMap((h) =>
  GALLERY_CATEGORIES.slice(0, 8).map(
    (c) => `- ${h.name.toLowerCase()} ${c.name.toLowerCase()} coloring pages`,
  ),
).join('\n')}

Also rank these single-theme occasion phrases:
${HOLIDAY_EVENTS.map((h) => `- ${h.name.toLowerCase()} coloring pages`).join('\n')}

Highlight the top 10 combinations that have meaningful volume AND low to medium competition (i.e. not already dominated by huge sites).`;
  return sonarAsk(prompt);
};

const researchContexts = async (): Promise<string> => {
  const prompt = `You are a kids-content SEO analyst. Rank these "craft activity context" coloring page search phrases by relative monthly Google search volume in the US + UK. Markdown table: phrase | relative_volume | notes.

Phrases:
${CRAFT_CONTEXTS.map((ctx) => `- coloring pages for ${ctx.name.toLowerCase()}`).join('\n')}

Also tell me which other craft/activity contexts parents commonly Google with "coloring pages for ___" — beyond the list above. Suggest 5-10 candidates we should consider adding to our combo pages catalog. For each, note who's currently ranking on page 1.`;
  return sonarAsk(prompt);
};

const main = async () => {
  const { group } = parseArgs();
  const targets: Group[] = group ? [group] : ['age', 'occasion', 'context'];

  for (const g of targets) {
    console.log(`\n\n========== ${g.toUpperCase()} ==========\n`);
    let result = '';
    if (g === 'age') result = await researchAges();
    if (g === 'occasion') result = await researchOccasions();
    if (g === 'context') result = await researchContexts();
    console.log(result);
  }
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
