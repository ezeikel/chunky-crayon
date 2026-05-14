/**
 * Programmatic-SEO combo pages — one indexable page per
 * (theme? × age × occasion-or-context) combination.
 *
 * Sibling of LANDING_PAGES but expressed as a structured combo rather
 * than a free-form landing config. This keeps the matrix understandable
 * (theme/age/occasion vs ad-hoc tag bag) and lets the backfill script
 * derive image prompts from the combo dimensions.
 *
 * Route: /coloring-pages-for/[slug].
 *
 * Growth rule: never publish a combo with <6 existing tagged images. Use
 * `scripts/backfill-combo-pages.ts` to top up before adding to this array.
 */

import { Difficulty } from '@one-colored-pixel/db';
import type { AgeBracket, SpecificAge } from './age-brackets';

export type ComboGroup = 'age' | 'occasion' | 'context';

export type ComboPage = {
  /** URL segment: /coloring-pages-for/{slug}. */
  slug: string;

  /** Which growth group this combo belongs to. Used for grouping in admin + sitemap priority hints. */
  group: ComboGroup;

  /** Optional theme. Omit for cross-theme combos like 'rainy-days'. */
  categorySlug?: string;

  /** Optional broad age bracket. */
  ageBracket?: AgeBracket;

  /** Optional specific age (e.g. 5 for "for 5 year olds"). Mutually informative with ageBracket — both can be set when a combo targets one age inside a bracket. */
  specificAge?: SpecificAge;

  /** Optional occasion slug. Matches HOLIDAY_EVENTS.slug. */
  occasionSlug?: string;

  /** Optional craft-context slug. Matches CRAFT_CONTEXTS.slug. */
  contextSlug?: string;

  /** Difficulty for content filtering. Usually derived from age. */
  difficulty?: Difficulty;

  /** Tags AND-intersected on top of theme. Source from HOLIDAY_EVENTS or CRAFT_CONTEXTS. */
  extraTagsAny?: string[];

  /** <title>. Pattern: "[Adjective] [Theme] Coloring Pages [Audience] - Free Printable | Chunky Crayon". */
  title: string;

  /** Meta description shown in SERPs. 150-160 chars. No em dashes. */
  description: string;

  /** H1. Distinct from <title> to avoid duplication signal. */
  h1: string;

  /** One-line subtext under the H1. */
  tagline: string;

  /** Opening paragraph above the gallery. Hand-written, voice-on. */
  intro: string;

  /** Optional "why this fits this age/context" block. */
  whyItHelps?: string;

  /** 4-8 questions for FAQPage JSON-LD + visible FAQ section. */
  faqs: { q: string; a: string }[];

  /** Keyword cluster — used as supporting H2/H3 phrases and in metadata keywords. */
  keywords: string[];

  /** 4-6 sibling combo slugs for the related-combos chip block. */
  relatedComboSlugs?: string[];
};

/**
 * V0 starter set. Final 30-50 list comes after running
 * `scripts/research-combo-keywords.ts` + GSC cross-check.
 *
 * These 8 combos span all three groups so the route can be verified
 * end-to-end without a full keyword research pass. Each combo MUST pass
 * the ≥6-image gate before its commit lands on main.
 */
export const COMBO_PAGES: ComboPage[] = [
  // --- Age group ---
  {
    slug: 'unicorn-coloring-pages-for-5-year-olds',
    group: 'age',
    categorySlug: 'unicorns',
    ageBracket: 'for-kids',
    specificAge: 5,
    difficulty: Difficulty.INTERMEDIATE,
    title:
      'Unicorn Coloring Pages for 5 Year Olds - Free Printable | Chunky Crayon',
    description:
      'Free unicorn coloring pages picked for 5 year olds. Bold lines, easy shapes, and a touch of sparkle. Print at home or color online in seconds.',
    h1: 'Unicorn Coloring Pages for 5 Year Olds',
    tagline:
      'Bold lines, big smiles, and just enough sparkle for the kindergarten crowd.',
    intro:
      "Five is the year colouring stops being a wild scribble and starts looking like a unicorn (mostly). We've picked the friendliest, biggest-lined unicorn pages from our gallery so the only thing your five-year-old has to argue about is whether the horn should be rainbow or just regular rainbow.",
    whyItHelps:
      'At five, kids can grip a crayon for longer, name colors confidently, and stay inside the lines roughly 60% of the time (which, around here, counts as a win). These pages are tuned to that sweet spot: clear shapes, room to scribble, and enough magic to keep them at the table.',
    faqs: [
      {
        q: 'Are these unicorn coloring pages really free?',
        a: "Yes. Every page is free to print or color online. We never paywall the gallery, and there's no email wall before the download.",
      },
      {
        q: 'Will my 5 year old be able to color these on their own?',
        a: 'These pages use thick outlines and big shapes on purpose so a five-year-old can color them solo. Tighter detail pages (better suited to 7+) live on our 7 year olds page.',
      },
      {
        q: 'Can I print these or only color online?',
        a: 'Both. Click any unicorn, then choose Print to grab a PDF or Color Online to paint right in the browser.',
      },
      {
        q: 'How many unicorn coloring pages do you have?',
        a: 'We add new unicorn pages every week and currently have dozens in the gallery, with new ones arriving from the daily picture stream.',
      },
    ],
    keywords: [
      'unicorn coloring pages for 5 year olds',
      'free unicorn coloring pages kindergarten',
      'easy unicorn coloring pages',
      'printable unicorn pages for kids',
    ],
    relatedComboSlugs: [
      'unicorn-coloring-pages-for-6-year-olds',
      'unicorn-coloring-pages-for-7-year-olds',
      'dinosaur-coloring-pages-for-5-year-olds',
    ],
  },
  {
    slug: 'unicorn-coloring-pages-for-6-year-olds',
    group: 'age',
    categorySlug: 'unicorns',
    ageBracket: 'for-kids',
    specificAge: 6,
    difficulty: Difficulty.INTERMEDIATE,
    title:
      'Unicorn Coloring Pages for 6 Year Olds - Free Printable | Chunky Crayon',
    description:
      'Free unicorn coloring pages for 6 year olds. Slightly more detail, still kindergarten-friendly. Print or color online with one click.',
    h1: 'Unicorn Coloring Pages for 6 Year Olds',
    tagline: 'A little more detail for the freshly-six crowd.',
    intro:
      "Six is when 'inside the lines' becomes a personal challenge. We've picked unicorn pages with a step up in detail from our 5 year olds set, the kind that reward concentration without crossing into 'why won't this come out right' territory.",
    faqs: [
      {
        q: "What's different about the 6-year-olds set vs the 5-year-olds one?",
        a: 'Slightly finer outlines, a few more elements per page (flowers, clouds, sparkles), and trickier curves. Still very printable, still very forgiving.',
      },
      {
        q: 'Can I print multiple pages at once?',
        a: "Yes. Each page has its own Print button, and you can stack as many tabs as you'd like before sending them to the printer.",
      },
      {
        q: 'Are these good for a 6th birthday party?',
        a: 'Lay a stack of these on the activity table with crayons and your party hosts itself. The bigger detail level keeps six-year-olds engaged for a real chunk of time.',
      },
      {
        q: 'Do you have new pages every week?',
        a: 'A new coloring page goes live every day, automatically. The unicorn ones that land in this age range filter into this gallery within a day.',
      },
    ],
    keywords: [
      'unicorn coloring pages for 6 year olds',
      'free unicorn pages first grade',
      'unicorn coloring sheets year 1',
    ],
    relatedComboSlugs: [
      'unicorn-coloring-pages-for-5-year-olds',
      'unicorn-coloring-pages-for-7-year-olds',
      'dinosaur-coloring-pages-for-6-year-olds',
    ],
  },

  // --- Occasion group ---
  {
    slug: 'christmas-unicorn-coloring-pages',
    group: 'occasion',
    categorySlug: 'unicorns',
    occasionSlug: 'christmas',
    extraTagsAny: ['christmas', 'santa'],
    title: 'Christmas Unicorn Coloring Pages - Free Printable | Chunky Crayon',
    description:
      'Free Christmas unicorn coloring pages. Santa hats, twinkly hooves, snowy meadows. Print or color online before the cookies run out.',
    h1: 'Christmas Unicorn Coloring Pages',
    tagline:
      'Two reasons to color: unicorns, and the looming threat of being asked to wrap presents.',
    intro:
      "What if Santa rode a unicorn? Loud answer: he should, and he probably does on Tuesdays. We've collected our most festive unicorn pages so the kids have something to do between cookie batches.",
    whyItHelps:
      "Christmas afternoons need quiet activities that don't require batteries. These pages do the job, and your living room floor stays mercifully Lego-free for thirty whole minutes.",
    faqs: [
      {
        q: 'Are these ready to print for Christmas morning?',
        a: 'Yes. Each page is print-ready as a PDF, no setup required. Print a stack the night before and tuck them in stockings.',
      },
      {
        q: 'Can kids color these online without a printer?',
        a: 'Yes. Click Color Online on any page to fill it in with our brush tools, no app or download needed.',
      },
      {
        q: 'Are there other Christmas themes besides unicorns?',
        a: 'Our main Christmas gallery has dinosaurs, animals, princesses, and more, all dressed up for the holidays.',
      },
      {
        q: 'When do new Christmas pages get added?',
        a: 'Through November and December our daily picture skews festive, so new Christmas unicorn pages land regularly in the weeks leading up to the big day.',
      },
    ],
    keywords: [
      'christmas unicorn coloring pages',
      'free christmas unicorn printables',
      'holiday unicorn coloring sheets',
    ],
    relatedComboSlugs: [
      'unicorn-coloring-pages-for-5-year-olds',
      'christmas-dinosaur-coloring-pages',
    ],
  },
  {
    slug: 'christmas-dinosaur-coloring-pages',
    group: 'occasion',
    categorySlug: 'dinosaurs',
    occasionSlug: 'christmas',
    extraTagsAny: ['christmas', 'santa'],
    title: 'Christmas Dinosaur Coloring Pages - Free Printable | Chunky Crayon',
    description:
      'Free Christmas dinosaur coloring pages. T-Rex in a Santa hat, triceratops with baubles, the whole prehistoric Christmas crew. Print or color online.',
    h1: 'Christmas Dinosaur Coloring Pages',
    tagline:
      'Because the only thing better than a dinosaur is a dinosaur wearing a Santa hat.',
    intro:
      'If your kid spent the year wearing the same dinosaur t-shirt, this page is for them. Festive prehistoric coloring pages, sized for crayons and short attention spans alike.',
    faqs: [
      {
        q: 'Do you have T-Rex Santa pages specifically?',
        a: 'Yes, T-Rex in a Santa hat is one of our most-printed dinosaur Christmas pages every December.',
      },
      {
        q: 'Can my 4 year old handle these?',
        a: 'Most can. The dinosaur outlines are chunky enough for small hands. For trickier scenes, our toddler dinosaur gallery has even simpler shapes.',
      },
      {
        q: 'Are these good for a classroom holiday party?',
        a: 'Teachers print these in bulk every December. Each page is a single PDF, easy to send to a copier.',
      },
      {
        q: 'How many Christmas dinosaur pages do you have?',
        a: 'We have a growing collection that expands every Christmas season as the daily picture rotates through festive prehistoric scenes.',
      },
    ],
    keywords: [
      'christmas dinosaur coloring pages',
      'free christmas dinosaur printables',
      'santa dinosaur coloring pages',
    ],
    relatedComboSlugs: [
      'christmas-unicorn-coloring-pages',
      'dinosaur-coloring-pages-for-5-year-olds',
    ],
  },

  // --- Craft context group ---
  {
    slug: 'coloring-pages-for-rainy-days',
    group: 'context',
    contextSlug: 'rainy-days',
    extraTagsAny: ['rainy-day', 'indoor', 'quiet-activity'],
    title: 'Coloring Pages for Rainy Days - 50+ Free Printable | Chunky Crayon',
    description:
      'Free coloring pages for rainy days. Indoor-friendly themes, big enough sets to fill a whole afternoon. Print or color online without leaving the couch.',
    h1: 'Coloring Pages for Rainy Days',
    tagline: "Stuck inside, again. Here are 50 reasons that's actually fine.",
    intro:
      "Rainy days run on three things: snacks, screens, and something quiet between the two. We've pulled together a deep stack of coloring pages built for exactly this: enough variety to ride out the storm, low enough effort that nobody has to dig out the craft cupboard.",
    whyItHelps:
      "A rainy afternoon with crayons is one of those rare activities that costs nothing, makes no mess (almost), and ends with a fridge worth of new art. We're biased, but the math checks out.",
    faqs: [
      {
        q: 'How many coloring pages can I find here?',
        a: 'Hundreds across the gallery. This page surfaces the ones most parents reach for when the weather kills outdoor plans.',
      },
      {
        q: 'Do I need to register or pay?',
        a: 'No. Print or color online without an account.',
      },
      {
        q: "What's the best age for these?",
        a: "We have pages from toddler-simple to detailed-enough-for-tweens. If you know the kid's age, our age-specific pages give you a sharper match.",
      },
      {
        q: 'Can my kid color these on a tablet?',
        a: 'Yes. The Color Online tool works on iPads and most tablets. No app install needed.',
      },
    ],
    keywords: [
      'coloring pages for rainy days',
      'indoor coloring activities for kids',
      'rainy day printables',
      'quiet activities for kids',
    ],
    relatedComboSlugs: [
      'coloring-pages-for-classroom',
      'coloring-pages-for-road-trips',
    ],
  },
  {
    slug: 'coloring-pages-for-classroom',
    group: 'context',
    contextSlug: 'classroom',
    // Dropped 'group-activity' — also matched birthday-party scenes
    // (kids round a cake, balloons, party hats). 'classroom' + 'school'
    // is narrower and matches what teachers actually want here.
    extraTagsAny: ['classroom', 'school'],
    title: 'Coloring Pages for the Classroom - Free Printable | Chunky Crayon',
    description:
      'Free coloring pages for teachers. Print-friendly PDFs, bulk-friendly templates, kid-tested designs. Use them as morning work, transitions, or rainy-day backup.',
    h1: 'Coloring Pages for the Classroom',
    tagline: 'Teacher-tested coloring pages. Not just busy work, we promise.',
    intro:
      'These are the pages teachers print in stacks. We pick designs that work for the whole class (no one wants a fight over the only good unicorn), print cleanly in black and white, and stay quiet enough for transition time but interesting enough that kids actually finish them.',
    faqs: [
      {
        q: 'Can I use these in my classroom for free?',
        a: 'Yes, for non-commercial classroom use. Print as many copies as you need.',
      },
      {
        q: 'Do they print well in black and white?',
        a: 'Every page is designed to print cleanly in B&W on standard copier paper. No fancy printers required.',
      },
      {
        q: 'Are there age-specific options?',
        a: 'Yes. Pair this page with our age-specific galleries (5 year olds, 6 year olds, etc.) to match your grade level.',
      },
      {
        q: 'Can I bulk download?',
        a: "Each page downloads as a single PDF. We don't have a one-click bulk zip yet, but you can right-click to save each.",
      },
    ],
    keywords: [
      'coloring pages for classroom',
      'teacher printable coloring pages',
      'school coloring activities',
      'bulk printable coloring pages',
    ],
    relatedComboSlugs: [
      'coloring-pages-for-rainy-days',
      'coloring-pages-for-birthday-parties',
    ],
  },
  {
    slug: 'coloring-pages-for-birthday-parties',
    group: 'context',
    contextSlug: 'birthday-parties',
    extraTagsAny: ['birthday', 'party', 'group-activity'],
    title:
      'Coloring Pages for Birthday Parties - Free Printable | Chunky Crayon',
    description:
      'Free birthday party coloring pages. Activity table favorites, goodie-bag fillers, calm-down corner pages. Print, fold, party.',
    h1: 'Coloring Pages for Birthday Parties',
    tagline: 'The activity table just got carried.',
    intro:
      'Three things every birthday party needs: cake, a chaos contingency plan, and something for the kids who finish musical chairs first. These pages cover the third one. Print a stack, scatter them on a table, watch the room calm down by 20%.',
    faqs: [
      {
        q: 'How many pages should I print for a 10-kid party?',
        a: "Three per kid is the sweet spot: one for the activity table, one for the goodie bag, and one spare for the inevitable 'mine got ripped'.",
      },
      {
        q: 'Do you have theme-matching options (unicorn party, dinosaur party)?',
        a: 'Yes. Pair this page with our theme galleries (unicorns, dinosaurs, princesses, superheroes) to match the party.',
      },
      {
        q: 'Can I print on cardstock?',
        a: 'Yes, they print great on cardstock if you want activity-table-grade durability.',
      },
      {
        q: 'Is there a personalized birthday option?',
        a: 'Our Birthday Invite freebie generator handles personalization for invites. The coloring pages themselves are generic so any kid can color them.',
      },
    ],
    keywords: [
      'coloring pages for birthday parties',
      'birthday party printables',
      'party activity table pages',
      'kids party coloring sheets',
    ],
    relatedComboSlugs: [
      'coloring-pages-for-classroom',
      'coloring-pages-for-rainy-days',
    ],
  },

  // ===== Phase 1 expansion (Nov 2026) =====
  // Picked from Perplexity research output in scripts/research-combo-keywords.ts.
  // Age combos limited to ages 3-6 (preschool/early-elementary, highest volume
  // per research). Occasion combos prioritise top-10 christmas/halloween/easter
  // combos. Two extra contexts (summer-camp, road-trips) round out the set.

  // --- Age expansion ---
  {
    slug: 'unicorn-coloring-pages-for-3-year-olds',
    group: 'age',
    categorySlug: 'unicorns',
    ageBracket: 'for-toddlers',
    specificAge: 3,
    difficulty: Difficulty.BEGINNER,
    title:
      'Unicorn Coloring Pages for 3 Year Olds - Free Printable | Chunky Crayon',
    description:
      'Free unicorn coloring pages for 3 year olds. Big chunky shapes, simple horn, room for scribbles. Print at home or color online.',
    h1: 'Unicorn Coloring Pages for 3 Year Olds',
    tagline: 'Big shapes, no expectations, all the rainbow you can handle.',
    intro:
      'Three is the year colouring is mostly scribbling and that is genuinely fine. Our 3 year olds set keeps the shapes huge, the horn one big triangle, and the manes simple enough that a confident toddler can fill them in with two colours and call it a masterpiece.',
    faqs: [
      {
        q: 'Are these easy enough for a 3 year old?',
        a: 'Yes. We picked the chunkiest, most forgiving unicorn outlines from our gallery. No tiny shapes, no thin lines, no eyelashes to worry about.',
      },
      {
        q: 'Will they finish a whole page?',
        a: 'Three year olds typically pick a favourite shape, colour it, and decide they are done. That counts. The rest of the page can wait for tomorrow.',
      },
      {
        q: 'Can my toddler color these on a tablet?',
        a: 'Yes. The Color Online tool works on iPads with a finger or a stylus.',
      },
      {
        q: 'How many pages are there?',
        a: 'We add new unicorn pages every week. The gallery grows automatically as the daily picture rotates through unicorn themes.',
      },
    ],
    keywords: [
      'unicorn coloring pages for 3 year olds',
      'easy unicorn coloring for toddlers',
      'simple unicorn printable',
    ],
    relatedComboSlugs: [
      'unicorn-coloring-pages-for-4-year-olds',
      'unicorn-coloring-pages-for-5-year-olds',
      'dinosaur-coloring-pages-for-3-year-olds',
    ],
  },
  {
    slug: 'unicorn-coloring-pages-for-4-year-olds',
    group: 'age',
    categorySlug: 'unicorns',
    ageBracket: 'for-toddlers',
    specificAge: 4,
    difficulty: Difficulty.BEGINNER,
    title:
      'Unicorn Coloring Pages for 4 Year Olds - Free Printable | Chunky Crayon',
    description:
      'Free unicorn coloring pages for 4 year olds. Bold lines, friendly faces, a touch of detail without crossing into "frustrating".',
    h1: 'Unicorn Coloring Pages for 4 Year Olds',
    tagline:
      'Friendly faces, big rainbows, and one (1) star they can almost stay inside.',
    intro:
      'Four is when most kids realise crayons have a pointy end and the pointy end matters. Our 4 year olds unicorn pages are tuned to that emerging precision: cleaner outlines than the 3 year olds set, with just enough detail (a flower, a star, a sparkle) to reward the effort.',
    faqs: [
      {
        q: 'What is different from the 3 year olds set?',
        a: 'Slightly finer outlines, a small accessory or two on the unicorn (flower, bow, cloud), and shapes that reward staying inside the lines without punishing the kids who do not.',
      },
      {
        q: 'Are these good for pre-K?',
        a: 'Yes. Teachers print these in stacks for quiet time at pre-K and reception classes.',
      },
      {
        q: 'Can I print multiple pages at once?',
        a: 'Yes. Open each page in its own tab and print them as a batch.',
      },
      {
        q: 'Do you have unicorn pages for older kids too?',
        a: 'Yes. We have 5, 6, 7 and 8 year olds sets with progressively more detail.',
      },
    ],
    keywords: [
      'unicorn coloring pages for 4 year olds',
      'unicorn coloring for preschool',
      'pre-k unicorn printable',
    ],
    relatedComboSlugs: [
      'unicorn-coloring-pages-for-3-year-olds',
      'unicorn-coloring-pages-for-5-year-olds',
      'dinosaur-coloring-pages-for-4-year-olds',
    ],
  },
  {
    slug: 'dinosaur-coloring-pages-for-3-year-olds',
    group: 'age',
    categorySlug: 'dinosaurs',
    ageBracket: 'for-toddlers',
    specificAge: 3,
    difficulty: Difficulty.BEGINNER,
    title:
      'Dinosaur Coloring Pages for 3 Year Olds - Free Printable | Chunky Crayon',
    description:
      'Free dinosaur coloring pages for 3 year olds. Chunky T-Rex, friendly faces, no scary teeth. Print or color online.',
    h1: 'Dinosaur Coloring Pages for 3 Year Olds',
    tagline:
      'Big friendly dinosaurs, sized for crayons that get held in the whole fist.',
    intro:
      'Three year olds love dinosaurs and three year olds also love scribbling outside the lines. We picked the chunkiest, friendliest dinosaurs from our gallery so neither side wins and everyone has a good time. No scary teeth, no fine detail, just shapes a toddler can fill in.',
    faqs: [
      {
        q: 'Are these scary?',
        a: 'No. We picked friendly cartoon dinosaurs only. Big eyes, soft expressions, no fangs.',
      },
      {
        q: 'Will my toddler need help?',
        a: 'Honestly, no. These are designed to be coloured solo. The reward is the colours they pick, not the staying-inside-the-lines.',
      },
      {
        q: 'Print or color online — which works better for this age?',
        a: 'Print, usually. Three year olds love the physical crayon-on-paper part. Online tools are great too, especially on a tablet.',
      },
      {
        q: 'Do you have a T-Rex specifically?',
        a: 'Yes. The gallery includes T-Rex, Triceratops, Brachiosaurus, Stegosaurus and more, all in the toddler-friendly style.',
      },
    ],
    keywords: [
      'dinosaur coloring pages for 3 year olds',
      'easy dinosaur coloring for toddlers',
      'simple t-rex printable',
    ],
    relatedComboSlugs: [
      'dinosaur-coloring-pages-for-4-year-olds',
      'dinosaur-coloring-pages-for-5-year-olds',
      'unicorn-coloring-pages-for-3-year-olds',
    ],
  },
  {
    slug: 'dinosaur-coloring-pages-for-4-year-olds',
    group: 'age',
    categorySlug: 'dinosaurs',
    ageBracket: 'for-toddlers',
    specificAge: 4,
    difficulty: Difficulty.BEGINNER,
    title:
      'Dinosaur Coloring Pages for 4 Year Olds - Free Printable | Chunky Crayon',
    description:
      'Free dinosaur coloring pages for 4 year olds. T-Rex, triceratops, the whole gang in friendly cartoon form. Print or color online.',
    h1: 'Dinosaur Coloring Pages for 4 Year Olds',
    tagline: 'The dinosaur years arrive on schedule. We are ready.',
    intro:
      "If your 4 year old has informed you that they are now a paleontologist, this is the page for them. We picked friendly cartoon dinosaurs with a step up in detail from the 3 year olds set, the kind that reward concentration without crossing into 'too fiddly for me right now'.",
    faqs: [
      {
        q: 'My 4 year old has favorite dinosaurs. Do you have specific ones?',
        a: 'Yes. T-Rex, Triceratops, Brachiosaurus, Stegosaurus, Velociraptor and Pterodactyl all appear regularly in the gallery.',
      },
      {
        q: 'Are the dinosaurs realistic or cartoon?',
        a: 'Cartoon, always, for this age. We pick designs that look friendly and inviting, not scientifically accurate.',
      },
      {
        q: 'Can I print on cardstock?',
        a: 'Yes. Cardstock makes them more durable for repeated colouring or display on the fridge.',
      },
      {
        q: 'How many dinosaur pages do you have?',
        a: 'Dozens, with new ones added every week as the daily picture rotates through prehistoric themes.',
      },
    ],
    keywords: [
      'dinosaur coloring pages for 4 year olds',
      'preschool dinosaur coloring',
      'pre-k dinosaur printable',
    ],
    relatedComboSlugs: [
      'dinosaur-coloring-pages-for-3-year-olds',
      'dinosaur-coloring-pages-for-5-year-olds',
      'unicorn-coloring-pages-for-4-year-olds',
    ],
  },
  {
    slug: 'dinosaur-coloring-pages-for-5-year-olds',
    group: 'age',
    categorySlug: 'dinosaurs',
    ageBracket: 'for-kids',
    specificAge: 5,
    difficulty: Difficulty.INTERMEDIATE,
    title:
      'Dinosaur Coloring Pages for 5 Year Olds - Free Printable | Chunky Crayon',
    description:
      'Free dinosaur coloring pages for 5 year olds. Kindergarten-ready scenes with T-Rex, triceratops, and prehistoric landscapes.',
    h1: 'Dinosaur Coloring Pages for 5 Year Olds',
    tagline: 'Kindergarten meets the Cretaceous. Everyone wins.',
    intro:
      'Five is the dinosaur sweet spot: old enough to know the names, young enough to still think the long-necked one is the best one. We picked our most kindergarten-ready dinosaur scenes, with backgrounds (volcanoes, jungles, a friendly meteor or two) that give kids more to colour without overwhelming them.',
    faqs: [
      {
        q: 'Are these harder than the toddler set?',
        a: 'Yes, slightly. The scenes now include backgrounds and small details (leaves, rocks, eggs) that give 5 year olds more to work with.',
      },
      {
        q: 'Will my 5 year old finish a whole scene?',
        a: 'Most do, eventually. These are designed for two or three sittings rather than one quick session.',
      },
      {
        q: 'Are they good for school?',
        a: 'Yes. Teachers print these for quiet time and dinosaur-themed lesson units.',
      },
      {
        q: 'Where can I find more advanced dinosaur pages?',
        a: 'Our 7 year olds and 9 year olds dinosaur sets have finer detail and more complex scenes.',
      },
    ],
    keywords: [
      'dinosaur coloring pages for 5 year olds',
      'kindergarten dinosaur printable',
      'free t-rex coloring kindergarten',
    ],
    relatedComboSlugs: [
      'dinosaur-coloring-pages-for-4-year-olds',
      'dinosaur-coloring-pages-for-6-year-olds',
      'unicorn-coloring-pages-for-5-year-olds',
    ],
  },
  {
    slug: 'dinosaur-coloring-pages-for-6-year-olds',
    group: 'age',
    categorySlug: 'dinosaurs',
    ageBracket: 'for-kids',
    specificAge: 6,
    difficulty: Difficulty.INTERMEDIATE,
    title:
      'Dinosaur Coloring Pages for 6 Year Olds - Free Printable | Chunky Crayon',
    description:
      'Free dinosaur coloring pages for 6 year olds. Detailed scenes, named species, the whole prehistoric crew. Print or color online.',
    h1: 'Dinosaur Coloring Pages for 6 Year Olds',
    tagline: 'For the kid who will correct you on Stegosaurus pronunciation.',
    intro:
      'Six year olds care about getting the dinosaur right. We picked scenes with clearer species identification (the Stegosaurus actually has the plates, the Triceratops has all three horns) and enough detail to keep a first-grader busy for a real chunk of time.',
    faqs: [
      {
        q: 'Are the dinosaurs accurate?',
        a: 'Accurate-ish. We aim for recognisable species (T-Rex, Triceratops, Stegosaurus, etc.) drawn in a friendly cartoon style. Not paleontology-textbook accurate, but enough to satisfy a 6 year old.',
      },
      {
        q: 'What is different from the 5 year olds set?',
        a: 'Finer detail, more elements per scene (rocks, plants, eggs, volcanoes), and trickier curves. Still very printable, still very forgiving.',
      },
      {
        q: 'Do you have a dinosaur scene with multiple species?',
        a: 'Yes. The gallery includes multi-dinosaur scenes alongside single-character portraits.',
      },
      {
        q: 'Are these good for a dinosaur birthday party?',
        a: 'Yes. Lay a stack on the activity table with crayons and the party hosts itself for thirty solid minutes.',
      },
    ],
    keywords: [
      'dinosaur coloring pages for 6 year olds',
      'first grade dinosaur printable',
      'year 1 dinosaur coloring',
    ],
    relatedComboSlugs: [
      'dinosaur-coloring-pages-for-5-year-olds',
      'unicorn-coloring-pages-for-6-year-olds',
      'christmas-dinosaur-coloring-pages',
    ],
  },
  {
    slug: 'animal-coloring-pages-for-3-year-olds',
    group: 'age',
    categorySlug: 'animals',
    ageBracket: 'for-toddlers',
    specificAge: 3,
    difficulty: Difficulty.BEGINNER,
    title:
      'Animal Coloring Pages for 3 Year Olds - Free Printable | Chunky Crayon',
    description:
      'Free animal coloring pages for 3 year olds. Friendly farm and zoo animals with big shapes and bold outlines.',
    h1: 'Animal Coloring Pages for 3 Year Olds',
    tagline: 'Farm, zoo, jungle. All friendly, all forgiving.',
    intro:
      'Three year olds love naming animals almost as much as they love colouring them in the wrong colour. We picked friendly farm and zoo animals from the gallery, with shapes chunky enough for a toddler grip and outlines bold enough to survive enthusiastic scribbling.',
    faqs: [
      {
        q: 'What animals are in this set?',
        a: 'Dogs, cats, cows, pigs, sheep, lions, elephants, giraffes, monkeys, fish and more. Friendly cartoon versions, no scary ones.',
      },
      {
        q: 'Is my 3 year old too young for these?',
        a: 'No. These are picked specifically for this age. Big shapes, bold lines, no tiny detail to frustrate them.',
      },
      {
        q: 'Can my toddler color on a phone?',
        a: 'It works on a phone, but a tablet or printed page is much easier for small hands.',
      },
      {
        q: 'Do you have farm animals specifically?',
        a: 'Yes. The gallery includes a steady rotation of farm, jungle, zoo, ocean, and forest animals.',
      },
    ],
    keywords: [
      'animal coloring pages for 3 year olds',
      'easy animal coloring for toddlers',
      'simple farm animal printable',
    ],
    relatedComboSlugs: [
      'animal-coloring-pages-for-5-year-olds',
      'unicorn-coloring-pages-for-3-year-olds',
      'dinosaur-coloring-pages-for-3-year-olds',
    ],
  },
  {
    slug: 'animal-coloring-pages-for-5-year-olds',
    group: 'age',
    categorySlug: 'animals',
    ageBracket: 'for-kids',
    specificAge: 5,
    difficulty: Difficulty.INTERMEDIATE,
    title:
      'Animal Coloring Pages for 5 Year Olds - Free Printable | Chunky Crayon',
    description:
      'Free animal coloring pages for 5 year olds. Farm, jungle, zoo, ocean. Print or color online.',
    h1: 'Animal Coloring Pages for 5 Year Olds',
    tagline: 'The age where they correctly identify the platypus.',
    intro:
      'Five year olds know more animals than they can spell, which is a high bar. We picked scenes with named species (toucan, narwhal, hedgehog) and enough background detail (jungle leaves, ocean bubbles, farm fences) to keep them engaged.',
    faqs: [
      {
        q: 'Do you have specific habitats?',
        a: 'Yes. The gallery includes farm, jungle, zoo, ocean, arctic, forest and desert scenes, all in the kindergarten-friendly style.',
      },
      {
        q: 'Are the animals realistic?',
        a: 'Realistic-ish — recognisable as the species, drawn friendly. Not photo-accurate.',
      },
      {
        q: 'How many animal pages are there?',
        a: 'Dozens, growing weekly as the daily picture rotates through animal themes.',
      },
      {
        q: 'Are these good for an animal-themed party?',
        a: 'Yes. Print a stack and theme the activity table to a habitat (jungle, farm, ocean).',
      },
    ],
    keywords: [
      'animal coloring pages for 5 year olds',
      'kindergarten animal printable',
      'farm zoo animal coloring',
    ],
    relatedComboSlugs: [
      'animal-coloring-pages-for-3-year-olds',
      'dinosaur-coloring-pages-for-5-year-olds',
      'unicorn-coloring-pages-for-5-year-olds',
    ],
  },

  // --- Occasion expansion ---
  {
    slug: 'christmas-animal-coloring-pages',
    group: 'occasion',
    categorySlug: 'animals',
    occasionSlug: 'christmas',
    extraTagsAny: ['christmas', 'santa'],
    title: 'Christmas Animal Coloring Pages - Free Printable | Chunky Crayon',
    description:
      'Free Christmas animal coloring pages. Reindeer, polar bears, robins, foxes in the snow. Print or color online before the cocoa runs out.',
    h1: 'Christmas Animal Coloring Pages',
    tagline: 'Reindeer, robins, and one (1) very festive raccoon.',
    intro:
      'Animals plus Christmas is the rare crossover that works for every kid in the house. We picked our most festive animal scenes from the gallery: reindeer at the North Pole, polar bears with cocoa, robins on snowy branches, the works.',
    faqs: [
      {
        q: 'Are the reindeer different from regular deer?',
        a: 'Yes. The Christmas set features reindeer with antlers, bells, sometimes Santa hats. Regular deer live in our main animals gallery.',
      },
      {
        q: 'Can my child color these online?',
        a: 'Yes. Every page works in our Color Online tool with no app install.',
      },
      {
        q: 'Are these good for a Christmas card project?',
        a: 'Yes. Print on cardstock, fold in half, and you have a card-ready coloring activity.',
      },
      {
        q: 'When do new Christmas animal pages get added?',
        a: 'November and December the daily picture skews festive, so new Christmas animal pages land regularly through the holiday season.',
      },
    ],
    keywords: [
      'christmas animal coloring pages',
      'free christmas animal printables',
      'reindeer coloring pages',
      'polar bear christmas coloring',
    ],
    relatedComboSlugs: [
      'christmas-unicorn-coloring-pages',
      'christmas-dinosaur-coloring-pages',
      'winter-animal-coloring-pages',
    ],
  },
  {
    slug: 'halloween-animal-coloring-pages',
    group: 'occasion',
    categorySlug: 'animals',
    occasionSlug: 'halloween',
    extraTagsAny: ['halloween', 'pumpkin', 'spooky'],
    title: 'Halloween Animal Coloring Pages - Free Printable | Chunky Crayon',
    description:
      'Free Halloween animal coloring pages. Black cats, friendly bats, owls on pumpkins. Print or color online without the nightmares.',
    h1: 'Halloween Animal Coloring Pages',
    tagline: 'Spooky animals, kept charmingly un-scary.',
    intro:
      'Halloween animals are the gateway drug for kids who are not quite ready for ghosts and zombies. Black cats, owls, bats, friendly spiders. We picked our most charmingly un-scary versions so the only thing your kid is scared of is running out of orange crayon.',
    faqs: [
      {
        q: 'Are these too scary for little kids?',
        a: 'No. We pick friendly cartoon versions only. No fangs, no glowing eyes, no jump scares.',
      },
      {
        q: 'Do you have a friendly bat specifically?',
        a: 'Yes. Smiley bats with tiny wings are a Halloween staple in the gallery.',
      },
      {
        q: 'Can I print on orange paper?',
        a: 'You can, but the line art looks best on white or cream paper.',
      },
      {
        q: 'When are new Halloween pages added?',
        a: 'September and October the daily picture skews spooky, so new pages land through autumn.',
      },
    ],
    keywords: [
      'halloween animal coloring pages',
      'free halloween animal printables',
      'black cat coloring pages',
      'friendly bat coloring',
    ],
    relatedComboSlugs: [
      'halloween-dinosaur-coloring-pages',
      'halloween-unicorn-coloring-pages',
      'autumn-animal-coloring-pages',
    ],
  },
  {
    slug: 'halloween-dinosaur-coloring-pages',
    group: 'occasion',
    categorySlug: 'dinosaurs',
    occasionSlug: 'halloween',
    extraTagsAny: ['halloween', 'pumpkin', 'spooky'],
    title: 'Halloween Dinosaur Coloring Pages - Free Printable | Chunky Crayon',
    description:
      'Free Halloween dinosaur coloring pages. T-Rex in a witch hat, triceratops with pumpkins. Print or color online.',
    h1: 'Halloween Dinosaur Coloring Pages',
    tagline: 'T-Rex in a witch hat. We rest our case.',
    intro:
      'If your kid spent the year talking about dinosaurs and now wants to be a witch for Halloween, congratulations: this page is for them. Festive prehistoric coloring pages, sized for crayons and short attention spans alike.',
    faqs: [
      {
        q: 'Do you have T-Rex specifically?',
        a: 'Yes. T-Rex in costume is one of our most-printed Halloween dinosaur pages.',
      },
      {
        q: 'Are these scary?',
        a: 'No. We pick friendly costumed dinosaurs only. The vibe is cute, not creepy.',
      },
      {
        q: 'Can my 4 year old handle these?',
        a: 'Yes. The dinosaur outlines are chunky and friendly. For finer detail go to the 6+ sets.',
      },
      {
        q: 'How many Halloween dinosaur pages do you have?',
        a: 'A growing collection that expands every autumn as the daily picture rotates through Halloween dinosaurs.',
      },
    ],
    keywords: [
      'halloween dinosaur coloring pages',
      'spooky dinosaur printables',
      'dinosaur in costume coloring',
    ],
    relatedComboSlugs: [
      'halloween-animal-coloring-pages',
      'halloween-unicorn-coloring-pages',
      'christmas-dinosaur-coloring-pages',
    ],
  },
  {
    slug: 'easter-animal-coloring-pages',
    group: 'occasion',
    categorySlug: 'animals',
    occasionSlug: 'easter',
    extraTagsAny: ['easter', 'bunny', 'eggs'],
    title: 'Easter Animal Coloring Pages - Free Printable | Chunky Crayon',
    description:
      'Free Easter animal coloring pages. Bunnies, chicks, lambs, all the spring crew. Print or color online before the chocolate runs out.',
    h1: 'Easter Animal Coloring Pages',
    tagline: 'Bunnies, chicks, lambs. The full spring lineup.',
    intro:
      'Easter is when our gallery quietly fills up with small fluffy animals and we make no apologies for it. Bunnies, chicks, lambs, ducklings, the whole spring crew, in friendly cartoon form designed for kids who would also love a chocolate egg right about now.',
    faqs: [
      {
        q: 'Are there bunnies with eggs?',
        a: 'Yes. Bunnies with eggs, baskets, flowers, the works.',
      },
      {
        q: 'Are these good for Easter morning?',
        a: 'Print a stack the night before and tuck them in baskets. Quiet activity included with the chocolate.',
      },
      {
        q: 'Can my child color these on a tablet?',
        a: 'Yes. The Color Online tool works on iPads and most tablets.',
      },
      {
        q: 'When do new Easter pages get added?',
        a: 'March and April the daily picture skews spring/Easter, so new pages land through the lead-up.',
      },
    ],
    keywords: [
      'easter animal coloring pages',
      'free easter bunny printables',
      'chick coloring pages',
      'spring animal coloring',
    ],
    relatedComboSlugs: [
      'easter-dinosaur-coloring-pages',
      'spring-animal-coloring-pages',
      'christmas-animal-coloring-pages',
    ],
  },
  {
    slug: 'christmas-superhero-coloring-pages',
    group: 'occasion',
    categorySlug: 'superheroes',
    occasionSlug: 'christmas',
    extraTagsAny: ['christmas', 'santa'],
    title:
      'Christmas Superhero Coloring Pages - Free Printable | Chunky Crayon',
    description:
      'Free Christmas superhero coloring pages. Capes plus santa hats, the holiday team-up. Print or color online.',
    h1: 'Christmas Superhero Coloring Pages',
    tagline: 'Capes plus Santa hats. Cinematic universe of one.',
    intro:
      'Some kids only have two interests, and at Christmas those interests are superheroes and presents. We picked our most festive superhero scenes from the gallery: capes plus Santa hats, snowy rooftops, the holiday team-up.',
    faqs: [
      {
        q: 'Are these any specific heroes?',
        a: 'These are our own original superhero characters in festive scenes. No licensed characters.',
      },
      {
        q: 'Can my 5 year old handle these?',
        a: 'Yes. The detail level is kindergarten-friendly. For more detail use the older-age sets.',
      },
      {
        q: 'Print or color online?',
        a: 'Both. Each page works as a print-ready PDF or in the Color Online tool.',
      },
      {
        q: 'Are there girl superheroes too?',
        a: 'Yes. The gallery rotates between male and female heroes evenly.',
      },
    ],
    keywords: [
      'christmas superhero coloring pages',
      'free christmas superhero printables',
      'superhero santa coloring',
    ],
    relatedComboSlugs: [
      'christmas-unicorn-coloring-pages',
      'christmas-dinosaur-coloring-pages',
      'halloween-superhero-coloring-pages',
    ],
  },
  {
    slug: 'halloween-unicorn-coloring-pages',
    group: 'occasion',
    categorySlug: 'unicorns',
    occasionSlug: 'halloween',
    extraTagsAny: ['halloween', 'pumpkin', 'spooky'],
    title: 'Halloween Unicorn Coloring Pages - Free Printable | Chunky Crayon',
    description:
      'Free Halloween unicorn coloring pages. Unicorns in witch hats, pumpkin patches, the works. Print or color online.',
    h1: 'Halloween Unicorn Coloring Pages',
    tagline: 'Cute-spooky, never scary-spooky.',
    intro:
      'Unicorns plus Halloween is the cute-spooky aesthetic kids will defend in court. We picked our most charming Halloween unicorn scenes: tiny witch hats, friendly pumpkins, sparkly bats, no real scares.',
    faqs: [
      {
        q: 'Are these scary?',
        a: 'No. Cute-spooky only. Witch hats, friendly bats, smiley jack-o-lanterns.',
      },
      {
        q: 'Are these for older kids?',
        a: 'No, these are mostly 4-7 year old friendly. The detail level keeps it accessible.',
      },
      {
        q: 'Do you have a unicorn-in-costume page?',
        a: 'Yes. Unicorns in witch hats, pumpkin costumes, and other friendly Halloween costumes.',
      },
      {
        q: 'When are new pages added?',
        a: 'September and October the daily picture skews spooky, so new Halloween unicorn pages land through autumn.',
      },
    ],
    keywords: [
      'halloween unicorn coloring pages',
      'cute spooky unicorn printables',
      'unicorn in witch hat coloring',
    ],
    relatedComboSlugs: [
      'halloween-animal-coloring-pages',
      'halloween-dinosaur-coloring-pages',
      'christmas-unicorn-coloring-pages',
    ],
  },
  {
    slug: 'winter-animal-coloring-pages',
    group: 'occasion',
    categorySlug: 'animals',
    occasionSlug: 'winter',
    extraTagsAny: ['winter', 'snow'],
    title: 'Winter Animal Coloring Pages - Free Printable | Chunky Crayon',
    description:
      'Free winter animal coloring pages. Polar bears, arctic foxes, penguins, snowy owls. Print or color online.',
    h1: 'Winter Animal Coloring Pages',
    tagline: 'Arctic edition. No actual penguins were harmed.',
    intro:
      'Winter brings out the entire arctic gallery: polar bears, snowy owls, arctic foxes, penguins (yes we know they live in the south, the kids do not care). We picked our coziest winter animal scenes for those long January afternoons.',
    faqs: [
      {
        q: 'Are penguins really winter?',
        a: 'Kid-logic: yes. Adult-logic: they live in Antarctica. We picked our battles.',
      },
      {
        q: 'Do you have arctic foxes?',
        a: 'Yes. Arctic foxes, polar bears, snowy owls, and reindeer all appear in the winter set.',
      },
      {
        q: 'How is this different from christmas-animal-coloring-pages?',
        a: 'No Santa, no Christmas trees. Just winter scenes (snow, ice, arctic habitats) that work all season.',
      },
      {
        q: 'Can my child color these online?',
        a: 'Yes. Color Online works on tablets, phones, and laptops.',
      },
    ],
    keywords: [
      'winter animal coloring pages',
      'arctic animal printables',
      'polar bear coloring pages',
      'penguin coloring pages',
    ],
    relatedComboSlugs: [
      'christmas-animal-coloring-pages',
      'autumn-animal-coloring-pages',
      'easter-animal-coloring-pages',
    ],
  },
  {
    slug: 'easter-dinosaur-coloring-pages',
    group: 'occasion',
    categorySlug: 'dinosaurs',
    occasionSlug: 'easter',
    extraTagsAny: ['easter', 'bunny', 'eggs'],
    title: 'Easter Dinosaur Coloring Pages - Free Printable | Chunky Crayon',
    description:
      'Free Easter dinosaur coloring pages. T-Rex hunting eggs, triceratops with bunny ears. Print or color online.',
    h1: 'Easter Dinosaur Coloring Pages',
    tagline: 'T-Rex hunting eggs is exactly as fun as it sounds.',
    intro:
      'If your kid loves dinosaurs and refuses to let Easter slow them down, we have you covered. We picked friendly dinosaur scenes with eggs, bunny ears, and spring flowers, the dinosaur-Easter crossover episode parents did not know they needed.',
    faqs: [
      {
        q: 'Is there a T-Rex with bunny ears?',
        a: 'Yes. T-Rex in bunny ears is a perennial favourite in our Easter dinosaur set.',
      },
      {
        q: 'Are these good for an Easter egg hunt prize?',
        a: 'Yes. Print a stack on cardstock and tuck them in the basket as a calm-after-the-chocolate activity.',
      },
      {
        q: 'How is this different from regular dinosaur pages?',
        a: 'Eggs, bunny ears, spring flowers, pastel-friendly backgrounds. The dinosaurs themselves are the same friendly cartoon style.',
      },
      {
        q: 'When are new pages added?',
        a: 'March and April the daily picture rotates through Easter dinosaurs and animals.',
      },
    ],
    keywords: [
      'easter dinosaur coloring pages',
      'dinosaur easter printables',
      't-rex easter egg coloring',
    ],
    relatedComboSlugs: [
      'easter-animal-coloring-pages',
      'christmas-dinosaur-coloring-pages',
      'spring-animal-coloring-pages',
    ],
  },
  {
    slug: 'halloween-superhero-coloring-pages',
    group: 'occasion',
    categorySlug: 'superheroes',
    occasionSlug: 'halloween',
    extraTagsAny: ['halloween', 'pumpkin', 'spooky'],
    title:
      'Halloween Superhero Coloring Pages - Free Printable | Chunky Crayon',
    description:
      'Free Halloween superhero coloring pages. Capes and costumes, pumpkins and capes. Print or color online.',
    h1: 'Halloween Superhero Coloring Pages',
    tagline: 'Two costumes for the price of one.',
    intro:
      'Halloween is the one time of year a kid can be a superhero and a witch at the same time, and the dress-up logic checks out. We picked our most festive superhero scenes: capes plus pumpkins, hero costumes meeting Halloween costumes, the chaotic good crossover.',
    faqs: [
      {
        q: 'Are these any specific heroes?',
        a: 'These are our own original superhero characters in Halloween scenes. No licensed characters.',
      },
      {
        q: 'Are they scary?',
        a: 'No. The Halloween elements are friendly (pumpkins, smiley ghosts, witch hats), not creepy.',
      },
      {
        q: 'Do you have girl superheroes?',
        a: 'Yes. The gallery rotates evenly between male and female heroes.',
      },
      {
        q: 'Print or online?',
        a: 'Both, every page.',
      },
    ],
    keywords: [
      'halloween superhero coloring pages',
      'superhero costume coloring',
      'free halloween superhero printables',
    ],
    relatedComboSlugs: [
      'christmas-superhero-coloring-pages',
      'halloween-animal-coloring-pages',
      'halloween-dinosaur-coloring-pages',
    ],
  },
  {
    slug: 'valentine-unicorn-coloring-pages',
    group: 'occasion',
    categorySlug: 'unicorns',
    occasionSlug: 'valentines-day',
    extraTagsAny: ['valentine', 'hearts', 'love'],
    title:
      "Valentine's Day Unicorn Coloring Pages - Free Printable | Chunky Crayon",
    description:
      "Free Valentine's Day unicorn coloring pages. Hearts, sparkles, the magical Valentine's combo. Print or color online.",
    h1: "Valentine's Day Unicorn Coloring Pages",
    tagline: 'Unicorns plus hearts plus glitter. We made the math work.',
    intro:
      "Unicorns and Valentine's Day were destined to share a coloring page, and the kids agree. We picked our most heart-laden, sparkle-heavy unicorn scenes for February afternoons that need an activity between the sugar and the bedtime.",
    faqs: [
      {
        q: 'Are these good for classroom Valentine cards?',
        a: 'Yes. Print on cardstock, write a note on the back, and you have a coloring-Valentine combo.',
      },
      {
        q: 'Are these for older kids too?',
        a: 'Some pages are detailed enough for older kids. Most are kindergarten-to-second-grade friendly.',
      },
      {
        q: 'Is there a unicorn with hearts on it?',
        a: 'Yes. Hearts on the mane, hearts on the tail, hearts everywhere. Maximum Valentine.',
      },
      {
        q: 'When are new Valentine pages added?',
        a: 'January and February the daily picture rotates through Valentine themes.',
      },
    ],
    keywords: [
      "valentine's day unicorn coloring pages",
      'valentine unicorn printables',
      'unicorn hearts coloring',
    ],
    relatedComboSlugs: [
      'christmas-unicorn-coloring-pages',
      'halloween-unicorn-coloring-pages',
      'easter-animal-coloring-pages',
    ],
  },

  // --- Context expansion ---
  {
    slug: 'coloring-pages-for-summer-camp',
    group: 'context',
    contextSlug: 'summer-camp',
    extraTagsAny: ['summer-camp', 'outdoors', 'group-activity'],
    title: 'Coloring Pages for Summer Camp - Free Printable | Chunky Crayon',
    description:
      'Free coloring pages for summer camp. Outdoor-themed scenes, group-friendly designs, print-in-bulk PDFs. Cabin afternoons, sorted.',
    h1: 'Coloring Pages for Summer Camp',
    tagline: 'For cabin afternoons that are not, in fact, sunny.',
    intro:
      "Camp counsellors know that the words 'rest period' need backup. We picked our most camp-friendly coloring pages: outdoor scenes, woodland animals, tents and canoes, all designed to keep a cabin of kids quietly busy for thirty real minutes.",
    faqs: [
      {
        q: 'Can I print these for the whole cabin?',
        a: 'Yes, every page prints cleanly in bulk for non-commercial camp use.',
      },
      {
        q: 'Are there outdoor-themed scenes specifically?',
        a: 'Yes. Tents, canoes, woodland animals, campfires, all in friendly cartoon style.',
      },
      {
        q: 'What age range?',
        a: 'We cover ages 4-12. Filter by the age you need.',
      },
      {
        q: 'Do they need a printer at camp?',
        a: 'Yes, for the print version. The Color Online tool works on any tablet with WiFi.',
      },
    ],
    keywords: [
      'coloring pages for summer camp',
      'camp printable coloring',
      'cabin activity printables',
      'summer camp activities',
    ],
    relatedComboSlugs: [
      'coloring-pages-for-rainy-days',
      'coloring-pages-for-classroom',
      'coloring-pages-for-road-trips',
    ],
  },
  {
    slug: 'coloring-pages-for-road-trips',
    group: 'context',
    contextSlug: 'road-trips',
    extraTagsAny: ['road-trip', 'travel', 'quiet-activity'],
    title: 'Coloring Pages for Road Trips - Free Printable | Chunky Crayon',
    description:
      'Free coloring pages for road trips. Travel-friendly, kid-friendly, "are we there yet"-friendly. Print at home before you leave.',
    h1: 'Coloring Pages for Road Trips',
    tagline: 'For "are we there yet" in three different time zones.',
    intro:
      'Road trips run on snacks, snacks, and something quiet between the snacks. We picked our most travel-friendly coloring pages: small enough scenes to colour in segments, durable enough designs that you can leave them on the back seat without worrying.',
    faqs: [
      {
        q: 'Are these good for car back seats?',
        a: 'Yes. The page sizes are designed for a clipboard or hardback book to rest on.',
      },
      {
        q: 'Can my kid color these on a tablet in the car?',
        a: 'Yes. The Color Online tool works offline once the page has loaded, useful for car rides without signal.',
      },
      {
        q: 'How many pages should I print for a long trip?',
        a: 'Five per kid for a long-haul drive is a solid baseline. Mix age levels for variety.',
      },
      {
        q: 'Do you have travel-themed pages specifically?',
        a: 'Yes. Cars, planes, suitcases, road maps and travel scenes appear in the gallery.',
      },
    ],
    keywords: [
      'coloring pages for road trips',
      'travel coloring printables',
      'car activity for kids',
      'road trip activities for kids',
    ],
    relatedComboSlugs: [
      'coloring-pages-for-rainy-days',
      'coloring-pages-for-summer-camp',
      'coloring-pages-for-classroom',
    ],
  },
];

export const getComboPageBySlug = (slug: string): ComboPage | undefined =>
  COMBO_PAGES.find((c) => c.slug === slug);
