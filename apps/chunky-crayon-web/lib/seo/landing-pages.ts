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
];

export const getLandingPageBySlug = (slug: string) =>
  LANDING_PAGES.find((p) => p.slug === slug);
