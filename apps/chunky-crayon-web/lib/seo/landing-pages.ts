/**
 * Long-tail SEO landing pages — one static route per high-intent query.
 * Each slug is a separate indexable page with a focused H1, meta
 * description, gallery of matching images, and CTA to the generator.
 *
 * Keeping these in a typed config (rather than a DB table) makes it
 * trivial to audit which URLs exist, what they target, and to ship new
 * slugs as a code change.
 *
 * When adding/removing slugs here, also update
 * `packages/coloring-core/src/blog/landings.ts` (slug+title only) so the
 * worker's blog-generation prompt can offer the new slug as an internal
 * link target. Drift is low-risk but the two lists should stay aligned.
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
  /**
   * Visual style ('theme') vs problem-solver ('problem') landing.
   * Defaults to 'theme'. Problem landings render a different copy block
   * above the gallery (situation → why-helps → cite) targeted at parents
   * in distress mode rather than parents browsing. See the
   * `LandingPageContent` component for the template fork.
   */
  angle?: 'theme' | 'problem';
  /**
   * Problem-solver only. One-line description of the situation the
   * parent/teacher is in when they search this. Renders as the "We get
   * it" block above the gallery.
   */
  problemFraming?: string;
  /**
   * Problem-solver only. One-line description of who this page targets.
   * Renders subtly under the H1 to confirm the searcher landed in the
   * right place.
   */
  targetAudience?: string;
  /**
   * Optional research citation displayed below the why-helps block.
   * MUST be from a genuinely reputable source (AAP, CHADD, NHS, NAS,
   * Cleveland Clinic, Autism Speaks, AOTA, or a peer-reviewed study).
   * Claim must be descriptive, never therapeutic. Leave empty if no
   * qualifying source exists for this query.
   */
  researchCitation?: {
    source: string;
    claim: string;
    url?: string;
  };
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

  // -----------------------------------------------------------------
  // Wave 2 (2026-05-12): 33 new long-tail slugs from Perplexity Sonar
  // research. Sorted in same order as research output — highest
  // estimated US monthly volume first. See /tmp/landing-page-research.json
  // for the raw data + competition notes. Total estimated reach across
  // these 33: ~145K monthly searches.
  // -----------------------------------------------------------------

  // Seasonal (8) — peaks vary; ranked by annualized monthly average
  {
    slug: 'free-easter-coloring-pages-for-kids',
    title: 'Free Easter Coloring Pages for Kids (Print-Ready PDFs)',
    description:
      'Free printable Easter coloring pages for young kids — bunnies, eggs, baskets and spring scenes with bold outlines. No signup.',
    tagline: 'Bunnies, eggs, baskets — print one before the egg hunt.',
    intro:
      "Friendly Easter coloring pages designed for ages 3–8. Big-shape bunnies, easy-to-color eggs, chunky baskets. Print one for a quiet morning, or generate a custom Easter page with your kid's favourite Easter thing.",
    tags: ['easter', 'bunny', 'egg'],
    difficulty: 'beginner',
  },
  {
    slug: 'easy-valentines-coloring-pages-for-kids',
    title: "Easy Valentine's Day Coloring Pages for Kids (Free Printables)",
    description:
      "Free printable Valentine's Day coloring pages — friendly hearts, simple love notes, cute animals with hearts. Bold lines for ages 3–8.",
    tagline:
      'Big hearts, simple shapes — Valentine fun without the lace doily.',
    intro:
      "Valentine's pages made for little hands. Friendly hearts, simple cards your kid can colour and gift, animals holding flowers. Browse below or generate a custom Valentine page with your kid's name on it.",
    tags: ['valentine', 'heart', 'love'],
    difficulty: 'beginner',
  },
  {
    slug: 'simple-thanksgiving-coloring-pages-for-kids',
    title: 'Simple Thanksgiving Coloring Pages for Kids (Free Printable)',
    description:
      'Free printable Thanksgiving coloring pages for young kids. Friendly turkeys, autumn leaves, pumpkins and harvest scenes with bold outlines.',
    tagline:
      'Friendly turkeys and autumn leaves — print before the in-laws arrive.',
    intro:
      'Thanksgiving coloring pages made for the youngest hands at the table. Big-shape turkeys, autumn leaves, pumpkin pies, harvest baskets. Print one for the kids while the bird cooks, or make a custom Thanksgiving page.',
    tags: ['thanksgiving', 'turkey', 'fall', 'autumn'],
    difficulty: 'beginner',
  },
  {
    slug: 'easy-back-to-school-coloring-pages-for-kids',
    title: 'Easy Back to School Coloring Pages for Kids (Free Printables)',
    description:
      'Free printable back-to-school coloring pages — school buses, apples, pencils, backpacks. Bold outlines, perfect for August and September.',
    tagline:
      'School buses, apples, backpacks — print one for the first-day jitters.',
    intro:
      'Back-to-school coloring pages for kids about to start a new year. Big-shape school buses, apples for the teacher, chunky pencils and backpacks. Great for classroom welcome packs or first-day-of-school distraction.',
    tags: ['school', 'school-bus', 'apple', 'pencil', 'backpack'],
    difficulty: 'beginner',
  },
  {
    slug: 'simple-st-patricks-day-coloring-pages-for-kids',
    title: "Simple St. Patrick's Day Coloring Pages for Kids (Free)",
    description:
      "Free printable St. Patrick's Day coloring pages — shamrocks, rainbows, friendly leprechauns, pots of gold. Bold outlines for ages 3–8.",
    tagline: 'Shamrocks, rainbows, friendly leprechauns — March print-and-go.',
    intro:
      "St. Patrick's Day coloring pages designed for young kids. Big-shape shamrocks, easy-to-color rainbows, friendly leprechaun faces. Print one for a March classroom craft or rainy-day quiet time.",
    tags: ['st-patricks', 'shamrock', 'rainbow', 'leprechaun'],
    difficulty: 'beginner',
  },
  {
    slug: 'cute-4th-of-july-coloring-pages-for-kids',
    title: 'Cute 4th of July Coloring Pages for Kids (Free Printable)',
    description:
      'Free printable 4th of July coloring pages — fireworks, flags, BBQ scenes, picnic blankets. Bold outlines for young kids.',
    tagline: 'Fireworks, flags, BBQ — print one before the cookout.',
    intro:
      'Friendly 4th of July coloring pages for the youngest patriots. Big-shape fireworks, easy-to-color flags, picnic blankets and watermelon slices. Print a stack for the BBQ table.',
    tags: ['4th-of-july', 'firework', 'flag', 'summer'],
    difficulty: 'beginner',
  },
  {
    slug: 'free-hanukkah-coloring-pages-for-kids',
    title: 'Free Hanukkah Coloring Pages for Kids (Printable PDFs)',
    description:
      'Free printable Hanukkah coloring pages — menorahs, dreidels, latkes, the Star of David. Bold outlines for ages 3–8.',
    tagline: 'Menorahs, dreidels, latkes — eight nights of print-and-color.',
    intro:
      'Hanukkah coloring pages designed for young kids. Big-shape menorahs, easy-to-color dreidels, friendly faces lighting candles. Great for classroom celebrations or quiet time during the eight nights.',
    tags: ['hanukkah', 'menorah', 'dreidel'],
    difficulty: 'beginner',
  },
  {
    slug: 'cute-new-years-coloring-pages-for-kids',
    title: "Cute New Year's Coloring Pages for Kids (Free Printable)",
    description:
      "Free printable New Year's Eve coloring pages — fireworks, party hats, balloons, countdown clocks. Bold outlines, friendly faces.",
    tagline: 'Fireworks, balloons, party hats — stay-up-late fun.',
    intro:
      "New Year's coloring pages made for kids trying to make it to midnight. Big-shape fireworks, party hats, balloons, friendly countdown clocks. Print a stack for the New Year's Eve table.",
    tags: ['new-year', 'firework', 'celebration'],
    difficulty: 'beginner',
  },

  // Characters & themes (9) — generic, non-trademarked
  {
    slug: 'bold-and-easy-superhero-coloring-pages-for-kids',
    title: 'Bold and Easy Superhero Coloring Pages for Kids (Free)',
    description:
      'Free printable superhero coloring pages — generic capes, masks, cityscapes. Bold outlines for ages 3–8. Save-the-day fun.',
    tagline: 'Capes, masks, hero poses — print and let them save the day.',
    intro:
      'Generic superhero coloring pages made for little heroes-in-training. Big-shape capes, simple masks, friendly hero faces. No trademarked characters, just classic hero energy your kid can colour and pretend to be.',
    tags: ['superhero', 'cape', 'mask', 'hero'],
    difficulty: 'beginner',
  },
  {
    slug: 'free-monster-truck-coloring-pages-for-kids',
    title: 'Free Monster Truck Coloring Pages for Kids (Printables)',
    description:
      'Free printable monster truck coloring pages — chunky trucks, giant tires, mud and ramps. Bold outlines made for vehicle-obsessed kids.',
    tagline: 'Giant tires, big mud, bigger smiles.',
    intro:
      "Monster truck coloring pages for kids who'd happily watch them all day. Chunky bodies, giant tires, mud ramps. Print a stack for a vehicle-themed afternoon or make a custom monster truck with your kid's favourite paint job.",
    tags: ['monster-truck', 'truck', 'racing', 'vehicle'],
    difficulty: 'beginner',
  },
  {
    slug: 'easy-space-coloring-pages-for-kids',
    title: 'Easy Space Coloring Pages for Kids (Free Printables)',
    description:
      'Free printable space coloring pages — astronauts, rockets, planets, friendly aliens. Bold outlines for ages 3–8. STEM-friendly.',
    tagline: 'Astronauts, rockets, planets — print and blast off.',
    intro:
      'Space coloring pages for kids hooked on the night sky. Big-shape rockets, smiling astronauts, friendly planets and shooting stars. Great for STEM-themed classrooms or rainy-day cosmic adventures.',
    tags: ['space', 'astronaut', 'rocket', 'planet'],
    difficulty: 'beginner',
  },
  {
    slug: 'easy-construction-coloring-pages-for-kids',
    title: 'Easy Construction Coloring Pages for Kids (Free Printable)',
    description:
      'Free printable construction coloring pages — bulldozers, cranes, dump trucks, excavators. Bold outlines for diggers-obsessed kids.',
    tagline: 'Bulldozers, cranes, dump trucks — print the whole site.',
    intro:
      "Construction vehicle coloring pages for kids who could watch a digger all day. Chunky bulldozers, towering cranes, dump trucks mid-tip. Print a job-site's worth, or make a custom construction page.",
    tags: ['construction', 'bulldozer', 'crane', 'digger', 'vehicle'],
    difficulty: 'beginner',
  },
  {
    slug: 'bold-and-easy-pirate-coloring-pages-for-kids',
    title: 'Bold and Easy Pirate Coloring Pages for Kids (Free)',
    description:
      'Free printable pirate coloring pages — friendly pirates, ships, treasure maps, parrots. Bold outlines for ages 3–8. Yo-ho-ho.',
    tagline: 'Friendly pirates, treasure maps, parrots — yo-ho-print.',
    intro:
      'Friendly pirate coloring pages designed for young adventurers. Big-shape pirate ships, smiling captains, treasure maps with the X. Print one for a pirate-themed birthday or quiet-time storytelling.',
    tags: ['pirate', 'ship', 'treasure'],
    difficulty: 'beginner',
  },
  {
    slug: 'free-dragon-coloring-pages-for-kids',
    title: 'Free Dragon Coloring Pages for Kids (Bold & Easy)',
    description:
      'Free printable dragon coloring pages — friendly dragons, castles, knights, treasure hoards. Bold outlines for ages 3–8.',
    tagline: 'Friendly dragons and brave knights — fantasy print-and-color.',
    intro:
      "Dragon coloring pages with big bold outlines — friendly dragons, not nightmare ones. Add knights, castles, treasure piles. Browse below, or make a custom dragon page with your kid's favourite name.",
    tags: ['dragon', 'fantasy', 'castle'],
    difficulty: 'beginner',
  },
  {
    slug: 'simple-fairy-coloring-pages-for-toddlers',
    title: 'Simple Fairy Coloring Pages for Toddlers (Free Printable)',
    description:
      'Free printable fairy coloring pages simplified for toddlers — friendly fairies, big wings, flowers and mushrooms. Bold outlines.',
    tagline: "Fairy magic without the tiny detail toddler hands can't manage.",
    intro:
      "Toddler-friendly fairy coloring pages. Big chunky wings, simple flower-and-mushroom backgrounds, friendly faces. Print one for a fairy-themed afternoon, or make a custom fairy page with your toddler's favourite colour scheme.",
    tags: ['fairy', 'wings', 'magic', 'flower'],
    difficulty: 'beginner',
  },
  {
    slug: 'cute-robot-coloring-pages-for-kids',
    title: 'Cute Robot Coloring Pages for Kids (Free Printables)',
    description:
      'Free printable robot coloring pages — friendly robots, chunky bodies, simple antennas. Bold outlines for ages 3–8. STEM-friendly.',
    tagline: 'Friendly robots with chunky shapes — beep boop print.',
    intro:
      'Robot coloring pages designed for young STEM fans. Big chunky bodies, simple antennas, friendly faces — no scary mechanical detail. Browse the gallery or make a custom robot with whatever colour scheme your kid wants.',
    tags: ['robot', 'mech', 'tech'],
    difficulty: 'beginner',
  },
  {
    slug: 'cute-ninja-coloring-pages-for-kids',
    title: 'Cute Ninja Coloring Pages for Kids (Free Printable)',
    description:
      'Free printable ninja coloring pages — friendly ninjas, throwing stars, dojo scenes. Bold outlines for ages 3–8.',
    tagline: 'Friendly ninjas, big poses, simple shapes.',
    intro:
      'Cute ninja coloring pages designed for young action fans. Big-shape ninjas in friendly poses, simple throwing stars, dojo backgrounds. Generic — no specific characters — just classic stealth-mode fun.',
    tags: ['ninja', 'martial-arts'],
    difficulty: 'beginner',
  },

  // Evergreen animals (9)
  {
    slug: 'cute-dog-coloring-pages-for-kids',
    title: 'Cute Dog Coloring Pages for Kids (Free Printable)',
    description:
      'Free printable dog coloring pages — puppies, big floppy ears, friendly faces. Bold outlines for ages 3–8.',
    tagline: 'Puppies, floppy ears, wagging tails — every kid loves these.',
    intro:
      "Dog coloring pages for kids who'd adopt every puppy at the shelter. Big floppy ears, friendly tails, simple body shapes. Browse below or make a custom page of your own dog (or the one you wish you had).",
    tags: ['dog', 'puppy'],
    difficulty: 'beginner',
  },
  {
    slug: 'bold-and-easy-cat-coloring-pages-for-kids',
    title: 'Bold and Easy Cat Coloring Pages for Kids (Free)',
    description:
      'Free printable cat coloring pages with bold thick outlines — kittens, big eyes, simple shapes. Made for ages 3–8.',
    tagline:
      'Kittens with big eyes and chunky outlines — purr-fect for little hands.',
    intro:
      'Cat coloring pages designed for young cat fans. Big-shape kittens, simple body lines, friendly faces. Browse below or generate a custom cat page in any colour your kid wants.',
    tags: ['cat', 'kitten'],
    difficulty: 'beginner',
  },
  {
    slug: 'easy-horse-coloring-pages-for-kids',
    title: 'Easy Horse Coloring Pages for Kids (Free Printable)',
    description:
      'Free printable horse coloring pages — friendly horses, ponies, simple manes and tails. Bold outlines for ages 3–8.',
    tagline: 'Friendly horses, flowing manes, simple shapes.',
    intro:
      'Horse coloring pages for kids obsessed with everything equine. Big-shape horses, easy-to-color manes and tails, friendly faces. Browse the gallery or make a custom horse in any pattern your kid imagines.',
    tags: ['horse', 'pony'],
    difficulty: 'beginner',
  },
  {
    slug: 'free-fish-coloring-pages-for-kids',
    title: 'Free Fish Coloring Pages for Kids (Bold & Easy Printables)',
    description:
      'Free printable fish coloring pages — tropical fish, goldfish, simple underwater scenes. Bold outlines for ages 3–8.',
    tagline: 'Goldfish, tropical fish, easy underwater scenes.',
    intro:
      "Fish coloring pages for under-the-sea fans. Big-shape goldfish, easy-to-color tropical fish, simple underwater backgrounds. Print a stack for a beach-themed afternoon or generate a custom fish in your kid's favourite colour.",
    tags: ['fish', 'goldfish', 'sea', 'underwater'],
    difficulty: 'beginner',
  },
  {
    slug: 'cute-butterfly-coloring-pages-for-kids',
    title: 'Cute Butterfly Coloring Pages for Kids (Free Printable)',
    description:
      'Free printable butterfly coloring pages — symmetrical wings, simple patterns, friendly faces. Bold outlines for ages 3–8.',
    tagline: 'Symmetrical wings and simple patterns — print, color, fly.',
    intro:
      'Butterfly coloring pages designed for spring-loving kids. Big-shape wings with simple patterns your kid can fill in any way they like, friendly faces, flower backgrounds. Great for pattern play or a quick after-school activity.',
    tags: ['butterfly', 'wings', 'insect'],
    difficulty: 'beginner',
  },
  {
    slug: 'easy-farm-animal-coloring-pages-for-kids',
    title: 'Easy Farm Animal Coloring Pages for Kids (Free Printables)',
    description:
      'Free printable farm animal coloring pages — cows, pigs, chickens, sheep, horses. Bold outlines for ages 3–8. Educational.',
    tagline: 'Cows, pigs, chickens, sheep — print the whole farm.',
    intro:
      "Farm animal coloring pages for kids learning their moos from their baas. Big-shape cows, friendly pigs, chunky chickens, fluffy sheep. Browse below or make a custom farm page with your kid's favourite barnyard mix.",
    tags: ['farm', 'cow', 'pig', 'chicken', 'sheep'],
    difficulty: 'beginner',
  },
  {
    slug: 'cute-elephant-coloring-pages-for-kids',
    title: 'Cute Elephant Coloring Pages for Kids (Free Printable)',
    description:
      'Free printable elephant coloring pages — friendly elephants, big ears, simple shapes. Bold outlines for ages 3–8.',
    tagline: 'Big ears, friendly trunks, simple shapes.',
    intro:
      'Elephant coloring pages designed for zoo-animal fans. Big-shape elephants with friendly faces, simple trunks, chunky ears. Browse the gallery or make a custom elephant in any colour your kid wants.',
    tags: ['elephant', 'zoo'],
    difficulty: 'beginner',
  },
  {
    slug: 'free-bird-coloring-pages-for-kids',
    title: 'Free Bird Coloring Pages for Kids (Bold & Easy Printables)',
    description:
      'Free printable bird coloring pages — parrots, owls, songbirds, simple feather patterns. Bold outlines for ages 3–8.',
    tagline: 'Parrots, owls, songbirds — simple feathers, bold outlines.',
    intro:
      "Bird coloring pages for budding birdwatchers. Big-shape parrots, friendly owls, simple songbirds with feather patterns kids can fill in. Browse below or make a custom bird in your kid's favourite plumage.",
    tags: ['bird', 'parrot', 'owl'],
    difficulty: 'beginner',
  },
  {
    slug: 'bold-and-easy-tiger-coloring-pages',
    title: 'Bold and Easy Tiger Coloring Pages (Free Printable)',
    description:
      'Free printable tiger coloring pages — friendly tigers, simple stripes, jungle backgrounds. Bold outlines for ages 3–8.',
    tagline: 'Friendly tigers, simple stripes, jungle backgrounds.',
    intro:
      'Tiger coloring pages designed for jungle-animal fans. Big-shape tigers with friendly faces, simple stripe patterns kids can fill in their own way. Browse the gallery or make a custom tiger in any colour scheme.',
    tags: ['tiger', 'stripes', 'jungle'],
    difficulty: 'beginner',
  },
  {
    slug: 'simple-lion-coloring-pages-for-toddlers',
    title: 'Simple Lion Coloring Pages for Toddlers (Free Printable)',
    description:
      'Free printable lion coloring pages simplified for toddlers — friendly lions, big manes, simple shapes. Bold outlines.',
    tagline: 'Friendly lions, big manes, simple shapes — toddler-ready.',
    intro:
      "Toddler-friendly lion coloring pages. Big chunky manes, friendly faces, simple body shapes — nothing tiny or fiddly. Print one for a jungle-themed afternoon or make a custom lion in your toddler's favourite colour.",
    tags: ['lion', 'jungle', 'mane'],
    difficulty: 'beginner',
  },
  {
    slug: 'simple-bug-coloring-pages-for-kids',
    title: 'Simple Bug Coloring Pages for Kids (Free Printable)',
    description:
      'Free printable bug coloring pages — ladybugs, bees, butterflies, friendly spiders. Bold outlines for ages 3–8.',
    tagline: 'Ladybugs, bees, friendly spiders — backyard bug fun.',
    intro:
      'Bug coloring pages for backyard explorers. Big-shape ladybugs, friendly bees, simple spiders (nothing scary). Great for nature-themed afternoons or alongside a backyard bug hunt.',
    tags: ['bug', 'ladybug', 'bee', 'insect'],
    difficulty: 'beginner',
  },

  // Age-specific (5)
  {
    slug: 'free-coloring-pages-for-4-year-olds',
    title: 'Free Coloring Pages for 4 Year Olds (Print-Ready, No Signup)',
    description:
      'Free printable coloring pages designed for 4 year olds — big shapes, bold outlines, simple subjects. Print-ready PDFs, no signup.',
    tagline:
      'Big shapes, bold outlines — the style 4-year-olds actually finish.',
    intro:
      "Every page here is built for 4-year-old hands. Big-shape subjects, bold outlines, nothing tiny or fiddly. Browse the gallery for ready-made pages or generate a custom one with your 4-year-old's favourite thing.",
    tags: ['preschool', 'simple', 'easy'],
    difficulty: 'beginner',
  },
  {
    slug: 'cute-coloring-pages-for-preschoolers',
    title: 'Cute Coloring Pages for Preschoolers (Free Printables)',
    description:
      'Free printable coloring pages for preschoolers — cute animals, friendly faces, simple shapes. Bold outlines, no signup.',
    tagline: 'Cute, friendly, classroom-ready.',
    intro:
      'Preschool coloring pages with everything sized for the youngest hands. Cute animals, friendly faces, simple shapes, bold outlines. Great for classroom packs, daycare quiet time, or a rainy afternoon at home.',
    tags: ['preschool', 'cute', 'easy'],
    difficulty: 'beginner',
  },
  {
    slug: 'easy-coloring-pages-for-kindergarten',
    title: 'Easy Coloring Pages for Kindergarten (Free Printable)',
    description:
      'Free printable coloring pages for kindergarten classrooms — simple shapes, alphabet, numbers, animals. Bold outlines.',
    tagline: 'Classroom-ready packs for the kindergarten crowd.',
    intro:
      "Kindergarten coloring pages teachers can print by the stack. Simple animals, alphabet letters, numbers, friendly objects. All bold outlines so 5-year-olds can stay in the lines. Browse below or make custom pages around your week's theme.",
    tags: ['kindergarten', 'school', 'simple'],
    difficulty: 'beginner',
  },
  {
    slug: 'bold-and-easy-coloring-pages-for-3-year-olds',
    title: 'Bold and Easy Coloring Pages for 3 Year Olds (Free)',
    description:
      'Free printable coloring pages for 3 year olds — extra-thick outlines, simple subjects, lots of empty space for chunky crayons.',
    tagline: 'Extra-thick lines, simple shapes — fits a 3-year-old grip.',
    intro:
      'Coloring pages built for 3-year-old hands. Extra-thick outlines, big simple shapes, lots of empty space so chunky crayons can fill freely. No tiny detail. Browse below or make a custom 3-year-old-friendly page.',
    tags: ['toddler', 'easy', 'bold'],
    difficulty: 'beginner',
  },
  {
    slug: 'simple-animal-coloring-pages-for-2-year-olds',
    title: 'Simple Animal Coloring Pages for 2 Year Olds (Free Printable)',
    description:
      'Free printable animal coloring pages for 2 year olds — ultra-simple shapes, thickest outlines, friendly faces. Toddler-ready.',
    tagline: 'Ultra-simple shapes and the thickest outlines we make.',
    intro:
      "Coloring pages designed for 2-year-olds — the simplest shapes we make, the thickest outlines, the friendliest faces. Mostly toddler-sized animals: cow, dog, fish, bunny. Print a stack for a quiet morning, or make a custom one with your toddler's favourite animal.",
    tags: ['toddler', 'animal', 'simple'],
    difficulty: 'beginner',
  },

  // ────────────────────────────────────────────────────────────────────
  // Problem-solver ("painkiller") landings
  //
  // These target parents/teachers in distress mode looking for SOLUTIONS,
  // not browsing for cute images. Volume is lower than the tag landings
  // above but intent is much higher: searchers have a problem TODAY and
  // coloring is part of the answer.
  //
  // Copy guardrails (especially for neurodivergent/health-adjacent slugs):
  // - Descriptive, never therapeutic. "Many parents find this helpful"
  //   not "this treats / cures / fixes".
  // - Cite only reputable public sources (AAP, CHADD, NHS, NAS, Cleveland
  //   Clinic, Autism Speaks, AOTA). If unsure, leave researchCitation
  //   undefined.
  // - Never imply Chunky Crayon is a medical product.
  // - No em dashes in user-facing copy (commas, periods, colons only).
  //
  // Researched via scripts/research-problem-solver-landings.ts (Perplexity
  // Sonar). Add new entries via the same script + a human copy pass.
  // ────────────────────────────────────────────────────────────────────

  // --- Neurodivergent: ADHD, autism, sensory processing ---
  {
    slug: 'calming-coloring-pages-for-kids-with-adhd',
    title: 'Calming Coloring Pages for Kids with ADHD',
    description:
      'Quiet, low-stimulation coloring pages many parents find calming for kids with ADHD. Free, print-ready, no signup.',
    tagline: 'The post-school activity that actually holds their attention.',
    intro:
      'These pages lean on the patterns and repetition many parents of ADHD kids find calming after school or before bed. Bold outlines, simple shapes, nothing fiddly. Print one, or generate a custom calm page on whatever your kid is already obsessed with. Their interest does the heavy lifting.',
    tags: ['mandala', 'pattern', 'simple', 'calm'],
    angle: 'problem',
    targetAudience:
      'For parents of 5 to 10 year-olds with ADHD looking for a calm-down activity after school or before bed.',
    problemFraming:
      'School pick-up turns into hyperactive chaos. Bedtime is a battle. You need a structured, screen-free way to help your kid downshift. Most "quiet activities" don\'t hold their attention for 5 minutes.',
    researchCitation: {
      source: 'CHADD',
      claim:
        'Many parents report that structured creative activities like coloring help children with ADHD focus and self-regulate.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'focus-coloring-activities-for-adhd-children',
    title: 'Focus Coloring Activities for ADHD Children',
    description:
      'Coloring pages built for sustained focus. Repetitive patterns, bold outlines, clear sections. Free, print-ready, screen-free.',
    tagline: 'Small wins, repeated. The loop an ADHD brain stays with.',
    intro:
      "Sustained attention is hard. These pages use repeating patterns and clearly-bounded sections so kids can finish one segment, feel the win, and move to the next. It's the small-wins loop that keeps an ADHD brain engaged. Free to print, or generate a custom focus page on whatever they're locked in on this week.",
    tags: ['pattern', 'simple', 'mandala', 'repeating'],
    angle: 'problem',
    targetAudience:
      'For parents and teachers of school-age kids with ADHD who need a focus-friendly seat-work activity.',
    problemFraming:
      'Homework time turns into a redirect every 30 seconds. You want an activity that lets them practice sitting and focusing without it feeling like punishment.',
    researchCitation: {
      source: 'Cleveland Clinic',
      claim:
        'Repetitive fine-motor activities like coloring can support attention in children with ADHD.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'after-school-calming-coloring-for-adhd',
    title: 'After-School Calming Coloring for Kids with ADHD',
    description:
      'After-school wind-down coloring pages for kids with ADHD. Simple, calming, no screen. Free print-ready PDFs.',
    tagline: 'The 15 minutes between pickup and dinner, sorted.',
    intro:
      "Pickup to dinner is the bermuda triangle of the ADHD parent's day. Full backpack, full belly, full energy. These pages fill that window with something quiet and structured. Print a stack, keep them in the car or by the door, and have one ready before the meltdown hits.",
    tags: ['simple', 'animal', 'pattern', 'calm'],
    angle: 'problem',
    targetAudience:
      'For exhausted parents of elementary-age kids with ADHD who need a post-school wind-down.',
    problemFraming:
      "School pick-up unleashes a hyperactivity explosion. Every afternoon you swear you'll have a plan, and every afternoon it falls apart.",
    difficulty: 'beginner',
  },
  {
    slug: 'bedtime-coloring-routine-for-adhd-kids',
    title: 'Bedtime Coloring Routine for ADHD Kids',
    description:
      'Calm bedtime coloring pages for ADHD kids. Repetitive patterns, low stimulation, screen-free. Free printable PDFs.',
    tagline: 'The bedtime cue your kid will actually settle into.',
    intro:
      'Consistent quiet activities before bed are one of the most-recommended bedtime tools for ADHD families. These pages fit that slot: patterns and simple subjects you can hand over with a "this is what we do before teeth-brushing" and have it work without negotiation.',
    tags: ['simple', 'night', 'stars', 'calm', 'pattern'],
    angle: 'problem',
    targetAudience:
      'For parents fighting nightly bedtime battles with energetic ADHD kids.',
    problemFraming:
      "Bedtime ends in tears every night because your kid can't downshift from full speed to sleep. You've tried baths, books, melatonin. Nothing has stuck.",
    researchCitation: {
      source: 'CHADD',
      claim:
        'Consistent quiet activities before bed help many ADHD families establish reliable sleep routines.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'coloring-pages-for-autistic-children',
    title: 'Coloring Pages for Autistic Children',
    description:
      'Predictable, low-stimulation coloring pages many parents of autistic children find helpful for downtime, transitions, and sensory breaks.',
    tagline:
      'Predictable, low-stimulation. The structure many kids settle into.',
    intro:
      "These pages use simple repeating shapes and bold outlines. That predictability is what many parents of autistic children find calming for downtime or transition moments. Every kid is different, but bold-and-simple is usually a safer starting point than busy intricate scenes. Generate a custom page with your kid's special interest for the highest hit rate.",
    tags: ['simple', 'bold', 'pattern', 'repeating'],
    angle: 'problem',
    targetAudience:
      'For parents of autistic 4 to 8 year-olds seeking predictable, low-stimulation activities.',
    problemFraming:
      'Your kid gets overwhelmed by noisy toys, unpredictable play, or open-ended activities. You want something with clear edges and a clear ending they can do at their own pace.',
    researchCitation: {
      source: 'National Autistic Society',
      claim:
        'Many autistic children enjoy repetitive visual activities like coloring during downtime.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'sensory-friendly-coloring-for-autism',
    title: 'Sensory-Friendly Coloring for Autistic Kids',
    description:
      'Sensory-friendly coloring pages for autistic children. Bold outlines, tactile-friendly designs, low visual noise. Free print-ready.',
    tagline: 'Low visual noise, bold tactile lines, plenty of empty space.',
    intro:
      "These pages are designed with sensory load in mind. Bold outlines so the lines are easy to follow. Simple subjects so the visual field stays calm. Plenty of empty space so the page doesn't feel busy. Useful for sensory breaks at home or in the classroom. Generate a custom version if a specific special interest works best for your kid.",
    tags: ['tactile', 'bold', 'simple', 'pattern'],
    angle: 'problem',
    targetAudience:
      'For occupational therapists and parents building sensory diets for autistic kids.',
    problemFraming:
      'Sensory overload hits during transitions or free play, and shutdowns or meltdowns follow. You need a low-stimulation seated activity to anchor between higher-input moments.',
    researchCitation: {
      source: 'Autism Speaks',
      claim:
        'Visual and tactile activities like coloring can support sensory processing for some autistic children.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'transition-coloring-activities-autism',
    title: 'Transition Coloring Activities for Autistic Kids',
    description:
      'Calming coloring activities to ease transitions for autistic children. Predictable, finite, screen-free. Free printable PDFs.',
    tagline: 'A finite activity to bridge one thing to the next.',
    intro:
      "Transitions are one of the hardest parts of the day. These short, finite coloring activities sit in the gap. Hand over a page with a clear endpoint as the bridge from one demand to the next. They know what they're doing. They know when it ends. The switch lands softer.",
    tags: ['timer', 'simple', 'predictable', 'pattern'],
    angle: 'problem',
    targetAudience:
      'For parents and teachers supporting autistic kids through daily transitions.',
    problemFraming:
      "Meltdowns erupt every time it's time to switch activities. You've tried timers, visual schedules, and warning countdowns. They help. You need one more tool.",
    researchCitation: {
      source: 'National Autistic Society',
      claim:
        'Predictable, finite activities can aid transitions for many autistic children.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'sensory-processing-coloring-activities',
    title: 'Coloring Activities for Sensory Processing',
    description:
      'Coloring activities that provide tactile and visual sensory input. Useful for sensory-seeking and sensory-avoiding kids. Free printables.',
    tagline: 'Fine-motor sensory input, no equipment needed.',
    intro:
      'Coloring is one of the cheapest sensory tools in the house. It delivers tactile input through grip and pressure, visual input through pattern, and proprioceptive input through fine-motor effort. These pages are tuned for sensory-diet use: simple subjects, bold outlines, repeating textures to layer pressure on.',
    tags: ['tactile', 'bold', 'repeating', 'simple'],
    angle: 'problem',
    targetAudience:
      'For occupational therapists and parents addressing sensory seeking or avoiding behaviors.',
    problemFraming:
      "Your kid craves or avoids specific textures, sounds, or movement, and you're building a daily sensory diet. You need quiet seated options that still provide input.",
    researchCitation: {
      source: 'American Occupational Therapy Association',
      claim:
        'Fine-motor activities like coloring can provide sensory input that supports processing for some children.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'low-stimulation-coloring-for-neurodivergent',
    title: 'Low-Stimulation Coloring for Neurodivergent Kids',
    description:
      'Quiet, low-stimulation coloring pages for neurodivergent children. Minimal visual noise, bold simple outlines. Free PDFs.',
    tagline: 'The opposite of busy. Minimal pages by design.',
    intro:
      'Most printable coloring pages are visually busy. Fine for some kids, overwhelming for others. These pages strip it back: one subject, bold outline, plenty of empty space, nothing extra. Useful for kids who shut down or check out when a page is "too much".',
    tags: ['simple', 'pattern', 'mandala', 'minimal'],
    angle: 'problem',
    targetAudience:
      'For parents who need zero-pressure quiet time for sensory-sensitive kids.',
    problemFraming:
      "Overstimulation leads to shutdowns or outbursts. You want a quiet seated activity that doesn't add to the load.",
    difficulty: 'beginner',
  },
  {
    slug: 'special-interest-coloring-autistic-kids',
    title: 'Special-Interest Coloring Pages for Autistic Kids',
    description:
      "Custom coloring pages on your autistic child's special interest. Trains, dinosaurs, washing machines, anything. Free printable PDFs.",
    tagline: 'Any subject, any depth of obsession.',
    intro:
      "If your kid is locked in on trains, dinosaurs, washing machines, or some very specific niche, the standard coloring book won't cut it. This is where custom-generation actually shines. Type the exact subject and get a print-ready page in 30 seconds. Browse below for starting points, or just make the page they want.",
    tags: ['train', 'dinosaur', 'pattern', 'simple'],
    angle: 'problem',
    targetAudience:
      "For parents using their kid's special interest as the way in.",
    problemFraming:
      'Your kid engages for hours with their special interest and refuses everything else. Pre-made coloring books are too generic. They need the specific thing.',
    difficulty: 'beginner',
  },

  // --- School holiday / boredom ---
  {
    slug: 'summer-holiday-coloring-activities-kids',
    title: 'Summer Holiday Coloring Activities for Kids',
    description:
      'Screen-free coloring activities to fill the long summer holidays. Free printable PDFs, fresh themes weekly.',
    tagline: 'Six weeks of "I\'m bored", solved.',
    intro:
      'Summer holidays are a marathon. These coloring pages cover the themes kids actually want in summer: beach, garden, holiday adventures, ice cream, animals. And you can generate a custom page on whatever the obsession-of-the-week is. Build a stack at the start of the holidays. Pull one out whenever the boredom hits.',
    tags: ['summer', 'beach', 'adventure', 'holiday'],
    angle: 'problem',
    targetAudience:
      'For parents facing 6+ weeks of "I\'m bored" during summer break.',
    problemFraming:
      "It's week two and you've already burned through every play idea. The screen-time guilt is mounting. The budget for paid activities is finite.",
    difficulty: 'beginner',
  },
  {
    slug: 'half-term-coloring-ideas-for-kids',
    title: 'Half-Term Coloring Ideas for Kids',
    description:
      'Activities to fill UK half-term week. Screen-free coloring pages your kid will actually do. Free printable PDFs.',
    tagline: 'Five days off school, sorted.',
    intro:
      'Half-term sneaks up on you. These pages fill the gaps between trips out, playdates, and the inevitable rainy afternoon. Print a small stack at the start of the week, or have your kid generate a custom page on whatever they\'re into right now. Saves the "what now?" negotiation.',
    tags: ['outdoor', 'adventure', 'simple', 'fun'],
    angle: 'problem',
    targetAudience:
      'For UK parents looking for 5-day half-term survival activities.',
    problemFraming:
      'Short school break, cabin fever, mounting screen-time guilt. You need easy-win activities that take 30 seconds to set up.',
    difficulty: 'beginner',
  },
  {
    slug: 'may-half-term-activities-for-kids',
    title: 'May Half-Term Activities for Children',
    description:
      'May half-term coloring activities for kids. Spring themes, outdoor adventures, screen-free fun. Free printables.',
    tagline: 'Spring themes for sunny gardens and surprise rainy mornings.',
    intro:
      "May half-term lands in the lovely stretch between the end of winter and the chaos of summer. These pages lean into the spring vibe: gardens, butterflies, picnics, animals. They work for the days when it's nice enough to color in the garden, and the days when it's suddenly raining again.",
    tags: ['spring', 'outdoor', 'adventure', 'simple'],
    angle: 'problem',
    targetAudience: 'For UK parents prepping for late-spring half-term week.',
    problemFraming:
      'Spring half-term means activities that work for sunny garden afternoons and surprise rainy mornings. You want options that flex to both.',
    difficulty: 'beginner',
  },
  {
    slug: 'october-half-term-coloring-pack',
    title: 'October Half-Term Coloring Pack',
    description:
      'Autumn half-term coloring pages for UK kids. Halloween, leaves, cozy autumn themes. Free print-ready PDFs.',
    tagline: 'Autumn half-term, cozy themes ready to print.',
    intro:
      'October half-term lands right when the leaves are turning and the energy is shifting indoors. These pages match that mood: autumn leaves, friendly pumpkins, cosy animals, soft Halloween. Print one for the kitchen table on a grey afternoon, or generate a custom one in whatever direction the kid leans.',
    tags: ['autumn', 'halloween', 'pattern', 'leaf'],
    angle: 'problem',
    targetAudience:
      'For UK families filling autumn half-term with screen-free fun.',
    problemFraming:
      'Mid-term energy crash hits, the weather turns, and indoor activity options thin out fast.',
    difficulty: 'beginner',
  },
  {
    slug: 'bank-holiday-monday-kids-activities',
    title: 'Bank Holiday Monday Activities for Kids',
    description:
      'Bank holiday Monday activities for kids. Coloring pages and screen-free fun. Free printable PDFs.',
    tagline: 'Long weekend, short patience. Printables ready to go.',
    intro:
      'Bank holiday Mondays have that "one extra day to fill" energy. These pages are sized for it. Easy enough to grab and go. Varied enough that you\'ve got something for the post-park slump and the pre-dinner meltdown. Print a few before the weekend starts.',
    tags: ['picnic', 'outdoor', 'family', 'fun'],
    angle: 'problem',
    targetAudience:
      'For UK parents with bank holiday Monday kid-wrangling needs.',
    problemFraming:
      'An extra day off means an extra day of "I\'m bored" complaints. The novelty of the long weekend wears off by mid-morning.',
    difficulty: 'beginner',
  },
  {
    slug: 'rainy-day-coloring-activities-for-kids',
    title: 'Rainy Day Coloring Activities for Kids',
    description:
      "Rainy day activities for kids. Coloring pages for the days you're stuck inside. Free print-ready PDFs.",
    tagline: 'Stuck inside? These print in 30 seconds.',
    intro:
      'Rain-trapped weekend energy needs a quiet outlet. These pages cover the cozy-indoor themes: animals, patterns, gentle adventures. You can generate a custom one on whatever the kid is currently obsessed with. The day is going to be long either way. These stretch it usefully.',
    tags: ['indoor', 'animal', 'pattern', 'cozy'],
    angle: 'problem',
    targetAudience:
      'For parents stuck inside with cabin-fever kids on wet weekends.',
    problemFraming:
      'Rain traps everyone indoors. Tempers shorten. Screens beckon. You need a screen-free option that actually holds attention.',
    difficulty: 'beginner',
  },
  {
    slug: 'snow-day-coloring-fun-for-children',
    title: 'Snow Day Coloring Pages for Kids',
    description:
      'Snow day activities for kids. Winter coloring pages that work when school closes unexpectedly. Free printable PDFs.',
    tagline: "School closed? These print before the kettle's boiled.",
    intro:
      'Snow day declarations come fast, and you have about 12 minutes before the question starts: "so what are we DOING today?". These pages cover winter themes (snowmen, animals, cozy indoor scenes). One click generates a custom one on whatever the snow-day mood is. Print a few once and you\'re covered for the next surprise closure too.',
    tags: ['winter', 'snowman', 'pattern', 'cozy'],
    angle: 'problem',
    targetAudience:
      'For parents with unexpected school closures who need instant activities.',
    problemFraming:
      'School closes on a Tuesday at 7am. Your whole day plan is upended. Your kid is bouncing off the walls.',
    difficulty: 'beginner',
  },

  // --- Emotional regulation ---
  {
    slug: 'back-to-school-anxiety-coloring',
    title: 'Back-to-School Anxiety Coloring Pages',
    description:
      'Coloring pages for kids feeling anxious about going back to school. Friendly classroom scenes, calming patterns. Free PDFs.',
    tagline: 'Friendly school scenes, before the first day arrives.',
    intro:
      "Many kids find the run-up to September harder than the first day itself. These pages put friendly versions of the things they're worrying about onto the page: school buses, classrooms, new uniform, packed lunches. They can color through the conversation. Generate a custom one with your kid's actual new teacher's name or school colors if it helps.",
    tags: ['school', 'bus', 'classroom', 'simple'],
    angle: 'problem',
    targetAudience:
      'For parents prepping nervous kids for the start of a new school year.',
    problemFraming:
      'Summer\'s end brings stomachaches, clingy bedtime, and "I don\'t want to go" tears. You want a low-pressure way to talk about the worries before they hit.',
    difficulty: 'beginner',
  },
  {
    slug: 'anxiety-coloring-pages-for-kids',
    title: 'Coloring Pages for Anxious Children',
    description:
      'Mindful coloring pages many parents find calming for anxious children. Simple repetitive patterns. Free print-ready PDFs.',
    tagline: 'The mindful-coloring effect, without the adult complexity.',
    intro:
      'Mindful coloring (pages with repeating patterns that engage the hands while quieting the brain) is one of the most-recommended low-stakes anxiety tools for kids. These pages keep the pattern but strip the complexity: kid-appropriate subjects, bold outlines, no expectation of finishing. Useful for the pre-bedtime spiral or the stomachache-before-school morning.',
    tags: ['mandala', 'butterfly', 'nature', 'calm'],
    angle: 'problem',
    targetAudience:
      'For parents helping 5 to 10 year-olds manage school, social, or storm anxiety.',
    problemFraming:
      "Stomachaches and worry keep your kid up at night. The conversations help. You need a tool you can hand them in the moment when talking isn't working.",
    researchCitation: {
      source: 'American Academy of Pediatrics',
      claim:
        'Mindful coloring activities can help children manage anxiety in everyday situations.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'anger-management-coloring-kids',
    title: 'Calm-Down Coloring for Angry Kids',
    description:
      'Calm-down coloring pages for kids dealing with big anger. Repetitive patterns for the meltdown aftermath. Free PDFs.',
    tagline: 'For the come-down, not the tantrum itself.',
    intro:
      "Coloring won't stop a tantrum mid-rage. It's one of the best ways to fill the awkward 20 minutes afterward, when your kid is still upset but the wave is breaking. These pages are designed for that moment: pressure-friendly bold outlines, repetitive patterns that keep hands busy while everyone resets.",
    tags: ['mandala', 'pattern', 'deep-pressure', 'calm'],
    angle: 'problem',
    targetAudience:
      'For parents de-escalating tantrums and big feelings in 4 to 8 year-olds.',
    problemFraming:
      'Rage episodes disrupt family peace multiple times a day. After the eruption, your kid is still cranky. You need a way to reset without negotiation.',
    researchCitation: {
      source: 'Cleveland Clinic',
      claim:
        'Coloring can provide a healthy outlet for emotional expression in children.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'big-feelings-coloring-activities',
    title: 'Big-Feelings Coloring Activities for Kids',
    description:
      'Coloring pages for kids with big feelings. Emotion faces, calming mandalas, conversation-starter pages. Free PDFs.',
    tagline: "Color the feeling. Talk about it later (or don't).",
    intro:
      "Some kids talk about their feelings. Some absolutely won't, but they will color them. These pages are conversation starters: emotion faces, weather-of-feelings scenes, and calm-down mandalas you can hand over and let them lead. Generate a custom one with their character if that's the version they engage with.",
    tags: ['emotion', 'face', 'mandala', 'pattern'],
    angle: 'problem',
    targetAudience:
      'For parents teaching emotional vocabulary to preschool and early-elementary kids.',
    problemFraming:
      'Your kid can\'t name or handle overwhelming emotions, and the standard "use your words" isn\'t landing. You want a sideways angle into the conversation.',
    difficulty: 'beginner',
  },
  {
    slug: 'new-sibling-coloring-distraction',
    title: 'Coloring Activities for Kids with a New Baby Sibling',
    description:
      'Coloring pages for the big-kid transition to new sibling. Family scenes, special "just for them" pages. Free PDFs.',
    tagline: 'Made for the big kid in the room.',
    intro:
      "New babies are wonderful, and they suck up everything for a few months. These pages give the older sibling a thing that is just theirs. Color a portrait of them with their new sibling, a family scene, or whatever they're into that has nothing to do with the baby. Custom-generated pages on their special interest land especially well during this transition.",
    tags: ['baby', 'family', 'big-kid', 'adventure'],
    angle: 'problem',
    targetAudience:
      'For new parents keeping the older child occupied and feeling seen.',
    problemFraming:
      'The new baby is taking 90% of your attention. The older sibling is showing jealousy, regression, or clinginess. You have approximately zero spare hands.',
    difficulty: 'beginner',
  },
  {
    slug: 'divorce-transition-coloring-kids',
    title: 'Coloring Activities for Kids During Big Family Changes',
    description:
      'Quiet coloring activities for kids navigating family transitions. Separation, divorce, moving house. Free printable PDFs.',
    tagline: 'A predictable activity that travels between two homes.',
    intro:
      "When the family routine is changing, predictable activities are quiet gold. Coloring pages travel. The same activity at mum's house and dad's house. The same activity in the new house and the visiting grandparents' house. These pages lean into the homey-and-secure end of the catalogue. Print a stack that lives in their bag.",
    tags: ['home', 'family', 'simple', 'calm'],
    angle: 'problem',
    targetAudience:
      'For co-parenting families providing stability amid change.',
    problemFraming:
      'Family upheaval leaves your kid insecure and clingy. You want a tiny stable thing they can carry with them across the changing routine.',
    difficulty: 'beginner',
  },

  // --- Sensory / classroom ---
  {
    slug: 'quiet-classroom-coloring-activities',
    title: 'Quiet Classroom Coloring Activities',
    description:
      'Quiet seat-work coloring pages for classrooms. Early finisher activities, indoor recess, transition fillers. Free PDFs.',
    tagline: 'Print a stack for the early-finisher box.',
    intro:
      "Designed for the classroom moments where you need quiet seat-work fast: early finishers, indoor recess, the last 10 minutes before pickup. These pages are simple enough that no one needs help, and varied enough that you're not photocopying the same butterfly all term. Free to print as many as your photocopier can handle.",
    tags: ['simple', 'small', 'pattern', 'independent'],
    angle: 'problem',
    targetAudience:
      'For teachers filling indoor recess or early-finisher time.',
    problemFraming:
      'No outdoor recess means classroom chaos. Early finishers disrupt the kids still working. You need a no-fuss quiet activity that runs itself.',
    difficulty: 'beginner',
  },
  {
    slug: 'quiet-time-coloring-preschool',
    title: 'Quiet-Time Coloring for Preschool',
    description:
      'Quiet-time coloring pages for preschool nap-resistant kids. Simple, cozy, screen-free. Free print-ready PDFs.',
    tagline: "For the toddlers who won't nap but need to slow down.",
    intro:
      'Some preschoolers nap. Some absolutely will not. The non-nappers still need a slow-down hour. These pages are tuned for that: cozy subjects, bold outlines, low-stimulation. Roll out a mat, hand them a page and a tin of crayons, and the room runs quiet.',
    tags: ['simple', 'book', 'cozy', 'pattern'],
    angle: 'problem',
    targetAudience:
      'For nursery workers and childminders managing nap-resistant toddlers.',
    problemFraming:
      "Half the room naps. Half doesn't. The non-nappers wake the nappers. You need a calm individual activity for the non-nap half.",
    difficulty: 'beginner',
  },
  {
    slug: 'occupational-therapy-coloring-sheets',
    title: 'Occupational Therapy Coloring Sheets',
    description:
      'Coloring sheets for occupational-therapy home carry-over. Fine motor, pencil grasp, visual-motor. Free PDFs.',
    tagline: 'OT home-carryover sheets for fine-motor practice.',
    intro:
      "Coloring is one of the most-recommended home-carryover activities for fine-motor and pencil-grasp work. These sheets are tuned for that use: clearly-bounded sections for visual-motor practice, varied line direction for stroke practice, bold enough that the page itself doesn't add cognitive load. Generate custom subjects if a specific motivator (cars, animals, characters) helps engagement.",
    tags: ['fine-motor', 'pattern', 'graded', 'simple'],
    angle: 'problem',
    targetAudience:
      'For occupational therapists prescribing home carry-over, and parents continuing OT work between sessions.',
    problemFraming:
      "Your kid's OT recommended fine-motor practice at home, but you've run out of fresh worksheets. You need a steady supply with the right characteristics.",
    researchCitation: {
      source: 'American Occupational Therapy Association',
      claim:
        'Coloring activities develop fine motor and visual-motor skills important for school readiness.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'sensory-break-coloring-classroom',
    title: 'Sensory-Break Coloring for the Classroom',
    description:
      '5-minute sensory-break coloring pages for the classroom. Quick, simple, calming. Free print-ready PDFs.',
    tagline: '5-minute resets between lessons.',
    intro:
      'Short sensory breaks improve focus and regulation for many students. These pages are designed for that 5-minute slot between transitions: small, simple, finishable. Keep a stack at the back of the room and let kids grab one when they need a reset, or hand them out as a whole-class transition tool.',
    tags: ['quick', 'simple', 'pattern', 'desk'],
    angle: 'problem',
    targetAudience:
      'For teachers building short sensory breaks into a busy classroom day.',
    problemFraming:
      "Wiggly kids disrupt lessons every 20 minutes. You need a fast, repeatable reset that doesn't blow up the lesson plan.",
    researchCitation: {
      source: 'American Occupational Therapy Association',
      claim:
        'Short sensory breaks can support focus and self-regulation for students throughout the school day.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'sensory-friendly-classroom-coloring',
    title: 'Sensory-Friendly Classroom Coloring',
    description:
      'Sensory-friendly coloring activities for inclusive classrooms. Low visual noise, bold outlines, predictable layouts. Free PDFs.',
    tagline: 'Low-stim coloring for neurodiverse classrooms.',
    intro:
      "Inclusive classrooms need activity materials that don't add sensory load. These pages keep the visual field simple: one subject per page, bold outline, plenty of empty space, no fine detail. Useful for IEP and 504 plans, sensory rooms, and any classroom that wants a low-stim default.",
    tags: ['low-stimulation', 'simple', 'bold', 'pattern'],
    angle: 'problem',
    targetAudience:
      'For inclusive educators supporting neurodiverse classrooms.',
    problemFraming:
      'Bright lights and busy worksheets overwhelm your sensitive students. You need calmer alternatives that fit the lesson without standing out.',
    difficulty: 'beginner',
  },

  // --- Sick day / quiet day ---
  {
    slug: 'sick-day-coloring-activities-for-kids',
    title: 'Sick-Day Coloring Activities for Kids',
    description:
      'Quiet coloring activities for sick kids. Cozy themes, low energy, screen-friendly alternative. Free print-ready PDFs.',
    tagline: "For the day everyone's on the sofa.",
    intro:
      'Sick days are long. Coloring is one of the few activities that holds attention without demanding energy. Useful for the post-tantrum, pre-nap, bone-tired middle hours. These pages keep the subjects cozy and the demands low. The screen-glare alternative when the iPad has been used up.',
    tags: ['simple', 'cozy', 'animal', 'bed'],
    angle: 'problem',
    targetAudience:
      'For parents bedside with low-energy kids recovering from illness.',
    problemFraming:
      "Your kid is too poorly for active play but too awake for sleep. You need a screen-alternative that doesn't demand any energy.",
    researchCitation: {
      source: 'NHS',
      claim:
        "Quiet creative activities can support rest and recovery in children when they're unwell.",
    },
    difficulty: 'beginner',
  },
  {
    slug: 'low-energy-day-coloring-for-kids',
    title: 'Low-Energy Day Coloring for Kids',
    description:
      'Quiet seated coloring activities for low-energy days. No fevers, just slow. Free print-ready PDFs.',
    tagline: "For the days that aren't sick but aren't full-speed either.",
    intro:
      "Not every quiet day is a sick day. Sometimes kids are just slow. Post-party, post-late-bedtime, post-big-week. These pages match that pace: simple subjects, gentle scenes, nothing demanding. The day doesn't need to be productive. It just needs to pass kindly.",
    tags: ['simple', 'seated', 'minimal', 'pattern'],
    angle: 'problem',
    targetAudience: 'For parents with lethargic kids on slow recovery days.',
    problemFraming:
      'No fevers, but no energy for active play either. You need activities that fit the low-watt mood.',
    difficulty: 'beginner',
  },
  {
    slug: 'hospital-waiting-room-coloring-kids',
    title: 'Hospital Waiting-Room Coloring for Kids',
    description:
      'Portable coloring activities for hospital waiting rooms. Small format, simple, calming. Free printable PDFs.',
    tagline: 'Print and stuff in the bag before the appointment.',
    intro:
      'Hospital waiting rooms are long and stressful for everyone. These pages travel. Print 4-up, fold into a bag, hand over with a tin of pencils when the wait stretches past patience. Subjects are simple and calming on purpose: nothing that needs explaining, nothing that demands focus.',
    tags: ['simple', 'portable', 'quick', 'pattern'],
    angle: 'problem',
    targetAudience:
      'For stressed parents in medical waiting areas with fidgety kids.',
    problemFraming:
      "The appointment was meant to take 30 minutes and it's been 90. Your kid is hungry, bored, and starting to crack. The waiting-room toys are not toys.",
    difficulty: 'beginner',
  },
  {
    slug: 'post-illness-quiet-coloring-activities',
    title: 'Post-Illness Quiet Coloring Activities',
    description:
      'Coloring activities for kids easing back to activity after illness. Gentle, simple, low-stimulation. Free PDFs.',
    tagline: 'For the stretch between sick-day and back-to-normal.',
    intro:
      "There's a stretch after illness where the energy is back but rough play isn't a great idea yet. These pages fit there: gentle subjects, simple scenes, enough engagement to feel normal without the demands. Useful for the day before school goes back too.",
    tags: ['gentle', 'simple', 'animal', 'cozy'],
    angle: 'problem',
    targetAudience:
      'For parents easing kids back to activity after flu or cold.',
    problemFraming:
      "Your kid has the energy of a recovered kid but the immune system of a half-recovered one. You want bridge activities that aren't full play.",
    difficulty: 'beginner',
  },
  {
    slug: 'quiet-hour-coloring-after-lunch',
    title: 'Quiet-Hour Coloring After Lunch',
    description:
      'After-lunch quiet-time coloring pages for preschool and home. Calming, simple, screen-free. Free print-ready PDFs.',
    tagline: 'Build the after-lunch calm hour into the daily routine.',
    intro:
      "Post-lunch is the natural energy dip in most kids' days. Lean into it. A mandatory 30-minute quiet hour with a coloring page and a tin of crayons. These pages support that: simple, slow, no demands. Build the habit once and the rest of the afternoon goes smoother.",
    tags: ['simple', 'pattern', 'calm', 'rest'],
    angle: 'problem',
    targetAudience:
      'For parents and caregivers building an afternoon calm period into the daily routine.',
    problemFraming:
      'Post-lunch energy crash hits and the afternoon goes sideways. You need a structured quiet block before the second wind kicks in.',
    difficulty: 'beginner',
  },

  // --- Screen replacement ---
  {
    slug: 'screen-free-activities-for-6-year-olds',
    title: 'Screen-Free Activities for 6 Year Olds',
    description:
      'Print-and-color activities for 6 year olds. Adventurous themes, kid-led independence, free PDFs.',
    tagline: 'The screen-time-fight backup plan.',
    intro:
      'Six-year-olds are at the age where independent quiet time is finally possible. Only if the alternative is interesting enough. Print one of these pages (fully screen-free) and walk away, or let them color in the app instead, much calmer screen time than YouTube. Either way, generate a custom page on whatever obsession is winning this week.',
    tags: ['adventure', 'animal', 'simple', 'outdoor'],
    angle: 'problem',
    targetAudience:
      'For parents enforcing daily screen limits on school-age kids.',
    problemFraming:
      'iPad battles happen every evening. The screen-time rules are clear. The alternatives are not.',
    researchCitation: {
      source: 'American Academy of Pediatrics',
      claim:
        'Creative hands-on activities support healthy development whether on paper or on a focused, finite digital activity.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'ipad-alternatives-coloring-activities',
    title: 'iPad Alternatives: Coloring Activities for Kids',
    description:
      'Coloring activities to replace passive iPad time. Print fully screen-free, or color in-app as a calmer screen alternative to YouTube.',
    tagline: 'Print it out, or color in-app instead of YouTube.',
    intro:
      'iPad alternatives are everywhere. Most require setup, supervision, or buy-in. Coloring is the rare one that flexes. Print a page for fully screen-free time. Or let them color in the app: still a screen, but a focused, finite, creative one (not passive scrolling). These pages are sized for laps, simple enough that no one has to come help.',
    tags: ['portable', 'simple', 'adventure', 'quick'],
    angle: 'problem',
    targetAudience:
      'For parents prying devices from kids in restaurants, cars, and waiting rooms.',
    problemFraming:
      "Every outing comes with a screen battle. You want an alternative that's either fully screen-free or at least a calmer screen than YouTube and TikTok.",
    difficulty: 'beginner',
  },
  {
    slug: 'no-screen-travel-coloring-pack',
    title: 'No-Screen Travel Coloring Pack',
    description:
      'Print-and-go car-trip coloring pages. Sized for laps, kid-friendly themes, travel-ready. Free print-ready PDFs.',
    tagline: 'Print before the trip. Survive the drive.',
    intro:
      "Long-drive screen battles are a parent rite of passage. These pages are packaged for the car: lap-sized, simple enough to do unsupervised, varied enough that a kid won't burn through them in 20 minutes. Print the pack the night before, drop it in their backpack, drive. The print-out route is fully screen-free; the app is there as a calmer fallback when paper runs out.",
    tags: ['travel', 'vehicle', 'map', 'simple'],
    angle: 'problem',
    targetAudience: 'For road-tripping parents banning backseat tablets.',
    problemFraming:
      'Long drives turn into "are we there yet?" every 5 minutes, and the iPad is the lazy default. You want a real screen-free pack that survives a 4-hour trip.',
    difficulty: 'beginner',
  },
  {
    slug: 'digital-detox-coloring-kids',
    title: 'Digital Detox Coloring Activities for Kids',
    description:
      'Coloring activities to anchor family digital-detox days. Print fully screen-free, or use the app as the gentle middle ground.',
    tagline: 'The default activity for screen-free family time.',
    intro:
      "Digital-detox days run smoother when there's a default activity to fall back on. Coloring is the easiest one. Print the page for genuinely screen-free time. (The in-app version exists too, useful for the moments when full screen-free isn't realistic, but for a detox day, the printed page is the point.) These pages skew toward nature and family scenes, the calmer end of the spectrum.",
    tags: ['nature', 'pattern', 'family', 'simple'],
    angle: 'problem',
    targetAudience:
      'For families committing to weekend or holiday screen breaks.',
    problemFraming:
      "Everyone's grumpy from too much screen time. The detox keeps falling apart by lunchtime. You need an easy default activity that runs itself.",
    researchCitation: {
      source: 'American Academy of Pediatrics',
      claim:
        'Screen-free play enhances creativity, family bonding, and child development.',
    },
    difficulty: 'beginner',
  },
  {
    slug: 'evening-screen-free-coloring-routine',
    title: 'Evening Screen-Free Coloring Routine',
    description:
      'Print-and-color pages for the evening wind-down. Calming themes, bedtime-friendly. Free print-ready PDFs.',
    tagline: 'The post-dinner alternative to switching the TV on.',
    intro:
      'The hour between dinner and bedtime is when most families cave to a screen. Print one of these pages and you have a fully screen-free alternative. Calm themes (night scenes, stars, animals, gentle patterns), simple enough that the kid can do it solo while you finish the kitchen, finite enough that it ends naturally before bedtime. If they want to color on the iPad instead, the app version is far calmer than the TV, but the print route is what makes this a real wind-down.',
    tags: ['night', 'stars', 'family', 'calm'],
    angle: 'problem',
    targetAudience:
      'For families replacing after-dinner TV with a calmer wind-down.',
    problemFraming:
      'After-dinner TV pushes bedtime later every night and the blue light is wrecking sleep. You want a real alternative for that 7 to 8pm slot.',
    difficulty: 'beginner',
  },
];

export const getLandingPageBySlug = (slug: string) =>
  LANDING_PAGES.find((p) => p.slug === slug);

/**
 * Theme-angle landings (visual style: animals, holidays, characters, ages).
 * Default angle when none specified.
 */
export const getThemeLandings = () =>
  LANDING_PAGES.filter((p) => (p.angle ?? 'theme') === 'theme');

/**
 * Problem-solver landings (use-case: ADHD/autism support, holiday boredom,
 * emotional regulation, sensory, sick days, screen replacement).
 */
export const getProblemLandings = () =>
  LANDING_PAGES.filter((p) => p.angle === 'problem');

/**
 * Find landings related to the given slug, ranked by shared-tag count.
 *
 * Used to render a "Related coloring page collections" block at the
 * bottom of each landing page. Internal cross-linking like this:
 *  - Builds topical-authority clusters Google rewards
 *  - Keeps landing pages from being SEO orphans (orphans lose authority)
 *  - Distributes traffic to landings that don't yet rank
 *
 * The match heuristic is intentionally simple: count tag overlap, sort
 * desc, take the top N. Falls back to same-angle siblings when no
 * tag overlap exists.
 */
export const getRelatedLandings = (
  slug: string,
  limit = 4,
): LandingPageConfig[] => {
  const source = getLandingPageBySlug(slug);
  if (!source) return [];
  const sourceTags = new Set(source.tags);
  const sourceAngle = source.angle ?? 'theme';

  const scored = LANDING_PAGES.filter((p) => p.slug !== slug).map((p) => {
    const sharedTags = p.tags.filter((t) => sourceTags.has(t)).length;
    // Same-angle siblings get a small boost so a problem-landing's
    // related block leans toward other problem-landings, and vice versa.
    const angleBonus = (p.angle ?? 'theme') === sourceAngle ? 0.5 : 0;
    return { landing: p, score: sharedTags + angleBonus };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0)
    .slice(0, limit)
    .map((s) => s.landing);
};
