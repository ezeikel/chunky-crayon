import { gzipSync } from "node:zlib";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { generateText, Output } from "ai";
import { models } from "../models";
import {
  regionFirstColorResponseSchema,
  regionLabellingResponseSchema,
  type RegionFirstColorResponse,
  type RegionLabellingResponse,
} from "../schemas";
import { detectAllRegionsFromPixels } from "@one-colored-pixel/canvas";
import type { ColorMapConfig, ColorPaletteEntry } from "./generate-color-map";

// =============================================================================
// Types
// =============================================================================

/**
 * The four palette variants available for every coloring image. Each region
 * gets one suggested colour per variant so the client can switch at runtime
 * without any additional AI calls.
 */
export const PALETTE_VARIANTS = [
  "realistic",
  "pastel",
  "cute",
  "surprise",
] as const;
export type PaletteVariant = (typeof PALETTE_VARIANTS)[number];

export type RegionStoreRegion = {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  pixelCount: number;
  /** AI-provided semantic label, e.g. "sky", "leaf", "hair" */
  label: string;
  /**
   * Logical object this region belongs to. Multiple regions can share a
   * group (e.g. three mast regions → "main mast"). The client can use this
   * to optionally reveal all regions in a group on a single tap.
   */
  objectGroup: string;
  /** Colour assignment per palette variant */
  palettes: Record<PaletteVariant, { hex: string; colorName: string }>;
};

export type RegionStoreJson = {
  sceneDescription: string;
  sourceWidth: number;
  sourceHeight: number;
  /** How many pixels in the gzipped region map belong to a real region (non-boundary) */
  regionPixelCount: number;
  regions: RegionStoreRegion[];
};

export type GenerateRegionStoreConfig = ColorMapConfig & {
  /**
   * Per-palette-variant modifier appended to the base regionFillPointsSystem
   * prompt. Lets each brand tune the aesthetic of each variant while sharing
   * the base colouring rules.
   */
  paletteVariantModifiers: Record<PaletteVariant, string>;
};

export type GenerateRegionStoreResult =
  | {
      success: true;
      /** Gzipped Uint16Array pixel→regionId lookup (width*height*2 uncompressed bytes) */
      regionMapGzipped: Buffer;
      /** Region metadata + palette assignments, ready for JSON.stringify */
      regionsJson: RegionStoreJson;
      width: number;
      height: number;
      /** AI scene description, surfaced for logging / diagnostics */
      sceneDescription: string;
    }
  | { success: false; error: string };

// =============================================================================
// Defaults
// =============================================================================

/**
 * Sensible brand-agnostic defaults. Individual apps can override any of these
 * via the `paletteVariantModifiers` config key.
 */
export const DEFAULT_PALETTE_VARIANT_MODIFIERS: Record<PaletteVariant, string> =
  {
    realistic:
      "PALETTE VARIANT: REALISTIC. Choose colours that match real-world expectations. Grass is green, sky is blue, skin is warm, wood is brown. Lean naturalistic and grounded.",
    pastel:
      "PALETTE VARIANT: PASTEL. Choose soft, desaturated colours: gentle pinks, mints, lavenders, peaches, sky blues. Everything should feel calming, airy, and dreamy. Avoid bold saturated hues.",
    cute: "PALETTE VARIANT: CUTE. Choose playful, high-saturation colours: bubblegum pinks, sunny yellows, mint greens, sky blues, corals. Everything should feel warm, friendly, and inviting. Think children's cartoon.",
    surprise:
      "PALETTE VARIANT: SURPRISE. Choose unexpected, creative colour choices that defy expectations. A pink tree, a purple sky, rainbow skin, a teal sun. Be imaginative and bold — but the overall palette must still feel harmonious, not chaotic.",
  };

/**
 * System prompt for the labelling pass. Shared across brands — labels are
 * purely about identifying what's in the scene, with no colour judgement.
 */
const REGION_LABELLING_SYSTEM = `You are a coloring-book scene analyst. You will be shown TWO images of the same coloring page:

1. The ORIGINAL black-and-white line art. Use this to identify what each object in the scene IS (a pirate ship, a moon, a star, a planet).
2. A COLOUR-CODED REGION MAP of the same scene. Every fillable region is filled with its own distinct colour. A numeric region ID is stamped on top of each region in white text with a black outline.

CRITICAL: In the colour-coded map, every pixel that shares the same colour belongs to the SAME region. When you see a number N on a coloured area, that entire coloured area is region N — not just the point where the number is drawn. Use the full coloured area to understand which pixels belong to which region.

Your job is to read each number in the colour-coded map, look at the corresponding area in the original line art, identify what that region represents in the scene, and assign it a precise semantic label plus an object group.

RULES:
- You MUST return exactly one entry per region ID shown in the overlay. Do not skip any. Do not invent IDs that aren't present.
- To identify a region: first find its number in the colour-coded map. Note the full extent of the colour area surrounding that number. Then look at the SAME area in the original line art to see what object is drawn there. That's the region's identity.
- The label describes what the region IS in the scene (e.g. "sky", "mast", "sail stripe", "wave", "pirate flag skull", "moon face", "star", "planet ring").
- The objectGroup groups regions that belong to the same logical object. For example:
  - If a crow's nest is made of three separate regions (cup, base, strut), all three get objectGroup "crow's nest".
  - If a face has eyes and a mouth as separate regions, all get objectGroup "moon".
  - If sails have multiple stripes, each stripe shares objectGroup "main sail" but keeps its own label like "sail stripe".
  - Single-region objects like "sky" or "sea" just repeat their label as the group.
- Use VISUAL CONTEXT to disambiguate. Two small round regions may look similar in isolation — but one is a star in the sky and the other is a porthole on a ship. Use neighbourhood cues from the original line art.
- IMPORTANT: The LARGEST region by coloured area is almost always the BACKGROUND (sky, sea, space, etc.). If one region clearly dominates the image — spanning the whole background with a single colour in the map — label it as the background it represents ("sky", "space", "sea", "grass field") regardless of what foreground objects are nearby.
- Prefer specific over generic: "pirate flag skull" beats "skull" beats "decoration".
- If you genuinely cannot tell what a region is, use label "unknown" and objectGroup "unknown". Do NOT guess wildly. "unknown" is better than a wrong confident label.
- Return labels in plain English, singular unless it obviously denotes a group.`;

// =============================================================================
// Helpers
// =============================================================================

function getSizeDescriptor(
  pixelCount: number,
  totalPixels: number,
): "small" | "medium" | "large" {
  const percentage = (pixelCount / totalPixels) * 100;
  if (percentage > 10) return "large";
  if (percentage > 2) return "medium";
  return "small";
}

/**
 * Rasterise an SVG buffer to an RGBA pixel buffer at a target width
 * (preserving aspect ratio). Uses Resvg for reliable SVG rendering, then
 * sharp to apply morphological closing + extract raw pixels.
 *
 * Morphological closing (dilate → erode) is applied to close 1-2 pixel gaps
 * at potrace curve intersections without eroding small feature interiors.
 * Sharp's dilate/erode operate on the LUMINANCE of the pixels — dilation
 * expands dark pixels (line art), erosion shrinks them. Applied in sequence,
 * this closes any dark-pixel gap smaller than ~2× the operation width.
 *
 * Returns both the original PNG (for display / AI vision) and the
 * closed-boundary pixels (for region detection).
 */
async function rasterizeSvgToPixels(
  svgBuffer: Buffer,
  targetWidth: number,
): Promise<{
  pngBuffer: Buffer;
  pixels: Uint8Array;
  width: number;
  height: number;
}> {
  const resvg = new Resvg(svgBuffer, {
    fitTo: { mode: "width", value: targetWidth },
    background: "white",
  });
  const rendered = resvg.render();
  const pngBuffer = Buffer.from(rendered.asPng());
  const width = rendered.width;
  const height = rendered.height;

  // Apply morphological closing to the rasterised line art. Sharp's
  // dilate/erode use greyscale morphology — dilate grows dark regions,
  // erode shrinks them. Sequenced as dilate(N) → erode(N), any dark-pixel
  // gap smaller than ~2N pixels gets filled in, while feature interiors
  // (which were never dark) are preserved. Width 2 gives us gap closing
  // up to ~4 pixels, which handles potrace micro-gaps reliably.
  const { data } = await sharp(pngBuffer)
    .flatten({ background: "white" })
    .dilate(2)
    .erode(2)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data);

  return { pngBuffer, pixels, width, height };
}

/**
 * Assign a distinct, visually-contrasting HSL colour to each region.
 *
 * Uses a golden-ratio hue rotation so adjacent region IDs get maximally
 * different hues. Saturation and lightness are varied across a small set of
 * bands so even regions that collide on hue still look different.
 *
 * Returns a map from regionId → `rgb(r, g, b)` CSS string.
 */
function assignRegionColours(regionIds: number[]): Map<number, string> {
  const colours = new Map<number, string>();
  const goldenRatio = 0.61803398875;
  let hue = 0;
  // Cycle through a small set of saturation/lightness bands so overflow
  // regions with repeating hues still look distinguishable.
  const bands: Array<[number, number]> = [
    [85, 55],
    [70, 45],
    [90, 65],
    [75, 35],
  ];

  regionIds.forEach((id, i) => {
    hue = (hue + goldenRatio) % 1;
    const [s, l] = bands[i % bands.length];
    const { r, g, b } = hslToRgb(hue * 360, s, l);
    colours.set(id, `rgb(${r}, ${g}, ${b})`);
  });

  return colours;
}

function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  const S = s / 100;
  const L = l / 100;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const hp = h / 60;
  const X = C * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [C, X, 0];
  else if (hp < 2) [r1, g1, b1] = [X, C, 0];
  else if (hp < 3) [r1, g1, b1] = [0, C, X];
  else if (hp < 4) [r1, g1, b1] = [0, X, C];
  else if (hp < 5) [r1, g1, b1] = [X, 0, C];
  else if (hp < 6) [r1, g1, b1] = [C, 0, X];
  const m = L - C / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

/**
 * Build a PNG where each pixel is coloured according to its region's
 * assigned hue, plus a numeric label stamped at every region's centroid.
 *
 * This is MUCH more reliable than numbered points on the line art because
 * Gemini can see the full extent of each region as a coloured area, not
 * just a floating number. When asked "which region is labelled #1?",
 * Gemini can look at the entire area filled with region #1's colour,
 * not guess based on what's visually near a tiny number.
 *
 * The numeric labels are still drawn on top so Gemini can tie colours
 * back to IDs.
 */
function renderColouredRegionOverlayPng(
  pixelToRegion: Uint16Array,
  regions: Array<{
    id: number;
    centroid: { x: number; y: number };
    pixelCount: number;
  }>,
  width: number,
  height: number,
): Promise<Buffer> {
  // Step 1: build raw RGB buffer by looking up each pixel's region colour.
  const regionIds = regions.map((r) => r.id);
  const colours = assignRegionColours(regionIds);

  // Pre-parse colours into RGB triples for the inner loop
  const rgbByRegion = new Map<number, [number, number, number]>();
  for (const [id, rgb] of colours.entries()) {
    const m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(rgb);
    if (m) {
      rgbByRegion.set(id, [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])]);
    }
  }

  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixelToRegion.length; i++) {
    const regionId = pixelToRegion[i];
    const rgb = rgbByRegion.get(regionId);
    const p = i * 3;
    if (rgb) {
      raw[p] = rgb[0];
      raw[p + 1] = rgb[1];
      raw[p + 2] = rgb[2];
    } else {
      // Boundary or unassigned — black
      raw[p] = 0;
      raw[p + 1] = 0;
      raw[p + 2] = 0;
    }
  }

  // Step 2: build an SVG overlay with numeric labels stamped at centroids.
  // Skip very small regions where a number would overwrite the entire region.
  const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${regions
    .filter((r) => r.pixelCount >= 60)
    .map((r) => {
      const raw = Math.sqrt(r.pixelCount) / 2.5;
      const fontSize = Math.max(14, Math.min(56, Math.round(raw)));
      const strokeWidth = Math.max(2, fontSize / 8);
      return `<text x="${r.centroid.x}" y="${r.centroid.y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="900" text-anchor="middle" dominant-baseline="middle" fill="white" stroke="black" stroke-width="${strokeWidth}" paint-order="stroke fill">${r.id}</text>`;
    })
    .join("")}</svg>`;

  return sharp(raw, { raw: { width, height, channels: 3 } })
    .composite([{ input: Buffer.from(labelSvg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

// =============================================================================
// Labelling pass (Strategy C)
// =============================================================================

/**
 * Call the labelling AI once to get a region→label mapping. Uses both the
 * original PNG and a numbered-overlay PNG so the AI can read region IDs
 * directly off the image instead of guessing from spatial descriptors.
 *
 * Returns null on failure — callers should fall back to generic labels.
 */
async function generateRegionLabels(
  linePngBase64: string,
  overlayPngBase64: string,
  regionIds: number[],
): Promise<RegionLabellingResponse | null> {
  const startTime = Date.now();

  try {
    const userPrompt = `The first image is the original black-and-white line art. Use it to identify what each object in the scene is.

The second image is a COLOUR-CODED REGION MAP. Each of the ${regionIds.length} regions is filled with a distinct colour, with its numeric ID stamped on top in white text. Every pixel that shares a colour belongs to the same region.

Region IDs present: ${regionIds.join(", ")}.

For each region ID:
  1. Locate it in the colour-coded map by finding its number.
  2. Note the full coloured area around the number — that's the region's footprint.
  3. Look at the SAME footprint in the original line art to see what that region represents.
  4. Return a label and objectGroup.

Return exactly one entry per region ID — no skips, no duplicates, no invented IDs. Pay special attention to the largest coloured area — that is almost certainly the background (sky, space, sea, etc.).`;

    const { output } = await generateText({
      model: models.analyticsQuality,
      output: Output.object({ schema: regionLabellingResponseSchema }),
      system: REGION_LABELLING_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image", image: linePngBase64 },
            { type: "image", image: overlayPngBase64 },
          ],
        },
      ],
    });

    const elapsedMs = Date.now() - startTime;
    console.log(
      `[RegionStore] Labelling pass completed in ${elapsedMs}ms:`,
      `${output?.regions.length ?? 0}/${regionIds.length} labels`,
    );

    return output ?? null;
  } catch (error) {
    console.error("[RegionStore] Labelling pass failed:", error);
    return null;
  }
}

// =============================================================================
// Colouring pass (Strategy C)
// =============================================================================

/**
 * Call the AI once for a single palette variant. Now that regions are
 * pre-labelled, the prompt includes the label list so the AI only has to
 * pick colours, not identify objects.
 */
async function assignColoursForVariant(
  variant: PaletteVariant,
  config: GenerateRegionStoreConfig,
  labelledRegions: Array<{
    id: number;
    label: string;
    objectGroup: string;
    gridRow: number;
    gridCol: number;
    size: "small" | "medium" | "large";
    pixelPercentage: number;
  }>,
  palette: ColorPaletteEntry[],
  imageBase64: string,
  sceneContext?: { title: string; description: string; tags: string[] },
): Promise<{
  variant: PaletteVariant;
  response: RegionFirstColorResponse | null;
  elapsedMs: number;
}> {
  const startTime = Date.now();
  const variantModifier = config.paletteVariantModifiers[variant];
  const systemPrompt = `${config.regionFillPointsSystem}\n\n${variantModifier}\n\nIMPORTANT: Each region already has a verified semantic label attached. Trust the labels — do not second-guess what a region is. Focus entirely on choosing the best palette colour for each labelled region under the variant described above.`;

  // Build a labelled version of the detected regions for the prompt. We pass
  // through the existing createRegionFillPointsPrompt but prepend an explicit
  // labels block so the brand prompts don't need to change.
  const labelsBlock = `PRE-IDENTIFIED REGIONS (labels are verified — do NOT relabel, only colour):
${labelledRegions
  .map(
    (r) =>
      `  - Region #${r.id}: ${r.label} (group: ${r.objectGroup}, grid r${r.gridRow}c${r.gridCol}, ${r.size}, ${r.pixelPercentage}% of canvas)`,
  )
  .join("\n")}

Using the variant guidelines in the system prompt, assign a palette colour to every region. The element field in your response MUST match the provided label exactly.`;

  try {
    const { output } = await generateText({
      model: models.analyticsQuality,
      output: Output.object({ schema: regionFirstColorResponseSchema }),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: labelsBlock },
            {
              type: "text",
              text: config.createRegionFillPointsPrompt(
                palette,
                labelledRegions.map((r) => ({
                  id: r.id,
                  gridRow: r.gridRow,
                  gridCol: r.gridCol,
                  size: r.size,
                  pixelPercentage: r.pixelPercentage,
                })),
                sceneContext,
              ),
            },
            { type: "image", image: imageBase64 },
          ],
        },
      ],
    });

    return {
      variant,
      response: output ?? null,
      elapsedMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error(
      `[RegionStore] AI call failed for ${variant} variant:`,
      error,
    );
    return { variant, response: null, elapsedMs: Date.now() - startTime };
  }
}

// =============================================================================
// Main
// =============================================================================

/**
 * Build the full region store for a coloring image.
 *
 * Strategy C pipeline:
 *   1. Rasterise the SVG (1024×auto) and detect regions via scanline flood fill.
 *   2. Render a numbered-overlay PNG with region IDs stamped at each centroid.
 *   3. ONE AI call: pass both the line art and the overlay to the labelling
 *      prompt. The AI reads numbers off the overlay and returns verified
 *      semantic labels + object groups for every region.
 *   4. FOUR parallel AI calls (one per palette variant): pass the labelled
 *      region list + the original image. The AI's job is now just colour
 *      selection, not identification.
 *   5. Merge the labels + per-variant colour assignments into the per-region
 *      palette structure.
 *   6. Gzip the Uint16Array pixel→regionId lookup.
 *
 * Caller is responsible for persistence (R2 upload + DB update).
 */
export async function generateRegionStoreLogic(
  svgBuffer: Buffer,
  config: GenerateRegionStoreConfig,
  sceneContext?: { title: string; description: string; tags: string[] },
): Promise<GenerateRegionStoreResult> {
  try {
    const overallStart = Date.now();

    // --- Step 1: rasterise the SVG with morphological gap-closing ----------
    // rasterizeSvgToPixels runs sharp dilate(2)→erode(2) on the line art
    // before extracting pixels, which closes potrace micro-gaps up to ~4
    // pixels wide while preserving small feature interiors (stars, planet
    // edges, decorations). No separate dilation step needed downstream.
    const { pngBuffer, pixels, width, height } = await rasterizeSvgToPixels(
      svgBuffer,
      1024,
    );
    console.log(
      `[RegionStore] Rasterised SVG to ${width}×${height} with morphological gap-closing`,
    );

    // --- Step 2: detect regions on the line-art raster ----------------------
    const regionMap = detectAllRegionsFromPixels(pixels, width, height, 100);
    console.log(`[RegionStore] Detected ${regionMap.regions.length} regions`);

    if (regionMap.regions.length === 0) {
      return {
        success: false,
        error: "No colorable regions detected in SVG",
      };
    }

    // --- Step 3: render the coloured region overlay PNG --------------------
    // Each region gets its own distinct HSL colour, with a numeric label
    // stamped on top at the centroid. This is MUCH more reliable than
    // numbered points on the original line art — Gemini can see the full
    // extent of each region as a coloured area instead of guessing from
    // spatial context around a tiny number.
    const overlayPngBuffer = await renderColouredRegionOverlayPng(
      regionMap.pixelToRegion,
      regionMap.regions,
      width,
      height,
    );
    console.log(
      `[RegionStore] Rendered coloured region overlay (${overlayPngBuffer.byteLength} bytes)`,
    );

    const linePngBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    const overlayPngBase64 = `data:image/png;base64,${overlayPngBuffer.toString("base64")}`;

    // --- Step 4: labelling pass (ONE call) ----------------------------------
    const regionIds = regionMap.regions.map((r) => r.id);
    const labellingResponse = await generateRegionLabels(
      linePngBase64,
      overlayPngBase64,
      regionIds,
    );

    // Build label lookup. If the labelling call fails entirely, fall back to
    // placeholder labels so the rest of the pipeline can still produce a
    // (degraded) region store.
    const labelByRegionId = new Map<
      number,
      { label: string; objectGroup: string }
    >();
    if (labellingResponse) {
      for (const entry of labellingResponse.regions) {
        labelByRegionId.set(entry.regionId, {
          label: entry.label,
          objectGroup: entry.objectGroup,
        });
      }
    }

    // Backfill any regions the AI missed (or all of them if labelling failed)
    const missingLabels: number[] = [];
    for (const r of regionMap.regions) {
      if (!labelByRegionId.has(r.id)) {
        labelByRegionId.set(r.id, {
          label: "unknown",
          objectGroup: "unknown",
        });
        missingLabels.push(r.id);
      }
    }
    if (missingLabels.length > 0) {
      console.warn(
        `[RegionStore] ${missingLabels.length} regions missing from labelling response (using "unknown")`,
      );
    }

    // --- Step 5: build labelled detected-regions for the colouring calls ----
    const totalPixels = width * height;
    const labelledRegions = regionMap.regions.map((r) => {
      const labelEntry = labelByRegionId.get(r.id)!;
      return {
        id: r.id,
        label: labelEntry.label,
        objectGroup: labelEntry.objectGroup,
        gridRow: Math.min(
          5,
          Math.max(1, Math.ceil((r.centroid.y / height) * 5)),
        ),
        gridCol: Math.min(
          5,
          Math.max(1, Math.ceil((r.centroid.x / width) * 5)),
        ),
        size: getSizeDescriptor(r.pixelCount, totalPixels),
        pixelPercentage: Number(
          ((r.pixelCount / totalPixels) * 100).toFixed(1),
        ),
      };
    });

    const palette = config.allColors
      .filter((c) => c.hex !== "#FFFFFF" && c.hex !== "#212121")
      .map((c) => ({ hex: c.hex, name: c.name }));

    // --- Step 6: colouring pass (FOUR parallel calls) -----------------------
    const variantResults = await Promise.all(
      PALETTE_VARIANTS.map((variant) =>
        assignColoursForVariant(
          variant,
          config,
          labelledRegions,
          palette,
          linePngBase64,
          sceneContext,
        ),
      ),
    );

    // Bail if every variant failed — nothing usable to persist
    if (variantResults.every((r) => r.response === null)) {
      return {
        success: false,
        error: "All palette variant AI calls failed",
      };
    }

    // --- Step 7: merge variant responses into per-region palette entries ----
    const variantLookups = new Map<
      PaletteVariant,
      Map<number, { hex: string; colorName: string }>
    >();
    for (const { variant, response } of variantResults) {
      const lookup = new Map<number, { hex: string; colorName: string }>();
      if (response) {
        for (const assignment of response.assignments) {
          lookup.set(assignment.regionId, {
            hex: assignment.suggestedColor,
            colorName: assignment.colorName,
          });
        }
      }
      variantLookups.set(variant, lookup);
    }

    // Brand-agnostic fallback colour when a variant didn't assign one (rare)
    const FALLBACK: Record<PaletteVariant, { hex: string; colorName: string }> =
      {
        realistic: { hex: "#9E9E9E", colorName: "Gray" },
        pastel: { hex: "#FFCDD2", colorName: "Soft Pink" },
        cute: { hex: "#FFEB3B", colorName: "Sunshine Yellow" },
        surprise: { hex: "#AB47BC", colorName: "Lavender" },
      };

    // Assemble the final region list
    const regions: RegionStoreRegion[] = regionMap.regions.map((r) => {
      const labelEntry = labelByRegionId.get(r.id)!;
      const palettes = Object.fromEntries(
        PALETTE_VARIANTS.map((variant) => [
          variant,
          variantLookups.get(variant)!.get(r.id) ?? FALLBACK[variant],
        ]),
      ) as RegionStoreRegion["palettes"];

      return {
        id: r.id,
        bounds: r.bounds,
        centroid: r.centroid,
        pixelCount: r.pixelCount,
        label: labelEntry.label,
        objectGroup: labelEntry.objectGroup,
        palettes,
      };
    });

    // Count total region pixels (everything assigned to a non-zero regionId)
    let regionPixelCount = 0;
    for (let i = 0; i < regionMap.pixelToRegion.length; i++) {
      if (regionMap.pixelToRegion[i] !== 0) regionPixelCount++;
    }

    // --- Step 8: serialise region map binary --------------------------------
    const pixelToRegionBytes = Buffer.from(
      regionMap.pixelToRegion.buffer,
      regionMap.pixelToRegion.byteOffset,
      regionMap.pixelToRegion.byteLength,
    );
    const regionMapGzipped = gzipSync(pixelToRegionBytes);

    // --- Step 9: build the JSON metadata ------------------------------------
    // Prefer the labelling pass's scene description; fall back to whichever
    // colour variant succeeded first.
    const sceneDescription =
      labellingResponse?.sceneDescription ??
      variantResults.find((v) => v.response)?.response?.sceneDescription ??
      "A coloring page";

    const regionsJson: RegionStoreJson = {
      sceneDescription,
      sourceWidth: width,
      sourceHeight: height,
      regionPixelCount,
      regions,
    };

    const overallElapsed = Date.now() - overallStart;
    console.log(
      `[RegionStore] Completed in ${overallElapsed}ms:`,
      `${regions.length} regions, ${regionMapGzipped.byteLength} gz bytes,`,
      `variant timings:`,
      variantResults.map((v) => `${v.variant}=${v.elapsedMs}ms`).join(" "),
    );

    return {
      success: true,
      regionMapGzipped,
      regionsJson,
      width,
      height,
      sceneDescription,
    };
  } catch (error) {
    console.error("[RegionStore] Error generating region store:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
