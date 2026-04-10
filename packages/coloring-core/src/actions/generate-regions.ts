import { gzipSync } from "node:zlib";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { generateText, Output } from "ai";
import { models } from "../models";
import {
  regionFirstColorResponseSchema,
  type RegionFirstColorResponse,
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
 * Call the AI once for a single palette variant. Returns the raw response
 * keyed by regionId so downstream merging is O(1).
 */
async function assignColoursForVariant(
  variant: PaletteVariant,
  config: GenerateRegionStoreConfig,
  detectedRegions: Array<{
    id: number;
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
  const systemPrompt = `${config.regionFillPointsSystem}\n\n${variantModifier}`;

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
              text: config.createRegionFillPointsPrompt(
                palette,
                detectedRegions,
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
 * Input: the traced SVG (the line art the client will render). The SVG is
 * rasterised once at 1024×auto, regions are detected via scanline flood fill
 * on that raster, and the AI is called four times in parallel (once per
 * palette variant) to assign colours.
 *
 * Output: a gzipped Uint16Array pixel→regionId lookup plus a JSON object
 * with per-region bounds, centroid, label, and all four palette variants.
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

    // --- Step 3: build AI input ---------------------------------------------
    const totalPixels = width * height;
    const detectedRegions = regionMap.regions.map((r) => ({
      id: r.id,
      gridRow: Math.min(5, Math.max(1, Math.ceil((r.centroid.y / height) * 5))),
      gridCol: Math.min(5, Math.max(1, Math.ceil((r.centroid.x / width) * 5))),
      size: getSizeDescriptor(r.pixelCount, totalPixels),
      pixelPercentage: Number(((r.pixelCount / totalPixels) * 100).toFixed(1)),
    }));

    const palette = config.allColors
      .filter((c) => c.hex !== "#FFFFFF" && c.hex !== "#212121")
      .map((c) => ({ hex: c.hex, name: c.name }));

    const imageBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;

    // --- Step 4: call AI for all four variants in parallel ------------------
    const variantResults = await Promise.all(
      PALETTE_VARIANTS.map((variant) =>
        assignColoursForVariant(
          variant,
          config,
          detectedRegions,
          palette,
          imageBase64,
          sceneContext,
        ),
      ),
    );

    // Bail if every variant failed — nothing to persist
    if (variantResults.every((r) => r.response === null)) {
      return {
        success: false,
        error: "All palette variant AI calls failed",
      };
    }

    // --- Step 5: merge variant responses into per-region palette entries ----
    // For each region, we want one entry per variant. Label comes from the
    // realistic variant preferentially (it's the best "what is this" answer),
    // with fallbacks through the other variants.
    const realistic = variantResults.find((v) => v.variant === "realistic");
    const labelLookup = new Map<number, string>();

    // Build a priority-ordered list of responses for label lookup
    const orderedForLabels = [
      realistic,
      ...variantResults.filter((v) => v.variant !== "realistic"),
    ].filter((v): v is NonNullable<typeof v> => v != null);

    for (const { response } of orderedForLabels) {
      if (!response) continue;
      for (const assignment of response.assignments) {
        if (!labelLookup.has(assignment.regionId)) {
          labelLookup.set(assignment.regionId, assignment.element);
        }
      }
    }

    // Build per-variant lookups for colour assignment
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
        label: labelLookup.get(r.id) ?? `region ${r.id}`,
        palettes,
      };
    });

    // Count total region pixels (everything assigned to a non-zero regionId)
    let regionPixelCount = 0;
    for (let i = 0; i < regionMap.pixelToRegion.length; i++) {
      if (regionMap.pixelToRegion[i] !== 0) regionPixelCount++;
    }

    // --- Step 6: serialise region map binary --------------------------------
    // pixelToRegion is a Uint16Array; take its backing ArrayBuffer (respecting
    // any byteOffset/byteLength) and gzip it. Both Node and modern browsers
    // are little-endian, so the raw bytes round-trip correctly via
    // `new Uint16Array(arrayBuffer)` on the client.
    const pixelToRegionBytes = Buffer.from(
      regionMap.pixelToRegion.buffer,
      regionMap.pixelToRegion.byteOffset,
      regionMap.pixelToRegion.byteLength,
    );
    const regionMapGzipped = gzipSync(pixelToRegionBytes);

    // --- Step 7: build the JSON metadata ------------------------------------
    const sceneDescription =
      realistic?.response?.sceneDescription ??
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
