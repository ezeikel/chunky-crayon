/**
 * Region-aware color map generator for onboarding welcome image.
 *
 * Pipeline:
 *   1. Rasterize SVG → PNG (1024x1024)
 *   2. Extract raw RGBA pixels with sharp
 *   3. Detect all enclosed regions via scanline flood fill
 *   4. Send image + region list to Gemini Pro for color assignment
 *   5. Map AI colors back to region centroids → write fill points file
 *
 * Usage:
 *   cd apps/web
 *   GOOGLE_GENERATIVE_AI_API_KEY=<key> npx tsx scripts/generate-onboarding-colormap.ts
 *
 * Output: apps/mobile/constants/onboardingFillPoints.ts
 */
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { detectAllRegionsFromPixels } from '../utils/regionDetectionNode';

// ---------------------------------------------------------------------------
// Schema (inlined to avoid Next.js import issues)
// ---------------------------------------------------------------------------
const regionColorAssignmentSchema = z.object({
  regionId: z.number(),
  element: z.string(),
  suggestedColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  colorName: z.string(),
  reasoning: z.string(),
});

const regionFirstColorResponseSchema = z.object({
  sceneDescription: z.string(),
  assignments: z.array(regionColorAssignmentSchema),
});

// ---------------------------------------------------------------------------
// Palette (same as production ALL_COLORING_COLORS)
// ---------------------------------------------------------------------------
const ALL_COLORING_COLORS = [
  { name: 'Cherry Red', hex: '#E53935' },
  { name: 'Sunset Orange', hex: '#FB8C00' },
  { name: 'Sunshine Yellow', hex: '#FDD835' },
  { name: 'Grass Green', hex: '#43A047' },
  { name: 'Sky Blue', hex: '#1E88E5' },
  { name: 'Grape Purple', hex: '#8E24AA' },
  { name: 'Bubblegum Pink', hex: '#EC407A' },
  { name: 'Chocolate Brown', hex: '#6D4C41' },
  { name: 'Coral', hex: '#FF7043' },
  { name: 'Mint', hex: '#26A69A' },
  { name: 'Lavender', hex: '#AB47BC' },
  { name: 'Peach', hex: '#FFAB91' },
  { name: 'Navy', hex: '#3949AB' },
  { name: 'Forest', hex: '#2E7D32' },
  { name: 'Gold', hex: '#FFD54F' },
  { name: 'Rose', hex: '#F48FB1' },
  { name: 'Black', hex: '#212121' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Gray', hex: '#9E9E9E' },
  { name: 'Skin Tone', hex: '#FFCC80' },
];

// ---------------------------------------------------------------------------
// Prompt — artist-quality color assignment
// ---------------------------------------------------------------------------
const REGION_FIRST_COLOR_SYSTEM = `You are a professional children's book illustrator coloring a line-art page. You think in terms of OBJECTS first, then assign colors to individual regions.

WORKFLOW (follow this order):
1. IDENTIFY OBJECTS — Look at the image and group nearby regions into logical objects (e.g., "the crayon character", "the banner", "balloon cluster left", "sky", "ground"). Many small regions belong to the SAME object.
2. DECIDE OBJECT PALETTE — For each object, pick a base color and optional accent. All regions belonging to one object should share a cohesive look:
   - Character body parts → same base color (e.g., all crayon body = Sunshine Yellow)
   - Hands/feet → can be a lighter or complementary shade but still harmonious
   - Stripes/bands on a character → use 1-2 contrasting accent colors consistently
   - Background (sky, ground) → one color each
   - Bushes/foliage → one green consistently
   - Decorative elements (balloons, flags) → each a DIFFERENT bright color for variety
   - Confetti/small decorations → distribute rainbow colors evenly across the image
3. ASSIGN REGIONS — For each region, pick the color that matches its object.

ARTIST PRINCIPLES:
- CONSISTENCY: Regions belonging to the same object get the same (or very similar) color. A character's left arm and right arm should match. A character's body and belly should match.
- DIFFERENTIATION: Different objects should contrast. The character should pop against the background.
- HARMONY: The overall palette should feel warm and inviting, like a finished coloring book page a child would be proud of.
- NATURALISM: Use colors that make visual sense — sky is blue, grass is green, skin is warm. Don't make a hand gray or a foot brown unless it's gloves/shoes.
- VARIETY FOR DECORATIONS: Balloons, flags, and confetti should each be a different bright color — cycle through the full palette for visual richness.

CONSTRAINTS:
- You MUST assign a color to EVERY region — no skipping
- You MUST use ONLY colors from the provided palette
- Use region IDs exactly as given`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSizeDescriptor(
  pixelCount: number,
  totalPixels: number,
): 'small' | 'medium' | 'large' {
  const percentage = (pixelCount / totalPixels) * 100;
  if (percentage > 10) return 'large';
  if (percentage > 2) return 'medium';
  return 'small';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const svgPath = path.resolve(
    __dirname,
    '../../mobile/assets/onboarding/welcome-coloring.svg',
  );

  if (!fs.existsSync(svgPath)) {
    console.error('SVG not found:', svgPath);
    process.exit(1);
  }

  // Step 1: Rasterize SVG to PNG
  console.log('Step 1: Rasterizing SVG...');
  const svgData = fs.readFileSync(svgPath, 'utf-8');
  const resvg = new Resvg(svgData, {
    fitTo: { mode: 'width', value: 1024 },
    background: 'white',
  });
  const rendered = resvg.render();
  const pngBuffer = rendered.asPng();
  const imageWidth = rendered.width;
  const imageHeight = rendered.height;
  console.log(`  Rasterized to ${imageWidth}x${imageHeight}`);

  // Step 2: Extract raw RGBA pixels
  console.log('Step 2: Extracting pixel data...');
  const { data: rawPixels } = await sharp(pngBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(rawPixels);
  console.log(`  ${pixels.length / 4} pixels extracted`);

  // Step 3: Detect regions
  console.log('Step 3: Detecting regions...');
  const regionMap = detectAllRegionsFromPixels(
    pixels,
    imageWidth,
    imageHeight,
    100, // MIN_REGION_SIZE
  );
  console.log(`  ${regionMap.regions.length} regions detected`);

  // Log region summary
  const totalPixels = imageWidth * imageHeight;
  for (const r of regionMap.regions) {
    const pct = ((r.pixelCount / totalPixels) * 100).toFixed(1);
    console.log(
      `    Region #${r.id}: centroid=(${r.centroid.x},${r.centroid.y}) ${pct}% ${getSizeDescriptor(r.pixelCount, totalPixels)}`,
    );
  }

  // Step 4: Format regions for AI
  console.log('Step 4: Calling Gemini Pro for color assignment...');
  const detectedRegions = regionMap.regions.map((r) => ({
    id: r.id,
    gridRow: Math.min(
      5,
      Math.max(1, Math.ceil((r.centroid.y / imageHeight) * 5)),
    ),
    gridCol: Math.min(
      5,
      Math.max(1, Math.ceil((r.centroid.x / imageWidth) * 5)),
    ),
    size: getSizeDescriptor(r.pixelCount, totalPixels),
    pixelPercentage: Number(((r.pixelCount / totalPixels) * 100).toFixed(1)),
  }));

  // Exclude White and Black — White is invisible on white fill areas,
  // Black overlaps with outlines. Both produce bad auto-color results.
  const palette = ALL_COLORING_COLORS.filter(
    (c) => c.hex !== '#FFFFFF' && c.hex !== '#212121',
  ).map((c) => ({ hex: c.hex, name: c.name }));

  // Build the user prompt (same structure as production createRegionFirstColorPrompt)
  const regionsList = detectedRegions
    .map(
      (r) =>
        `  - Region #${r.id}: Grid position (row ${r.gridRow}, col ${r.gridCol}), Size: ${r.size} (${r.pixelPercentage.toFixed(1)}% of image)`,
    )
    .join('\n');

  const userPrompt = `Color this children's coloring page. It shows a cute crayon character ("Colo") at a welcome party with balloons, a banner, confetti, bushes, and a grassy ground under a blue sky.

SCENE CONTEXT (use this to guide your color choices):
- The CRAYON CHARACTER (center) — Colo is a friendly crayon mascot. Color the body, arms, legs, and head a warm Sunshine Yellow (#FDD835). The party hat on top should be Cherry Red (#E53935). Stripes/bands on the body should alternate between Coral (#FF7043) and Sky Blue (#1E88E5). Cheeks should be Peach (#FFAB91) or Rose (#F48FB1). Hands and feet match the body (Sunshine Yellow).
- BANNER at the top — background should be Sunset Orange (#FB8C00), text area can be Gold (#FFD54F)
- BALLOONS (4 of them) — each a DIFFERENT bright color: Cherry Red, Grape Purple, Sunshine Yellow, Sky Blue. Strings should be Gray (#9E9E9E).
- SKY — Sky Blue (#1E88E5) for the large background region
- BUSHES — Grass Green (#43A047) consistently
- GROUND — Gold (#FFD54F) or Sunshine Yellow for a warm grassy look
- FLAGS on bunting string — alternate between bright colors (Red, Yellow, Blue, Green, Purple)
- CONFETTI scattered everywhere — distribute ALL remaining palette colors evenly: reds, oranges, yellows, greens, blues, purples, pinks. Each confetti piece should be a different color. Cycle through the palette.

AVAILABLE PALETTE (you MUST only use these):
${palette.map((c) => `- ${c.name}: ${c.hex}`).join('\n')}

DETECTED REGIONS (${detectedRegions.length} total):
${regionsList}

For EACH region, provide:
- regionId: exact region ID
- element: what it is (e.g., "crayon body", "left balloon", "sky")
- suggestedColor: hex from palette
- colorName: palette color name
- reasoning: brief reason (5-7 words)

Return ALL ${detectedRegions.length} assignments. Think like an artist — consistency within objects, variety between objects.`;

  // Prepare image for AI
  const imageBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;

  const startTime = Date.now();
  const { object } = await generateObject({
    model: google('gemini-3-pro-image-preview'),
    schema: regionFirstColorResponseSchema,
    system: REGION_FIRST_COLOR_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image', image: imageBase64 },
        ],
      },
    ],
  });
  const elapsed = Date.now() - startTime;
  console.log(`  AI response in ${elapsed}ms`);
  console.log(`  Scene: ${object.sceneDescription}`);
  console.log(
    `  Assignments: ${object.assignments.length}/${detectedRegions.length}`,
  );

  // Step 5: Map AI assignments back to centroids
  console.log('Step 5: Building fill points...');
  const regionById = new Map(regionMap.regions.map((r) => [r.id, r]));
  const fillPoints: Array<{
    x: number;
    y: number;
    color: string;
    label: string;
  }> = [];

  let matched = 0;
  for (const assignment of object.assignments) {
    const region = regionById.get(assignment.regionId);
    if (region) {
      fillPoints.push({
        x: region.centroid.x,
        y: region.centroid.y,
        color: assignment.suggestedColor,
        label: assignment.element,
      });
      matched++;
    } else {
      console.warn(
        `  Warning: AI returned regionId ${assignment.regionId} not found in detected regions`,
      );
    }
  }

  // Check for regions that AI missed
  const assignedIds = new Set(object.assignments.map((a) => a.regionId));
  const missed = regionMap.regions.filter((r) => !assignedIds.has(r.id));
  if (missed.length > 0) {
    console.warn(
      `  ${missed.length} regions not assigned by AI — using Sky Blue fallback`,
    );
    for (const r of missed) {
      fillPoints.push({
        x: r.centroid.x,
        y: r.centroid.y,
        color: '#1E88E5', // Sky Blue fallback
        label: `unassigned region #${r.id}`,
      });
    }
  }

  console.log(
    `  ${fillPoints.length} fill points total (${matched} from AI, ${missed.length} fallback)`,
  );

  // Step 6: Write output file
  const outputPath = path.resolve(
    __dirname,
    '../../mobile/constants/onboardingFillPoints.ts',
  );

  const tsOutput = `/**
 * Region-aware fill points for the onboarding welcome SVG (${imageWidth}x${imageHeight}).
 *
 * Generated by: apps/web/scripts/generate-onboarding-colormap.ts
 * Pipeline: SVG → rasterize → detect regions → Gemini Pro color assignment
 *
 * Each entry targets a detected region's centroid with an AI-assigned color.
 * Scene: ${object.sceneDescription}
 * Regions detected: ${regionMap.regions.length}
 * AI assignments: ${matched}/${regionMap.regions.length}
 */
export const ONBOARDING_FILL_POINTS: Array<{
  x: number;
  y: number;
  color: string;
  label: string;
}> = ${JSON.stringify(fillPoints, null, 2)};
`;

  fs.writeFileSync(outputPath, tsOutput);
  console.log(`\nWritten to: ${outputPath}`);

  // Print sample for verification
  console.log('\nSample fill points:');
  for (const pt of fillPoints.slice(0, 10)) {
    console.log(`  (${pt.x}, ${pt.y}) ${pt.color} — ${pt.label}`);
  }
  if (fillPoints.length > 10) {
    console.log(`  ... and ${fillPoints.length - 10} more`);
  }
}

main().catch(console.error);
