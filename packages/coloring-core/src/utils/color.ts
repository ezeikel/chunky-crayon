/**
 * Colour-space utilities for region-palette quality.
 *
 * The region store samples the dominant colour of each region from an
 * AI-coloured render, then must snap that arbitrary RGB value to the nearest
 * entry in the constrained shipping palette so in-app rendering stays
 * identical to today. "Nearest" in RGB Euclidean space is perceptually wrong
 * (it picks visually-distant colours); the industry-standard fix is CIEDE2000
 * ΔE in CIELAB. These are small, dependency-free, and unit-testable.
 */

export type Rgb = { r: number; g: number; b: number };
export type Lab = { L: number; a: number; b: number };

/**
 * Parse `#RRGGBB` (or `RRGGBB`) into an {r,g,b} triple. Returns null on a
 * malformed hex so callers can skip rather than crash on bad palette data.
 */
export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

/** Format an {r,g,b} triple (0-255, rounded) as an uppercase `#RRGGBB`. */
export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/**
 * Pull a colour toward full saturation while keeping its hue and rough
 * lightness.
 *
 * The colourise render is often muddy/desaturated (the review loop's
 * grey-dinosaur failure: a green dino sampled as grey, which then snaps to
 * "Slate" instead of "Grass Green"). The render's *hue* is still the right
 * signal — "this region is greenish" — it's only the saturation that's been
 * washed out. Boosting chroma before snapping makes a muddy green snap to a
 * clean green rather than to grey, which is what a human would actually
 * colour it. Near-neutral colours (true greys: low chroma at ALL hues) are
 * left alone so a genuinely grey rock stays grey.
 *
 * @param amount 0 = unchanged, 1 = fully saturated. Default 0.6.
 */
export function boostChroma({ r, g, b }: Rgb, amount = 0.6): Rgb {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (max <= 0) return { r, g, b };

  const s = delta / max; // HSV saturation, 0..1

  // A near-grey has NO reliable hue — its tiny channel differences are JPEG
  // noise / ambient bounce, not a colour choice. The old `delta < 14` guard
  // let a barely-tinted grey through and then a 0.6 boost DETONATED it into a
  // fully-saturated colour (the "cream fur → turquoise, whole bunny cyan"
  // bug). Fix: gate on SATURATION not raw delta, and ramp the boost in
  // gradually above the floor so a faint tint is nudged, not exploded.
  //   - s ≤ GREY_FLOOR  → leave entirely alone (a real grey stays grey)
  //   - GREY_FLOOR..FULL_AT → boost ramps 0→full
  //   - s ≥ FULL_AT     → full boost (genuinely chromatic, just washed out)
  const GREY_FLOOR = 0.12;
  const FULL_AT = 0.35;
  if (s <= GREY_FLOOR) return { r, g, b };
  const ramp = Math.min(1, (s - GREY_FLOOR) / (FULL_AT - GREY_FLOOR));
  const eff = amount * ramp;
  if (eff <= 0) return { r, g, b };

  // Keep value (max) + hue, raise saturation toward (never fully to) 1.
  const targetS = Math.min(0.95, s + (1 - s) * eff);
  const v = max;
  const newMin = v * (1 - targetS);
  const scale = (newMin - v) / (min - v || -1); // maps [min,max] -> [newMin,v]
  const remap = (c: number) => v + (c - v) * scale;
  return {
    r: Math.max(0, Math.min(255, remap(r))),
    g: Math.max(0, Math.min(255, remap(g))),
    b: Math.max(0, Math.min(255, remap(b))),
  };
}

// sRGB → linear → XYZ (D65) → CIELAB. Standard reference implementation.
function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** Convert an sRGB {r,g,b} (0-255) to CIELAB (D65 white point). */
export function rgbToLab({ r, g, b }: Rgb): Lab {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  // Linear sRGB → XYZ (D65)
  const x = rl * 0.4124 + gl * 0.3576 + bl * 0.1805;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505;

  // Normalise by D65 reference white
  const xn = x / 0.95047;
  const yn = y / 1.0;
  const zn = z / 1.08883;

  const f = (t: number) =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(xn);
  const fy = f(yn);
  const fz = f(zn);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * CIEDE2000 colour difference between two CIELAB colours.
 *
 * The current industry-standard perceptual distance. Lower = more similar;
 * a ΔE of ~2.3 is roughly the just-noticeable difference. Used to pick the
 * closest palette entry and to decide whether a sampled colour is "close
 * enough" to trust vs. flag for AI repair.
 *
 * Reference: Sharma, Wu & Dalal (2005), "The CIEDE2000 Color-Difference
 * Formula". This is a direct transcription of that algorithm.
 */
export function deltaE2000(lab1: Lab, lab2: Lab): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const kL = 1;
  const kC = 1;
  const kH = 1;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;

  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const rad2deg = (r: number) => (r * 180) / Math.PI;
  const deg2rad = (d: number) => (d * Math.PI) / 180;

  const hp = (b: number, ap: number) => {
    if (b === 0 && ap === 0) return 0;
    let h = rad2deg(Math.atan2(b, ap));
    if (h < 0) h += 360;
    return h;
  };
  const h1p = hp(b1, a1p);
  const h2p = hp(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp: number;
  if (C1p * C2p === 0) {
    hbarp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hbarp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hbarp = (h1p + h2p + 360) / 2;
  } else {
    hbarp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(deg2rad(hbarp - 30)) +
    0.24 * Math.cos(deg2rad(2 * hbarp)) +
    0.32 * Math.cos(deg2rad(3 * hbarp + 6)) -
    0.2 * Math.cos(deg2rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const Sl =
    1 +
    (0.015 * Math.pow(Lbarp - 50, 2)) /
      Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(deg2rad(2 * dTheta)) * Rc;

  return Math.sqrt(
    Math.pow(dLp / (kL * Sl), 2) +
      Math.pow(dCp / (kC * Sc), 2) +
      Math.pow(dHp / (kH * Sh), 2) +
      Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh)),
  );
}

export type PaletteEntry = { hex: string; name: string };

export type NearestPaletteResult = {
  hex: string;
  name: string;
  /** CIEDE2000 distance from the queried colour to this palette entry */
  deltaE: number;
};

/**
 * Find the perceptually closest palette entry to an arbitrary RGB colour.
 *
 * Pre-converts the palette to Lab on every call. The palette is ~38 entries
 * and this runs once per region, so the cost is negligible; callers wanting
 * to hot-loop millions of times should hoist a Lab-cached variant, but no
 * caller does that today.
 *
 * Returns null only if the palette is empty or entirely unparseable.
 */
export function nearestPaletteColor(
  rgb: Rgb,
  palette: PaletteEntry[],
): NearestPaletteResult | null {
  const targetLab = rgbToLab(rgb);
  let best: NearestPaletteResult | null = null;

  for (const entry of palette) {
    const entryRgb = hexToRgb(entry.hex);
    if (!entryRgb) continue;
    const d = deltaE2000(targetLab, rgbToLab(entryRgb));
    if (best === null || d < best.deltaE) {
      best = { hex: entry.hex, name: entry.name, deltaE: d };
    }
  }

  return best;
}
