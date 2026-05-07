/**
 * Deep research for Coco Wyo's PDF coloring bundles using Perplexity sonar-deep-research.
 *
 * Coco Wyo (cocowyo.com + Etsy CocoWyoColoring) sells themed PDF coloring bundles —
 * 93.5k+ Etsy sales, 4.9★, ~500k IG followers. We want to enumerate their full bundle
 * catalogue, understand the themes that work, and propose Chunky Crayon "twists" so
 * we can create our own line of premade bundles (sold via Stripe Products on
 * chunkycrayon.com) without copying their IP.
 *
 * Output: scripts/research-coco-wyo-bundles.output.json — review before generating
 * any line art or Stripe products.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/research-coco-wyo-bundles.ts \
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
const OUTPUT_FILE = join(__dirname, 'research-coco-wyo-bundles.output.json');
const CC_BUNDLE_PRICE_GBP = 4.99;

const cocoWyoBundleSchema = z.object({
  name: z.string().describe('Exact Coco Wyo bundle name as listed'),
  source: z
    .enum(['cocowyo.com', 'etsy', 'both'])
    .describe('Where the bundle is sold'),
  url: z
    .string()
    .optional()
    .describe('Direct product URL if found during research'),
  pageCount: z
    .number()
    .int()
    .describe('Number of coloring pages in the bundle'),
  priceGbp: z
    .number()
    .optional()
    .describe('Price in GBP (or converted from USD/EUR), null if unknown'),
  targetAge: z
    .string()
    .describe('Target age range, e.g. "3-8", "kids", "all ages", "adult"'),
  theme: z
    .string()
    .describe('Primary theme cluster, e.g. animals, fantasy, vehicles, food'),
  aestheticDescription: z
    .string()
    .describe(
      'One-line visual description of the art style and contents — what a buyer would see',
    ),
});

const ccTwistSchema = z.object({
  cocoWyoBundleName: z
    .string()
    .describe('Which Coco Wyo bundle this is responding to'),
  ccBundleName: z
    .string()
    .describe(
      'Proposed Chunky Crayon bundle name — distinct, not a copy. Playful, kid-friendly.',
    ),
  ccTagline: z
    .string()
    .describe('Short marketing tagline for the CC bundle (under 12 words)'),
  ccTheme: z
    .string()
    .describe('CC theme — may differ from CW if we see a better angle'),
  ccPageCount: z
    .number()
    .int()
    .describe('Recommended page count, default 10 unless reason to differ'),
  ccTwist: z
    .string()
    .describe(
      'What makes our version distinct — the twist. E.g. "include Colo mascot in 2 pages", "British countryside theme not just generic forest", "online + print not just print"',
    ),
  ccPagePrompts: z
    .array(z.string())
    .min(8)
    .max(15)
    .describe(
      'Per-page prompt seeds we can feed to our line-art generator. Each is a single specific scene description, not just a noun. ~15-25 words each.',
    ),
  whyItWorks: z
    .string()
    .describe(
      'Why this bundle should sell — what need it serves, what mood/moment it owns',
    ),
});

const themeClusterSchema = z.object({
  cluster: z
    .string()
    .describe('Theme cluster name, e.g. "Cute Animals", "Mystical/Fantasy"'),
  cocoWyoBundleNames: z
    .array(z.string())
    .describe('Names of CW bundles in this cluster'),
  saturation: z
    .enum(['oversaturated', 'well-covered', 'undersaturated', 'gap'])
    .describe(
      "How well CW covers this cluster — gap = they don't do it, opportunity for us",
    ),
  notes: z
    .string()
    .describe('What works in this cluster, what we could do differently'),
});

const researchOutputSchema = z.object({
  cocoWyoBundles: z
    .array(cocoWyoBundleSchema)
    .min(8)
    .describe(
      'Every Coco Wyo bundle you can verify from research — be exhaustive, list at least 8 even if some details are estimates',
    ),
  themeClusters: z
    .array(themeClusterSchema)
    .min(4)
    .describe('Coco Wyo bundles grouped into theme clusters'),
  ccBundleProposals: z
    .array(ccTwistSchema)
    .min(8)
    .describe(
      'Chunky Crayon bundle proposals — at least 8. Mix of CW-inspired-with-twist and gap-filling original ideas.',
    ),
  marketingNotes: z
    .string()
    .describe(
      'Free-form research notes: pricing patterns, what reviews praise, what gets criticized, IG/Pinterest content angles that drive their funnel',
    ),
});

function buildPrompt(): string {
  return `You are researching **Coco Wyo** (cocowyo.com + Etsy shop "CocoWyoColoring"), a popular indie coloring page brand. They sell themed PDF coloring bundles, primarily on Etsy where they have 93.5k+ sales and 4.9★ from 6k+ reviews. Their Instagram has roughly 500k followers. They illustrate by hand, in a recognisable cute/cozy style.

Our company **Chunky Crayon** (chunkycrayon.com) is a kids-focused online coloring site. We can generate line art on demand and offer in-browser coloring AND printable PDFs. We want to launch our own line of premade themed coloring bundles, sold as Stripe Products on our site at **£${CC_BUNDLE_PRICE_GBP}** each. We are NOT cloning Coco Wyo — we want to learn from what they sell, identify gaps, and propose original CC bundles with our own twist.

## Your task

Research Coco Wyo's full bundle catalogue across:
- cocowyo.com (Shopify storefront)
- Etsy shop "CocoWyoColoring" / "Coco Wyo"
- Their Instagram, Pinterest, TikTok, Facebook posts mentioning specific bundle names
- Reddit / parenting forum mentions
- Review sites discussing their products

For each bundle you find, capture:
- Exact name (e.g. "Combo 1: Little Cuddles", "Mystical World Vol 2")
- Source (cocowyo.com / etsy / both)
- Direct URL if you can find it
- Page count
- Price (in GBP — convert from USD/EUR if needed; null if unknown)
- Target age range
- Primary theme
- One-line aesthetic description of the art

Then group them into **theme clusters** and rate how saturated each cluster is in Coco Wyo's catalogue:
- **oversaturated**: they have many bundles in this theme, hard to differentiate
- **well-covered**: they cover it, but room for our own take
- **undersaturated**: they have one weak entry, opportunity to do better
- **gap**: they don't sell this theme — pure whitespace for us

Then propose **at least 8 Chunky Crayon bundles** — a mix of:
- CC-twisted versions of CW bestsellers (different art angle, different micro-theme)
- Gap-filling originals where CW has nothing

For each CC proposal:
- Original name (don't reuse CW names; make ours playful but distinct, e.g. "Crayon Critters" not "Little Cuddles")
- Tagline
- Theme
- 10-page count by default (justify if different)
- The "twist" — what makes ours different and better. Things to lean into: our **Colo mascot** (a friendly crayon character — can guest-star in some pages), **British/global cultural angles** Coco Wyo's US-focused style ignores, **online + print** as a feature, **scene cohesion** (e.g. "one storyline across 10 pages" vs CW's standalone pages), **inclusivity** (CW characters are mostly generic; we can do diverse kids).
- 8-15 specific per-page prompt seeds — these will be fed straight into our line-art generator. Each seed is a single scene with character, action, setting, mood. NOT just nouns. ~15-25 words each. Example: "A small fox in a knitted scarf reading a storybook to two baby rabbits inside a glowing autumn tree hollow at dusk" (good) vs. "Fox" (bad).
- Why it works: the parental need, the mood, the moment it owns.

Finally, free-form **marketingNotes**: what you observed about CW's pricing patterns, what their reviews praise, what gets criticized, what their IG/Pinterest content angles are, and any signals about their bestsellers vs. underperformers.

## Important constraints

- We are launching with **kids/family-friendly bundles only** (Chunky Crayon = kids brand). Skip CW's adult-leaning bundles for the proposal section, but still record them in the bundle list.
- Avoid copyrighted IP entirely (no Disney, Pokémon, no specific CW character names).
- US/UK-neutral language in CC bundle names and taglines (no "vacation"-vs-"holiday" landmines).
- No em dashes in CC tagline copy. Use commas or fresh sentences.
- Don't say "AI" anywhere in CC marketing language. Frame around outcomes.

Return ONLY the structured JSON.`;
}

async function run() {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  console.log(`[coco-wyo] Using model: ${MODEL_ID}`);
  console.log(`[coco-wyo] CC bundle anchor price: £${CC_BUNDLE_PRICE_GBP}`);

  const prompt = buildPrompt();
  console.log(`[coco-wyo] Prompt length: ${prompt.length} chars`);
  console.log(`[coco-wyo] Calling Perplexity (this takes several minutes)...`);

  const start = Date.now();
  const { output, sources, usage } = await generateText({
    model: perplexity(MODEL_ID),
    output: Output.object({ schema: researchOutputSchema }),
    prompt,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`[coco-wyo] Done in ${elapsed}s`);
  console.log(`[coco-wyo] Usage:`, usage);

  if (!output) {
    throw new Error('No output from Perplexity');
  }

  const { cocoWyoBundles, themeClusters, ccBundleProposals, marketingNotes } =
    output;

  console.log(`[coco-wyo] CW bundles found: ${cocoWyoBundles.length}`);
  console.log(`[coco-wyo] Theme clusters: ${themeClusters.length}`);
  console.log(`[coco-wyo] CC proposals: ${ccBundleProposals.length}`);

  const payload = {
    generatedAt: new Date().toISOString(),
    model: MODEL_ID,
    elapsedSeconds: Number(elapsed),
    ccBundlePriceGbp: CC_BUNDLE_PRICE_GBP,
    cocoWyoBundles,
    themeClusters,
    ccBundleProposals,
    marketingNotes,
    sources: sources ?? [],
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`[coco-wyo] Wrote results to ${OUTPUT_FILE}`);

  if (sources && sources.length > 0) {
    console.log(`[coco-wyo] Sources (${sources.length}):`);
    sources.slice(0, 20).forEach((s, i) => {
      const url = 'url' in s ? s.url : JSON.stringify(s);
      console.log(`  [${i + 1}] ${url}`);
    });
  }
}

run().catch((err) => {
  console.error('[coco-wyo] Failed:', err);
  process.exit(1);
});
