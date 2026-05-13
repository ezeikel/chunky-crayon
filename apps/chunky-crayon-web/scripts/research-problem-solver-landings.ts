/**
 * Perplexity Sonar research pass for "painkiller" (problem-solver) landing
 * pages on chunkycrayon.com. Where the tag-themed landings target curiosity
 * searches ("dinosaur coloring pages"), these target parents/teachers in
 * distress mode looking for solutions ("calming activities for autistic
 * kids", "things to do over half-term", "ADHD homework alternatives").
 *
 * Output: /tmp/problem-solver-landing-research.json — review manually,
 * then port the chosen entries into lib/seo/landing-pages.ts with
 * `angle: 'problem'` so they pick up the problem-solver copy template.
 *
 * Run:
 *   pnpm tsx scripts/research-problem-solver-landings.ts
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
            'URL-safe kebab-case slug, 4-7 words. Patterns to use: "calming-coloring-pages-for-kids-with-adhd", "coloring-pages-for-autistic-children", "summer-holiday-coloring-activities-for-kids", "rainy-day-coloring-activities", "anxiety-coloring-pages-for-kids", "bedtime-coloring-pages-for-kids", "screen-free-activities-for-kids", "occupational-therapy-coloring-activities". DO NOT duplicate any of the existing tag-themed slugs (animal/holiday/character/age-specific).',
          ),
        query: z
          .string()
          .describe(
            'The Google search query a parent, teacher, OT, or childminder actually types when looking for a solution. Should be a complete natural phrase, not a stuffed keyword string.',
          ),
        cluster: z
          .enum([
            'neurodivergent',
            'school-holiday',
            'emotional-regulation',
            'sensory',
            'sick-day-quiet-day',
            'screen-replacement',
          ])
          .describe(
            'Problem cluster. neurodivergent = ADHD/autism/sensory processing. school-holiday = half-term, summer, snow days, bank holidays. emotional-regulation = anxiety, big feelings, anger, transitions. sensory = sensory breaks, sensory-friendly activities. sick-day-quiet-day = recovering kid, low-energy. screen-replacement = digital-detox, screen-free, no-iPad.',
          ),
        estimatedMonthlyVolume: z
          .number()
          .describe(
            'Best-guess monthly US + UK search volume combined. These are typically lower-volume than tag landings (100-5K range is normal) BUT higher intent and conversion. Prefer truth over inflation.',
          ),
        searcherIntent: z
          .enum([
            'parent-distressed',
            'parent-planning',
            'teacher-classroom',
            'ot-therapist',
            'childminder-nursery',
          ])
          .describe(
            'Who is most likely searching this. parent-distressed = solving a problem RIGHT NOW. parent-planning = browsing for upcoming holiday/transition. teacher-classroom = lesson-plan filler. ot-therapist = professional sourcing materials. childminder-nursery = group activity ideas.',
          ),
        suggestedTags: z
          .array(z.string())
          .describe(
            'Tags from ColoringImage.tags that should filter the gallery to images matching this need. e.g. for ADHD calm: ["mandala","pattern","simple","animal","calm"]. For autism sensory: ["simple","bold","pattern","repeating"]. For half-term boredom: any broad tag works — these are use-case landings so tag filters can be looser than themed landings. 3-6 tags.',
          ),
        targetAudience: z
          .string()
          .describe(
            'One-line description of who this page is for, written like ad-copy targeting. e.g. "Parents of 5-10yo kids with ADHD looking for a focus-friendly calm-down activity for after school."',
          ),
        problemFraming: z
          .string()
          .describe(
            'One-line description of the problem being solved. e.g. "Kid is hyperactive after school and bedtime is chaos." — not a feature description.',
          ),
        researchCitation: z
          .object({
            source: z
              .string()
              .describe(
                'Reputable public source. Prefer: Cleveland Clinic, CHADD, NHS, Autism Speaks, NAS (National Autistic Society), American Academy of Pediatrics, peer-reviewed studies. NEVER cite blogs, Pinterest, or non-medical wellness sites.',
              ),
            claim: z
              .string()
              .describe(
                'A single factual, descriptive sentence we can cite ON THE LANDING PAGE. Must be descriptive ("research suggests / many parents report / studies indicate"), never therapeutic ("coloring treats X"). If no reputable source exists for this query, return source="" and claim="" — we will fall back to descriptive parent-experience framing.',
              ),
            url: z
              .string()
              .describe(
                'Direct URL to the source if available, otherwise empty string.',
              ),
          })
          .describe(
            'OPTIONAL research citation. Only include if a clearly-reputable public source supports a descriptive (non-therapeutic) claim. If unsure, return all-empty — we will not cite.',
          ),
        notes: z
          .string()
          .describe(
            'One-line strategic note: competition level, why this is a good target, sensitivity flags.',
          ),
      }),
    )
    .describe(
      'Exactly 40 high-intent problem-solver queries spread across the clusters. Aim for ~10 neurodivergent, ~8 school-holiday, ~7 emotional-regulation, ~5 sensory, ~5 sick-day, ~5 screen-replacement.',
    ),
});

const SYSTEM_PROMPT = `You are an SEO researcher for a children's coloring-page website (chunkycrayon.com) that lets parents type any subject and get a print-ready coloring page in 30 seconds.

The site ALREADY has 40 tag-themed landing pages (animals, holidays, characters, age-specific). I do NOT want more of those.

I want 40 NEW "problem-solver" landing pages targeting parents/teachers in distress mode — people looking for a SOLUTION, not browsing for cute images.

THE BIG SHIFT:
- Tag landings = "vitamin" (nice-to-have) — curiosity searches like "dinosaur coloring pages"
- Problem-solver landings = "painkiller" (must-have) — solution searches like "calming activities for ADHD kids" or "what to do over summer holidays"

These convert ~3-5x better because the searcher has a PROBLEM and coloring (especially custom on-demand coloring) is genuinely part of the answer.

CLUSTERS to cover (aim for the rough distribution in the schema):

1. NEURODIVERGENT support (~10 queries)
   - ADHD: calming, focus, after-school, homework alternative, bedtime
   - Autism: sensory, transitions, special interests, predictable activities
   - Sensory processing: tactile, repetitive, low-stimulation
   - Search examples: "calming activities for autistic 6 year old", "ADHD coloring pages for adults" (lots of parents search this for themselves too), "coloring pages for sensory kids"

2. SCHOOL HOLIDAYS / boredom (~8 queries)
   - Half-term (UK) — Feb, May, Oct
   - Summer holidays — biggest seasonal opportunity, June-Sep
   - Bank holiday Monday
   - Snow days, rainy days, sick days
   - Search examples: "things to do with kids over half term", "summer holiday activities for kids", "rainy day activities for 5 year old"

3. EMOTIONAL REGULATION (~7 queries)
   - Anxiety, worry, big feelings
   - Anger management for kids
   - Transitions (school start, new sibling, divorce, moving house)
   - Search examples: "coloring pages for anxious children", "calm down activities for kids"

4. SENSORY (~5 queries)
   - Sensory breaks for school
   - Quiet time activities
   - Sensory-friendly classroom activities
   - Search examples: "quiet activities for the classroom", "sensory friendly coloring pages"

5. SICK DAY / QUIET DAY (~5 queries)
   - Kid recovering from illness
   - Hospital waiting room
   - Quiet hour after lunch
   - Search examples: "quiet activities for sick child", "activities for kid in hospital"

6. SCREEN REPLACEMENT (~5 queries)
   - Screen-free activities
   - Digital detox for kids
   - Alternatives to iPad
   - Search examples: "screen free activities for 6 year old", "alternatives to screens for kids"

CRITICAL CONSTRAINTS:

- US AND UK searchers (use the British "half-term" / "holidays" vocabulary where appropriate — these are huge in the UK)
- These are SOLUTION searches, not theme searches. The slug should describe the PROBLEM or the USE CASE, not the visual style.
- For autism + ADHD specifically: NEVER claim coloring is therapeutic, treats, or cures anything. Frame it as a calming activity many parents find helpful. We are NOT a medical product.
- ONLY suggest research citations from genuinely reputable sources (Cleveland Clinic, NHS, CHADD, Autism Speaks, NAS, peer-reviewed). If unsure, return empty citation fields — we'll fall back to descriptive parent-experience framing.
- Real search volume estimates. These are typically 100-5K/mo, not 10K+ — that's normal and FINE because intent is much higher.

DO NOT DUPLICATE these existing slugs (paraphrasing them is also a duplicate):
- bold-and-easy-animal-coloring-pages, cute-dinosaur, easy-halloween, simple-princess-for-toddlers, unicorn, easy-space, easy-construction, free-dragon, simple-fairy, bold-and-easy-superhero, cute-robot, cute-ninja, cute-dog, bold-and-easy-cat, easy-horse, free-fish, cute-butterfly, easy-farm-animal, cute-elephant, free-bird, bold-and-easy-tiger, simple-lion-for-toddlers, simple-bug, free-coloring-pages-for-4-year-olds, cute-coloring-pages-for-preschoolers, easy-coloring-pages-for-kindergarten, bold-and-easy-coloring-pages-for-3-year-olds, simple-animal-coloring-pages-for-2-year-olds, christmas-coloring-pages-for-preschool, bold-and-easy-vehicle, free-easter, easy-valentines, simple-thanksgiving, easy-back-to-school, simple-st-patricks-day, cute-4th-of-july, free-hanukkah, cute-new-years, free-monster-truck, bold-and-easy-pirate.`;

const USER_PROMPT = `Research the 40 highest-intent problem-solver coloring-page queries for chunkycrayon.com.

For each query return: slug, query, cluster, estimatedMonthlyVolume, searcherIntent, suggestedTags, targetAudience, problemFraming, researchCitation (or empty), notes.

Prioritise:
1. Real search demand (UK + US combined volume — UK terms welcome)
2. Strong distress/intent — searcher is solving a problem TODAY
3. Coloring is a genuinely good answer to the problem (don't reach)
4. Low SEO competition vs Crayola/Supercoloring (they target head terms, we want long-tail intent)

Do not duplicate existing slugs. Avoid trademarked characters. Cite only reputable medical/educational sources.`;

async function main() {
  console.log(
    '[research] querying Perplexity Sonar for problem-solver landings…',
  );
  const start = Date.now();

  const { object } = await generateObject({
    model: models.search,
    schema: ResearchSchema,
    system: SYSTEM_PROMPT,
    prompt: USER_PROMPT,
  });

  const ms = Date.now() - start;
  console.log(`[research] got ${object.queries.length} queries in ${ms}ms`);

  object.queries.sort(
    (a, b) => b.estimatedMonthlyVolume - a.estimatedMonthlyVolume,
  );

  const outputPath = '/tmp/problem-solver-landing-research.json';
  await writeFile(outputPath, JSON.stringify(object, null, 2));
  console.log(`[research] wrote ${outputPath}`);

  const byCluster = object.queries.reduce<Record<string, number>>((acc, q) => {
    acc[q.cluster] = (acc[q.cluster] ?? 0) + 1;
    return acc;
  }, {});
  console.log('\n=== Distribution by cluster ===');
  Object.entries(byCluster).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

  console.log('\n=== Top 40 problem-solver queries by estimated volume ===\n');
  object.queries.forEach((q, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. [${q.cluster.padEnd(22)}] ${q.estimatedMonthlyVolume.toString().padStart(5)}/mo  ${q.slug}`,
    );
    console.log(`    Q: "${q.query}"`);
    console.log(`    audience: ${q.targetAudience}`);
    console.log(`    problem:  ${q.problemFraming}`);
    console.log(`    tags:     ${q.suggestedTags.join(', ')}`);
    if (q.researchCitation.source) {
      console.log(
        `    cite:     ${q.researchCitation.source} — "${q.researchCitation.claim}"`,
      );
    }
    console.log(`    note:     ${q.notes}`);
    console.log();
  });
}

main().catch((err) => {
  console.error('[research] failed:', err);
  process.exit(1);
});
