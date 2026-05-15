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

export const SATELLITE_SITES: Record<string, SatelliteSiteConfig> = {
  [ROUTINECHARTS_CONFIG.slug]: ROUTINECHARTS_CONFIG,
};

export const getSatelliteSite = (slug: string): SatelliteSiteConfig | null =>
  SATELLITE_SITES[slug] ?? null;
