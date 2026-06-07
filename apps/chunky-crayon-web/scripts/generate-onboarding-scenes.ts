/**
 * Generate onboarding "welcome scene" coloring pages for CC mobile.
 *
 * Pipeline per scene — generate LINE ART DIRECTLY (the way the app generates
 * coloring pages), feeding the real Colo art as a REFERENCE image so the star
 * is the actual Colo, not a look-alike. No full-color round-trip, no lossy
 * trace step.
 *   1. gpt-image-2 `high` 1024x1024 via images.edit:
 *        image: [Colo master PNG]  (shape/identity reference)
 *        prompt: black-outline coloring-book page, this scene, Colo as the star
 *   2. write the SVG-ready PNG line art to disk for review
 *   (a light cleanup/threshold pass keeps it crisp; the existing welcome SVG is
 *    PNG-traced too — we trace the approved line-art PNG to SVG after approval)
 *
 * The scenes are Colo-led (the crayon mascot is the clear star) with a SUBTLE,
 * GENERIC background cast — NO named/licensed characters (kids-app IP safety),
 * and a "WELCOME" banner.
 *
 * Usage (from apps/chunky-crayon-web):
 *   OPENAI_API_KEY=... npx tsx scripts/generate-onboarding-scenes.ts party
 *   (pass one or more scene ids; omit to generate all)
 *
 * Output: scripts/out/onboarding-scenes/<id>.png  (black-outline line art)
 */
import OpenAI from 'openai';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const MODEL = 'gpt-image-2';
const SIZE = '1024x1024' as const;
const OUT_DIR = join(process.cwd(), 'scripts/out/onboarding-scenes');

// The real Colo master art (full-color, hi-res, transparent) — used purely as a
// SHAPE/IDENTITY reference. The prompt forces LINE-ART rendering, so the model
// takes Colo's form from the ref and the coloring-book style from the prompt.
const COLO_MASTER = '/Users/ezeikel/Desktop/Mascot2.png';

// Coloring-book line-art directive — keeps every scene crisp + colorable.
// Line weight is intentionally THIN/DELICATE (matches the existing onboarding
// welcome page), and the eyes are the ONE exception that stays solid black.
const LINE_ART = [
  'Black and white COLORING BOOK PAGE for young children ages 3 to 8.',
  'THIN, delicate, even black outlines on a pure white background — fine line',
  'weight like a classic printable coloring page, NOT thick or heavy.',
  'NO color, NO gray, NO shading, NO fills — just clean thin black line art with',
  'fully closed shapes and large open areas that are easy to color in.',
  'Render the reference character (Colo the orange crayon) as thin line art:',
  'keep his exact shape — crayon body, conical wrapper tip, wavy wrapper band,',
  'pink wax section as a thin outline band, smile, rosy cheeks as small open',
  'outline circles, mitten hands, little feet. EXCEPTION: his two eyes are SOLID',
  'FILLED BLACK dots (the only filled-black element in the whole image).',
  'Colo is the clear main character, large and front and center.',
  'The word "WELCOME" on a banner at the top.',
].join(' ');

// Subtle generic background cast per scene — small, unnamed, clearly original.
const SCENES: { id: string; prompt: string }[] = [
  {
    id: 'welcome-party',
    prompt: `A welcome party scene. Balloons on strings, bunting, and confetti. A couple of SMALL simple generic party-guest creatures (a little round bird and a tiny bunny) in the background, much smaller than Colo. ${LINE_ART}`,
  },
  {
    id: 'welcome-space',
    prompt: `A friendly outer-space welcome scene with a rocket ship on a small planet, stars and a ringed planet in the sky. One SMALL simple generic astronaut friend in the background, much smaller than Colo. ${LINE_ART}`,
  },
  {
    id: 'welcome-underwater',
    prompt: `A cheerful underwater reef welcome scene with bubbles, seaweed, and a treasure chest. A couple of SMALL simple generic fish friends in the background, much smaller than Colo. ${LINE_ART}`,
  },
  {
    id: 'welcome-jungle',
    prompt: `A jungle treehouse welcome scene with leafy vines and flowers. A couple of SMALL simple generic animal friends (a little monkey and a parrot) in the background, much smaller than Colo. ${LINE_ART}`,
  },
];

function loadAsFile(path: string, name: string): File {
  const buf = readFileSync(path);
  return new File([buf], `${name}.png`, { type: 'image/png' });
}

async function generateScene(
  client: OpenAI,
  scene: { id: string; prompt: string },
) {
  console.log(`[scenes] generating ${scene.id} (line art, Colo ref)...`);
  const ref = loadAsFile(COLO_MASTER, 'colo-master');
  const result = await client.images.edit({
    model: MODEL,
    image: [ref],
    prompt: scene.prompt,
    size: SIZE,
    quality: 'high',
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`no image returned for ${scene.id}`);
  writeFileSync(join(OUT_DIR, `${scene.id}.png`), Buffer.from(b64, 'base64'));
  console.log(`[scenes] ${scene.id}.png saved`);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  mkdirSync(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const todo = args.length
    ? SCENES.filter(
        (s) =>
          args.includes(s.id) || args.includes(s.id.replace('welcome-', '')),
      )
    : SCENES;
  if (!todo.length) {
    console.error(
      `No matching scenes. Available: ${SCENES.map((s) => s.id).join(', ')}`,
    );
    process.exit(1);
  }
  const client = new OpenAI();
  for (const scene of todo) await generateScene(client, scene);
  console.log(`[scenes] done → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('[scenes] failed:', err);
  process.exit(1);
});
