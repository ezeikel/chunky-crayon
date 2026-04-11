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

1. The original black-and-white line art.
2. The same line art with numeric region IDs overlaid at each fillable region's centroid, in white text with a black outline.

Your job is to read each number in the overlay image, identify what that region represents in the scene, and assign it a precise semantic label plus an object group.

RULES:
- You MUST return exactly one entry per region ID shown in the overlay. Do not skip any. Do not invent IDs that aren't present.
- The label describes what the region IS in the scene (e.g. "sky", "mast", "left sail stripe", "wave", "pirate flag skull", "moon face", "star").
- The objectGroup groups regions that belong to the same logical object. For example:
  - If a crow's nest is made of three separate regions (cup, base, strut), all three get objectGroup "crow's nest".
  - If a face has eyes and a mouth as separate regions, all get objectGroup "moon face".
  - If sails have multiple stripes, each stripe shares objectGroup "main sail" but can keep its own label like "left sail stripe".
  - Single-region objects like "sky" or "sea" just repeat their label as the group.
- Use VISUAL CONTEXT to disambiguate. Two small round regions may look similar in isolation — but one is a star in the sky and the other is a porthole on a ship. Use neighbourhood cues.
- Prefer specific over generic: "pirate flag skull" beats "skull" beats "decoration".
- If you genuinely cannot tell what a region is, use label "unknown" and objectGroup "unknown". Do NOT guess wildly. "unknown" is better than a wrong confident label — we can flag it for review later.
- Return labels in kebab-free plain English, singular unless it obviously denotes a group.

Read the numbers CAREFULLY. Each region ID only appears once in the overlay. The numbers are drawn at each region's centroid. If a region is very small, its number may be tiny — look closely.`;

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
 * sharp to extract raw pixels.
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

  const { data } = await sharp(pngBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(data);

  return { pngBuffer, pixels, width, height };
}

/**
 * Build an SVG that stamps each region's numeric ID at its centroid, with
 * white fill and a black stroke so it's readable on any background.
 *
 * Font size scales with sqrt(pixelCount) so large regions get bigger numbers
 * and small regions still have legible numbers without occluding everything.
 * Very tiny regions (< 60 px at 1024×1024) are skipped because their number
 * would occlude the whole region — we'll still have a label gap but that's
 * preferable to an illegible overlay.
 */
function buildNumberedOverlaySvg(
  regions: Array<{
    id: number;
    centroid: { x: number; y: number };
    pixelCount: number;
  }>,
  width: number,
  height: number,
): string {
  const textElements = regions
    .filter((r) => r.pixelCount >= 60)
    .map((r) => {
      // sqrt-based sizing keeps small regions from getting absurdly tiny text.
      // Clamp to a sensible range for readability.
      const raw = Math.sqrt(r.pixelCount) / 2.5;
      const fontSize = Math.max(14, Math.min(56, Math.round(raw)));
      const strokeWidth = Math.max(2, fontSize / 8);
      return `<text x="${r.centroid.x}" y="${r.centroid.y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="900" text-anchor="middle" dominant-baseline="middle" fill="white" stroke="black" stroke-width="${strokeWidth}" paint-order="stroke fill">${r.id}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${textElements}</svg>`;
}

/**
 * Composite a numbered overlay SVG on top of the line-art PNG.
 */
async function renderNumberedOverlayPng(
  linePngBuffer: Buffer,
  regions: Array<{
    id: number;
    centroid: { x: number; y: number };
    pixelCount: number;
  }>,
  width: number,
  height: number,
): Promise<Buffer> {
  const overlaySvg = buildNumberedOverlaySvg(regions, width, height);
  return sharp(linePngBuffer)
    .composite([
      {
        input: Buffer.from(overlaySvg),
        top: 0,
        left: 0,
      },
    ])
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
    const userPrompt = `The first image is the line art. The second image is the same line art with region IDs overlaid at each region's centroid.

There are ${regionIds.length} regions in the overlay. Their IDs are: ${regionIds.join(", ")}.

Return exactly one entry per region ID — no skips, no duplicates, no invented IDs. Use the overlay to read each number, then look at the line art to identify what that region is.`;

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

    // --- Step 1: rasterise the SVG ------------------------------------------
    const { pngBuffer, pixels, width, height } = await rasterizeSvgToPixels(
      svgBuffer,
      1024,
    );
    console.log(`[RegionStore] Rasterised SVG to ${width}×${height}`);

    // --- Step 2: detect regions on the line-art raster ----------------------
    const regionMap = detectAllRegionsFromPixels(pixels, width, height, 100);
    console.log(`[RegionStore] Detected ${regionMap.regions.length} regions`);

    if (regionMap.regions.length === 0) {
      return {
        success: false,
        error: "No colorable regions detected in SVG",
      };
    }

    // --- Step 3: render the numbered-overlay PNG ----------------------------
    const overlayPngBuffer = await renderNumberedOverlayPng(
      pngBuffer,
      regionMap.regions,
      width,
      height,
    );
    console.log(
      `[RegionStore] Rendered numbered overlay (${overlayPngBuffer.byteLength} bytes)`,
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
