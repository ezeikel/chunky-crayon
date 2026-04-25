/**
 * Long-tail SEO landing pages — one static route per high-intent query.
 * Each slug is a separate indexable page with a focused H1, meta
 * description, gallery of matching images, and CTA to the generator.
 *
 * Keeping these in a typed config (rather than a DB table) makes it
 * trivial to audit which URLs exist, what they target, and to ship new
 * slugs as a code change.
 */

export type LandingPageConfig = {
  /** URL segment: /coloring-pages/{slug} */
  slug: string;
  /** <title> + H1 */
  title: string;
  /** Meta description shown in search results. */
  description: string;
  /** Opening paragraph shown above the gallery. */
  intro: string;
  /** One-line subtext under the H1. */
  tagline: string;
  /**
   * Free-form tags used for the DB filter (matched against
   * ColoringImage.tags). If empty, falls back to the full gallery.
   */
  tags: string[];
  /** Optional category slug override — maps to GALLERY_CATEGORIES. */
  categorySlug?: string;
  /** Optional difficulty override. */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
};

/**
 * Starter set derived from Perplexity research:
 * - "bold and easy {category} coloring pages ages 3-8" — 2–10K/mo searches,
 *   low competition.
 * - "simple {holiday} coloring pages for toddlers" — seasonal surges.
 * - "free {theme} coloring pages for kids" — evergreen long-tails.
 *
 * Prompt the gallery filter to each config via `tags` → matches the
 * existing ColoringImage.tags column populated at generation time.
 */
export const LANDING_PAGES: LandingPageConfig[] = [
  {
    slug: 'bold-and-easy-animal-coloring-pages',
    title: 'Bold and Easy Animal Coloring Pages for Kids (Ages 3–8)',
    description:
      'Free printable animal coloring pages with bold thick outlines — perfect for ages 3–8. Lions, elephants, farm animals, sea creatures. No signup, print-ready.',
    tagline:
      'Thick lines, simple shapes — the style little hands actually enjoy.',
    intro:
      'Our bold-and-easy animal coloring pages are designed specifically for preschoolers and early primary kids. Chunky outlines, simple shapes, no tiny detail that gets frustrating at age 4. Print one, or generate a custom page with your own subject below.',
    tags: ['animal', 'animals', 'zoo', 'farm'],
    difficulty: 'beginner',
  },
  {
    slug: 'easy-halloween-coloring-pages-for-kids',
    title: 'Easy Halloween Coloring Pages for Kids (Free Printable)',
    description:
      'Free printable Halloween coloring pages for young kids. Friendly pumpkins, ghosts, cats and costumes — never scary. Print-ready, no signup.',
    tagline: 'Friendly-spooky, not nightmare-fuel.',
    intro:
      "Every Halloween coloring page here was made with ages 3–8 in mind — friendly pumpkins, happy ghosts, polite black cats and costume-party fun. Nothing scary. Download one, or create a custom Halloween page with whatever your kid's into this year.",
    tags: ['halloween', 'pumpkin', 'ghost'],
    difficulty: 'beginner',
  },
  {
    slug: 'simple-princess-coloring-pages-for-toddlers',
    title: 'Simple Princess Coloring Pages for Toddlers (Free)',
    description:
      'Free printable princess coloring pages — simplified for toddlers and preschoolers. Friendly princesses, castles, crowns, unicorns.',
    tagline: 'Princess pages without the tiny glitter everywhere.',
    intro:
      "Big bold princess coloring pages for toddlers and preschoolers. Simplified faces, thicker lines, plenty of empty space for chunky crayons. Pick a ready-made page below or make a custom one with your kid's favourite.",
    tags: ['princess', 'queen', 'royal', 'unicorn'],
    difficulty: 'beginner',
  },
  {
    slug: 'unicorn-coloring-pages-for-kids',
    title: 'Free Unicorn Coloring Pages for Kids (Bold & Easy)',
    description:
      'Free printable unicorn coloring pages for ages 3–8. Magical unicorns with rainbows, stars, hearts and more. Bold outlines, print-ready PDFs.',
    tagline: 'Unicorns, rainbows, stars — every page free and printable.',
    intro:
      'Magical unicorn coloring pages ready to print. Bold outlines so chunky crayons stay in the lines, rainbows and stars for flair. Browse below or make a custom unicorn page with your own theme.',
    tags: ['unicorn', 'rainbow', 'magical'],
    difficulty: 'beginner',
  },
  {
    slug: 'cute-dinosaur-coloring-pages-for-kids',
    title: 'Cute Dinosaur Coloring Pages for Kids (Free Printables)',
    description:
      'Free printable dinosaur coloring pages — friendly T-Rex, stegosaurus, triceratops and more. Bold outlines, simple shapes for ages 3–8.',
    tagline:
      'Dinosaurs without the scary teeth — friendly faces, chunky outlines.',
    intro:
      "Every dinosaur here got the friendly treatment — wide smiles, rounded shapes, bold outlines. Great for preschool dinosaur fans. Pick a ready-made page or generate a custom one with the species your kid's obsessed with this week.",
    tags: ['dinosaur', 't-rex', 'prehistoric'],
    difficulty: 'beginner',
  },
  {
    slug: 'christmas-coloring-pages-for-preschool',
    title: 'Christmas Coloring Pages for Preschool (Free Printables)',
    description:
      'Free printable Christmas coloring pages for preschool and early primary. Santa, reindeer, trees, presents — bold outlines, simple shapes.',
    tagline: 'Santa, snowmen, reindeer — keep little hands busy in December.',
    intro:
      'Bold-and-easy Christmas coloring pages made for preschool classrooms and home-with-the-kids afternoons. Santa with a simple outline, friendly reindeer, chunky Christmas trees. Browse below or generate a custom Christmas page.',
    tags: ['christmas', 'santa', 'winter', 'holidays'],
    difficulty: 'beginner',
  },
  {
    slug: 'bold-and-easy-vehicle-coloring-pages',
    title: 'Bold and Easy Vehicle Coloring Pages for Kids (Free)',
    description:
      'Free printable vehicle coloring pages for kids ages 3–8. Cars, fire trucks, planes, trains and diggers with bold, easy outlines.',
    tagline: 'Vroom-vroom pages with chunky outlines, no fiddly detail.',
    intro:
      "Simple-shaped vehicles made for little hands and big crayons. Fire trucks, diggers, planes, trains — all with chunky outlines your kid can actually colour inside. Browse the gallery below, or use our generator to make your kid's favourite vehicle.",
    tags: ['vehicle', 'car', 'truck', 'plane', 'train'],
    difficulty: 'beginner',
  },
];

export const getLandingPageBySlug = (slug: string) =>
  LANDING_PAGES.find((p) => p.slug === slug);
