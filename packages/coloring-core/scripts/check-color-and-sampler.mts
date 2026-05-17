/**
 * Offline sanity check for the JPEG-driven region-palette primitives.
 *
 * No network, no AI, no DB — pure functions only. Catches Lab-math and
 * sampling bugs in seconds before we spend image-gen calls on the full
 * review loop.
 *
 * Run: pnpm --filter @one-colored-pixel/coloring-core exec tsx \
 *        scripts/check-color-and-sampler.mts
 */
import sharp from "sharp";
import {
  hexToRgb,
  rgbToHex,
  deltaE2000,
  rgbToLab,
  nearestPaletteColor,
  boostChroma,
} from "../src/utils/color.js";
import { sampleRegionColoursFromRender } from "../src/actions/sample-region-colours.js";

// Mirror of the shipped palette (ALL_COLORING_COLORS_EXTENDED, minus
// white/black exactly as generate-regions.ts filters them).
const PALETTE = [
  { name: "Cherry Red", hex: "#E53935" },
  { name: "Sunset Orange", hex: "#FB8C00" },
  { name: "Sunshine Yellow", hex: "#FDD835" },
  { name: "Grass Green", hex: "#43A047" },
  { name: "Sky Blue", hex: "#1E88E5" },
  { name: "Grape Purple", hex: "#8E24AA" },
  { name: "Bubblegum Pink", hex: "#EC407A" },
  { name: "Chocolate Brown", hex: "#6D4C41" },
  { name: "Coral", hex: "#FF7043" },
  { name: "Mint", hex: "#26A69A" },
  { name: "Lavender", hex: "#AB47BC" },
  { name: "Peach", hex: "#FFAB91" },
  { name: "Navy", hex: "#3949AB" },
  { name: "Forest", hex: "#2E7D32" },
  { name: "Gold", hex: "#FFD54F" },
  { name: "Rose", hex: "#F48FB1" },
  { name: "Gray", hex: "#9E9E9E" },
  { name: "Skin Tone", hex: "#FFCC80" },
  { name: "Turquoise", hex: "#00ACC1" },
  { name: "Teal", hex: "#00897B" },
  { name: "Indigo", hex: "#283593" },
  { name: "Magenta", hex: "#C2185B" },
  { name: "Lime", hex: "#7CB342" },
  { name: "Amber", hex: "#FFB300" },
  { name: "Crimson", hex: "#B71C1C" },
  { name: "Olive", hex: "#827717" },
  { name: "Tan", hex: "#D2B48C" },
  { name: "Salmon", hex: "#FF8A65" },
  { name: "Slate", hex: "#546E7A" },
  { name: "Cream", hex: "#FFF8E1" },
  { name: "Light", hex: "#FFE0B2" },
  { name: "Medium Light", hex: "#FFCC80" },
  { name: "Medium", hex: "#DEB887" },
  { name: "Medium Dark", hex: "#A0522D" },
  { name: "Dark", hex: "#8B4513" },
  { name: "Deep", hex: "#5D4037" },
];

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
};

// --- 1. round-trips -------------------------------------------------------
const rt = hexToRgb("#1E88E5");
ok(
  !!rt && rt.r === 0x1e && rt.g === 0x88 && rt.b === 0xe5,
  `hexToRgb #1E88E5 -> ${JSON.stringify(rt)}`,
);
ok(
  rgbToHex({ r: 30, g: 136, b: 229 }) === "#1E88E5",
  `rgbToHex {30,136,229} -> ${rgbToHex({ r: 30, g: 136, b: 229 })}`,
);

// --- 2. deltaE2000 self-distance is zero, symmetric -----------------------
const labA = rgbToLab({ r: 200, g: 50, b: 50 });
const labB = rgbToLab({ r: 60, g: 180, b: 90 });
ok(deltaE2000(labA, labA) < 1e-9, "deltaE2000(x,x) == 0");
ok(
  Math.abs(deltaE2000(labA, labB) - deltaE2000(labB, labA)) < 1e-9,
  "deltaE2000 symmetric",
);

// --- 3. nearestPaletteColor picks the human-obvious colour ----------------
const cases: Array<{ rgb: [number, number, number]; expect: string }> = [
  { rgb: [255, 0, 0], expect: "Cherry Red" },
  { rgb: [10, 110, 230], expect: "Sky Blue" }, // a bright sky blue
  { rgb: [40, 160, 70], expect: "Grass Green" }, // grass
  { rgb: [120, 80, 50], expect: "Chocolate Brown" }, // wood / fur brown-ish
  { rgb: [250, 220, 60], expect: "Sunshine Yellow" }, // sun
  { rgb: [160, 160, 165], expect: "Gray" }, // bunny fur grey, NOT teal
];
for (const c of cases) {
  const n = nearestPaletteColor(
    { r: c.rgb[0], g: c.rgb[1], b: c.rgb[2] },
    PALETTE,
  );
  ok(
    n?.name === c.expect,
    `nearest(${c.rgb.join(",")}) -> ${n?.name} (ΔE ${n?.deltaE.toFixed(1)}) [expect ${c.expect}]`,
  );
}

// --- 3b. boostChroma: muddy hued colour snaps to its vivid family ---------
// The grey-dinosaur failure: a washed-out green (low saturation, clear green
// hue) must snap to Grass Green, NOT grey Slate. And a true neutral grey
// must stay grey (a real grey rock shouldn't become lime).
const muddyGreen = { r: 110, g: 130, b: 100 }; // desaturated green
const muddyRaw = nearestPaletteColor(muddyGreen, PALETTE);
const muddyBoosted = nearestPaletteColor(boostChroma(muddyGreen), PALETTE);
ok(
  muddyBoosted?.name === "Grass Green" || muddyBoosted?.name === "Forest" ||
    muddyBoosted?.name === "Lime",
  `boostChroma muddy green: raw->${muddyRaw?.name} boosted->${muddyBoosted?.name} [expect a green]`,
);
const trueGrey = { r: 150, g: 150, b: 152 };
const greyBoosted = nearestPaletteColor(boostChroma(trueGrey), PALETTE);
ok(
  greyBoosted?.name === "Gray" || greyBoosted?.name === "Slate",
  `boostChroma true grey stays neutral -> ${greyBoosted?.name} [expect Gray/Slate]`,
);

// --- 4. sampler: a synthetic 3-region image -------------------------------
// Build a 60×20 RGB image: cols 0-19 pure red, 20-39 pure green,
// 40-59 pure blue. Region map: same banding. Each region's modal colour
// must come back as that pure colour with coverage≈1 and confidence≈1.
const W = 60;
const H = 20;
const rgb = Buffer.alloc(W * H * 3);
const pixelToRegion = new Uint16Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const p = i * 3;
    if (x < 20) {
      rgb[p] = 220;
      rgb[p + 1] = 30;
      rgb[p + 2] = 30;
      pixelToRegion[i] = 1;
    } else if (x < 40) {
      rgb[p] = 40;
      rgb[p + 1] = 170;
      rgb[p + 2] = 70;
      pixelToRegion[i] = 2;
    } else {
      // A true bright sky blue (close to palette Sky Blue #1E88E5), not a
      // dark navy — the earlier value was genuinely nearer Navy and the
      // ΔE math was right to say so.
      rgb[p] = 32;
      rgb[p + 1] = 140;
      rgb[p + 2] = 232;
      pixelToRegion[i] = 3;
    }
  }
}
const pngBuffer = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
  .png()
  .toBuffer();

const samples = await sampleRegionColoursFromRender(
  pngBuffer,
  pixelToRegion,
  [1, 2, 3],
  W,
  H,
);

for (const [id, expect] of [
  [1, "Cherry Red"],
  [2, "Grass Green"],
  [3, "Sky Blue"],
] as const) {
  const s = samples.get(id);
  const snapped =
    s && s.rgb ? nearestPaletteColor(s.rgb, PALETTE) : null;
  ok(
    !!s &&
      s.rgb !== null &&
      s.coverage > 0.95 &&
      s.confidence > 0.95 &&
      snapped?.name === expect,
    `region ${id}: rgb=${s?.rgb ? rgbToHex(s.rgb) : "null"} cov=${s?.coverage.toFixed(2)} conf=${s?.confidence.toFixed(2)} -> ${snapped?.name} [expect ${expect}]`,
  );
}

console.log(
  `\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`,
);
process.exit(failures === 0 ? 0 : 1);
