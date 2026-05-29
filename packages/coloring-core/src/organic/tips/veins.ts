/**
 * Parent Tips engine — evergreen topic veins.
 *
 * Replaces the original hardcoded baby-names/milestones/screen-time dataset
 * (hand-typed numbers attributed to ONS/CDC — a real accuracy risk) with
 * DYNAMIC, save-worthy useful content discovered live via Perplexity, the
 * same mechanism as the news engine. The audience is parents of nursery /
 * primary-age children (roughly 3-8). These are the things such a parent
 * actually bookmarks: a drill, an activity, a recipe, a money-saving tip.
 *
 * Each vein is a Perplexity search query that surfaces concrete, current,
 * specific tips. The discovery flow then fetches the real source, grounds
 * the script on it, fact-checks, brand-safety-gates, and quality-checks.
 *
 * Universal-only for now — location-specific formats ("nurseries in X")
 * are deferred until we target by audience geography.
 */

export type TipVein = {
  id: string;
  /** Maps to an OrganicCategory (reuses the existing enum where possible). */
  category:
    | "childhood-play"
    | "reading-literacy"
    | "school-food"
    | "creativity"
    | "nostalgia";
  /** The live-search query (prefixed with today's date at call time). */
  query: string;
};

export const TIP_VEINS: TipVein[] = [
  {
    id: "sports-drills",
    category: "childhood-play",
    query:
      "Simple at-home sports or football drills and skill games parents can do with children aged 5 to 8, from a coaching site, sports body, or reputable parenting/sports source. Return the page URL, a title, and a 2-sentence summary of the specific drill.",
  },
  {
    id: "school-holiday-activities",
    category: "childhood-play",
    query:
      "Free or low-cost school-holiday activity ideas for children aged 3 to 8 that parents can do at home or locally, from a parenting site or family-activity source. Return the URL, title, and a 2-sentence summary of the specific activity.",
  },
  {
    id: "lunchbox-meals",
    category: "school-food",
    query:
      "Easy, healthy lunchbox or quick meal ideas for young children aged 3 to 8, from a recognised nutrition body, dietitian, or reputable food/parenting site. Return the URL, title, and a 2-sentence summary of the specific idea.",
  },
  {
    id: "screen-free-activities",
    category: "creativity",
    query:
      "Specific screen-free or rainy-day activity ideas for children aged 3 to 8 that build creativity or fine-motor skills, from a parenting or early-years source. Return the URL, title, and a 2-sentence summary of the specific activity.",
  },
  {
    id: "home-learning",
    category: "reading-literacy",
    query:
      "Practical, evidence-based ways parents can support reading, phonics, or early numeracy at home with children aged 4 to 7, from an education body, school, or reputable literacy source. Return the URL, title, and a 2-sentence summary of the specific tip.",
  },
  {
    id: "money-saving-parents",
    category: "childhood-play",
    query:
      "Practical money-saving tips for parents of young children (free activities, kit swaps, deals on kids' clubs or days out) from a reputable money-advice or parenting site. Return the URL, title, and a 2-sentence summary of the specific tip.",
  },
  {
    id: "clubs-and-sports-to-try",
    category: "childhood-play",
    query:
      "Beginner-friendly clubs, sports, or hobbies worth trying with children aged 4 to 8 and what to expect, from a parenting or activity source. Return the URL, title, and a 2-sentence summary.",
  },
  {
    id: "things-to-do",
    category: "childhood-play",
    query:
      "Specific ideas for days out or things to do with young children aged 3 to 8 (museums, nature, free attractions, seasonal events) from a family-days-out or parenting source. Return the URL, title, and a 2-sentence summary.",
  },
  {
    id: "kids-music-and-audio",
    category: "creativity",
    query:
      "Recommendations for music, songs, or audio (albums, playlists, audio stories) that are great for children aged 3 to 8, from a reputable parenting, education, or music source. Return the URL, title, and a 2-sentence summary.",
  },
  {
    id: "behaviour-and-routines",
    category: "childhood-play",
    query:
      "Practical, gentle tips for everyday routines or behaviour with children aged 3 to 8 (mornings, bedtime, transitions, mealtimes) from a reputable parenting or child-development source. Avoid clinical/diagnostic advice. Return the URL, title, and a 2-sentence summary.",
  },
];

export const TIP_DISCOVERY_SYSTEM = `You are a resource scout for Chunky Crayon, whose audience is parents of children aged roughly 3 to 8. You find real, specific, genuinely useful and SAVE-WORTHY tips, activities, drills, recipes, or recommendations from credible sources (parenting sites, coaching/sports bodies, nutrition bodies, education sources, family-activity sites). You return concrete, actionable items with a real page URL — never vague listicles, never sales pages, never your own invented advice. Prefer evergreen, practical content a parent would bookmark.`;
