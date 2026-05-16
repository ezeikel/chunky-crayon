/**
 * Curated age bands, trip lengths, and the small hardcoded game catalog
 * that powers both the live preview (RoadKit) and the printable PDF
 * (roadKitDocument). The PDF route clamps/whitelists against AGE_BAND_KEYS,
 * TRIP_LENGTH_KEYS, and the kids-count range.
 *
 * The activity pack is assembled by `buildPack(ageBand, tripLength)`:
 * longer trips select more pages, the age band tunes which games are a
 * good fit, and the coloring + doodle page is always included as the
 * Chunky Crayon funnel hook.
 *
 * One template shape works across every game: each entry supplies its own
 * title + printable kind; the PDF renders a page per selected game.
 */

export const AGE_BANDS = [
  { key: "3-5", label: "3 to 5" },
  { key: "6-8", label: "6 to 8" },
  { key: "9-12", label: "9 to 12" },
] as const;

export type AgeBandKey = (typeof AGE_BANDS)[number]["key"];

export const AGE_BAND_KEYS = AGE_BANDS.map((band) => band.key);

export const TRIP_LENGTHS = [
  { key: "under-1h", label: "Under 1 hour" },
  { key: "1-3h", label: "1 to 3 hours" },
  { key: "3-6h", label: "3 to 6 hours" },
  { key: "6h-plus", label: "6 hours or more" },
] as const;

export type TripLengthKey = (typeof TRIP_LENGTHS)[number]["key"];

export const TRIP_LENGTH_KEYS = TRIP_LENGTHS.map((trip) => trip.key);

export const MIN_KIDS = 1;
export const MAX_KIDS = 6;

/** How a printable game page is laid out in the PDF. */
export type GameKind = "bingo" | "checklist" | "list" | "doodle" | "tally";

export type GameDef = {
  /** Stable key used for whitelisting + dedup. */
  key: string;
  /** Display title on the preview chip and PDF page header. */
  title: string;
  /** One-line description shown in the preview. */
  blurb: string;
  /** Printable layout the PDF uses for this game. */
  kind: GameKind;
  /** Grid/list cells for bingo / checklist / list / tally games. */
  items: string[];
};

/**
 * Master catalog. Items are written US-spelling, kid-neutral, and generic
 * enough that one band's wording reads fine for the whole range it covers.
 */
const GAMES = {
  travelBingo3: {
    key: "travel-bingo-3",
    title: "Travel Bingo",
    blurb: "Spot it, mark it, shout bingo.",
    kind: "bingo",
    items: [
      "Red car",
      "Cow",
      "Bridge",
      "Truck",
      "Dog",
      "Stop sign",
      "Tractor",
      "School bus",
      "Bird",
      "Gas station",
      "Tunnel",
      "Boat",
      "Police car",
      "Tall tree",
      "Flag",
      "Train",
    ],
  },
  travelBingo6: {
    key: "travel-bingo-6",
    title: "Travel Bingo",
    blurb: "Spot it, mark it, first to a full row wins.",
    kind: "bingo",
    items: [
      "Out of state plate",
      "Roadwork cones",
      "Water tower",
      "Motorcycle",
      "Farm animal",
      "Rest stop sign",
      "Camper or RV",
      "River or lake",
      "Mile marker",
      "Solar panel",
      "Wind turbine",
      "Hot air balloon",
      "Tow truck",
      "Billboard",
      "Bridge over road",
      "Yellow car",
      "Hawk or eagle",
      "Tunnel",
      "Boat on a trailer",
      "Speed limit 70",
      "Train crossing",
      "Toll booth",
      "Mountain in view",
      "Food sign",
      "License plate game word",
    ],
  },
  scavenger: {
    key: "scavenger-hunt",
    title: "Scavenger Hunt",
    blurb: "Things to spot from your window, check each one off.",
    kind: "checklist",
    items: [
      "Something taller than the car",
      "An animal in a field",
      "A vehicle with more than 6 wheels",
      "A flag of any kind",
      "A bridge you drive under or over",
      "A road sign with an arrow",
      "Water (river, lake, or sea)",
      "A building with a tower",
      "Something the same color as your shoes",
      "A car towing something",
      "A hill or mountain",
      "A place that sells food",
    ],
  },
  wouldYouRather: {
    key: "would-you-rather",
    title: "Would You Rather",
    blurb: "Read one out loud, everyone answers, no wrong answers.",
    kind: "list",
    items: [
      "Would you rather have a pet dragon or a pet dinosaur?",
      "Would you rather only travel by boat or only by plane?",
      "Would you rather be able to fly or be invisible?",
      "Would you rather eat only pizza or only ice cream forever?",
      "Would you rather live in a treehouse or an underwater house?",
      "Would you rather have hands for feet or feet for hands?",
      "Would you rather always be 10 minutes late or 20 minutes early?",
      "Would you rather talk to animals or speak every language?",
      "Would you rather it always be snowing or always be sunny?",
      "Would you rather have a robot best friend or a talking pet?",
    ],
  },
  twentyQuestions: {
    key: "verbal-games",
    title: "Verbal Games",
    blurb: "No paper needed, play these out loud as you drive.",
    kind: "list",
    items: [
      "20 Questions: one person thinks of a thing, others get 20 yes or no questions.",
      "I Spy: I spy with my little eye something that is ...",
      "The Alphabet Game: find each letter A to Z on signs in order.",
      "Story Chain: one sentence each, build a story together.",
      "Counting Cows: count the animals on your side of the road.",
      "Categories: pick a topic, take turns naming things until someone is stuck.",
    ],
  },
  doodle: {
    key: "coloring-doodle",
    title: "Coloring + Doodle Page",
    blurb: "A blank page to color and doodle on. Free pages at Chunky Crayon.",
    kind: "doodle",
    items: [],
  },
  licensePlate: {
    key: "license-plate-game",
    title: "License Plate Game",
    blurb: "Spot a plate from a new state, tally it, most states wins.",
    kind: "tally",
    items: [
      "Alabama",
      "Arizona",
      "California",
      "Colorado",
      "Florida",
      "Georgia",
      "Illinois",
      "Indiana",
      "Michigan",
      "Nevada",
      "New York",
      "Ohio",
      "Oregon",
      "Pennsylvania",
      "Tennessee",
      "Texas",
      "Utah",
      "Virginia",
      "Washington",
      "Other state",
    ],
  },
  roadRules: {
    key: "road-trip-rules",
    title: "Road Trip Challenge Card",
    blurb: "Mini missions for the long stretches, check them off as you go.",
    kind: "checklist",
    items: [
      "Be the first to spot a sign for our destination",
      "Make up a song about where we are going",
      "Guess how many minutes to the next stop",
      "Spot 5 trucks the same color",
      "Name a town that starts with each letter of your name",
      "Count to 100 in another language with help",
    ],
  },
} satisfies Record<string, GameDef>;

/**
 * age band + trip length to selected game keys. Longer trips append more
 * pages on top of the shorter selection (the coloring + doodle page is
 * always last so it is easy to find). Age band swaps the bingo card and
 * adds older-kid games for the 9-12 band.
 */
const PACK_MAP: Record<AgeBandKey, Record<TripLengthKey, string[]>> = {
  "3-5": {
    "under-1h": ["travel-bingo-3", "coloring-doodle"],
    "1-3h": ["travel-bingo-3", "scavenger-hunt", "coloring-doodle"],
    "3-6h": [
      "travel-bingo-3",
      "scavenger-hunt",
      "verbal-games",
      "coloring-doodle",
    ],
    "6h-plus": [
      "travel-bingo-3",
      "scavenger-hunt",
      "verbal-games",
      "road-trip-rules",
      "coloring-doodle",
    ],
  },
  "6-8": {
    "under-1h": ["travel-bingo-6", "coloring-doodle"],
    "1-3h": ["travel-bingo-6", "scavenger-hunt", "coloring-doodle"],
    "3-6h": [
      "travel-bingo-6",
      "scavenger-hunt",
      "would-you-rather",
      "license-plate-game",
      "coloring-doodle",
    ],
    "6h-plus": [
      "travel-bingo-6",
      "scavenger-hunt",
      "would-you-rather",
      "license-plate-game",
      "road-trip-rules",
      "coloring-doodle",
    ],
  },
  "9-12": {
    "under-1h": ["travel-bingo-6", "coloring-doodle"],
    "1-3h": ["travel-bingo-6", "would-you-rather", "coloring-doodle"],
    "3-6h": [
      "travel-bingo-6",
      "would-you-rather",
      "license-plate-game",
      "road-trip-rules",
      "coloring-doodle",
    ],
    "6h-plus": [
      "travel-bingo-6",
      "would-you-rather",
      "verbal-games",
      "license-plate-game",
      "road-trip-rules",
      "coloring-doodle",
    ],
  },
};

const GAME_BY_KEY = new Map<string, GameDef>(
  Object.values(GAMES).map((game) => [game.key, game]),
);

export const getGame = (key: string): GameDef | undefined =>
  GAME_BY_KEY.get(key);

/** Resolve the curated game list for an age band + trip length. */
export const buildPack = (
  ageBand: AgeBandKey,
  tripLength: TripLengthKey,
): GameDef[] => {
  const keys = PACK_MAP[ageBand]?.[tripLength] ?? PACK_MAP["6-8"]["1-3h"];
  return keys
    .map((key) => GAME_BY_KEY.get(key))
    .filter((game): game is GameDef => Boolean(game));
};

export type RoadKitConfig = {
  ageBand: AgeBandKey;
  tripLength: TripLengthKey;
  kids: number;
};
