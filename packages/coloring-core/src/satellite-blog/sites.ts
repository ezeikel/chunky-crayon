/**
 * Registry of satellite sites the worker can publish blog posts for.
 *
 * Keyed by slug. Adding a new site means:
 * 1. Add an entry here.
 * 2. Create a Sanity dataset matching `sanityDataset` in the `parent-tools` project.
 * 3. Add a Vercel cron entry on that site that fires the worker route.
 */

import type { SatelliteSiteConfig, SatelliteBlogTopic } from "./types";

const ROUTINECHARTS_TOPICS: SatelliteBlogTopic[] = [
  {
    topic: "How to make a morning routine that actually sticks",
    keywords: [
      "morning routine for kids",
      "kids morning routine",
      "routine chart",
    ],
  },
  {
    topic: "Visual schedules: why they work for kids who can't read yet",
    keywords: [
      "visual schedule for kids",
      "picture schedule",
      "preschool routine",
    ],
  },
  {
    topic: "Bedtime routine ideas for toddlers who fight sleep",
    keywords: [
      "toddler bedtime routine",
      "bedtime chart",
      "kids sleep routine",
    ],
  },
  {
    topic: "Chore charts for ages 3 to 5: what they can actually do",
    keywords: [
      "toddler chore chart",
      "age appropriate chores",
      "preschooler chores",
    ],
  },
  {
    topic: "Sticker charts vs reward charts: which one works",
    keywords: [
      "sticker chart for kids",
      "reward chart printable",
      "behavior chart",
    ],
  },
  {
    topic: "After-school routine that ends the homework fight",
    keywords: [
      "after school routine",
      "homework routine for kids",
      "school day schedule",
    ],
  },
  {
    topic: "Weekend routines for kids who melt down on Saturdays",
    keywords: ["weekend routine kids", "saturday schedule", "family routine"],
  },
  {
    topic: "How long should you keep a routine chart up?",
    keywords: [
      "how routine charts work",
      "behavior chart tips",
      "routine consistency",
    ],
  },
  {
    topic: "When your kid's routine breaks: getting back on track",
    keywords: [
      "routine reset",
      "kids routine change",
      "back to school routine",
    ],
  },
  {
    topic: "Mom's morning routine: surviving the school run",
    keywords: ["mom morning routine", "school run tips", "morning chaos"],
  },
  {
    topic: "Tidy-up routine: making cleanup actually happen",
    keywords: ["kids cleanup routine", "tidy up chart", "kids tidying tips"],
  },
  {
    topic: "Independent play time: building a routine for it",
    keywords: ["independent play", "solo play kids", "quiet time routine"],
  },
  {
    topic: "Visual cue cards for kids with autism or ADHD",
    keywords: ["visual cue cards", "autism routine", "adhd routine"],
  },
  {
    topic: "Travel routine: keeping kids regulated on long trips",
    keywords: [
      "travel routine for kids",
      "road trip routine",
      "vacation schedule",
    ],
  },
  {
    topic: "First day of preschool: a routine that calms first-day nerves",
    keywords: [
      "first day preschool",
      "preschool prep",
      "starting school routine",
    ],
  },
  {
    topic: "Sibling routines: when one chart isn't enough",
    keywords: [
      "multiple kids routine",
      "sibling chore chart",
      "family routine chart",
    ],
  },
  {
    topic: "Daycare drop-off routine that ends the tears",
    keywords: [
      "daycare drop off",
      "separation anxiety routine",
      "daycare prep",
    ],
  },
  {
    topic: "Evening routine after a working-parent day",
    keywords: [
      "evening routine working parent",
      "after work routine",
      "family evening",
    ],
  },
  {
    topic: "Routine charts for picky eaters",
    keywords: ["picky eater routine", "mealtime routine", "food chart kids"],
  },
  {
    topic: "Backwards planning: building a routine from bedtime up",
    keywords: [
      "bedtime first routine",
      "evening planning kids",
      "backwards routine",
    ],
  },
];

const ROUTINECHARTS_CONFIG: SatelliteSiteConfig = {
  slug: "routinecharts",
  displayName: "Routine Charts",
  domain: "routinecharts.com",
  sanityDataset: "routinecharts",
  systemPromptBrandSection: `Routine Charts is a free tool that lets parents build and print custom routine charts for their kids. The site exists for parents, not for selling anything. Treat it as a no-bullshit utility: no upsells, no signups, no "premium" tier.`,
  niche:
    "printable routine charts, chore charts, and visual schedules for parents of young kids (ages 2-10) — morning/bedtime/after-school routines, behavior consistency, daily logistics",
  topics: ROUTINECHARTS_TOPICS,
  imageStylePrompt:
    "Modern flat illustration, calm pastel palette, simple shapes, no text. Soft warm-orange accent matching the Routine Charts brand. Editorial, parent-magazine aesthetic. Not childish, not corporate.",
  ccCtaUrl:
    "https://chunkycrayon.com/?utm_source=routinecharts&utm_medium=blog&utm_campaign=blog_post",
  ccCtaHint:
    "When a routine is done, a free coloring page from Chunky Crayon is a nice reward",
};

const STICKERCHARTMAKER_SEED_TOPICS: SatelliteBlogTopic[] = [
  {
    topic: "Sticker charts vs reward charts: which actually changes behavior",
    keywords: [
      "sticker chart",
      "reward chart",
      "behavior chart for kids",
      "do sticker charts work",
    ],
  },
  {
    topic: "How many days should a sticker chart run before the reward?",
    keywords: [
      "sticker chart length",
      "reward chart days",
      "how long sticker chart",
    ],
  },
  {
    topic: "What to do when the sticker chart stops working",
    keywords: [
      "sticker chart not working",
      "reward chart failing",
      "kid bored of sticker chart",
    ],
  },
  {
    topic: "Sticker chart ideas for potty training that don't backfire",
    keywords: [
      "potty training sticker chart",
      "potty reward chart",
      "potty training rewards",
    ],
  },
  {
    topic: "Age-appropriate rewards for a kids' sticker chart (no toys needed)",
    keywords: [
      "sticker chart reward ideas",
      "non-toy rewards kids",
      "reward chart prizes",
    ],
  },
  {
    topic: "One sticker chart for siblings: how to make it fair",
    keywords: [
      "sibling sticker chart",
      "reward chart multiple kids",
      "fair reward system siblings",
    ],
  },
  {
    topic: "Sticker charts for bedtime: getting kids to stay in their room",
    keywords: [
      "bedtime sticker chart",
      "stay in bed reward chart",
      "sleep reward chart kids",
    ],
  },
  {
    topic: "Why experts are split on reward charts, and when to use one anyway",
    keywords: [
      "are reward charts good",
      "sticker chart psychology",
      "reward chart pros cons",
    ],
  },
];

const STICKERCHARTMAKER_CONFIG: SatelliteSiteConfig = {
  slug: "stickerchartmaker",
  displayName: "Sticker Chart Maker",
  domain: "stickerchartmaker.com",
  // SHARED dataset across all satellites (Sanity free tier caps datasets).
  // Partitioning is by the `siteSlug` field on every post, enforced in
  // every GROQ query. Dataset name is "routinecharts" for historical
  // reasons (first site) but holds ALL sites' posts — not site-specific.
  sanityDataset: "routinecharts",
  systemPromptBrandSection: `Sticker Chart Maker is a free tool that lets parents build and print custom sticker/reward charts for their kids. It exists for parents, no upsells, no signups, no premium tier. Tone leans encouraging and positive-reinforcement-aware, but honest about when reward charts don't work.`,
  niche:
    "printable sticker charts and reward charts for parents of young kids (ages 2-9) — potty training, bedtime, behavior goals, positive reinforcement, motivation",
  topics: STICKERCHARTMAKER_SEED_TOPICS,
  imageStylePrompt:
    "Modern flat illustration, cheerful but not garish palette with a friendly gold/amber accent, simple shapes, no text. Encouraging, parent-magazine aesthetic. Not childish, not corporate.",
  ccCtaUrl:
    "https://chunkycrayon.com/?utm_source=stickerchartmaker&utm_medium=blog&utm_campaign=blog_post",
  ccCtaHint:
    "A free coloring page from Chunky Crayon makes a nice no-cost reward when the chart is full",
};

const BOREDOMWHEEL_SEED_TOPICS: SatelliteBlogTopic[] = [
  {
    topic: "Screen-free things to do with a bored 5-year-old in 5 minutes",
    keywords: [
      "bored kid activities",
      "screen free activities",
      "quick kids activities",
    ],
  },
  {
    topic: "Rainy day activities for kids that need zero prep",
    keywords: [
      "rainy day activities kids",
      "indoor activities no supplies",
      "boredom busters",
    ],
  },
  {
    topic: "What to do when your kid says 'I'm bored' for the tenth time",
    keywords: [
      "kid always bored",
      "im bored kids",
      "handling boredom children",
    ],
  },
  {
    topic: "Why boredom is actually good for kids (and how to lean into it)",
    keywords: [
      "boredom good for kids",
      "benefits of boredom children",
      "let kids be bored",
    ],
  },
  {
    topic: "Indoor activities for high-energy kids stuck inside",
    keywords: [
      "high energy kids indoors",
      "active indoor games",
      "burn energy indoors kids",
    ],
  },
  {
    topic: "Solo play ideas that actually keep a 4-year-old busy",
    keywords: [
      "independent play ideas",
      "solo play toddler",
      "keep kid busy alone",
    ],
  },
  {
    topic: "Activities for two kids who fight when they're bored",
    keywords: [
      "sibling boredom activities",
      "stop kids fighting bored",
      "activities for siblings",
    ],
  },
  {
    topic: "5-minute boredom busters for the witching hour before dinner",
    keywords: [
      "witching hour kids",
      "before dinner activities",
      "5pm meltdown activities",
    ],
  },
];

const BOREDOMWHEEL_CONFIG: SatelliteSiteConfig = {
  slug: "boredomwheel",
  displayName: "Boredom Wheel",
  domain: "boredomwheel.com",
  sanityDataset: "routinecharts",
  systemPromptBrandSection: `Boredom Wheel is a free spin-the-wheel tool that gives parents an instant screen-free activity idea for a bored kid. It exists for parents, no upsells, no signups. Tone is quick, energetic, and rescue-mode empathetic — the parent is frazzled and needs an idea NOW.`,
  niche:
    "screen-free boredom-buster activities for parents of young kids (ages 2-10) — rainy days, indoor play, quick no-prep activities, independent play, sibling activities",
  topics: BOREDOMWHEEL_SEED_TOPICS,
  imageStylePrompt:
    "Modern flat illustration, playful energetic palette with a bright teal/cyan accent, simple shapes, no text. Lively, parent-magazine aesthetic. Not childish, not corporate.",
  ccCtaUrl:
    "https://chunkycrayon.com/?utm_source=boredomwheel&utm_medium=blog&utm_campaign=blog_post",
  ccCtaHint:
    "Coloring is one reliable boredom-buster — a free Chunky Crayon page buys you ten quiet minutes",
};

const BIRTHDAYPLAYBOOK_SEED_TOPICS: SatelliteBlogTopic[] = [
  {
    topic: "A realistic timeline for planning a kid's birthday party",
    keywords: [
      "kids party planning timeline",
      "how to plan birthday party",
      "party planning checklist",
    ],
  },
  {
    topic: "Low-budget kids party ideas that don't look low-budget",
    keywords: [
      "cheap kids party ideas",
      "budget birthday party",
      "affordable party kids",
    ],
  },
  {
    topic: "How many kids should you invite to a birthday party by age",
    keywords: [
      "how many kids invite party",
      "birthday party guest list",
      "party size by age",
    ],
  },
  {
    topic: "Party games for 4-year-olds that actually work",
    keywords: [
      "party games 4 year olds",
      "toddler party games",
      "birthday games young kids",
    ],
  },
  {
    topic: "What to do when no one RSVPs to your kid's party",
    keywords: [
      "no rsvp kids party",
      "party rsvp problems",
      "low party turnout",
    ],
  },
  {
    topic: "A no-stress birthday party plan for an introverted kid",
    keywords: [
      "introverted kid party",
      "small birthday party ideas",
      "low key kids party",
    ],
  },
  {
    topic: "The 2-hour party schedule that prevents meltdowns",
    keywords: [
      "kids party schedule",
      "party timeline kids",
      "birthday party flow",
    ],
  },
  {
    topic: "DIY party activities that keep kids busy without a entertainer",
    keywords: [
      "diy party activities",
      "party activities no entertainer",
      "self run party games",
    ],
  },
];

const BIRTHDAYPLAYBOOK_CONFIG: SatelliteSiteConfig = {
  slug: "birthdayplaybook",
  displayName: "Birthday Playbook",
  domain: "birthdayplaybook.com",
  sanityDataset: "routinecharts",
  systemPromptBrandSection: `Birthday Playbook is a free tool that gives parents a printable kid's-party plan (checklist, invite wording, activity ideas) from a chosen theme. It exists for parents, no upsells, no signups. Tone is calm and confidence-building — party planning is overwhelming and the parent needs a clear plan.`,
  niche:
    "kids' birthday party planning for parents (kids ages 1-12) — themes, checklists, invitations, party games, timelines, budgets, activities",
  topics: BIRTHDAYPLAYBOOK_SEED_TOPICS,
  imageStylePrompt:
    "Modern flat illustration, festive but tasteful palette with a confetti-pink/magenta accent, simple shapes, no text. Celebratory, parent-magazine aesthetic. Not childish, not corporate.",
  ccCtaUrl:
    "https://chunkycrayon.com/?utm_source=birthdayplaybook&utm_medium=blog&utm_campaign=blog_post",
  ccCtaHint:
    "Themed coloring sheets from Chunky Crayon make an easy party activity station",
};

const KIDSROADKIT_SEED_TOPICS: SatelliteBlogTopic[] = [
  {
    topic: "Road trip activities for toddlers that survive a 6-hour drive",
    keywords: [
      "road trip activities toddlers",
      "long car ride toddler",
      "car activities young kids",
    ],
  },
  {
    topic: "Screen-free car activities for kids who get carsick reading",
    keywords: [
      "carsick kids activities",
      "screen free car games",
      "no reading car activities",
    ],
  },
  {
    topic: "How to pack a road trip activity bag that actually gets used",
    keywords: ["road trip bag kids", "car activity kit", "travel activity bag"],
  },
  {
    topic: "Car games for kids that don't need anything but talking",
    keywords: [
      "no equipment car games",
      "verbal car games kids",
      "talking road trip games",
    ],
  },
  {
    topic: "Road trip plan for kids by age: what works at 3, 6, and 9",
    keywords: [
      "road trip by age",
      "age appropriate travel activities",
      "car activities by age",
    ],
  },
  {
    topic: "Surviving a flight with a 2-year-old: a realistic kit list",
    keywords: [
      "flight with toddler",
      "plane activities toddler",
      "travel kit 2 year old",
    ],
  },
  {
    topic: "How often should you stop on a road trip with young kids",
    keywords: [
      "road trip stops kids",
      "how often stop driving kids",
      "road trip breaks children",
    ],
  },
  {
    topic: "Printable road trip games that need zero prep at a rest stop",
    keywords: [
      "printable road trip games",
      "travel bingo printable",
      "car scavenger hunt kids",
    ],
  },
];

const KIDSROADKIT_CONFIG: SatelliteSiteConfig = {
  slug: "kidsroadkit",
  displayName: "Kids Road Kit",
  domain: "kidsroadkit.com",
  sanityDataset: "routinecharts",
  systemPromptBrandSection: `Kids Road Kit is a free tool that generates a printable road-trip activity pack (bingo, scavenger hunts, games) by kid age and trip length. It exists for parents, no upsells, no signups. Tone is survival-mode empathetic — the parent is facing hours in a car with restless kids.`,
  niche:
    "road trip and travel activities for parents of young kids (ages 2-10) — car games, printable travel packs, packing, screen-free travel, flights, trip logistics",
  topics: KIDSROADKIT_SEED_TOPICS,
  imageStylePrompt:
    "Modern flat illustration, road-trip palette with a sky-blue/sunshine accent, simple shapes, no text. Adventurous but calm, parent-magazine aesthetic. Not childish, not corporate.",
  ccCtaUrl:
    "https://chunkycrayon.com/?utm_source=kidsroadkit&utm_medium=blog&utm_campaign=blog_post",
  ccCtaHint:
    "Printable coloring pages from Chunky Crayon are a quiet, mess-light car activity",
};

export const SATELLITE_SITES: Record<string, SatelliteSiteConfig> = {
  [ROUTINECHARTS_CONFIG.slug]: ROUTINECHARTS_CONFIG,
  [STICKERCHARTMAKER_CONFIG.slug]: STICKERCHARTMAKER_CONFIG,
  [BOREDOMWHEEL_CONFIG.slug]: BOREDOMWHEEL_CONFIG,
  [BIRTHDAYPLAYBOOK_CONFIG.slug]: BIRTHDAYPLAYBOOK_CONFIG,
  [KIDSROADKIT_CONFIG.slug]: KIDSROADKIT_CONFIG,
};

export const getSatelliteSite = (slug: string): SatelliteSiteConfig | null =>
  SATELLITE_SITES[slug] ?? null;
