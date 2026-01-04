# Pre-compute Colouring Features Plan

## Overview

Move Magic Brush & Auto Colour color mapping + Background Music generation from client-runtime to the image generation pipeline using `after()`. This eliminates wait times when users click these features.

---

## Current State

### Magic Brush & Auto Colour

- **Location**: `apps/web/hooks/useMagicColorMap.ts` + `apps/web/app/actions/analyze-coloring-image.ts`
- **Flow**:
  1. User clicks Magic Fill button
  2. Client detects all regions via canvas (accurate, fast ~100ms)
  3. Regions converted to 5x5 grid positions
  4. Sent to AI for color assignments
  5. AI returns color per region
- **Problem**: 3-5s wait when user clicks button

### Background Music

- **Status**: `ambientSoundUrl` field exists but has NEVER been populated (0/472 images)
- **Desired**: Loopable background music (kids-app style, content-specific)

---

## Proposed Solution

### Key Insight: Decouple Region Detection from Color Assignment

The current V3 approach already uses **grid positions** (5x5) for AI color assignment. We can:

1. **Keep client-side region detection** (accurate, uses same logic as fill tool)
2. **Pre-compute grid-based color map server-side** (AI assigns colors to 25 grid cells)
3. **Client maps regions → grid → pre-computed colors** (instant lookup)

```
Server (after image generation):
  Image → AI → Grid-based color map (25 cells with colors)
  Store in DB as JSON

Client (when user colors):
  Canvas → Detect regions → Calculate grid position → Lookup pre-computed color
  No AI call needed!
```

---

## Implementation Plan

### Phase 1: Database Schema

Add fields to `ColoringImage`:

```prisma
model ColoringImage {
  // ... existing fields ...

  // Pre-computed grid-based color map for Magic Brush & Auto Colour
  colorMapJson        String?   @db.Text
  colorMapGeneratedAt DateTime?

  // Background music (loopable, content-specific)
  backgroundMusicUrl  String?
}
```

**colorMapJson Structure**:

```typescript
type GridColorMap = {
  sceneDescription: string;
  gridColors: Array<{
    row: number; // 1-5 (top to bottom)
    col: number; // 1-5 (left to right)
    element: string; // "sky", "grass", "teddy bear"
    suggestedColor: string; // "#87CEEB"
    colorName: string; // "Sky Blue"
    reasoning: string; // "Perfect for the sky!"
  }>;
};
```

### Phase 2: Grid-Based Color Assignment Action

**New file**: `apps/web/app/actions/generate-color-map.ts`

```typescript
"use server";

import { generateObject, models, getTracedModels } from "@/lib/ai";
import { db } from "@chunky-crayon/db";
import {
  gridColorMapSchema,
  GRID_COLOR_MAP_SYSTEM,
  createGridColorPrompt,
} from "@/lib/ai";

/**
 * Generate a 5x5 grid-based color map for an image.
 * This runs in after() and doesn't require client-side region detection.
 */
export async function generateGridColorMap(
  coloringImageId: string,
  imageUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { object } = await generateObject({
      model: models.analytics, // Gemini Flash - fast vision
      schema: gridColorMapSchema,
      system: GRID_COLOR_MAP_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: createGridColorPrompt() },
            { type: "image", image: new URL(imageUrl) },
          ],
        },
      ],
    });

    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: {
        colorMapJson: JSON.stringify(object),
        colorMapGeneratedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[ColorMap] Error generating color map:", error);
    return { success: false, error: String(error) };
  }
}
```

**New AI prompt** for grid-based analysis:

```typescript
export const GRID_COLOR_MAP_SYSTEM = `You are a children's coloring assistant.
Analyze this coloring page image divided into a 5x5 grid.
For each grid cell (row 1-5, col 1-5), identify what element is primarily in that area
and suggest an appropriate, child-friendly color.

Grid layout:
- Row 1 = top of image, Row 5 = bottom
- Col 1 = left side, Col 5 = right side

Consider:
- What object/element is in each grid cell
- Realistic but vibrant colors kids would enjoy
- Sky typically at top, ground at bottom
- Consistency (same object = same color across cells)
`;

export const gridColorMapSchema = z.object({
  sceneDescription: z.string(),
  gridColors: z.array(
    z.object({
      row: z.number().min(1).max(5),
      col: z.number().min(1).max(5),
      element: z.string(),
      suggestedColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      colorName: z.string(),
      reasoning: z.string(),
    }),
  ),
});
```

### Phase 3: Background Music Generation

**Update**: `apps/web/lib/elevenlabs/index.ts`

```typescript
/**
 * Generate loopable background music based on image theme.
 * Creates calming, kids-app style music specific to the content.
 */
export async function generateBackgroundMusic(
  title: string,
  tags: string[],
): Promise<Buffer> {
  const elevenlabs = getClient();

  // Create music prompt from image content
  const themes = [title.toLowerCase(), ...tags.slice(0, 3)].join(", ");
  const prompt = `Gentle, calming background music for children.
Loopable, no vocals, soft instrumentation.
Theme inspired by: ${themes}.
Style: whimsical, playful, soothing like a kids' app or cartoon.`;

  const audioStream = await elevenlabs.textToSoundEffects.convert({
    text: prompt,
    duration_seconds: 22, // Good loop length
    prompt_influence: 0.4,
  });

  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
```

**New action**: `apps/web/app/actions/generate-background-music.ts`

```typescript
"use server";

import { put } from "@/lib/storage";
import { db } from "@chunky-crayon/db";
import { generateBackgroundMusic } from "@/lib/elevenlabs";

export async function generateBackgroundMusicForImage(
  coloringImageId: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const image = await db.coloringImage.findUnique({
      where: { id: coloringImageId },
      select: { title: true, tags: true, backgroundMusicUrl: true },
    });

    if (!image) return { success: false, error: "Image not found" };
    if (image.backgroundMusicUrl)
      return { success: true, url: image.backgroundMusicUrl };

    const audioBuffer = await generateBackgroundMusic(image.title, image.tags);

    const { url } = await put(
      `uploads/coloring-images/${coloringImageId}/background-music.mp3`,
      audioBuffer,
      { access: "public", contentType: "audio/mpeg" },
    );

    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: { backgroundMusicUrl: url },
    });

    console.log(`[Music] Generated background music for "${image.title}"`);
    return { success: true, url };
  } catch (error) {
    console.error("[Music] Error:", error);
    return { success: false, error: String(error) };
  }
}
```

### Phase 4: Integrate into after()

**Update**: `apps/web/app/actions/coloring-image.ts`

```typescript
after(async () => {
  if (!result.url || !result.svgUrl) return;

  await Promise.allSettled([
    // Existing: SVG validation
    (async () => {
      const { isValid } = await checkSvgImage(result.svgUrl!);
      if (!isValid) await retraceImage(result.id, result.url!);
    })(),

    // Existing: Analytics
    (async () => {
      const analytics = await analyzeImageForAnalytics(result.url!);
      if (analytics && userId) {
        await trackWithUser(userId, TRACKING_EVENTS.CREATION_ANALYZED, {
          coloringImageId: result.id,
          ...analytics,
        });
      }
    })(),

    // NEW: Generate grid-based color map
    (async () => {
      await generateGridColorMap(result.id, result.url!);
      console.log(`[Pipeline] Color map generated for ${result.id}`);
    })(),

    // NEW: Generate background music
    (async () => {
      await generateBackgroundMusicForImage(result.id);
      console.log(`[Pipeline] Background music generated for ${result.id}`);
    })(),
  ]);

  // Invalidate cache so new data is available
  updateTag(`coloring-image-${result.id}`);
});
```

### Phase 5: Update Client Hook

**Update**: `apps/web/hooks/useMagicColorMap.ts`

Add ability to initialize from pre-computed grid data:

```typescript
/**
 * Initialize color map from pre-computed grid data.
 * Uses grid position matching instead of exact region IDs.
 */
const initializeFromGridData = useCallback(
  (
    gridData: GridColorMap,
    drawingCanvas: HTMLCanvasElement,
    boundaryCanvas: HTMLCanvasElement,
  ): boolean => {
    // Step 1: Detect regions client-side (same as fill tool)
    const regionMap = detectAllRegions(drawingCanvas, boundaryCanvas);
    if (regionMap.regions.length === 0) return false;

    // Step 2: Build lookup from grid data
    const gridLookup = new Map<string, (typeof gridData.gridColors)[0]>();
    for (const cell of gridData.gridColors) {
      gridLookup.set(`${cell.row}-${cell.col}`, cell);
    }

    // Step 3: Map each detected region to its grid cell's color
    const colorMap = new Map<number, string>();
    const colorNameMap = new Map<number, string>();
    const reasoningMap = new Map<number, string>();

    for (const region of regionMap.regions) {
      const grid = getGridPosition(
        region.centroid,
        regionMap.width,
        regionMap.height,
      );
      const gridKey = `${grid.row}-${grid.col}`;
      const cellData = gridLookup.get(gridKey);

      if (cellData) {
        colorMap.set(region.id, cellData.suggestedColor);
        colorNameMap.set(region.id, cellData.colorName);
        reasoningMap.set(region.id, cellData.reasoning);
      } else {
        // Fallback for unmapped cells
        const fallback = getDefaultColorForGrid(grid);
        colorMap.set(region.id, fallback.hex);
        colorNameMap.set(region.id, fallback.name);
        reasoningMap.set(region.id, "A nice color!");
      }
    }

    // Step 4: Create pre-colored canvas
    const preColoredCanvas = createPreColoredCanvas(
      drawingCanvas,
      regionMap,
      colorMap,
    );

    setState({
      isLoading: false,
      isReady: true,
      error: null,
      loadingMessage: null,
      analysis: {
        sceneDescription: gridData.sceneDescription,
        assignments: [],
      },
      regionMap,
      colorMap,
      colorNameMap,
      reasoningMap,
      preColoredCanvas,
      coloredRegions: new Set(),
    });

    return true;
  },
  [],
);

return {
  // ... existing returns ...
  initializeFromGridData,
};
```

### Phase 6: Update Coloring Page UI

**Update coloring canvas component**:

```tsx
function ColoringCanvas({ coloringImage }) {
  const { initializeFromGridData, state } = useMagicColorMap();
  const [isInitialized, setIsInitialized] = useState(false);

  // Parse pre-computed data if available
  const gridData = coloringImage.colorMapJson
    ? JSON.parse(coloringImage.colorMapJson)
    : null;

  // Initialize from pre-computed data when canvas is ready
  useEffect(() => {
    if (
      gridData &&
      drawingCanvasRef.current &&
      boundaryCanvasRef.current &&
      !isInitialized
    ) {
      const success = initializeFromGridData(
        gridData,
        drawingCanvasRef.current,
        boundaryCanvasRef.current,
      );
      setIsInitialized(success);
    }
  }, [gridData, isInitialized]);

  return (
    <>
      {/* Magic Brush button - disabled until color map ready */}
      <MagicBrushButton
        disabled={!state.isReady}
        loading={!gridData} // Show loading if data not yet generated
      />

      {/* Auto Colour button - same logic */}
      <AutoColourButton disabled={!state.isReady} loading={!gridData} />

      {/* Background Music - disabled until music ready */}
      <BackgroundMusicPlayer
        url={coloringImage.backgroundMusicUrl}
        disabled={!coloringImage.backgroundMusicUrl}
      />
    </>
  );
}
```

---

## Data Flow Summary

### Before (Current)

```
User clicks Magic Fill
       ↓
Client detects regions (~100ms)
       ↓
Sends to AI (~3-5s wait) ← USER WAITS HERE
       ↓
AI returns colors
       ↓
Fill canvas
```

### After (New)

```
Image generated
       ↓
after() runs in background:
  - AI generates grid color map (~3-5s, non-blocking)
  - ElevenLabs generates music (~5-10s, non-blocking)
       ↓
Data stored in DB

User opens coloring page
       ↓
Pre-computed data loaded instantly
       ↓
Client detects regions (~100ms)
       ↓
Map regions to grid → lookup colors (instant)
       ↓
Fill canvas ← NO WAIT!
```

---

## File Changes Summary

| File                                                | Change                                                          |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `packages/db/prisma/schema.prisma`                  | Add `colorMapJson`, `colorMapGeneratedAt`, `backgroundMusicUrl` |
| `apps/web/lib/ai/prompts.ts`                        | Add `GRID_COLOR_MAP_SYSTEM` prompt                              |
| `apps/web/lib/ai/schemas.ts`                        | Add `gridColorMapSchema`                                        |
| `apps/web/app/actions/generate-color-map.ts`        | NEW: Grid-based color map generation                            |
| `apps/web/app/actions/generate-background-music.ts` | NEW: Background music generation                                |
| `apps/web/lib/elevenlabs/index.ts`                  | Add `generateBackgroundMusic` function                          |
| `apps/web/app/actions/coloring-image.ts`            | Add after() tasks                                               |
| `apps/web/hooks/useMagicColorMap.ts`                | Add `initializeFromGridData`                                    |
| `apps/web/components/ColoringCanvas.tsx`            | Use pre-computed data, disable buttons until ready              |

---

## Progress Tracker

- [ ] **Phase 1**: Database schema migration
- [ ] **Phase 2**: Grid-based color map generation action + AI prompt
- [ ] **Phase 3**: Background music generation (ElevenLabs)
- [ ] **Phase 4**: Integrate both into after() in image generation
- [ ] **Phase 5**: Update useMagicColorMap hook with initializeFromGridData
- [ ] **Phase 6**: Update UI to use pre-computed data + disable buttons
- [ ] **Backfill**: Script to generate data for existing 472 images
- [ ] **Testing**: End-to-end flow verification

---

## Open Questions

1. **Grid resolution**: Is 5x5 (25 cells) enough granularity, or should we use 10x10?
   - 5x5 is simpler and faster
   - 10x10 would be more accurate for complex images

2. **Backfill priority**: Should we backfill all 472 images or just new ones?
   - New images: Easy, just update after()
   - Existing: Need migration script with rate limiting

3. **Fallback behavior**: What if pre-computed data isn't ready yet?
   - Show loading indicator on buttons
   - Fall back to current on-demand behavior?

---

## Cost Estimate

Per image:

- Grid color map (Gemini Flash): ~$0.001
- Background music (ElevenLabs): ~$0.02-0.05

At 472 existing images + 10 new/day:

- Backfill: ~$15-25 one-time
- Ongoing: ~$0.25-0.50/day
