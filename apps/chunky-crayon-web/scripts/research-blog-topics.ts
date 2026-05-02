/**
 * Deep research for new blog topics using Perplexity sonar-deep-research.
 *
 * Reads existing BLOG_TOPICS from constants.ts + covered topics from Sanity,
 * asks Perplexity to propose NEW topics per category, and writes the result
 * to scripts/research-blog-topics.output.json for review.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/research-blog-topics.ts \
 *     dotenv_config_path=.env.local
 *
 * Env vars required:
 *   PERPLEXITY_API_KEY
 *   NEXT_PUBLIC_SANITY_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET
 *   SANITY_API_TOKEN (only if dataset is private — production is public read)
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateText, Output } from 'ai';
import { perplexity } from '@ai-sdk/perplexity';
import { z } from 'zod';
import { createClient } from 'next-sanity';
import { BLOG_TOPICS, type BlogTopic } from '@one-colored-pixel/coloring-core';

const TARGET_PER_CATEGORY = 30; // ~6 months per category at 1/day across 6 cats = long runway
const MODEL_ID = 'sonar-deep-research';
const OUTPUT_FILE = join(__dirname, 'research-blog-topics.output.json');

const blogTopicSchema = z.object({
  topic: z
    .string()
    .describe(
      'Short descriptive blog post title, 5-12 words, no trailing period',
    ),
  category: z.enum([
    'parenting',
    'educational',
    'seasonal',
    'adult-coloring',
    'themes',
    'techniques',
  ]),
  keywords: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe('3-6 SEO keywords a parent or adult would search for'),
});

const researchOutputSchema = z.object({
  topics: z.array(blogTopicSchema).min(60),
});

const CATEGORY_DESCRIPTIONS: Record<BlogTopic['category'], string> = {
  parenting:
    'Parents of young kids using coloring as a parenting tool, activity, bonding moment',
  educational:
    'Coloring as a learning aid for kids (letters, numbers, science, geography, history)',
  seasonal:
    'Holiday and seasonal themes (spring, Christmas, back-to-school, cultural holidays, etc.)',
  'adult-coloring':
    'Coloring for adults: stress relief, mindfulness, sleep, wellness, hobby',
  themes:
    'Popular image themes kids and adults love (animals, vehicles, fantasy, etc.)',
  techniques:
    'How-to content about coloring skills, tools, and visual techniques',
};

async function getCoveredTopics(): Promise<string[]> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

  if (!projectId) {
    throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set');
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2025-02-19',
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
  });

  const topics = await client.fetch<string[]>(
    `*[_type == "post" && defined(generationMeta.topic)].generationMeta.topic`,
  );

  return topics || [];
}

function buildPrompt(
  existingTopics: BlogTopic[],
  coveredTopics: string[],
): string {
  const existingByCategory = existingTopics.reduce<Record<string, string[]>>(
    (acc, t) => {
      (acc[t.category] ||= []).push(t.topic);
      return acc;
    },
    {},
  );

  const categoryBlock = (
    Object.keys(CATEGORY_DESCRIPTIONS) as BlogTopic['category'][]
  )
    .map((cat) => {
      const desc = CATEGORY_DESCRIPTIONS[cat];
      const existing = existingByCategory[cat] ?? [];
      return `### ${cat}
${desc}

Existing topics in this category (DO NOT repeat or closely paraphrase):
${existing.map((t) => `- ${t}`).join('\n')}`;
    })
    .join('\n\n');

  return `You are researching fresh, high-SEO-value blog post topic ideas for **Chunky Crayon**, a free online coloring site aimed at kids and their parents.

Use your deep web research to identify topics that:
1. Are actively searched by parents, teachers, or adult colorists in 2026.
2. Align with seasonal events, education trends, parenting conversations, and mindfulness/wellness trends happening right now.
3. Have clear SEO keyword potential (look at search intent, "people also ask", Reddit/parenting forums, TikTok parenting trends, current news hooks).
4. Are genuinely distinct from the existing topics listed below.

Produce **${TARGET_PER_CATEGORY} brand new topic ideas per category** (total ${TARGET_PER_CATEGORY * 6}).

Categories and their existing coverage:

${categoryBlock}

All of the following topics have already been published as posts — DO NOT propose any of them or close variants:

${coveredTopics.map((t) => `- ${t}`).join('\n')}

For each new topic:
- Write a clear, specific \`topic\` string (5–12 words) that would work as a blog title seed.
- Assign the correct \`category\`.
- List 3–6 search-intent \`keywords\` (short phrases, lowercase, comma-safe — what someone would type into Google).

Be genuinely creative and research-driven. Favour specific angles (e.g. "Forest school coloring activities for outdoor learners") over generic ones (e.g. "Coloring is fun"). Use what you find in your research — seasonal hooks for the coming 6–9 months, viral topics in parenting spaces, adult colouring trends.

Return ONLY the structured JSON.`;
}

async function run() {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY is not set');
  }

  console.log(`[research] Using model: ${MODEL_ID}`);
  console.log(`[research] Existing topics: ${BLOG_TOPICS.length}`);

  const coveredTopics = await getCoveredTopics();
  console.log(`[research] Covered topics in Sanity: ${coveredTopics.length}`);

  const prompt = buildPrompt(BLOG_TOPICS, coveredTopics);
  console.log(`[research] Prompt length: ${prompt.length} chars`);
  console.log(`[research] Calling Perplexity (this takes several minutes)...`);

  const start = Date.now();
  const { output, sources, usage } = await generateText({
    model: perplexity(MODEL_ID),
    output: Output.object({ schema: researchOutputSchema }),
    prompt,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`[research] Done in ${elapsed}s`);
  console.log(`[research] Usage:`, usage);

  if (!output) {
    throw new Error('No output from Perplexity');
  }

  const { topics } = output;
  const existingTopicSet = new Set(
    BLOG_TOPICS.map((t) => t.topic.toLowerCase().trim()),
  );
  const coveredSet = new Set(coveredTopics.map((t) => t.toLowerCase().trim()));

  const unique = topics.filter((t) => {
    const key = t.topic.toLowerCase().trim();
    return !existingTopicSet.has(key) && !coveredSet.has(key);
  });
  const duplicatesRemoved = topics.length - unique.length;

  const byCategory = unique.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`[research] Topics returned: ${topics.length}`);
  console.log(`[research] Duplicates removed: ${duplicatesRemoved}`);
  console.log(`[research] Unique topics: ${unique.length}`);
  console.log(`[research] Per category:`, byCategory);

  const payload = {
    generatedAt: new Date().toISOString(),
    model: MODEL_ID,
    elapsedSeconds: Number(elapsed),
    totalReturned: topics.length,
    duplicatesRemoved,
    uniqueTopics: unique,
    countsPerCategory: byCategory,
    sources: sources ?? [],
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`[research] Wrote ${unique.length} topics to ${OUTPUT_FILE}`);

  if (sources && sources.length > 0) {
    console.log(`[research] Sources (${sources.length}):`);
    sources.slice(0, 20).forEach((s, i) => {
      const url = 'url' in s ? s.url : JSON.stringify(s);
      console.log(`  [${i + 1}] ${url}`);
    });
  }
}

run().catch((err) => {
  console.error('[research] Failed:', err);
  process.exit(1);
});
