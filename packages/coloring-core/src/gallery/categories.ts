/**
 * Shared gallery-category catalogue — DATA ONLY.
 *
 * Categories are how the pre-made coloring-page LIBRARY is browsed (Animals,
 * Dinosaurs, Vehicles, …). They map to the `tags[]` field on ColoringImage —
 * there is NO category table; a page belongs to a category when its tags
 * intersect the category's `tags` (Prisma `tags: { hasSome: category.tags }`).
 * This catalogue is the single source of truth for the keys, slugs, names,
 * descriptions, SEO keywords and tag sets across web AND mobile.
 *
 * Why data-only (no FA icons, no colours): coloring-core is also imported by
 * the worker (server). Pulling @fortawesome icon data + app-specific colours
 * (web Tailwind classes vs mobile hex) into it would bloat the server bundle
 * and couple it to a platform. So the per-category PRESENTATION (FA icon +
 * colour) lives in each app, keyed by `slug`:
 *   - web:    a slug→{icon, color(Tailwind)} map in the gallery UI layer
 *   - mobile: a slug→{icon, primary/secondary(hex)} map next to CategoryRow
 * Both map against the SAME slugs exported here — add/remove a category once.
 *
 * Mirrors the scene-catalog pattern (see ./scene/scene-catalog.ts).
 */

export type GalleryCategory = {
  id: string;
  name: string;
  slug: string;
  /** One-line blurb shown on the category screen header. */
  description: string;
  /** SEO keywords this category targets (web landing pages). */
  keywords: string[];
  /** Tags from AI-generated metadata that map a page into this category. */
  tags: string[];
};

// Maps to tags[] on the ColoringImage model. Order here is the display order.
export const GALLERY_CATEGORIES: GalleryCategory[] = [
  {
    id: "animals",
    name: "Animals",
    slug: "animals",
    description: "Cute and wild animal coloring pages for kids and adults",
    keywords: [
      "animal coloring pages",
      "zoo animals",
      "pet coloring",
      "wildlife coloring",
    ],
    tags: [
      "animal",
      "animals",
      "zoo",
      "pet",
      "wildlife",
      "dog",
      "cat",
      "lion",
      "elephant",
      "bear",
      "fox",
      "panda",
      "penguin",
      "bird",
      "fish",
    ],
  },
  {
    id: "fantasy",
    name: "Fantasy & Magic",
    slug: "fantasy",
    description: "Magical creatures and fantasy world coloring pages",
    keywords: [
      "fantasy coloring pages",
      "magical coloring",
      "mythical creatures",
    ],
    tags: [
      "fantasy",
      "magic",
      "magical",
      "mythical",
      "fairy",
      "wizard",
      "witch",
      "elf",
      "goblin",
      "giant",
      "genie",
    ],
  },
  {
    id: "dragons",
    name: "Dragons",
    slug: "dragons",
    description: "Epic dragon coloring pages from cute to fierce",
    keywords: [
      "dragon coloring pages",
      "fire breathing dragon",
      "baby dragon coloring",
    ],
    tags: ["dragon", "dragons", "fire-breathing", "mythical"],
  },
  {
    id: "unicorns",
    name: "Unicorns",
    slug: "unicorns",
    description: "Beautiful unicorn and rainbow coloring pages",
    keywords: ["unicorn coloring pages", "rainbow unicorn", "magical horse"],
    // 'rainbow' deliberately excluded — too aggressive, leaked non-unicorn
    // rainbow pages (leprechauns, sprinklers) into the unicorn gallery.
    tags: ["unicorn", "unicorns", "magical horse", "pegasus"],
  },
  {
    id: "princesses",
    name: "Princesses & Royalty",
    slug: "princesses",
    description: "Princess, prince, and castle coloring pages",
    keywords: [
      "princess coloring pages",
      "castle coloring",
      "royalty coloring",
    ],
    tags: [
      "princess",
      "prince",
      "queen",
      "king",
      "royalty",
      "castle",
      "crown",
      "throne",
    ],
  },
  {
    id: "superheroes",
    name: "Superheroes",
    slug: "superheroes",
    description: "Action-packed superhero coloring pages",
    keywords: ["superhero coloring pages", "hero coloring", "comic coloring"],
    tags: [
      "superhero",
      "hero",
      "superheroes",
      "action",
      "comic",
      "cape",
      "mask",
    ],
  },
  {
    id: "dinosaurs",
    name: "Dinosaurs",
    slug: "dinosaurs",
    description: "Prehistoric dinosaur coloring pages for all ages",
    keywords: [
      "dinosaur coloring pages",
      "t-rex coloring",
      "prehistoric coloring",
    ],
    tags: [
      "dinosaur",
      "dinosaurs",
      "prehistoric",
      "t-rex",
      "trex",
      "raptor",
      "brontosaurus",
      "pterodactyl",
    ],
  },
  {
    id: "space",
    name: "Space & Astronauts",
    slug: "space",
    description: "Outer space, rockets, and astronaut coloring pages",
    keywords: [
      "space coloring pages",
      "astronaut coloring",
      "rocket coloring",
      "planet coloring",
    ],
    tags: [
      "space",
      "astronaut",
      "rocket",
      "planet",
      "moon",
      "star",
      "galaxy",
      "alien",
      "spaceship",
      "ufo",
    ],
  },
  {
    id: "underwater",
    name: "Underwater & Ocean",
    slug: "underwater",
    description: "Ocean life and underwater adventure coloring pages",
    keywords: [
      "ocean coloring pages",
      "underwater coloring",
      "sea creature coloring",
      "mermaid coloring",
    ],
    tags: [
      "underwater",
      "ocean",
      "sea",
      "mermaid",
      "fish",
      "whale",
      "dolphin",
      "shark",
      "coral",
      "reef",
    ],
  },
  {
    id: "vehicles",
    name: "Vehicles & Transport",
    slug: "vehicles",
    description: "Cars, trucks, planes, and train coloring pages",
    keywords: [
      "vehicle coloring pages",
      "car coloring",
      "truck coloring",
      "plane coloring",
    ],
    tags: [
      "vehicle",
      "car",
      "truck",
      "plane",
      "train",
      "boat",
      "ship",
      "helicopter",
      "motorcycle",
      "bus",
      "transport",
    ],
  },
  {
    id: "pirates",
    name: "Pirates",
    slug: "pirates",
    description: "Swashbuckling pirate adventure coloring pages",
    keywords: [
      "pirate coloring pages",
      "treasure coloring",
      "pirate ship coloring",
    ],
    tags: [
      "pirate",
      "pirates",
      "treasure",
      "ship",
      "island",
      "parrot",
      "skull",
    ],
  },
  {
    id: "nature",
    name: "Nature & Flowers",
    slug: "nature",
    description: "Beautiful nature scenes and flower coloring pages",
    keywords: [
      "nature coloring pages",
      "flower coloring",
      "garden coloring",
      "tree coloring",
    ],
    tags: [
      "nature",
      "flower",
      "flowers",
      "garden",
      "tree",
      "forest",
      "landscape",
      "plant",
      "botanical",
    ],
  },
  {
    id: "holidays",
    name: "Holidays & Seasons",
    slug: "holidays",
    description: "Christmas, Easter, Halloween and seasonal coloring pages",
    keywords: [
      "holiday coloring pages",
      "christmas coloring",
      "easter coloring",
      "halloween coloring",
    ],
    tags: [
      "holiday",
      "christmas",
      "easter",
      "halloween",
      "thanksgiving",
      "winter",
      "summer",
      "spring",
      "autumn",
      "snow",
      "santa",
    ],
  },
  {
    id: "robots",
    name: "Robots & Technology",
    slug: "robots",
    description: "Futuristic robot and technology coloring pages",
    keywords: [
      "robot coloring pages",
      "technology coloring",
      "futuristic coloring",
    ],
    tags: [
      "robot",
      "robots",
      "technology",
      "machine",
      "futuristic",
      "cyborg",
      "android",
    ],
  },
  {
    id: "food",
    name: "Food & Sweets",
    slug: "food",
    description: "Delicious food, candy, and dessert coloring pages",
    keywords: [
      "food coloring pages",
      "candy coloring",
      "dessert coloring",
      "fruit coloring",
    ],
    tags: [
      "food",
      "candy",
      "cake",
      "dessert",
      "fruit",
      "ice cream",
      "pizza",
      "sweet",
      "cupcake",
    ],
  },
];

/** Find a category by its slug. */
export const getCategoryBySlug = (slug: string): GalleryCategory | undefined =>
  GALLERY_CATEGORIES.find((cat) => cat.slug === slug);

/** Find categories whose tag set matches a given tag (substring match). */
export const getCategoriesForTag = (tag: string): GalleryCategory[] =>
  GALLERY_CATEGORIES.filter((cat) =>
    cat.tags.some((t) => tag.toLowerCase().includes(t.toLowerCase())),
  );
