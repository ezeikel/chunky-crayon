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
import {
  nearestPaletteColor,
  rgbToLab,
  deltaE2000,
  boostChroma,
} from "../utils/color";
import { createColourisePrompt } from "./colorise-prompts";
import {
  colorizeLineArt,
  DEFAULT_COLORIZE_MODEL,
  type ColorizeModel,
} from "./colorize-line-art";
import { sampleRegionColoursFromRender } from "./sample-region-colours";

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
   *
   * Still used by the AI-repair pass for outlier regions; the primary colour
   * source is now JPEG sampling (see generateRegionStoreLogic step 6).
   */
  paletteVariantModifiers: Record<PaletteVariant, string>;
  /**
   * Which model produces the styled colourised render that region colours
   * are sampled from. Defaults to "gemini" (today's known-good
   * coloredReferenceUrl model). The dev region-store viewer overrides this
   * to compare "gemini" vs "gpt" on the same image.
   */
  colorizeModel?: ColorizeModel;
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

type ResolvedColour = { hex: string; colorName: string };

// A region's sampled colour is trusted (no AI repair needed) when the render
// actually coloured a meaningful chunk of it, that colour was concentrated
// rather than noisy, and the constrained palette can represent it closely.
const TRUST_MIN_COVERAGE = 0.15;
const TRUST_MIN_CONFIDENCE = 0.5;
const TRUST_MAX_DELTA_E = 25;

// In the object-group consistency pass, "same object ⇒ same colour" is the
// #1 rule (a bunny's ears match its body; a jacket's sleeve matches its
// collar). We only let a region keep its OWN colour when it is BOTH very
// confidently sampled AND dramatically different from the group colour —
// a genuinely distinct sub-part like a red stripe on a white sail. The bar
// is deliberately high: per-region shading on the render routinely shifts a
// single object's fragments by ΔE 20-30, and letting that fragment the
// object is exactly the "muddy patchy body" failure the review loop caught.
const GROUP_OVERRIDE_MIN_CONFIDENCE = 0.8;
const GROUP_OVERRIDE_MIN_DELTA_E = 38;

/**
 * Resolve every region's colour for ONE palette variant.
 *
 * Pipeline (replaces the old blind-AI pass):
 *   1. Colourise the line art with the configured model + the variant prompt.
 *   2. Sample each region's dominant colour from that render.
 *   3. Snap each sampled colour to the constrained palette (CIEDE2000).
 *   4. Regions the render coloured cleanly are trusted as-is. The rest
 *      ("outliers": tiny, unfilled, noisy, or unrepresentable) go to ONE AI
 *      repair call that SEES the render and is told the trusted colours.
 *   5. Object-group consistency: same logical object ⇒ same colour, unless a
 *      region is confidently a different-coloured sub-part.
 */
async function resolveVariantColours(
  variant: PaletteVariant,
  config: GenerateRegionStoreConfig,
  lineArtPng: Buffer,
  pixelToRegion: Uint16Array,
  width: number,
  height: number,
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
  sceneContext?: { title: string; description: string; tags: string[] },
): Promise<{
  variant: PaletteVariant;
  colours: Map<number, ResolvedColour> | null;
  elapsedMs: number;
  stats: { sampled: number; repaired: number; grouped: number };
}> {
  const startTime = Date.now();
  const colorizeModel = config.colorizeModel ?? DEFAULT_COLORIZE_MODEL;
  const regionIds = labelledRegions.map((r) => r.id);
  const labelById = new Map(labelledRegions.map((r) => [r.id, r]));
  const stats = { sampled: 0, repaired: 0, grouped: 0 };

  try {
    // --- 1. styled render ---------------------------------------------------
    const sceneHint = sceneContext?.title
      ? `This is: "${sceneContext.title}". ${sceneContext.description ?? ""}`
      : "";
    const render = await colorizeLineArt(
      lineArtPng,
      createColourisePrompt(variant, sceneHint),
      colorizeModel,
    );
    if (!render.success) {
      console.error(
        `[RegionStore] ${variant}: colourise failed (${colorizeModel}): ${render.error}`,
      );
      return { variant, colours: null, elapsedMs: Date.now() - startTime, stats };
    }

    // --- 2. sample dominant colour per region -------------------------------
    const samples = await sampleRegionColoursFromRender(
      render.pngBuffer,
      pixelToRegion,
      regionIds,
      width,
      height,
    );

    // --- 3. snap to palette + 4. classify trusted vs outlier ----------------
    // Boost chroma before snapping: the render is often muddy/desaturated,
    // but its HUE is the right signal. A washed-out green dino region should
    // snap to Grass Green, not grey "Slate". Genuine neutrals (grey rock)
    // are left alone by boostChroma's low-delta guard.
    const resolved = new Map<number, ResolvedColour>();
    const outliers: number[] = [];
    for (const id of regionIds) {
      const s = samples.get(id);
      if (!s || !s.rgb) {
        outliers.push(id);
        continue;
      }
      const snapped = nearestPaletteColor(boostChroma(s.rgb), palette);
      if (!snapped) {
        outliers.push(id);
        continue;
      }
      if (
        s.coverage >= TRUST_MIN_COVERAGE &&
        s.confidence >= TRUST_MIN_CONFIDENCE &&
        snapped.deltaE <= TRUST_MAX_DELTA_E
      ) {
        resolved.set(id, { hex: snapped.hex, colorName: snapped.name });
        stats.sampled++;
      } else {
        // Stash the best-effort snap as a fallback; AI repair may override.
        resolved.set(id, { hex: snapped.hex, colorName: snapped.name });
        outliers.push(id);
      }
    }

    // --- 5. AI repair pass for outliers (only if any) -----------------------
    if (outliers.length > 0) {
      const repaired = await repairOutlierColours(
        variant,
        config,
        render.pngBuffer,
        outliers,
        resolved,
        labelById,
        palette,
        sceneContext,
      );
      for (const [id, colour] of repaired) {
        resolved.set(id, colour);
        stats.repaired++;
      }
    }

    // --- 6. object-group consistency ---------------------------------------
    stats.grouped = enforceObjectGroupConsistency(
      resolved,
      samples,
      labelledRegions,
      palette,
    );

    return {
      variant,
      colours: resolved,
      elapsedMs: Date.now() - startTime,
      stats,
    };
  } catch (error) {
    console.error(`[RegionStore] ${variant}: resolve failed:`, error);
    return { variant, colours: null, elapsedMs: Date.now() - startTime, stats };
  }
}

/**
 * One AI call to (re)colour only the outlier regions, shown the styled render
 * so it can copy the colours it can already see, and told the trusted regions'
 * colours so its picks stay coherent with the sampled majority.
 *
 * Reuses the existing region-fill-points prompt machinery + response schema so
 * the brand prompts don't need to change.
 */
async function repairOutlierColours(
  variant: PaletteVariant,
  config: GenerateRegionStoreConfig,
  renderPng: Buffer,
  outlierIds: number[],
  resolvedSoFar: Map<number, ResolvedColour>,
  labelById: Map<
    number,
    {
      id: number;
      label: string;
      objectGroup: string;
      gridRow: number;
      gridCol: number;
      size: "small" | "medium" | "large";
      pixelPercentage: number;
    }
  >,
  palette: ColorPaletteEntry[],
  sceneContext?: { title: string; description: string; tags: string[] },
): Promise<Map<number, ResolvedColour>> {
  const variantModifier = config.paletteVariantModifiers[variant];
  const systemPrompt = `${config.regionFillPointsSystem}\n\n${variantModifier}\n\nYou are shown a fully COLOURED render of this page. Most regions have ALREADY been assigned a colour by sampling that render directly — those are LOCKED and listed below. Your ONLY job is to assign the best palette colour to the small set of UNRESOLVED regions, copying what you can see in the render and keeping them harmonious with the locked colours. Match the variant aesthetic above.`;

  const lockedBlock = [...resolvedSoFar.entries()]
    .filter(([id]) => !outlierIds.includes(id))
    .map(([id, c]) => {
      const l = labelById.get(id);
      return `  - Region #${id} (${l?.label ?? "?"}): LOCKED to ${c.colorName} ${c.hex}`;
    })
    .join("\n");

  const outlierBlock = outlierIds
    .map((id) => {
      const l = labelById.get(id);
      return `  - Region #${id}: ${l?.label ?? "unknown"} (group: ${l?.objectGroup ?? "unknown"}, grid r${l?.gridRow ?? 0}c${l?.gridCol ?? 0}, ${l?.size ?? "small"}, ${l?.pixelPercentage ?? 0}% of canvas)`;
    })
    .join("\n");

  const instruction = `LOCKED REGIONS (already coloured from the render — do NOT change, listed for harmony only):
${lockedBlock || "  (none)"}

UNRESOLVED REGIONS — assign a palette colour to EACH of these ${outlierIds.length} (and ONLY these):
${outlierBlock}

For EACH unresolved region return: regionId, element (its label), suggestedColor (hex from palette), colorName, reasoning (5-7 words). Use ONLY the provided palette. Look at the coloured render to see what colour each region should be; if a region looks unfilled in the render, pick the colour a skilled illustrator would expect for that labelled object, distinct from adjacent locked regions.`;

  try {
    const { output } = await generateText({
      model: models.analyticsQuality,
      output: Output.object({ schema: regionFirstColorResponseSchema }),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `AVAILABLE PALETTE (use ONLY these):\n${palette
                .map((c) => `- ${c.name}: ${c.hex}`)
                .join("\n")}`,
            },
            { type: "text", text: instruction },
            { type: "image", image: renderPng },
          ],
        },
      ],
    });

    const result = new Map<number, ResolvedColour>();
    if (output) {
      const outlierSet = new Set(outlierIds);
      for (const a of output.assignments) {
        if (!outlierSet.has(a.regionId)) continue;
        // Defensive: keep the AI's pick only if it's an exact palette hex;
        // otherwise it hallucinated — drop it so the sampled-snap fallback
        // (already stored in resolvedSoFar) stands.
        const known = palette.find(
          (p) => p.hex.toLowerCase() === a.suggestedColor.toLowerCase(),
        );
        if (known) {
          result.set(a.regionId, { hex: known.hex, colorName: known.name });
        }
      }
    }
    return result;
  } catch (error) {
    console.error(`[RegionStore] ${variant}: repair pass failed:`, error);
    return new Map();
  }
}

/**
 * Enforce "same logical object ⇒ same colour".
 *
 * The single biggest visible failure (old pipeline AND the first cut of this
 * one — see the review loop's "muddy patchy dinosaur body") is one object's
 * fragments getting different colours because the render shaded them
 * differently. Fix:
 *
 *   1. The group's colour is the SIZE-WEIGHTED MEAN of its members' *sampled*
 *      colours (pooled across the whole object), snapped to the palette —
 *      NOT one fragment's resolved colour. One mis-sampled sliver can't drag
 *      the object any more; the big areas dominate.
 *   2. Every member is forced to that group colour UNLESS it is BOTH very
 *      confidently sampled AND dramatically far from the group colour (a
 *      genuine distinct sub-part like a red stripe on a white sail). The bar
 *      is high on purpose — defaulting to one colour per object is correct
 *      far more often than not.
 *
 * Returns the number of regions whose colour was changed by this pass.
 */
function enforceObjectGroupConsistency(
  resolved: Map<number, ResolvedColour>,
  samples: Map<
    number,
    { rgb: { r: number; g: number; b: number } | null; confidence: number }
  >,
  labelledRegions: Array<{
    id: number;
    label: string;
    objectGroup: string;
    pixelPercentage: number;
  }>,
  palette: ColorPaletteEntry[],
): number {
  // Coalesce by objectGroup AND by label. The labeller frequently gives an
  // object's repeated parts the same precise label ("lightning bolt", "tail",
  // "emblem border") but DIFFERENT objectGroup strings, leaving them as
  // singletons that never get unified — the main driver of the review loop's
  // low group-consistency. Two regions belong together if they share a
  // non-"unknown" objectGroup OR the same non-"unknown" label.
  const norm = (s: string) => s.trim().toLowerCase();
  const byGroup = new Map<string, typeof labelledRegions>();
  for (const r of labelledRegions) {
    const g = norm(r.objectGroup || "unknown");
    const l = norm(r.label || "unknown");
    // Prefer a real objectGroup; otherwise fall back to the label. Skip
    // regions that are "unknown" on both — that's a dumping ground.
    const key =
      g !== "unknown" ? `g:${g}` : l !== "unknown" ? `l:${l}` : null;
    if (!key) continue;
    const arr = byGroup.get(key);
    if (arr) arr.push(r);
    else byGroup.set(key, [r]);
  }

  let changed = 0;
  for (const [, members] of byGroup) {
    if (members.length < 2) continue;

    // Group colour = size-weighted mean of members' SAMPLED colours, snapped
    // to the palette. Falls back to the largest member's resolved colour if
    // nothing in the group was sampled (e.g. the render left it all blank).
    let wr = 0;
    let wg = 0;
    let wb = 0;
    let wsum = 0;
    for (const m of members) {
      const s = samples.get(m.id);
      if (!s || !s.rgb) continue;
      const w = Math.max(0.0001, m.pixelPercentage);
      wr += s.rgb.r * w;
      wg += s.rgb.g * w;
      wb += s.rgb.b * w;
      wsum += w;
    }

    let groupColour: ResolvedColour | undefined;
    if (wsum > 0) {
      const snapped = nearestPaletteColor(
        boostChroma({ r: wr / wsum, g: wg / wsum, b: wb / wsum }),
        palette,
      );
      if (snapped) {
        groupColour = { hex: snapped.hex, colorName: snapped.name };
      }
    }
    if (!groupColour) {
      const anchor = [...members].sort(
        (a, b) => b.pixelPercentage - a.pixelPercentage,
      )[0];
      groupColour = resolved.get(anchor.id);
    }
    if (!groupColour) continue;
    const groupLab = (() => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
        groupColour.hex,
      );
      return m
        ? rgbToLab({
            r: parseInt(m[1], 16),
            g: parseInt(m[2], 16),
            b: parseInt(m[3], 16),
          })
        : null;
    })();

    for (const m of members) {
      const current = resolved.get(m.id);
      if (!current) continue;
      if (current.hex.toLowerCase() === groupColour.hex.toLowerCase()) continue;

      const s = samples.get(m.id);
      // Keep this region's own colour only if it was sampled VERY confidently
      // AND its sampled colour is dramatically far (CIEDE2000) from the group
      // colour — a genuine distinct sub-part, not shading variance.
      if (
        s &&
        s.rgb &&
        s.confidence >= GROUP_OVERRIDE_MIN_CONFIDENCE &&
        groupLab
      ) {
        const dE = deltaE2000(rgbToLab(s.rgb), groupLab);
        if (dE > GROUP_OVERRIDE_MIN_DELTA_E) {
          continue; // genuine different-coloured sub-part — leave it
        }
      }

      resolved.set(m.id, groupColour);
      changed++;
    }
  }
  return changed;
}

// =============================================================================
// Main
// =============================================================================

/**
 * Build the full region store for a coloring image.
 *
 * Pipeline:
 *   1. Rasterise the SVG (1024×auto) and detect regions via scanline flood fill.
 *   2. Render a numbered-overlay PNG with region IDs stamped at each centroid.
 *   3. ONE AI call: pass both the line art and the overlay to the labelling
 *      prompt → verified semantic labels + object groups for every region.
 *   4. FOUR parallel per-variant colour passes (resolveVariantColours):
 *      colourise the line art with the configured model + the variant prompt,
 *      sample each region's dominant colour from that render, snap to the
 *      constrained palette, AI-repair the regions the render didn't colour
 *      cleanly, then enforce same-object-same-colour. This replaces the old
 *      blind constrained-palette AI guess.
 *   5. Merge the labels + per-variant resolved colours into the per-region
 *      palette structure (shape unchanged — fully backward compatible).
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

    // --- Step 6: colouring pass — JPEG-sampled, AI-repaired -----------------
    // For each of the 4 variants, in parallel: colourise the line art with
    // the configured model + the variant prompt, sample each region's
    // dominant colour from that render, snap to the constrained palette,
    // AI-repair the regions the render didn't colour cleanly, then enforce
    // same-object-same-colour. Replaces the old blind constrained-palette
    // AI guess (which the user reported as consistently mediocre).
    const variantResults = await Promise.all(
      PALETTE_VARIANTS.map((variant) =>
        resolveVariantColours(
          variant,
          config,
          pngBuffer,
          regionMap.pixelToRegion,
          width,
          height,
          labelledRegions,
          palette,
          sceneContext,
        ),
      ),
    );

    // Bail only if every variant failed — nothing usable to persist
    if (variantResults.every((r) => r.colours === null)) {
      return {
        success: false,
        error: "All palette variant colour passes failed",
      };
    }

    // --- Step 7: merge variant colours into per-region palette entries ------
    const variantLookups = new Map<
      PaletteVariant,
      Map<number, { hex: string; colorName: string }>
    >();
    for (const { variant, colours } of variantResults) {
      variantLookups.set(variant, colours ?? new Map());
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
    // The labelling pass is now the sole scene-description source (the colour
    // pass no longer returns prose — it samples pixels).
    const sceneDescription =
      labellingResponse?.sceneDescription ?? "A coloring page";

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
      `colourModel=${config.colorizeModel ?? DEFAULT_COLORIZE_MODEL},`,
      `variants:`,
      variantResults
        .map(
          (v) =>
            `${v.variant}=${v.elapsedMs}ms(sampled:${v.stats.sampled} repaired:${v.stats.repaired} grouped:${v.stats.grouped}${v.colours ? "" : " FAILED"})`,
        )
        .join(" "),
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
