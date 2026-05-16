/**
 * Curated default boredom-buster activities. All no-prep, screen-free,
 * age 3 to 10. Each is tagged with `minAge` (youngest age the activity
 * suits) and `needsSupplies` (true if it needs anything beyond what's
 * already lying around the house) so the optional filters can narrow
 * the active list.
 *
 * "Color a picture" is the Chunky Crayon funnel hook: its slice links
 * out to chunkycrayon.com, which auto-fires the shared `cc_cta_click`
 * conversion event via cc-link-tracking.
 */
export type Activity = {
  label: string;
  minAge: number;
  needsSupplies: boolean;
  /** Outbound href for the CC funnel slice. Optional. */
  href?: string;
};

export const CC_COLOR_HREF =
  "https://chunkycrayon.com/?utm_source=boredomwheel&utm_medium=wheel&utm_campaign=spin_result";

export const DEFAULT_ACTIVITIES: Activity[] = [
  { label: "Build a blanket fort", minAge: 3, needsSupplies: false },
  { label: "Sock basketball", minAge: 3, needsSupplies: false },
  { label: "Dance party", minAge: 3, needsSupplies: false },
  {
    label: "Color a picture",
    minAge: 3,
    needsSupplies: true,
    href: CC_COLOR_HREF,
  },
  { label: "Draw a comic", minAge: 6, needsSupplies: true },
  { label: "Indoor scavenger hunt", minAge: 4, needsSupplies: false },
  { label: "Paper airplane contest", minAge: 5, needsSupplies: true },
  { label: "Freeze dance", minAge: 3, needsSupplies: false },
  { label: "Make a card for someone", minAge: 4, needsSupplies: true },
  { label: "Pillow obstacle course", minAge: 3, needsSupplies: false },
  { label: "Animal charades", minAge: 4, needsSupplies: false },
  { label: "Build the tallest cup tower", minAge: 4, needsSupplies: true },
  { label: "Tell a story together", minAge: 3, needsSupplies: false },
  { label: "Balloon keep-up", minAge: 4, needsSupplies: true },
  { label: "Make up a secret handshake", minAge: 5, needsSupplies: false },
  { label: "Sort toys by color", minAge: 3, needsSupplies: false },
  { label: "Treasure map drawing", minAge: 6, needsSupplies: true },
  { label: "Hot lava floor game", minAge: 4, needsSupplies: false },
  { label: "Puppet show with socks", minAge: 4, needsSupplies: false },
  { label: "Race toy cars down a ramp", minAge: 3, needsSupplies: true },
  { label: "Invent a new board game", minAge: 7, needsSupplies: true },
  {
    label: "Practice somersaults on a cushion",
    minAge: 5,
    needsSupplies: false,
  },
  { label: "Build a marble run", minAge: 7, needsSupplies: true },
  { label: "Make a paper crown", minAge: 4, needsSupplies: true },
];

export type AgeBand = "all" | "3-5" | "6-8" | "9-10";

export const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: "all", label: "Any age" },
  { value: "3-5", label: "Ages 3 to 5" },
  { value: "6-8", label: "Ages 6 to 8" },
  { value: "9-10", label: "Ages 9 to 10" },
];

const BAND_MAX: Record<Exclude<AgeBand, "all">, number> = {
  "3-5": 5,
  "6-8": 8,
  "9-10": 10,
};

/**
 * Narrows the activity list by age band and the no-supplies toggle.
 * An activity is shown for a band if its minAge is at or below the
 * band's upper bound (a 3+ activity still works for a 9-year-old).
 */
export const filterActivities = (
  activities: Activity[],
  band: AgeBand,
  noSuppliesOnly: boolean,
): Activity[] =>
  activities.filter((activity) => {
    if (noSuppliesOnly && activity.needsSupplies) return false;
    if (band === "all") return true;
    return activity.minAge <= BAND_MAX[band];
  });
