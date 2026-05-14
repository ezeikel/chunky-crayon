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
    extraTagsAny: ['classroom', 'school', 'group-activity'],
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
];

export const getComboPageBySlug = (slug: string): ComboPage | undefined =>
  COMBO_PAGES.find((c) => c.slug === slug);
