/**
 * Deep research for what 3-8 year olds (and their parents) actually buy in
 * coloring books. Coco Wyo round 1 told us about the adult market — useful for
 * CH later, but not what we need to launch CC bundles.
 *
 * This research targets:
 *   - Amazon Bestsellers in Children's Activity Books / Coloring
 *   - Etsy bestsellers in kids' coloring page bundles (PDFs)
 *   - Parent forum / Reddit r/Mommit / r/Parenting recurring requests
 *   - Pinterest top "kids coloring pages" themes
 *   - What teachers / nurseries / preschools buy for ages 3-8
 *
 * Output: scripts/research-kids-coloring-bestsellers.output.json — review before
 * generating any line art or Stripe products.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/research-kids-coloring-bestsellers.ts \
 *     dotenv_config_path=.env.local
 *
 * Env vars required:
 *   PERPLEXITY_API_KEY
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateText, Output } from 'ai';
import { perplexity } from '@ai-sdk/perplexity';
import { z } from 'zod';

const MODEL_ID = 'sonar-deep-research';
const OUTPUT_FILE = join(
  __dirname,
  'research-kids-coloring-bestsellers.output.json',
);
const CC_BUNDLE_PRICE_GBP = 4.99;
const TARGET_AGE = '3-8';

const bestsellerThemeSchema = z.object({
  theme: z
    .string()
    .describe(
      'Theme name as parents/kids would search for it, e.g. "Dinosaurs", "Unicorns", "Construction Vehicles", "Under the Sea"',
    ),
  evidence: z
    .array(z.string())
    .min(2)
    .describe(
      '2+ concrete signals this theme sells: e.g. "Crayola Dinosaurs Coloring Book is #3 in Amazon Children\'s Activity Books", "r/Mommit weekly thread on coloring activities mentions dinos in 30%+ posts", "Etsy search volume for \'dinosaur coloring pages PDF\' is high based on listing density"',
    ),
  ageSweetSpot: z
    .string()
    .describe(
      'Age range within 3-8 where this theme peaks, e.g. "3-5 (preschool)", "5-8 (early primary)", "all of 3-8"',
    ),
  genderLean: z
    .enum(['girl-skewing', 'boy-skewing', 'broadly-appealing'])
    .describe(
      'Honest read on gender skew of buyer behavior, not aspirational. "Broadly-appealing" only when it genuinely is.',
    ),
  competitiveDensity: z
    .enum(['saturated', 'moderate', 'open'])
    .describe(
      "How crowded the niche is — saturated means everyone's doing it (still works, but harder to differentiate), open means real whitespace",
    ),
  whyKidsLoveIt: z
    .string()
    .describe('What makes this theme genuinely appealing to a 3-8 year old'),
  whyParentsBuyIt: z
    .string()
    .describe(
      'What the parent buying motive is — calm-down activity, educational hook, gift, party favour, screen-time alternative',
    ),
  occasionFit: z
    .array(z.string())
    .describe(
      'Occasions where this theme is the natural buy: rainy day, birthday party, road trip, Christmas, school holidays',
    ),
});

const ccKidsBundleSchema = z.object({
  ccBundleName: z
    .string()
    .describe(
      'Playful, kid-coded name. Distinct, memorable, no copyrighted IP. Examples: "Dino Dance Party", "Roar & Color", "Tiny Diggers Big Day"',
    ),
  primaryTheme: z
    .string()
    .describe('Which bestseller theme this bundle is built on'),
  ccTagline: z
    .string()
    .describe(
      'Short marketing tagline aimed at the parent buyer (under 12 words, no em dashes, US/UK neutral, no "AI")',
    ),
  ageSweetSpot: z
    .string()
    .describe('Age range this bundle is tuned for, within 3-8'),
  ccPageCount: z.number().int().describe('Default 10. Justify if different.'),
  ccTwist: z
    .string()
    .describe(
      'What makes our version distinct from generic bestsellers. Things to lean into: Colo mascot cameo on 1-2 pages, story arc across pages, mix of complexity (start easy, get more detailed) so the bundle grows with the kid, inclusive characters built in, online + print',
    ),
  ccPagePrompts: z
    .array(z.string())
    .min(8)
    .max(12)
    .describe(
      'Per-page prompt seeds for the line-art generator. Each is a single specific scene with character, action, setting. ~12-22 words. Skew toward what an actual 3-8 year old finds exciting (action, expression, fun) rather than what an adult thinks a kid will like (cozy, mindful, abstract).',
    ),
  whyItWorks: z
    .string()
    .describe(
      'Why this bundle should sell at £4.99: parent buying motive + kid appeal + occasion fit',
    ),
});

const researchOutputSchema = z.object({
  bestsellerThemes: z
    .array(bestsellerThemeSchema)
    .min(15)
    .describe(
      'At least 15 themes ranked from strongest (most evidence + most demand) to weakest. Be comprehensive — cover both saturated themes (still real demand) and open themes (whitespace).',
    ),
  ccBundleProposals: z
    .array(ccKidsBundleSchema)
    .min(8)
    .describe(
      '8-10 CC bundle proposals built on the strongest themes. Aim for a balanced launch lineup: at least 2 broadly-appealing, at least 1 boy-skewing, at least 1 girl-skewing, at least 1 occasion-specific (e.g. birthday, Christmas), at least 1 educational angle. Avoid stacking the lineup with one theme.',
    ),
  marketIntelligence: z
    .string()
    .describe(
      'Free-form notes: what Amazon/Etsy bestseller patterns reveal, recurring parent complaints about existing kids coloring books (too easy / too hard / paper bleeds / too few pages / boring themes), what teachers/nurseries actually print and use, what differentiates a sellable bundle from a free printable',
    ),
});

function buildPrompt(): string {
  return `You are researching what **3-8 year old children** (and the parents who buy for them) actually want in printable / digital coloring page bundles. We are launching a line of premade themed coloring bundles on **Chunky Crayon** (chunkycrayon.com), a kids-focused online coloring brand. Bundles will sell as Stripe Products at **£${CC_BUNDLE_PRICE_GBP}** each, ~10 pages, available as PDF download AND online coloring on our site.

## What we already know (skip this in research)

Coco Wyo (cocowyo.com / Etsy CocoWyoColoring) dominates the **adult** indie coloring market — that's not our segment. Their catalogue is almost entirely adult relaxation/hygge/cozy aesthetics. We need to ground this round in **what 3-8 year old kids and their parents actually buy and search for**, NOT in what adults find aesthetically pleasing.

## Your task

### Part 1: Identify the bestseller themes (≥15)

Research these specific signals to find what sells in the 3-8 kids coloring book market:

1. **Amazon Bestsellers** in:
   - Children's Activity Books > Coloring Books
   - Children's Coloring Books (top 100)
   - Activity Books for Toddlers (3-5)
   - Activity Books for Kids (6-8)
   Use Amazon UK + Amazon US — note which themes dominate the top 50.

2. **Etsy bestsellers** in:
   - "kids coloring pages PDF"
   - "toddler coloring pages"
   - "coloring book for kids printable"
   - Look at top-selling shops, not just one-offs. What themes do they repeat across multiple SKUs?

3. **Parent forums and Reddit:**
   - r/Mommit, r/Parenting, r/Toddlers, r/preschool
   - Mumsnet (UK) coloring/activity threads
   - What themes do parents repeatedly ask for? What do kids reliably ask for?

4. **Pinterest top boards / pins** for "kids coloring pages [age]" — what themes dominate the top pins?

5. **Teacher / nursery / preschool buying patterns** — Teachers Pay Teachers, Twinkl, what coloring themes are standard requests in early years?

6. **Birthday party / gift / holiday occasions** where coloring bundles get bought — note these as occasion-specific themes (e.g. "dinosaur party favours", "rainy day activity pack").

For each of **at least 15 themes**, give:
- Name (as buyers search for it)
- 2+ concrete evidence signals (specific bestseller titles, search-volume hints, forum patterns)
- Age sweet spot within 3-8
- Honest gender lean (don't paper over reality — parents buy gendered themes)
- Competitive density (saturated / moderate / open)
- Why kids love it (real reason, not a market-research line)
- Why parents buy it (the actual buying motive)
- Occasion fit (rainy day, birthday, Christmas, road trip, etc.)

Be comprehensive. Include strong saturated themes (dinosaurs, unicorns, princesses, vehicles) AND undersaturated whitespace where you spot it.

### Part 2: 8-10 CC bundle proposals

Built on the strongest themes from Part 1. Balance the lineup:
- ≥2 broadly-appealing themes (so most parents click "buy")
- ≥1 boy-skewing theme (vehicles, dinos, monsters, sports)
- ≥1 girl-skewing theme (unicorns, princesses, fairies, fashion)
- ≥1 occasion-specific (birthday, Christmas, rainy day, summer)
- ≥1 with an educational hook parents value (animals + facts, alphabet, numbers, letters)

For each proposal:
- **Name** — playful, kid-coded, distinct, no copyrighted IP. (Bad: "Cute Dinos". Good: "Dino Dance Party" or "Roar & Color".)
- **Tagline** — under 12 words, parent-targeted, no em dashes, US/UK neutral, NO "AI".
- **Age sweet spot** within 3-8.
- **Page count** — default 10, justify if different.
- **Twist** — what makes ours not a generic Etsy clone. Lean into:
  - Colo mascot (our friendly crayon character) cameo on 1-2 pages
  - Story arc across pages (start of day → end of day, beginning of adventure → end)
  - Complexity ramp (page 1 simple, page 10 most detailed) so the same bundle works across the 3-8 range
  - Inclusive characters built in (skin tones, abilities) — but ambient, not the headline
  - "Online + print" as a feature
- **8-12 per-page prompts** — single specific scenes with character, action, setting. ~12-22 words each. **Skew toward what a 3-8 year old finds exciting (action, big emotion, silly moments) NOT what an adult thinks kids will like (cozy, mindful, abstract).** Examples:
  - GOOD: "A T-rex in a chef's hat sliding pizza dough across a giant kitchen counter while baby raptors steal toppings"
  - BAD: "A peaceful dinosaur garden with flowers"
- **Why it works** — parent buying motive + kid appeal + occasion fit, in 1-2 sentences.

### Part 3: Market intelligence (free-form)

Brief notes on:
- What Amazon/Etsy bestseller patterns reveal about price/page-count expectations for kids' bundles
- Recurring parent complaints about existing kids coloring books (too easy / too hard / paper bleed / boring / too few pages)
- What teachers and nurseries actually print and use
- What separates a sellable £4.99 bundle from a "they'd just use a free printable" buy

## Hard constraints

- Strictly 3-8 age range; don't drift into adult themes.
- No copyrighted IP (no Bluey, Paw Patrol, Pokémon, Disney, specific show characters).
- US/UK-neutral copy (no "vacation"-vs-"holiday", no "half-term").
- No em dashes in CC tagline copy.
- Don't mention "AI" anywhere in CC marketing language. Frame around outcomes.
- Be honest about gender skew — "broadly appealing" only when it genuinely is, not as default.
- Skew prompts toward kid-energy (action, emotion, silliness) NOT adult-aesthetic (cozy, mindful, abstract).

Return ONLY the structured JSON.`;
}

async function run() {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  console.log(`[kids] Using model: ${MODEL_ID}`);
  console.log(`[kids] Target age: ${TARGET_AGE}`);
  console.log(`[kids] CC bundle anchor price: £${CC_BUNDLE_PRICE_GBP}`);

  const prompt = buildPrompt();
  console.log(`[kids] Prompt length: ${prompt.length} chars`);
  console.log(`[kids] Calling Perplexity (this takes several minutes)...`);

  const start = Date.now();
  const { output, sources, usage } = await generateText({
    model: perplexity(MODEL_ID),
    output: Output.object({ schema: researchOutputSchema }),
    prompt,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`[kids] Done in ${elapsed}s`);
  console.log(`[kids] Usage:`, usage);

  if (!output) {
    throw new Error('No output from Perplexity');
  }

  const { bestsellerThemes, ccBundleProposals, marketIntelligence } = output;

  console.log(`[kids] Bestseller themes: ${bestsellerThemes.length}`);
  console.log(`[kids] CC proposals: ${ccBundleProposals.length}`);

  const payload = {
    generatedAt: new Date().toISOString(),
    model: MODEL_ID,
    elapsedSeconds: Number(elapsed),
    targetAge: TARGET_AGE,
    ccBundlePriceGbp: CC_BUNDLE_PRICE_GBP,
    bestsellerThemes,
    ccBundleProposals,
    marketIntelligence,
    sources: sources ?? [],
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`[kids] Wrote results to ${OUTPUT_FILE}`);

  if (sources && sources.length > 0) {
    console.log(`[kids] Sources (${sources.length}):`);
    sources.slice(0, 20).forEach((s, i) => {
      const url = 'url' in s ? s.url : JSON.stringify(s);
      console.log(`  [${i + 1}] ${url}`);
    });
  }
}

run().catch((err) => {
  console.error('[kids] Failed:', err);
  process.exit(1);
});
