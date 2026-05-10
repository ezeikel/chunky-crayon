/**
 * Bundle hero profiles — internal source of truth for character identity.
 *
 * Each bundle has a small cast of recurring hero characters (3-4 typical).
 * Profiles drive:
 *   - Reference-image generation (the per-character ref prompts)
 *   - Page generation (which heroes to feed in as conditioning refs per page)
 *   - QA gate (signature-detail checks per page — "does Rex still have his
 *     headphones?")
 *
 * Names are internal. We can surface them on the product page later if we
 * want, but the page line art itself stays text-free.
 *
 * When adding a new bundle, copy the DinoDanceParty pattern:
 *   1. Define 3-4 heroes with internal name + species + signature details
 *   2. Write the per-character reference-sheet prompt (used to generate the
 *      ref image once)
 *   3. Map each of the 10 page numbers to the heroes that appear on it
 */

export type Hero = {
  /** Internal id, kebab-case. Used in R2 paths and ref filenames. */
  id: string;
  /** Internal display name (Rex, Spike, Zip, Dots). Not user-facing yet. */
  name: string;
  /** Species, used in QA checks. */
  species: string;
  /**
   * The non-negotiable details that define this character. QA gate checks
   * each one is visible and recognisable on every page the hero appears on.
   * Keep concise — these become checkbox items in the QA prompt.
   */
  signatureDetails: readonly string[];
  /**
   * Reference-sheet prompt fed to gpt-image-2 once to generate this hero's
   * canonical reference image. Output is reused as conditioning for every
   * page the hero appears on.
   */
  referenceSheetPrompt: string;
  /**
   * One short, kid-friendly line of personality. Surfaced on the bundle
   * product page's "Meet the cast" switcher so kids can put a face to the
   * name. Optional — UI falls back to a formatted signatureDetail if absent.
   */
  funFact?: string;
};

export type HeroBundle = {
  /** Bundle slug (matches Prisma Bundle.slug). */
  slug: string;
  /** Internal cast roster. */
  heroes: readonly Hero[];
  /**
   * For each page (1-indexed), which hero ids appear. Heroes drive
   * conditioning refs at generation time and signature-detail checks at QA
   * time. An empty array means the page is incidentals-only and uses brand
   * style refs alone.
   */
  pageCast: Readonly<Record<number, readonly string[]>>;
  /**
   * Page-by-page scene prompts, 1-indexed (pagePrompts[0] = page 1).
   * Fed to gpt-image-2 along with hero conditioning refs at generation
   * time. Scene-only — the brand style block + character continuity hints
   * are appended by the generation pipeline.
   */
  pagePrompts: readonly string[];
};

export const DINO_DANCE_PARTY: HeroBundle = {
  slug: "dino-dance-party",
  heroes: [
    {
      id: "rex",
      name: "Rex",
      species: "T-rex",
      signatureDetails: [
        "oversized round headphones with a thick band over the head",
        "big rounded snout, slightly upturned",
        "three small rounded ridge-bumps along the back",
        "thick tail with two stripe-bands near the tip",
        "stubby T-rex arms with three rounded fingers",
      ],
      referenceSheetPrompt: `A friendly cartoon T-rex character standing centered on a plain white background, facing slightly to the side in a relaxed pose. Big rounded snout with a happy half-smile, wide eyes with chunky pupils, three small rounded ridge-bumps along the back. Wearing oversized round headphones with a thick band over the head, like a DJ. Stubby T-rex arms with three rounded fingers, sturdy legs with three toes, thick tail with two stripe-bands near the tip. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`,
      funFact:
        "Rex picks every song at the dance party. He never takes his headphones off, not even to sleep.",
    },
    {
      id: "spike",
      name: "Spike",
      species: "Stegosaurus",
      signatureDetails: [
        "six heart-shaped back plates running down the spine",
        "round body with a small round head",
        "thick tail with two rounded soft-edge spikes near the tip",
        "stubby legs with three rounded toes",
      ],
      referenceSheetPrompt: `A friendly cartoon stegosaurus character standing centered on a plain white background, facing slightly to the side. Round body, small round head with a gentle smile, six heart-shaped back plates running down the spine and getting smaller toward the tail. Stubby legs with three rounded toes each, thick tail with two rounded soft-edge spikes near the tip. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`,
      funFact:
        "Spike counts the heart-shaped plates on his back when he's nervous. There are six. Always six.",
    },
    {
      id: "zip",
      name: "Zip",
      species: "Velociraptor",
      signatureDetails: [
        "small tuft of three rounded feathers on top of the head",
        "two thick striped wrist bands, one on each arm",
        "slim two-legged body with a long whippy tail",
        "pointy snout with one small visible tooth",
      ],
      referenceSheetPrompt: `A friendly cartoon velociraptor character standing centered on a plain white background, facing slightly to the side. Slim two-legged body in a relaxed pose, pointy snout with a cheeky grin showing one small tooth, wide eye with a chunky pupil. A small tuft of three rounded feathers on top of the head, like a punk crest. Two striped wrist bands are required — one on each arm — drawn as thick wide bands with three or four horizontal stripes, clearly visible at each wrist. Long whippy tail with a slight curl at the tip. Three-fingered hands, three-toed feet. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`,
      funFact:
        "Zip is the fastest dancer on the dance floor. Her feather mohawk bounces when she spins.",
    },
    {
      id: "dots",
      name: "Dots",
      species: "Ankylosaurus",
      signatureDetails: [
        "smooth dome of armor with no spiky scales along the edge",
        "big round polka-dot spots scattered across the armor",
        "soft rounded ball-shaped tail club",
        "four stubby legs with three round toes each",
      ],
      referenceSheetPrompt: `A friendly cartoon ankylosaurus dinosaur character standing centered on a plain white background in profile view, facing slightly toward the viewer. This is a DINOSAUR, not a turtle and not a tortoise. Dinosaur head shape clearly visible at the front: a low-slung snout with wide nostrils, big friendly eye, small horn nubs at the back of the head. Body posture is low and wide on four clearly visible stubby legs, each with three round toes. The back is covered in a smooth dome of armor — the armor edge is a single smooth curved line all the way around the back, with no spiky scales or triangular plates. Big round polka-dot spots scattered evenly across the armor. The tail extends out behind the body and ends in a soft rounded ball-shaped club at the very tip. Gentle smile. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`,
      funFact:
        "Dots taps his round tail club to keep the beat. He thinks he's the band, the rest of the cast disagree.",
    },
  ],
  pageCast: {
    1: ["rex"],
    2: ["spike"],
    3: ["zip"],
    4: [],
    5: [],
    6: [],
    7: ["rex", "zip"],
    8: ["spike"],
    9: ["dots", "spike"],
    10: ["rex", "zip"],
  },
  // Pages 9-10 split per the spike: 4-character ensembles broke down in
  // gpt-image-2 even with 16 refs. ≤2 heroes per page is the safe ceiling.
  // Page 9 = Dots joins (Spike welcomes). Page 10 = Rex + Zip DJ finale.
  // Pages 4-6 are deliberately incidentals-only — supporting cast (baby
  // triceratops, brachiosaurus, pterodactyl) appears once each so kids
  // don't get fatigued seeing only the hero quartet across all 10 pages.
  pagePrompts: [
    // page 1
    "A friendly cartoon T-rex standing facing the viewer in a jungle clearing, wearing oversized headphones, both stubby T-rex arms raised up in front of his chest with both hands clearly visible (each hand showing its rounded fingers separately), mouth wide open in a happy roar, palm trees behind",
    // page 2
    "A friendly cartoon stegosaurus standing in a 3/4 angle view (slightly facing the viewer with body turned to show the back), all six heart-shaped back plates clearly visible across the spine in heart-shape silhouette, dancing on a flat rock stage, two baby pterodactyls clapping in the sky behind",
    // page 3
    "A cheeky velociraptor breakdancing on its claws, one foot spinning, palm leaves and bananas flying around it",
    // page 4
    "A baby triceratops practicing dance moves with balloons tied to its three horns",
    // page 5
    "A long-necked brachiosaurus stretching its neck up to reach the highest dance trophy on a shelf",
    // page 6
    "A pterodactyl flying through a rainbow while holding disco balls in its claws",
    // page 7
    "Two friendly cartoon dinosaurs performing a duet on a small rock stage. On the LEFT: a T-rex facing the viewer wearing oversized round headphones, both stubby T-rex arms raised holding two drumsticks above a small bone-drum kit, both arms fully extended forward (NOT held against the body). On the RIGHT: a velociraptor facing the viewer with a small punk-feather tuft on its head, ONE arm raised straight up high above its head holding a microphone (this raised arm clearly shows the wrist with its striped band), the OTHER arm down by its side (this arm also shows the wrist with its striped band). Both wrist bands MUST be clearly visible — they are wide horizontal stripes drawn at each wrist. Simple jungle backdrop, music notes floating around. Both characters fully visible, no overlap.",
    "A friendly cartoon stegosaurus alone in the foreground in a 3/4 angle view (body turned to show the back), all six clearly heart-shaped back plates visible down the spine — these plates have the distinctive heart silhouette (rounded top with V-notch), NOT round and NOT polka-dot spots. The body has plain skin with NO spots, NO polka dots — just heart-shaped plates on the back. Stegosaurus is dancing on its hind legs in a celebratory pose in front of a plain cone-shaped volcano that's gently erupting heart-shaped confetti into the sky. The volcano is just a plain landscape volcano — NO face on the volcano, NO eyes, NO mouth, NO smile — it is not a character, just a normal mountain shape. Stegosaurus is the only character on this page.",
    // page 9 (was previously the shy ankylosaurus joining; now the Dots+Spike scene leading into finale)
    "Two friendly cartoon dinosaurs side by side on a flat rock stage. On the LEFT: an ankylosaurus in a 3/4 angle view (body turned to show the back), smooth dome of armor with big round polka-dot spots clearly visible, a few star-shaped glow stickers stuck on the dotted armor, soft rounded tail club, looking happy. On the RIGHT: a stegosaurus in a 3/4 angle view (body turned to show the back), all heart-shaped back plates clearly visible across the spine, both front legs raised cheering. Both characters fully visible, no overlap, dancing-in-celebration mood.",
    // page 10 (split-finale: Rex DJing + Zip dancing on a tall rock under a starry sky)
    "An epic finale scene of a dinosaur dance party at midnight on top of a TALL DRAMATIC ROCK PEAK silhouetted against a starry night sky filled with fireworks of music notes, swirling confetti, and constellations. On the LEFT atop the peak: a T-rex facing the viewer wearing oversized round headphones, both stubby T-rex arms raised up high above his head in a triumphant DJ pose, rounded fingers fanned out, behind a tall stacked-rock turntable. On the RIGHT atop the peak: a velociraptor facing the viewer with a small punk-feather tuft on its head, ONE arm raised high overhead in a dance pose (clearly showing the striped wrist band), the OTHER arm extended out to the side (also clearly showing the striped wrist band). Both wrist bands MUST be clearly visible. Below the peak: a darker silhouetted jungle and distant volcano. Above: a huge starry sky with crescent moon, music note fireworks bursting in three places, swirling streamers. The composition feels like the climactic moment of the whole bundle — wide, dramatic, celebratory.",
  ],
};

// ─── Stub bundles (research-output prompts only) ────────────────────
//
// These four are the launch lineup from research-kids-coloring-bestsellers.
// Each has its 10 page prompts wired up but NO heroes / pageCast yet —
// the per-character work (signatureDetails, referenceSheetPrompt,
// funFact) hasn't been done. They're registered so:
//   1. The orchestrator + seed scripts know what slugs to expect
//   2. Anyone listing HERO_BUNDLES sees the real launch lineup
//   3. Future per-bundle launch sessions can fill in heroes + pageCast
//      using DINO_DANCE_PARTY as the reference shape
//
// Generating pages from these as-is will fall back to brand-style refs
// only (no character continuity), which is acceptable for early
// scene-test runs but won't pass QA's signature-detail checks. Don't
// ship a bundle to prod with empty heroes — fill them in first.

export const UNICORN_RAINBOW_RALLY: HeroBundle = {
  slug: "unicorn-rainbow-rally",
  heroes: [], // TODO: define 3-4 unicorns with signatureDetails + funFact
  pageCast: {}, // TODO: map heroes to pages 1-10
  pagePrompts: [
    "A baby unicorn with a fluffy mane and a swirly horn, standing on a cloud, looking up at a sky where the rainbow has gone all gray",
    "A unicorn galloping fast across cotton-candy clouds, mane streaming behind it, the color RED glowing inside a floating bubble ahead",
    "A unicorn sliding down a tall waterslide of bright orange juice, hooves up, water spraying everywhere, oranges floating in the splash",
    "A unicorn with butterfly wings catching a yellow shooting star in its mane, sunflowers and bees around it on a fluffy hilltop",
    "Two unicorns racing neck-and-neck through a leafy green forest in the sky, jellybean obstacles bouncing under their hooves",
    "A unicorn dipping its horn into a bright blue lake, dragonflies circling above, water lilies making a perfect ring around it",
    "A unicorn floating through a deep purple night sky filled with planets and stars, mane sparkling, a tiny moon on its forehead",
    "A unicorn with a pink mane catching the last color, a glowing pink heart, in its hooves while doing a cartwheel mid-air",
    "All seven unicorns lined up on the edge of a giant cloud, each holding a color in a bubble, ready to release them at once",
    "The full rainbow restored across the sky, all seven unicorns leaping over it together, Colo the crayon riding on the lead unicorn's back, cheering",
  ],
};

export const SUPERHERO_VEHICLE_SQUAD: HeroBundle = {
  slug: "superhero-vehicle-squad",
  heroes: [], // TODO: define vehicle heroes (fire truck, school bus, police car, ambulance, etc.)
  pageCast: {},
  pagePrompts: [
    "A friendly fire truck with a big smile on its grille, parked in front of a small town fire station, sun rising behind it, ready to start the day",
    "A school bus with rocket boosters firing out the back, kids' faces in every window cheering, lifting off a grassy field, books flying happily inside",
    "A cheerful police car using a giant magnet on its roof to pull a runaway bunch of balloons back down to a crying child",
    "A construction digger with extending stretchy arms scooping up colorful blocks and stacking them into a wobbly castle on a building site",
    "An ambulance shining gentle healing lights over a row of injured teddy bears tucked into tiny beds outside a stuffed-animal hospital",
    "A garbage truck with sparkle vents, swallowing trash and shooting out a fresh new colorful slide that lands gently in a playground",
    "A delivery van going invisible (just outline of dotted lines) leaving a wrapped present on every doorstep down a long suburban street",
    "An ice-cream truck honking, every kid on the block running out, three flavors floating in colorful clouds above the truck windows",
    "A submarine with bright headlights gliding through an underwater city made of coral towers, jellyfish street lamps lighting the way",
    "All the vehicle heroes parked together at sunset on a grassy hill, fireworks above them, Colo the crayon waving from the top of the fire truck ladder",
  ],
};

export const DESSERT_ISLAND_ADVENTURE: HeroBundle = {
  slug: "dessert-island-adventure",
  heroes: [], // TODO: define explorer kids + animal friends (bear cub, fox chef, frog, etc.)
  pageCast: {},
  pagePrompts: [
    "A small wooden boat with a sail shaped like an ice-cream cone landing on a beach made of marshmallows and chocolate sand, palm trees with cookies for leaves",
    "A wide flowing chocolate river with gumdrop stepping stones, a curious bear cub dipping a paw in to taste, sprinkle-fish jumping out",
    "A tall ice-cream-scoop mountain with rainbow sprinkles, three friends climbing it with little ropes, footprint scoops behind them",
    "A cookie bridge stretching across a milk lake between two gingerbread houses, a fox in a chef's hat carrying a tray across",
    "A lollipop forest with swirled-rainbow trees, a small girl spinning underneath, the whole forest jingling like wind chimes",
    "A jellybean pond with gummy-bear fish leaping out, a frog catching one mid-air with its tongue, lily pads made of cookies",
    "A tall cotton-candy cloud factory with friendly creatures cranking the machine, big fluffy pink and blue clouds drifting up out of the chimney",
    "A popcorn waterfall pouring into a buttery valley below, kids in raincoats catching popcorn in baskets, a smiling sun shining above",
    "A grand cake castle with frosting walls, candy-cane towers, and a chocolate-bar drawbridge being lowered, friends arriving on a sugar-cube path",
    "A long feast table inside the cake castle, every food friend from the island sharing a giant celebration cake, Colo the crayon raising a tiny fork at the head of the table",
  ],
};

export const SPACE_ADVENTURE_CREW: HeroBundle = {
  slug: "space-adventure-crew",
  heroes: [], // TODO: define 3 kid astronauts (consistent suits, helmets, name patches)
  pageCast: {},
  pagePrompts: [
    "A chunky friendly rocket on a launchpad with three smiling kid astronauts waving from the windows, smoke clouds curling out the bottom shaped like cartoon faces",
    "Three astronauts somersaulting in zero gravity inside their spaceship, cookies and juice boxes floating past them, a surprised cat-shaped helmet drifting by",
    "A space rover crunching across a red planet, a friendly three-eyed alien plant tipping its leaves to wave, two moons in the sky behind",
    "An astronaut building a snow alien on Mars from glittery red sand, scarf made of stars, alien snowballs piled neatly nearby",
    "A spaceship dodging through an asteroid belt where every asteroid is a giant piece of candy, a swirly lollipop one nearly clipping the wing",
    "Three astronauts having a picnic on a small floating island shaped like a hamburger, three different planets visible in the sky around them",
    "A telescope on a dark hilltop showing galaxies shaped like animals: a kitten galaxy, a turtle galaxy, a giraffe galaxy, the kids leaning in to look",
    "Astronauts teaching a group of friendly tentacled aliens how to play hopscotch on a chalk grid drawn in moondust, aliens hopping happily",
    "A spaceship bobbing inside a giant friendly space-whale's bubble, the whale smiling, sparkles drifting around the ship like bath foam",
    "The crew arriving back on Earth, alien friends waving from a rainbow portal in the sky, Colo the crayon sitting on top of the rocket holding a 'WELCOME HOME' sign",
  ],
};

export const BAKERY_BUDDY_BAKERS: HeroBundle = {
  slug: "bakery-buddy-bakers",
  heroes: [
    {
      id: "whisk-bunny-baker",
      name: "Whisk",
      species: "Bunny Baker",
      signatureDetails: [
        "long floppy ears with a small bow tied around the base of the left ear",
        "tall puffy chef's hat sitting between the ears",
        "apron with a heart-shaped pocket on the front",
        "holds a metal whisk in one paw",
        "fluffy round cottontail peeking out behind",
        "tiny flour puff drawn near the whisk to show motion",
      ],
      referenceSheetPrompt:
        "Children's coloring book reference sheet for a single hero character. Whisk is a cheerful cartoon bunny baker drawn in clean bold black line art, centered on a plain white background, facing slightly to the side, standing upright in a friendly pose. Whisk has long floppy ears with a small bow tied around the base of the left ear, a tall puffy chef's hat resting between the ears, large round friendly eyes, and a small triangular nose with a tiny smile. Whisk wears a baker's apron with a heart-shaped pocket on the front, holds a metal whisk in one paw, and has a fluffy round cottontail peeking out behind. A tiny flour puff is drawn near the whisk to show playful motion. Simple cartoon shapes, thick even outlines, no shading, no color fill, no background scenery, kid-safe and friendly for ages three to eight.",
      funFact:
        "Whisk can whip up cream so fast that flour clouds dance through the whole kitchen!",
    },
    {
      id: "cinnamon-fox-baker",
      name: "Cinnamon",
      species: "Fox Baker",
      signatureDetails: [
        "pointy fox ears with fluffy tufts of fur inside",
        "tall classic chef's hat with a band at the base",
        "bushy fox tail with a fluffy white tip curling behind",
        "double-breasted chef's coat with two rows of round buttons",
        "small recipe card tucked into the front pocket",
        "neat triangle nose and a confident smile",
      ],
      referenceSheetPrompt:
        "Children's coloring book reference sheet for a single hero character. Cinnamon is a friendly cartoon fox head baker drawn in clean bold black line art, centered on a plain white background, facing slightly to the side, standing upright in a confident teaching pose. Cinnamon has pointy fox ears with fluffy tufts of fur inside, a tall classic chef's hat with a band at its base, large kind eyes, a neat triangle nose, and a warm confident smile. Cinnamon wears a double-breasted chef's coat with two rows of round buttons and has a small recipe card tucked into the front pocket. A bushy fox tail with a fluffy white tip curls behind. Simple rounded cartoon shapes, thick even outlines, no shading, no color fill, no background scenery, kid-safe and friendly for ages three to eight.",
      funFact:
        "Cinnamon keeps a secret recipe book full of cookies even the moon would line up to taste!",
    },
    {
      id: "sprinkle-mouse-baker",
      name: "Sprinkle",
      species: "Mouse Baker",
      signatureDetails: [
        "tiny round mouse ears with a sprinkle-shaped pin on one ear",
        "small chef's hat that flops slightly to one side",
        "long thin tail curling behind",
        "ruffled apron tied with a big bow at the back",
        "holds a small piping bag with a star tip",
        "little whiskers and a round button nose",
      ],
      referenceSheetPrompt:
        "Children's coloring book reference sheet for a single hero character. Sprinkle is an adorable cartoon mouse decorator drawn in clean bold black line art, centered on a plain white background, facing slightly to the side, standing upright in a cheerful pose. Sprinkle has tiny round mouse ears with a sprinkle-shaped pin on one ear, a small chef's hat that flops slightly to one side, big sparkly eyes, a round button nose, and little whiskers. Sprinkle wears a ruffled apron tied with a big bow at the back and holds a small piping bag with a star tip. A long thin tail curls behind. Simple rounded cartoon shapes, thick even outlines, no shading, no color fill, no background scenery, kid-safe and friendly for ages three to eight.",
      funFact:
        "Sprinkle can balance on one paw atop a stool to reach the very top of any tall cake!",
    },
    {
      id: "dough-bear-baker",
      name: "Dough",
      species: "Bear Baker",
      signatureDetails: [
        "round bear ears on top of a sturdy head",
        "chef's hat that looks slightly small on his big head",
        "thick apron with a wheat sheaf patch on the chest",
        "rolled-up sleeves showing strong fuzzy arms",
        "holds a wooden rolling pin or tray of bread",
        "small round nose and a gentle warm smile",
      ],
      referenceSheetPrompt:
        "Children's coloring book reference sheet for a single hero character. Dough is a big gentle cartoon bear baker drawn in clean bold black line art, centered on a plain white background, facing slightly to the side, standing upright in a kind helpful pose. Dough has round bear ears on top of a sturdy head, a chef's hat that looks slightly small on his big head, friendly half-moon eyes, a small round nose, and a gentle warm smile. Dough wears a thick apron with a wheat sheaf patch on the chest, has rolled-up sleeves showing strong fuzzy arms, and holds a wooden rolling pin in one paw. Simple rounded cartoon shapes, thick even outlines, no shading, no color fill, no background scenery, kid-safe and friendly for ages three to eight.",
      funFact:
        "Dough gives the warmest bear hugs and the squishiest bread loaves in the whole bakery!",
    },
  ],
  pageCast: {
    1: ["whisk-bunny-baker"],
    2: ["cinnamon-fox-baker", "dough-bear-baker"],
    3: ["sprinkle-mouse-baker"],
    4: [
      "whisk-bunny-baker",
      "cinnamon-fox-baker",
      "sprinkle-mouse-baker",
      "dough-bear-baker",
    ],
    5: ["dough-bear-baker", "cinnamon-fox-baker"],
    6: ["whisk-bunny-baker", "sprinkle-mouse-baker"],
    7: ["cinnamon-fox-baker", "whisk-bunny-baker"],
    8: [
      "whisk-bunny-baker",
      "cinnamon-fox-baker",
      "sprinkle-mouse-baker",
      "dough-bear-baker",
    ],
    9: ["sprinkle-mouse-baker", "cinnamon-fox-baker", "dough-bear-baker"],
    10: [
      "whisk-bunny-baker",
      "cinnamon-fox-baker",
      "sprinkle-mouse-baker",
      "dough-bear-baker",
    ],
  },
  pagePrompts: [
    "Whisk the bunny baker stirs a giant mixing bowl with his metal whisk, ears flopping with the motion. Puffy flour clouds and tiny dough splashes float around him as he giggles. Clean cartoon line art, no shading, kid-friendly bakery scene.",
    "Cinnamon the fox baker leans over a big wooden table, gently showing Dough the bear how to knead a soft mound of bread dough. Dough presses with strong paws while Cinnamon points kindly. Friendly cartoon line art, no shading.",
    "Sprinkle the mouse baker stands on a tall wooden stool to decorate a three-tier layer cake, piping swirly frosting and dotting it with sprinkles. Her tail balances behind her. Cute cartoon line art, no shading, kid-friendly.",
    "Whisk, Cinnamon, Sprinkle, and Dough crowd around an open oven wearing big puffy oven mitts, lifting out a tray of round cookies together. Steam swirls drift up. Cheerful cartoon line art, no shading, kid-friendly.",
    "Dough the bear baker carries a tall tray of warm bread loaves with both paws while Cinnamon the fox swings open the shop window with a welcoming smile. A small bird perches nearby. Friendly cartoon line art, no shading.",
    "Whisk and Sprinkle stand side by side at a counter frosting a row of cupcakes. Whisk swirls big loops while Sprinkle adds tiny stars and zigzags, both giggling. Playful cartoon line art, no shading, kid-friendly.",
    "Cinnamon the fox rolls out a flat sheet of dough with a wooden rolling pin while Whisk the bunny presses cookie cutters shaped like ducks, stars, and bears into it. Friendly cartoon line art, no shading.",
    "All four bakers, Whisk, Cinnamon, Sprinkle, and Dough, arrange pies, cookies, and cakes in the bakery display window. Each holds a different treat with proud smiles. Cozy cartoon line art, no shading.",
    "Sprinkle carefully places candles on a tall birthday cake while Cinnamon adds a frosting flower and Dough holds the cake plate steady. Tiny confetti shapes float around. Friendly cartoon line art, no shading.",
    "Whisk, Cinnamon, Sprinkle, and Dough sit together at a small bakery table sharing a plate of fresh treats and steaming mugs of cocoa. They laugh and clink mugs in a happy break. Warm cartoon line art, no shading.",
  ],
};

export const HERO_BUNDLES: Record<string, HeroBundle> = {
  [DINO_DANCE_PARTY.slug]: DINO_DANCE_PARTY,
  [UNICORN_RAINBOW_RALLY.slug]: UNICORN_RAINBOW_RALLY,
  [SUPERHERO_VEHICLE_SQUAD.slug]: SUPERHERO_VEHICLE_SQUAD,
  [DESSERT_ISLAND_ADVENTURE.slug]: DESSERT_ISLAND_ADVENTURE,
  [SPACE_ADVENTURE_CREW.slug]: SPACE_ADVENTURE_CREW,
  [BAKERY_BUDDY_BAKERS.slug]: BAKERY_BUDDY_BAKERS,
};

export function getBundleProfile(slug: string): HeroBundle | undefined {
  return HERO_BUNDLES[slug];
}

export function getHero(bundle: HeroBundle, heroId: string): Hero | undefined {
  return bundle.heroes.find((h) => h.id === heroId);
}
