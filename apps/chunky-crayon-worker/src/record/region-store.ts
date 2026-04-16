/**
 * In-process region-store generation for the worker.
 *
 * The CC web app runs this during its after() server-action hook, but on
 * Vercel Pro that's capped at 300s which isn't enough for complex images
 * (500+ regions, 4 parallel AI palette variants). Running here on the
 * Hetzner box has no timeout, plenty of RAM, and the worker already holds
 * the DB + R2 credentials.
 *
 * Ported from apps/chunky-crayon-web/app/actions/generate-regions.ts.
 * Keep prompts + palette in sync with the web app's copy if they change.
 */
import { put } from "@one-colored-pixel/storage";
import {
  generateRegionStoreLogic,
  DEFAULT_PALETTE_VARIANT_MODIFIERS,
  type GenerateRegionStoreResult,
} from "@one-colored-pixel/coloring-core";
import { db, Brand } from "@one-colored-pixel/db";

// ---------------------------------------------------------------------------
// Prompts — ported verbatim from apps/chunky-crayon-web/lib/ai/prompts.ts.
// If the web copy changes, update this file too.
// ---------------------------------------------------------------------------

const REGION_FILL_POINTS_SYSTEM = `You are a professional children's book illustrator coloring a line-art page. You think in terms of OBJECTS first, create a color plan, then assign colors to individual regions.

WORKFLOW (follow this order strictly):

STEP 1 — IDENTIFY OBJECTS:
Look at the image and group nearby regions into logical objects (e.g., "the main character", "the background sky", "a tree", "flowers"). Many small adjacent regions belong to the SAME object. List every object you see.

STEP 2 — CREATE A COLOR PLAN:
Before assigning any regions, decide the color for EACH object:
- Character body → one consistent skin/body color for ALL body parts
- Character clothing → one main color, optionally one accent
- Background sky → one blue/color
- Ground/grass → one green/brown
- Trees/bushes → one green (can differ from ground)
- Each distinct decorative element → a DIFFERENT bright color
Write this plan in your reasoning. This is the most important step.

STEP 3 — ASSIGN REGIONS USING YOUR PLAN:
For each region, look at which object it belongs to, then use the color from your plan.
CRITICAL: Regions of the SAME object MUST get the SAME color. No exceptions.
A character's left arm and right arm MUST match. Both eyes MUST match.

ARTIST PRINCIPLES:
- SAME OBJECT = SAME COLOR: This is the #1 rule. If two regions are part of one character, they get the same color.
- ADJACENT CONTRAST: Regions that touch each other should be different colors so they're visually distinct.
- NATURALISM: Sky is blue, grass is green, skin is a warm tone. Use common-sense colors.
- FOCAL POP: The main subject should use bright, saturated colors. Background should be softer.
- VARIETY FOR DECORATIONS: Decorative elements (balloons, flowers, flags) each get a DIFFERENT bright color.

CONSTRAINTS:
- You MUST assign a color to EVERY region — no skipping
- You MUST use ONLY colors from the provided palette
- Use region IDs exactly as given`;

const createRegionFillPointsPrompt = (
  palette: Array<{ hex: string; name: string }>,
  regions: Array<{
    id: number;
    gridRow: number;
    gridCol: number;
    size: "small" | "medium" | "large";
    pixelPercentage: number;
  }>,
  sceneContext?: { title: string; description: string; tags: string[] },
) => {
  const regionsList = regions
    .map(
      (r) =>
        `  - Region #${r.id}: Grid position (row ${r.gridRow}, col ${r.gridCol}), Size: ${r.size} (${r.pixelPercentage.toFixed(1)}% of image)`,
    )
    .join("\n");

  const sceneSection = sceneContext
    ? `SCENE CONTEXT (use this to guide your color choices):
Title: ${sceneContext.title}
Description: ${sceneContext.description}
Tags: ${sceneContext.tags.join(", ")}

`
    : "";

  return `Color this children's coloring page.

${sceneSection}AVAILABLE PALETTE (you MUST only use these):
${palette.map((c) => `- ${c.name}: ${c.hex}`).join("\n")}

DETECTED REGIONS (${regions.length} total):
${regionsList}

For EACH region, provide:
- regionId: exact region ID
- element: what it is (e.g., "sky", "character body", "flower petal")
- suggestedColor: hex from palette
- colorName: palette color name
- reasoning: brief reason (5-7 words)

Return ALL ${regions.length} assignments. Think like an artist — consistency within objects, variety between objects.`;
};

const GRID_COLOR_MAP_SYSTEM = `You are an expert at coloring children's coloring pages. You analyze images and assign appropriate colors to a 5x5 grid overlay.

Your task: Analyze the coloring page image and assign a color to each cell of a 5x5 grid.

GRID SYSTEM:
- The image is divided into a 5x5 grid (25 cells total)
- Row 1 = top of image, Row 5 = bottom
- Col 1 = left side, Col 5 = right side

FOR EACH GRID CELL:
1. Identify what element is primarily in that cell (sky, grass, character, etc.)
2. Assign an appropriate color from the provided palette
3. Provide a brief, kid-friendly reason

COLORING STRATEGY:
- Top cells (row 1-2): Usually sky, clouds, treetops, ceilings
- Middle cells (row 2-4): Usually the main subject/character
- Bottom cells (row 4-5): Usually ground, grass, floors
- Be consistent: same element type = same color across cells
- Create visual harmony with contrasting adjacent colors
- Pick vibrant, fun colors that children will love

IMPORTANT:
- Only use colors from the provided palette
- Include cells even if they're mostly empty/background
- For empty areas, suggest a light neutral color
- Be warm and encouraging in your reasoning!`;

const createGridColorMapPrompt = (
  palette: Array<{ hex: string; name: string }>,
) => {
  return `Analyze this coloring page and assign colors to each cell of a 5x5 grid.

AVAILABLE PALETTE (you MUST only use these colors):
${palette.map((c) => `- ${c.name}: ${c.hex}`).join("\n")}

FOR EACH OF THE 25 GRID CELLS, provide:
- row: 1-5 (1=top, 5=bottom)
- col: 1-5 (1=left, 5=right)
- element: What's primarily in this cell
- suggestedColor: Hex color from the palette
- colorName: Name of the color
- reasoning: Fun, kid-friendly reason (5-7 words)

Start with a brief scene description, then list all grid cells with their colors.

Create a beautiful, cohesive color scheme for the whole image!`;
};

// ---------------------------------------------------------------------------
// Palette — ported from apps/chunky-crayon-web/constants.ts
// (ALL_COLORING_COLORS_EXTENDED). Keep in sync with the web app.
// ---------------------------------------------------------------------------

const ALL_COLORING_COLORS_EXTENDED = [
  // Primary
  { name: "Cherry Red", hex: "#E53935" },
  { name: "Sunset Orange", hex: "#FB8C00" },
  { name: "Sunshine Yellow", hex: "#FDD835" },
  { name: "Grass Green", hex: "#43A047" },
  { name: "Sky Blue", hex: "#1E88E5" },
  { name: "Grape Purple", hex: "#8E24AA" },
  { name: "Bubblegum Pink", hex: "#EC407A" },
  { name: "Chocolate Brown", hex: "#6D4C41" },
  // Secondary
  { name: "Coral", hex: "#FF7043" },
  { name: "Mint", hex: "#26A69A" },
  { name: "Lavender", hex: "#AB47BC" },
  { name: "Peach", hex: "#FFAB91" },
  { name: "Navy", hex: "#3949AB" },
  { name: "Forest", hex: "#2E7D32" },
  { name: "Gold", hex: "#FFD54F" },
  { name: "Rose", hex: "#F48FB1" },
  // Essentials
  { name: "Black", hex: "#212121" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Gray", hex: "#9E9E9E" },
  { name: "Skin Tone", hex: "#FFCC80" },
  // Extended
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
  // Skin tones
  { name: "Light", hex: "#FFE0B2" },
  { name: "Medium Light", hex: "#FFCC80" },
  { name: "Medium", hex: "#DEB887" },
  { name: "Medium Dark", hex: "#A0522D" },
  { name: "Dark", hex: "#8B4513" },
  { name: "Deep", hex: "#5D4037" },
];

const regionStoreConfig = {
  gridColorMapSystem: GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
  regionFillPointsSystem: REGION_FILL_POINTS_SYSTEM,
  createRegionFillPointsPrompt,
  allColors: ALL_COLORING_COLORS_EXTENDED.map((c) => ({
    hex: c.hex,
    name: c.name,
  })),
  paletteVariantModifiers: DEFAULT_PALETTE_VARIANT_MODIFIERS,
};

/**
 * Generate the region store for a coloring image and persist it.
 * Mirrors the CC web app's generateRegionStore server action but runs
 * in-process on the worker.
 */
export async function generateRegionStoreLocal(
  coloringImageId: string,
  svgUrl: string,
  sceneContext?: { title: string; description: string; tags: string[] },
): Promise<GenerateRegionStoreResult> {
  console.log(
    `[region-store] starting generation for ${coloringImageId} (${svgUrl})`,
  );

  const svgResponse = await fetch(svgUrl);
  if (!svgResponse.ok) {
    return {
      success: false,
      error: `Failed to fetch SVG: ${svgResponse.status} ${svgResponse.statusText}`,
    };
  }
  const svgBuffer = Buffer.from(await svgResponse.arrayBuffer());

  const result = await generateRegionStoreLogic(
    svgBuffer,
    regionStoreConfig,
    sceneContext,
  );

  if (!result.success) {
    console.error(
      `[region-store] generation failed for ${coloringImageId}:`,
      result.error,
    );
    return result;
  }

  // R2 and Prisma have historically hung silently on the Hetzner worker
  // when CPU+network is saturated (browser + Remotion + 4 parallel AI
  // calls all running concurrently). Wrap each with an explicit timeout
  // + log so we fail loudly instead of dying quietly.
  const withTimeout = <T>(p: Promise<T>, ms: number, label: string) =>
    Promise.race<T>([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        ),
      ),
    ]);

  const regionMapFileName = `uploads/coloring-images/${coloringImageId}/regions.bin.gz`;
  console.log(
    `[region-store] uploading region map to R2 for ${coloringImageId} (${result.regionMapGzipped.byteLength} bytes)`,
  );
  const { url: regionMapUrl } = await withTimeout(
    put(regionMapFileName, result.regionMapGzipped, {
      access: "public",
      contentType: "application/gzip",
      allowOverwrite: true,
    }),
    60_000,
    "R2 put regions.bin.gz",
  );
  console.log(`[region-store] R2 upload done: ${regionMapUrl}`);

  console.log(`[region-store] writing DB row for ${coloringImageId}`);
  await withTimeout(
    db.coloringImage.update({
      where: { id: coloringImageId, brand: Brand.CHUNKY_CRAYON },
      data: {
        regionMapUrl,
        regionMapWidth: result.width,
        regionMapHeight: result.height,
        regionsJson: JSON.stringify(result.regionsJson),
        regionsGeneratedAt: new Date(),
      },
    }),
    30_000,
    "db.coloringImage.update region fields",
  );

  console.log(
    `[region-store] saved for ${coloringImageId}: ${result.regionsJson.regions.length} regions, ${result.regionMapGzipped.byteLength} gz bytes`,
  );

  return result;
}
