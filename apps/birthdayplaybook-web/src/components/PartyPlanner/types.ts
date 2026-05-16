/**
 * Curated party themes and the small hardcoded checklist map that powers
 * both the live preview (PartyPlanner) and the printable PDF
 * (partyPlanDocument). The PDF route clamps/whitelists against THEME_KEYS.
 *
 * Keep checklist items generic enough that one template shape works across
 * every theme: each theme supplies its own decor/food/activity flavor while
 * the structure (decor + food + activities + stations) stays identical.
 */

export const PARTY_LENGTHS = ["1.5h", "2h", "2.5h", "3h"] as const;

export type PartyLength = (typeof PARTY_LENGTHS)[number];

export type PartyTheme = {
  /** Stable key used for whitelisting in the PDF route. */
  key: string;
  /** Display label shown in the picker. */
  label: string;
  /** Emoji used for the picker tile + PDF header accent. */
  emoji: string;
  /** Themed decor checklist items. */
  decor: string[];
  /** Themed food + treat checklist items. */
  food: string[];
  /** Themed activity checklist items (decoration/setup chores). */
  activities: string[];
  /**
   * 3-4 activity stations run on the day. One is always the themed
   * coloring station (the Chunky Crayon funnel hook).
   */
  stations: string[];
};

export const PARTY_THEMES: readonly PartyTheme[] = [
  {
    key: "dinosaurs",
    label: "Dinosaurs",
    emoji: "🦕",
    decor: [
      "Green and brown balloons",
      "Dinosaur footprint floor trail",
      "Jungle leaf table runner",
      "Dino banner with the birthday name",
    ],
    food: [
      "Dino egg fruit cups",
      "Volcano dip with veggie sticks",
      "Dinosaur cookie cutters for sandwiches",
      "Cake with toy dino topper",
    ],
    activities: [
      "Set up a fossil dig sand tray",
      "Hide plastic dinosaurs for a hunt",
      "Lay out the footprint trail",
      "Prep the dino cookie decorating table",
    ],
    stations: [
      "Fossil dig sand tray",
      "Dinosaur hunt around the room",
      "Themed coloring station",
      "Dino cookie decorating",
    ],
  },
  {
    key: "unicorns",
    label: "Unicorns",
    emoji: "🦄",
    decor: [
      "Pastel rainbow balloons",
      "Glitter star table scatter",
      "Unicorn horn headbands per guest",
      "Cloud and rainbow backdrop",
    ],
    food: [
      "Rainbow fruit skewers",
      "Star-shaped sandwiches",
      "Pastel popcorn cups",
      "Unicorn cake with a horn topper",
    ],
    activities: [
      "Set up the headband decorating table",
      "Hang the rainbow backdrop",
      "Prep the glitter craft area",
      "Lay out the pastel snack cups",
    ],
    stations: [
      "Unicorn horn headband craft",
      "Glitter sticker craft",
      "Themed coloring station",
      "Pin the horn on the unicorn",
    ],
  },
  {
    key: "space",
    label: "Space",
    emoji: "🚀",
    decor: [
      "Black and silver balloons",
      "Glow-in-the-dark star ceiling stickers",
      "Planet cutouts on the walls",
      "Rocket banner with the birthday name",
    ],
    food: [
      "Star-shaped fruit pieces",
      "Moon rock crispy treats",
      "Galaxy juice cups",
      "Rocket cake with a planet topper",
    ],
    activities: [
      "Hang the planet cutouts",
      "Set up the rocket craft table",
      "Prep the star-jar glow craft",
      "Lay out the astronaut photo props",
    ],
    stations: [
      "Build a paper rocket",
      "Astronaut photo corner",
      "Themed coloring station",
      "Planet bean bag toss",
    ],
  },
  {
    key: "superheroes",
    label: "Superheroes",
    emoji: "🦸",
    decor: [
      "Primary color balloon cluster",
      "Comic-style POW and BAM signs",
      "City skyline backdrop",
      "Hero banner with the birthday name",
    ],
    food: [
      "Power fruit cups",
      "Shield-shaped sandwiches",
      "Energy juice pouches",
      "Hero emblem cake",
    ],
    activities: [
      "Set up the mask and cape decorating table",
      "Hang the city skyline backdrop",
      "Prep the obstacle training course",
      "Lay out the comic photo props",
    ],
    stations: [
      "Make a mask and cape",
      "Hero training obstacle course",
      "Themed coloring station",
      "Save the city bean bag game",
    ],
  },
  {
    key: "under-the-sea",
    label: "Under the Sea",
    emoji: "🐠",
    decor: [
      "Blue and teal balloons",
      "Hanging paper fish and jellyfish",
      "Bubble wall scatter",
      "Ocean banner with the birthday name",
    ],
    food: [
      "Goldfish snack cups",
      "Fish-shaped sandwiches",
      "Blue jelly ocean cups",
      "Sea cake with shell toppers",
    ],
    activities: [
      "Hang the paper fish and jellyfish",
      "Set up the shell craft table",
      "Prep the pearl treasure hunt",
      "Lay out the bubble play area",
    ],
    stations: [
      "Shell and pearl craft",
      "Under the sea treasure hunt",
      "Themed coloring station",
      "Fishing game with magnets",
    ],
  },
  {
    key: "construction",
    label: "Construction",
    emoji: "🚧",
    decor: [
      "Yellow and black balloons",
      "Caution tape table runner",
      "Traffic cone markers",
      "Construction banner with the birthday name",
    ],
    food: [
      "Digger snack cups",
      "Brick-shaped sandwiches",
      "Cement mixer milkshakes",
      "Dump truck cake",
    ],
    activities: [
      "Set up the block building zone",
      "Lay out the caution tape",
      "Prep the sand and digger tray",
      "Set up the tool belt craft table",
    ],
    stations: [
      "Block building zone",
      "Sand and digger tray",
      "Themed coloring station",
      "Hard hat bean bag toss",
    ],
  },
  {
    key: "princess",
    label: "Princess",
    emoji: "👑",
    decor: [
      "Pink and gold balloons",
      "Castle backdrop",
      "Tiara per guest",
      "Royal banner with the birthday name",
    ],
    food: [
      "Berry fruit cups",
      "Crown-shaped sandwiches",
      "Pink lemonade cups",
      "Castle cake with a tiara topper",
    ],
    activities: [
      "Set up the tiara decorating table",
      "Hang the castle backdrop",
      "Prep the royal dress-up corner",
      "Lay out the jewel craft area",
    ],
    stations: [
      "Decorate a tiara or crown",
      "Royal dress-up photo corner",
      "Themed coloring station",
      "Pin the jewel on the crown",
    ],
  },
  {
    key: "animals-safari",
    label: "Animals & Safari",
    emoji: "🦁",
    decor: [
      "Green and tan balloons",
      "Animal print table runner",
      "Hanging paper leaves and vines",
      "Safari banner with the birthday name",
    ],
    food: [
      "Animal cracker cups",
      "Jungle fruit skewers",
      "Watering hole juice cups",
      "Safari cake with animal toppers",
    ],
    activities: [
      "Hang the paper leaves and vines",
      "Set up the binoculars craft table",
      "Prep the animal safari hunt",
      "Lay out the face paint area",
    ],
    stations: [
      "Make safari binoculars",
      "Animal safari hunt",
      "Themed coloring station",
      "Feed the animals bean bag game",
    ],
  },
  {
    key: "sports",
    label: "Sports",
    emoji: "⚽",
    decor: [
      "Team color balloons",
      "Pennant flag bunting",
      "Scoreboard sign with the birthday name",
      "Finish line tape",
    ],
    food: [
      "Orange slice halftime cups",
      "Stadium snack boxes",
      "Sports drink juice cups",
      "Cake with a ball topper",
    ],
    activities: [
      "Set up the relay race lanes",
      "Hang the pennant bunting",
      "Prep the medal craft table",
      "Lay out the mini sports stations",
    ],
    stations: [
      "Relay race course",
      "Mini ball games rotation",
      "Themed coloring station",
      "Medal making craft",
    ],
  },
  {
    key: "rainbow",
    label: "Rainbow",
    emoji: "🌈",
    decor: [
      "Full rainbow balloon arch",
      "Color-block table runner",
      "Cloud and rainbow backdrop",
      "Rainbow banner with the birthday name",
    ],
    food: [
      "Rainbow fruit platter",
      "Color-sorted snack cups",
      "Layered rainbow jelly cups",
      "Rainbow layer cake",
    ],
    activities: [
      "Build the rainbow balloon arch",
      "Set up the color craft table",
      "Prep the rainbow sorting game",
      "Lay out the color photo props",
    ],
    stations: [
      "Rainbow color craft",
      "Color sorting game",
      "Themed coloring station",
      "Pot of gold treasure hunt",
    ],
  },
] as const;

export const THEME_KEYS = PARTY_THEMES.map((theme) => theme.key);

export const getTheme = (key: string): PartyTheme =>
  PARTY_THEMES.find((theme) => theme.key === key) ?? PARTY_THEMES[0];

/** Templated single-paragraph invite wording. No em dashes. */
export const buildInviteWording = (
  childName: string,
  age: number,
  themeLabel: string,
): string => {
  const name = childName.trim() || "our birthday star";
  return `You are invited to ${name}'s ${themeLabel} birthday party. ${name} is turning ${age}, and we would love for you to celebrate with us. There will be themed games, treats, and a coloring station. Please let us know if you can make it. We cannot wait to see you there.`;
};

export type PartyPlanConfig = {
  childName: string;
  age: number;
  themeKey: string;
  partyLength: PartyLength;
};
