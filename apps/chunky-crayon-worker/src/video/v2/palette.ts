/**
 * Pick the healthiest palette variant for a coloring image's regionsJson.
 *
 * Background: the region-store labelling pass occasionally collapses an
 * entire variant to a single hex value (e.g. all 538 regions painted one
 * shade of yellow). When that happens, the demo-reel cover and the reveal
 * sweep both look like a flat fill with no detail. This helper prefers
 * a chosen variant when it's healthy and falls back to the variant with
 * the most distinct hexes when it isn't.
 *
 * Used by `/publish/v2` to pick the palette ONCE per render so the cover
 * thumbnail and the on-camera Magic Brush reveal stay visually consistent.
 *
 * "Healthy" = at least `minDistinctColors` distinct hex values across all
 * regions (default 3). Anything below that means the LLM didn't actually
 * differentiate and we should look elsewhere.
 */
export type PaletteVariant = "realistic" | "pastel" | "cute" | "surprise";

type RegionWithPalettes = {
  palettes?: Record<
    string,
    { hex?: string; colorName?: string } | null | undefined
  >;
};

type RegionsJsonShape = {
  regions: RegionWithPalettes[];
};

const ALL_VARIANTS: PaletteVariant[] = [
  "realistic",
  "cute",
  "pastel",
  "surprise",
];

const countDistinctHexes = (
  regionsJson: RegionsJsonShape,
  variant: PaletteVariant,
): number => {
  const seen = new Set<string>();
  for (const region of regionsJson.regions) {
    const hex = region.palettes?.[variant]?.hex;
    if (hex) seen.add(hex.toLowerCase());
  }
  return seen.size;
};

export type PickPaletteResult = {
  variant: PaletteVariant;
  distinctColors: number;
  /** Per-variant counts so callers can log diagnostics. */
  counts: Record<PaletteVariant, number>;
  /** True when we fell through from the preferred variant. */
  fellBack: boolean;
};

export function pickBestPalette(
  regionsJson: RegionsJsonShape,
  opts: {
    preferred?: PaletteVariant;
    minDistinctColors?: number;
  } = {},
): PickPaletteResult {
  const preferred = opts.preferred ?? "realistic";
  const minDistinct = opts.minDistinctColors ?? 3;

  const counts: Record<PaletteVariant, number> = {
    realistic: 0,
    cute: 0,
    pastel: 0,
    surprise: 0,
  };
  for (const v of ALL_VARIANTS) counts[v] = countDistinctHexes(regionsJson, v);

  // 1. Preferred variant if healthy.
  if (counts[preferred] >= minDistinct) {
    return {
      variant: preferred,
      distinctColors: counts[preferred],
      counts,
      fellBack: false,
    };
  }

  // 2. Otherwise the variant with the most distinct colors. Tie-break in
  //    a sensible visual order: realistic > cute > pastel > surprise.
  let best: PaletteVariant = preferred;
  let bestCount = counts[preferred];
  for (const v of ALL_VARIANTS) {
    if (counts[v] > bestCount) {
      best = v;
      bestCount = counts[v];
    }
  }

  return {
    variant: best,
    distinctColors: bestCount,
    counts,
    fellBack: best !== preferred,
  };
}
