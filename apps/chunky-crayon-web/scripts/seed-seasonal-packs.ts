/**
 * Seed real coloring pages for each Seasonal Pack via the existing AI
 * pipeline (createColoringImage). Each generated page is tagged with
 * `seasonal-pack:{pack}` so `/api/tools/seasonal-pack` can query them.
 *
 * ─── 🚨 RUN-BEFORE CHECKLIST ────────────────────────────────────────
 * The route has a fallback that pulls existing gallery images by topic
 * tag (halloween, christmas, …) so the tool still works without this
 * script. Run this seed when you want CURATED, on-brand pages for a
 * promotional push:
 *
 *   • Halloween push       → seed by mid-September
 *   • Thanksgiving push    → seed by early November
 *   • Christmas push       → seed by mid-November
 *   • Valentine's push     → seed by mid-January
 *   • Easter push          → seed ~6 weeks before Easter Sunday
 *   • Back-to-school push  → seed by late July
 *
 * After dev seed:  run scripts/clone-seasonal-packs-to-prod.ts so prod
 * gets the same R2 assets without paying AI credits twice.
 * ────────────────────────────────────────────────────────────────────
 *
 * Safe to re-run — entries are skipped if a coloring image already
 * exists with the same `seasonal-pack:{pack}` + slug tags. Failed
 * generations are logged and skipped (the next run will retry them).
 *
 * Cost + time: ~50 images × ~30–60s each × one AI credit per image.
 * Budget 25–50 minutes of wall time and review your provider dashboard.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   npx tsx --env-file=.env.local scripts/seed-seasonal-packs.ts [pack]
 *
 *   # run one pack at a time:
 *   npx tsx --env-file=.env.local scripts/seed-seasonal-packs.ts halloween
 */
import { db, GenerationType } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { createColoringImage } from '@/app/actions/coloring-image';

type PackSlug =
  | 'halloween'
  | 'christmas'
  | 'valentine'
  | 'easter'
  | 'thanksgiving'
  | 'back-to-school';

type SeedEntry = {
  /** Stable short slug so we can dedupe across runs. */
  slug: string;
  /** Full generation prompt — fed to createColoringImage. */
  description: string;
  /** Extra gallery tags applied to the image for general SEO. */
  extraTags: string[];
};

const PACKS: Record<PackSlug, SeedEntry[]> = {
  halloween: [
    {
      slug: 'pumpkin',
      description:
        'A friendly smiling jack-o-lantern pumpkin with a happy face, triangle eyes and zig-zag smile, bold thick outlines, simple shapes, coloring page for ages 3-8, no shading',
      extraTags: ['halloween', 'pumpkin'],
    },
    {
      slug: 'ghost',
      description:
        'A cute friendly cartoon ghost floating with big round eyes and a smile, bold thick outlines, simple shapes, coloring page for ages 3-8',
      extraTags: ['halloween', 'ghost'],
    },
    {
      slug: 'bat',
      description:
        'A friendly cartoon bat with big round eyes and simple wings, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['halloween', 'bat'],
    },
    {
      slug: 'spider',
      description:
        'A happy cartoon spider hanging from a web, smiling, eight simple legs, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['halloween', 'spider'],
    },
    {
      slug: 'witch-hat',
      description:
        'A cute witch hat with a big buckle and a small star, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['halloween', 'witch'],
    },
    {
      slug: 'candy',
      description:
        'A pile of cartoon Halloween candy — wrapped sweets, a lollipop and a chocolate bar, bold thick outlines, simple shapes, coloring page for ages 3-8',
      extraTags: ['halloween', 'candy'],
    },
    {
      slug: 'haunted-house',
      description:
        'A friendly cartoon haunted house with a pumpkin at the door and a tiny ghost in the window, bold thick outlines, not scary, coloring page for ages 3-8',
      extraTags: ['halloween', 'house'],
    },
    {
      slug: 'black-cat',
      description:
        'A cute black cat sitting next to a small pumpkin, big eyes, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['halloween', 'cat'],
    },
  ],
  christmas: [
    {
      slug: 'christmas-tree',
      description:
        'A decorated cartoon Christmas tree with simple baubles, a star on top and presents underneath, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['christmas', 'holidays', 'tree'],
    },
    {
      slug: 'gift',
      description:
        'A single wrapped Christmas present with a big bow on top, bold thick outlines, simple shapes, coloring page for ages 3-8',
      extraTags: ['christmas', 'gift'],
    },
    {
      slug: 'candy-cane',
      description:
        'A pair of crossed candy canes with a bow in the middle, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['christmas', 'candy'],
    },
    {
      slug: 'snowman',
      description:
        'A happy cartoon snowman with a carrot nose, scarf, top hat and stick arms, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['christmas', 'winter', 'snowman'],
    },
    {
      slug: 'reindeer',
      description:
        'A cute cartoon reindeer with a big red nose and simple antlers, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['christmas', 'reindeer'],
    },
    {
      slug: 'santa',
      description:
        'A friendly cartoon Santa Claus with a big beard, hat and sack of presents, bold thick outlines, simple shapes, coloring page for ages 3-8',
      extraTags: ['christmas', 'santa'],
    },
    {
      slug: 'snowflake',
      description:
        'A single large decorative snowflake with simple branches and repeating shapes, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['christmas', 'winter', 'snowflake'],
    },
    {
      slug: 'stocking',
      description:
        'A Christmas stocking full of small toys and candy canes hanging from a simple line, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['christmas', 'stocking'],
    },
    {
      slug: 'gingerbread',
      description:
        'A smiling gingerbread man with icing buttons and a bow tie, bold thick outlines, simple shapes, coloring page for ages 3-8',
      extraTags: ['christmas', 'gingerbread'],
    },
    {
      slug: 'sleigh',
      description:
        'A simple sleigh filled with Christmas presents, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['christmas', 'sleigh'],
    },
  ],
  valentine: [
    {
      slug: 'heart',
      description:
        'A big heart surrounded by smaller hearts and little stars, bold thick outlines, simple shapes, coloring page for ages 3-8',
      extraTags: ['valentine', 'valentines-day', 'heart', 'love'],
    },
    {
      slug: 'love-letter',
      description:
        'An envelope with a heart seal and simple hearts floating around, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['valentine', 'valentines-day', 'love'],
    },
    {
      slug: 'bouquet',
      description:
        'A bouquet of simple cartoon flowers tied with a ribbon, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['valentine', 'valentines-day', 'flower'],
    },
    {
      slug: 'cupcake',
      description:
        'A cute heart-shaped cupcake with a cherry on top, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['valentine', 'valentines-day', 'cupcake'],
    },
    {
      slug: 'teddy-bear',
      description:
        'A friendly teddy bear holding a big heart, bold thick outlines, simple shapes, coloring page for ages 3-8',
      extraTags: ['valentine', 'valentines-day', 'bear'],
    },
    {
      slug: 'hearts-pattern',
      description:
        'A grid pattern of decorative hearts with different simple designs inside each, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['valentine', 'valentines-day', 'pattern'],
    },
  ],
  easter: [
    {
      slug: 'easter-egg',
      description:
        'A decorated Easter egg with simple zig-zag and dot patterns, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['easter', 'spring', 'egg'],
    },
    {
      slug: 'bunny',
      description:
        'A cute cartoon Easter bunny holding a basket with a painted egg, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['easter', 'spring', 'bunny', 'rabbit'],
    },
    {
      slug: 'chick',
      description:
        'A baby chick hatching out of an egg, big smile and wings, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['easter', 'spring', 'chick'],
    },
    {
      slug: 'easter-basket',
      description:
        'An Easter basket full of decorated eggs and a small bunny peeking out, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['easter', 'spring', 'basket'],
    },
    {
      slug: 'tulips',
      description:
        'Three tulips growing side by side with leaves and a sun in the sky, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['easter', 'spring', 'flower', 'tulip'],
    },
    {
      slug: 'carrot',
      description:
        'A smiling cartoon carrot with a leafy top, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['easter', 'spring', 'carrot'],
    },
    {
      slug: 'butterfly',
      description:
        'A cartoon butterfly with simple symmetric wing patterns, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['easter', 'spring', 'butterfly'],
    },
    {
      slug: 'lamb',
      description:
        'A friendly cartoon lamb with a fluffy body and a bell, bold thick outlines, simple shapes, coloring page for ages 3-8',
      extraTags: ['easter', 'spring', 'lamb'],
    },
  ],
  thanksgiving: [
    {
      slug: 'turkey',
      description:
        'A cartoon turkey with a big fanned tail of feathers, friendly face, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['thanksgiving', 'autumn', 'turkey'],
    },
    {
      slug: 'pumpkin-pie',
      description:
        'A whole pumpkin pie with a slice cut out and whipped cream on top, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['thanksgiving', 'autumn', 'pie'],
    },
    {
      slug: 'cornucopia',
      description:
        'A simple cornucopia horn with pumpkin, corn, apple and wheat spilling out, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['thanksgiving', 'autumn', 'cornucopia'],
    },
    {
      slug: 'fall-leaves',
      description:
        'A pile of autumn leaves in different simple shapes, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['thanksgiving', 'autumn', 'leaves', 'fall'],
    },
    {
      slug: 'corn-cob',
      description:
        'A smiling cartoon corn on the cob with a leafy wrap, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['thanksgiving', 'autumn', 'corn'],
    },
    {
      slug: 'pilgrim-hat',
      description:
        'A simple pilgrim hat with a buckle, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['thanksgiving', 'autumn', 'pilgrim'],
    },
    {
      slug: 'thanks-apple',
      description:
        'A big shiny apple with a single leaf, bold thick outlines, simple shapes, coloring page for ages 3-8',
      extraTags: ['thanksgiving', 'autumn', 'apple'],
    },
    {
      slug: 'wheat',
      description:
        'A bundle of wheat stalks tied with a ribbon, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['thanksgiving', 'autumn', 'wheat'],
    },
  ],
  'back-to-school': [
    {
      slug: 'backpack',
      description:
        'A kids backpack with pencils sticking out of the front pocket, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['school', 'back-to-school', 'backpack'],
    },
    {
      slug: 'pencil',
      description:
        'A single large pencil with a smiling face, bold thick outlines, simple shapes, coloring page for ages 3-8',
      extraTags: ['school', 'back-to-school', 'pencil'],
    },
    {
      slug: 'crayon-box',
      description:
        'A box of crayons with the crayons sticking up above the box, simple shapes, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['school', 'back-to-school', 'crayon'],
    },
    {
      slug: 'school-bus',
      description:
        'A smiling cartoon yellow school bus with simple windows, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['school', 'back-to-school', 'bus'],
    },
    {
      slug: 'apple-teacher',
      description:
        'A shiny apple sitting on a stack of books, with a single leaf on top, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['school', 'back-to-school', 'apple', 'teacher'],
    },
    {
      slug: 'books',
      description:
        'A stack of three friendly cartoon books, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['school', 'back-to-school', 'book'],
    },
    {
      slug: 'ruler-scissors',
      description:
        'A ruler and scissors crossed over each other on a piece of paper, bold thick outlines, simple shapes, coloring page for ages 3-8',
      extraTags: ['school', 'back-to-school', 'stationery'],
    },
    {
      slug: 'chalkboard',
      description:
        "A classroom chalkboard with 'Welcome Back!' written on it and a piece of chalk in the tray, bold thick outlines, coloring page for ages 3-8",
      extraTags: ['school', 'back-to-school', 'chalkboard'],
    },
    {
      slug: 'alphabet-blocks',
      description:
        'Three wooden alphabet blocks showing the letters A, B and C stacked on top of each other, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['school', 'back-to-school', 'alphabet'],
    },
    {
      slug: 'globe',
      description:
        'A classroom globe on a simple stand with the outlines of continents, bold thick outlines, coloring page for ages 3-8',
      extraTags: ['school', 'back-to-school', 'globe'],
    },
  ],
};

const isPackSlug = (s: string): s is PackSlug =>
  (Object.keys(PACKS) as string[]).includes(s);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const seedEntry = async (pack: PackSlug, entry: SeedEntry) => {
  const seasonalTag = `seasonal-pack:${pack}`;
  const slugTag = `seasonal-pack-slug:${entry.slug}`;

  // Dedupe on the slug tag — lets us safely re-run the script.
  const existing = await db.coloringImage.findFirst({
    where: {
      brand: BRAND,
      tags: { hasEvery: [seasonalTag, slugTag] },
    },
    select: { id: true },
  });
  if (existing) {
    console.log(`[skip] ${pack}/${entry.slug} already exists (${existing.id})`);
    return;
  }

  console.log(
    `[gen] ${pack}/${entry.slug} — ${entry.description.slice(0, 70)}…`,
  );
  const formData = new FormData();
  formData.set('description', entry.description);
  formData.set('generationType', GenerationType.DAILY);
  formData.set('locale', 'en');

  const result = await createColoringImage(formData);
  if ('error' in result) {
    console.error(`[fail] ${pack}/${entry.slug}: ${result.error}`);
    return;
  }
  if (!result.id) {
    console.error(`[fail] ${pack}/${entry.slug}: no id returned`);
    return;
  }

  // Merge seasonal tags into whatever the vision model generated so the
  // image stays discoverable via the existing gallery tag pages too.
  const current = await db.coloringImage.findUnique({
    where: { id: result.id },
    select: { tags: true },
  });
  const merged = Array.from(
    new Set([
      ...(current?.tags ?? []),
      seasonalTag,
      slugTag,
      ...entry.extraTags,
    ]),
  );
  await db.coloringImage.update({
    where: { id: result.id },
    data: { tags: merged },
  });
  console.log(
    `[ok]   ${pack}/${entry.slug} → ${result.id} (${merged.length} tags)`,
  );
};

const main = async () => {
  const arg = process.argv[2];
  const packsToRun: PackSlug[] =
    arg && isPackSlug(arg) ? [arg] : (Object.keys(PACKS) as PackSlug[]);

  console.log(
    `[seed-seasonal-packs] generating for packs: ${packsToRun.join(', ')}`,
  );
  for (const pack of packsToRun) {
    const entries = PACKS[pack];
    console.log(`\n=== ${pack} (${entries.length} entries) ===`);
    for (const entry of entries) {
      try {
        await seedEntry(pack, entry);
      } catch (err) {
        console.error(
          `[fatal] ${pack}/${entry.slug}:`,
          err instanceof Error ? err.message : err,
        );
      }
      // Small pause so we don't hammer the AI provider / DB in tight
      // succession — each generation already takes ~30s internally.
      await sleep(1000);
    }
  }

  console.log('\n[seed-seasonal-packs] done');
  process.exit(0);
};

main().catch((err) => {
  console.error('[seed-seasonal-packs] fatal:', err);
  process.exit(1);
});
