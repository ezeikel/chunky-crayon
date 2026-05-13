/**
 * Generate the v2 reference-image set for difficulty-aware coloring page
 * generation.
 *
 * Builds 24 reference images at high quality on gpt-image-2 and uploads
 * them to R2 at:
 *
 *   reference-images/v2/beginner/{subject}.webp
 *   reference-images/v2/intermediate/{subject}.webp
 *   reference-images/v2/advanced/{subject}.webp
 *
 * The 8 subjects (birthdays, dinosaur, family-and-friends, farm-animals,
 * sea-creatures, superheroes, trains, unicorns) mirror the original v1
 * reference set so the only signal that changes across the 3 reference
 * directories is complexity.
 *
 * For the BEGINNER tier:
 *   - dinosaur, family-and-friends, farm-animals, trains are kept from
 *     v1 (their current versions are already pure-beginner). Run
 *     scripts/copy-beginner-references-to-v2.ts to copy them over.
 *   - birthdays, sea-creatures, superheroes, unicorns are replaced
 *     because the current versions drift into intermediate complexity
 *     (or in superheroes' case, include a Superman S logo we shouldn't
 *     be sending to the model).
 *
 * Usage:
 *   # Generate one subject across all 3 difficulties (~$0.63, 3 images)
 *   pnpm tsx scripts/generate-v2-references.ts --subject dinosaur
 *
 *   # Generate one specific (subject, difficulty) pair
 *   pnpm tsx scripts/generate-v2-references.ts --subject birthdays --difficulty beginner
 *
 *   # Full backfill (20 images at ~$4.20 — skips the 4 kept beginners)
 *   pnpm tsx scripts/generate-v2-references.ts --all
 *
 *   # Dry run prints prompts without calling the API
 *   pnpm tsx scripts/generate-v2-references.ts --all --dry-run
 *
 * Env: OPENAI_API_KEY, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *      R2_BUCKET, R2_PUBLIC_URL
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { put } from '@one-colored-pixel/storage';

const MODEL = 'gpt-image-2';
const SIZE: '1024x1024' = '1024x1024';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type Subject =
  | 'birthdays'
  | 'dinosaur'
  | 'family-and-friends'
  | 'farm-animals'
  | 'sea-creatures'
  | 'superheroes'
  | 'trains'
  | 'unicorns';

// All 8 beginners are regenerated at v2. The v1 set has shading + grey
// fills throughout (cow patches, locomotive body wash, family clothing,
// dinosaur body shadow, sun/rock gradients) that contradict our own
// style block ("no shading, no gradients, no fill"). Sending shaded
// references contaminates every downstream gpt-image-2 generation by
// teaching it that shading is acceptable. Fresh high-quality references
// with the current strict prompt fix this at the source.
//
// v1 originals stay untouched at their existing R2 paths as backup.

const ALL_SUBJECTS: readonly Subject[] = [
  'birthdays',
  'dinosaur',
  'family-and-friends',
  'farm-animals',
  'sea-creatures',
  'superheroes',
  'trains',
  'unicorns',
] as const;

type PromptMap = Record<Subject, string>;

// Shared style closer used by every prompt. Keeps cartoon style + closed
// contours invariant; only the subject + complexity description changes.
const STYLE_TAIL = `Thick bold black outlines on pure white background. Cartoon style, friendly faces. Every shape fully sealed with no breaks or gaps. No shading, no gradients, no fill, no copyrighted characters or logos.`;

const BEGINNER_PROMPTS: PromptMap = {
  birthdays: `A single happy cartoon child wearing a party hat, standing behind a large birthday cake with three candles. One balloon floating beside them. Plain background. Large simple shapes, friendly approachable smile, maximum 6 distinct colorable areas. ${STYLE_TAIL} Designed for a 3 year old to color with chunky crayons.`,
  dinosaur: `A single chubby smiling cartoon T-Rex standing on a flat patch of ground. One small simple sun in the sky. One small mountain shape in the distance. Plain background. Large simple body shape with no scale texture or fine detail. Friendly face with big round eyes and a small smile. Maximum 7 distinct colorable areas. ${STYLE_TAIL} Designed for a 3 year old to color with chunky crayons.`,
  'family-and-friends': `A cartoon family of three (one adult and two children) standing in a row, all smiling and waving. Each character has a simple body shape with plain clothing drawn as outlines only (no patterns, no stripes). Plain background. Large simple shapes, friendly approachable faces. Maximum 8 distinct colorable areas. ${STYLE_TAIL} Designed for a 3 year old to color with chunky crayons.`,
  'farm-animals': `A single chubby smiling cartoon cow standing on a flat patch of grass next to a smaller smiling pig. Both animals have plain bodies (no spots, no patches, no fine detail). Plain background. Large simple body shapes, friendly faces with big round eyes. Maximum 7 distinct colorable areas. ${STYLE_TAIL} Designed for a 3 year old to color with chunky crayons.`,
  'sea-creatures': `A single chubby smiling cartoon whale floating in calm water with one simple wave below. One small star above. Plain background. Large simple body shape with no scale texture or fine detail. Friendly face with big round eyes. Maximum 5 distinct colorable areas. ${STYLE_TAIL} Designed for a 3 year old to color with chunky crayons.`,
  superheroes: `A friendly cartoon child superhero standing in a confident pose, wearing a simple cape and a plain eye mask. A plain star outline on the chest (no letters, no copyrighted insignia). Large simple body shape, friendly approachable smile, maximum 7 distinct colorable areas. ${STYLE_TAIL} Designed for a 3 year old to color with chunky crayons.`,
  trains: `A single cheerful cartoon steam locomotive on a short piece of track. Three large round wheels visible. One simple smoke puff above. Plain background. Large simple body shape with no rivets or mechanical detail. Friendly face on the front of the locomotive. Maximum 7 distinct colorable areas. ${STYLE_TAIL} Designed for a 3 year old to color with chunky crayons.`,
  unicorns: `A single chubby smiling cartoon unicorn standing on a flat patch of ground, with one short straight horn and a simple mane drawn as 3 or 4 chunky shapes (no fine detail lines, no flowing tendrils). One small star above. Plain background. Friendly face, large simple body shape, maximum 7 distinct colorable areas. ${STYLE_TAIL} Designed for a 3 year old to color with chunky crayons.`,
};

const INTERMEDIATE_PROMPTS: PromptMap = {
  birthdays: `A birthday scene with two cartoon kids (one wearing a party hat, one holding a balloon) standing on either side of a tiered birthday cake with candles. Streamers and stars above. A wrapped gift on each side with simple bow patterns. Plain background. Clothing has simple stripe or polka-dot patterns. 12-18 distinct colorable areas. ${STYLE_TAIL} Designed for a 9-12 year old to color.`,
  dinosaur: `A friendly cartoon T-Rex standing in a prehistoric scene with two distant mountains, three palm trees, and one pterodactyl flying overhead. The T-Rex has simple spot patterns on its back. A small egg in the foreground. 14-20 distinct colorable areas. ${STYLE_TAIL} Designed for a 9-12 year old to color.`,
  'family-and-friends': `A family of four (two adults, two kids) standing in front of a simple cottage house, all smiling and waving. A small dog sitting in front. Two trees flanking the house, a sun in the sky, a flower bed in front. Each character wears simple clothing with stripe or dot patterns. 15-20 distinct colorable areas. ${STYLE_TAIL} Designed for a 9-12 year old to color.`,
  'farm-animals': `A farm scene with a cow, a pig, and a chicken standing in front of a simple barn. A small sun in the sky, two clouds, a fence in the foreground with three slats, a watering trough. Cow has spot patterns, chicken has simple feather lines. 14-18 distinct colorable areas. ${STYLE_TAIL} Designed for a 9-12 year old to color.`,
  'sea-creatures': `An underwater scene with a smiling dolphin in the center, a smaller fish to one side, a starfish on the seabed, and three bubbles rising. Two strands of seaweed flanking the scene. Dolphin has simple line details for the belly stripe. 13-17 distinct colorable areas. ${STYLE_TAIL} Designed for a 9-12 year old to color.`,
  superheroes: `A friendly cartoon superhero in a confident flying pose with cape billowing behind them. Wearing a plain eye mask and a plain star symbol on the chest (no letters, no copyrighted insignia). Three clouds in the background, two stars sparkling around them, simple stripe pattern on the wristbands and boots. 14-18 distinct colorable areas. ${STYLE_TAIL} Designed for a 9-12 year old to color.`,
  trains: `A cheerful cartoon steam locomotive on tracks, with simple smoke puffs above, two visible windows on the side, three large round wheels, a cowcatcher in front. Two clouds in the sky, a simple landscape with one hill and a tree. Smoke has simple swirl detail. Friendly face on the locomotive. 14-18 distinct colorable areas. ${STYLE_TAIL} Designed for a 9-12 year old to color.`,
  unicorns: `A smiling cartoon unicorn standing on a small grassy hill with a rainbow arching behind. Mane and tail drawn as 5-6 wavy sections with simple internal lines. Spiral horn pattern. Two stars and a small heart in the air. Simple flower at the unicorn's feet. 14-18 distinct colorable areas. ${STYLE_TAIL} Designed for a 9-12 year old to color.`,
};

const ADVANCED_PROMPTS: PromptMap = {
  birthdays: `A detailed cartoon birthday celebration with three smiling kids around a multi-tier cake. Each tier has different decorative icing patterns (zigzag, dots, swirls). Streamers and balloons across the top, each balloon showing a different simple pattern (stripes, dots, stars, checks). Several wrapped presents in the foreground with elaborate bows and patterned wrapping paper. Patterned tablecloth visible. Confetti scattered in the air. Detailed but kid-appropriate. 28-35 distinct colorable areas. ${STYLE_TAIL} Designed for an older child (8-12) who wants a more detailed coloring challenge.`,
  dinosaur: `A detailed cartoon prehistoric scene with a friendly stegosaurus in the foreground covered in patterned scales along its back and decorated plates. Behind, a smaller T-Rex and three pterodactyls in flight. Multiple distant mountains, palm trees with detailed frond patterns, ferns in the foreground with leaf-vein lines, a nest with three eggs each patterned differently, decorative cloud swirls above. 30-40 distinct colorable areas. ${STYLE_TAIL} Designed for an older child (8-12) who wants a more detailed coloring challenge.`,
  'family-and-friends': `A detailed cartoon scene of a family of five gathered in a garden in front of a cottage with brick patterns and shingle pattern on the roof. Each family member wears clothing with simple patterns (florals, stripes, geometric). A dog and a cat in the foreground each with patterned collars. Trees with detailed leaf patterns, a flower bed with multiple varieties, a stone path with cobblestone pattern, a birdhouse on a post. 30-38 distinct colorable areas. ${STYLE_TAIL} Designed for an older child (8-12) who wants a more detailed coloring challenge.`,
  'farm-animals': `A detailed cartoon farm scene with a cow (patterned patches), a pig (patterned bandana), a chicken (detailed feather sections), and a horse (decorated bridle and patterned mane) gathered in front of a barn with wood-plank texture and decorative trim. A fence with wood-grain pattern, a windmill with detailed blades, a haystack with cross-hatched texture, hens with feather plumage detail, a watering trough with rivets, sunflowers with patterned centers, a butterfly with patterned wings. 32-40 distinct colorable areas. ${STYLE_TAIL} Designed for an older child (8-12) who wants a more detailed coloring challenge.`,
  'sea-creatures': `A detailed cartoon underwater scene with a large smiling sea turtle in the center, its shell divided into sections each filled with different simple patterns (dots, swirls, stars, lines). Surrounded by a school of patterned fish, a jellyfish with curled tentacles, decorative coral, multiple starfish each with different decorated centers, seaweed with frond lines, and bubble clusters. 30-40 distinct colorable areas. ${STYLE_TAIL} Designed for an older child (8-12) who wants a more detailed coloring challenge.`,
  superheroes: `A detailed cartoon superhero standing in a heroic pose with cape billowing dramatically behind, cape lined with star patterns and zigzag trim. A plain geometric star symbol on the chest (no letters or copyrighted insignia). Detailed wristbands and boots with pattern bands. Behind them, a stylized city skyline with windows and patterned rooftops, decorative bursts of stars and lightning bolts, three patterned banners flowing. Belt with multiple compartments. 28-38 distinct colorable areas. ${STYLE_TAIL} Designed for an older child (8-12) who wants a more detailed coloring challenge.`,
  trains: `A detailed cartoon steam locomotive on tracks with machine parts visible (rivets, valves, pipes), simple patterns on the smokestack and cowcatcher, two passenger cars behind with patterned window frames. Detailed smoke clouds with internal swirl patterns, a track with crossties showing wood grain, a railway sign with simple decoration, distant hills, telegraph poles, and birds with simple wing patterns. Friendly face on the locomotive. 30-40 distinct colorable areas. ${STYLE_TAIL} Designed for an older child (8-12) who wants a more detailed coloring challenge.`,
  unicorns: `A detailed cartoon unicorn standing in a meadow. Mane and tail drawn as multiple wavy chunky sections (around 6 to 8 sections), each section a plain shape with at most one simple decoration inside (a star, a heart, or a small dot pattern). A spiraled horn drawn with chunky ridge lines, not fine filigree. A saddle blanket with a simple stripe or chevron pattern. A rainbow with chunky bands behind. Three simple cartoon flowers in the foreground with plain rounded petals (no mandala centres). Two cartoon butterflies with simple wing shapes. A few stars in the sky. Cartoon coloring book for kids style, not adult zentangle or mandala. Avoid fine filigree, decorative swirls, intricate lace patterns, or mandala-style ornament. Keep every pattern element chunky and child-appropriate. 30-40 distinct colorable areas. ${STYLE_TAIL} Designed for an older child (8-12) who wants a more detailed coloring challenge, but still a kids' coloring book page not an adult one.`,
};

const PROMPTS: Record<Difficulty, PromptMap> = {
  beginner: BEGINNER_PROMPTS,
  intermediate: INTERMEDIATE_PROMPTS,
  advanced: ADVANCED_PROMPTS,
};

type Args = {
  subject?: Subject;
  difficulty?: Difficulty;
  all: boolean;
  dryRun: boolean;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { all: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--subject') args.subject = argv[++i] as Subject;
    else if (a === '--difficulty') args.difficulty = argv[++i] as Difficulty;
  }
  return args;
}

type Job = { subject: Subject; difficulty: Difficulty };

function planJobs(args: Args): Job[] {
  // Single (subject, difficulty) pair
  if (args.subject && args.difficulty) {
    return [{ subject: args.subject, difficulty: args.difficulty }];
  }
  // Single subject across all three difficulties
  if (args.subject) {
    const subj = args.subject;
    return (['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(
      (d) => ({ subject: subj, difficulty: d }),
    );
  }
  // Full backfill — all 8 subjects × 3 difficulties = 24 generations
  if (args.all) {
    const jobs: Job[] = [];
    for (const subj of ALL_SUBJECTS) {
      for (const diff of [
        'beginner',
        'intermediate',
        'advanced',
      ] as Difficulty[]) {
        jobs.push({ subject: subj, difficulty: diff });
      }
    }
    return jobs;
  }
  return [];
}

async function generateAndUpload(
  client: OpenAI,
  job: Job,
  dryRun: boolean,
): Promise<void> {
  const prompt = PROMPTS[job.difficulty][job.subject];
  const r2Path = `reference-images/v2/${job.difficulty}/${job.subject}.png`;
  console.log(
    `\n[${job.difficulty}/${job.subject}] prompt (${prompt.length} chars):`,
  );
  console.log(`  ${prompt.slice(0, 200)}${prompt.length > 200 ? '…' : ''}`);
  if (dryRun) {
    console.log(`[${job.difficulty}/${job.subject}] DRY RUN — skip`);
    return;
  }

  const start = Date.now();
  const response = await client.images.generate({
    model: MODEL,
    prompt,
    size: SIZE,
    quality: 'high',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image data in response`);
  const buf = Buffer.from(b64, 'base64');
  console.log(
    `[${job.difficulty}/${job.subject}] generated in ${elapsed}s (${(buf.length / 1024).toFixed(0)}KB)`,
  );

  // Local preview so we can eyeball before R2 upload settles
  const previewDir = join(__dirname, 'out', 'v2-references', job.difficulty);
  mkdirSync(previewDir, { recursive: true });
  const localPath = join(previewDir, `${job.subject}.png`);
  writeFileSync(localPath, buf);

  const { url } = await put(r2Path, buf, {
    access: 'public',
    contentType: 'image/png',
    allowOverwrite: true,
  });
  console.log(`[${job.difficulty}/${job.subject}] uploaded -> ${url}`);
}

async function main() {
  const args = parseArgs();
  const jobs = planJobs(args);
  if (jobs.length === 0) {
    console.error(
      'Usage:\n' +
        '  --subject <name>                   # all 3 difficulties for one subject\n' +
        '  --subject <name> --difficulty <d>  # one specific combo\n' +
        '  --all                              # full backfill (20 images)\n' +
        '  --dry-run                          # print prompts without API calls\n' +
        'Subjects: birthdays, dinosaur, family-and-friends, farm-animals, sea-creatures, superheroes, trains, unicorns\n' +
        'Difficulties: beginner, intermediate, advanced',
    );
    process.exit(1);
  }
  console.log(
    `[v2-refs] ${jobs.length} job${jobs.length === 1 ? '' : 's'} planned`,
  );

  // OpenAI client only needed for real runs; skip the env check on dry-runs
  // so contributors can preview prompts without provisioning keys.
  let client: OpenAI | null = null;
  if (!args.dryRun) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  for (const job of jobs) {
    try {
      // Real runs require the client; dry-run path bails before any client use
      await generateAndUpload(client as OpenAI, job, args.dryRun);
    } catch (err) {
      console.error(
        `[${job.difficulty}/${job.subject}] FAILED:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log('\n[v2-refs] done');
}

main().catch((err) => {
  console.error('[v2-refs] fatal:', err);
  process.exit(1);
});
