# Magic Fill Feature (V3 Region-First)

_Status: **IMPLEMENTED** | Last Updated: December 2024_

---

## Overview

Magic Fill is an AI-powered "paint by numbers" system that analyzes line
drawings and assigns colors to each region. The user can then:

1. **Magic Reveal** - Tap/stroke regions to reveal AI-chosen colors (like
   scratch-off)
2. **Magic Auto** - One click fills the entire image with AI-assigned colors

---

## Current Implementation (V3)

### Architecture: Region-First Approach

The V3 implementation uses a **region-first** approach that guarantees 1:1
mapping between detected regions and AI color assignments:

```
┌──────────────────┐     ┌───────────────────┐     ┌─────────────────────┐
│  Line Art Image  │────▶│  Region Detection │────▶│  5x5 Grid Position  │
│  (Boundary Canvas)│     │  (Client-side)    │     │  + Size Descriptor  │
└──────────────────┘     └───────────────────┘     └─────────────────────┘
                                  │                          │
                                  ▼                          ▼
                         ┌───────────────────┐     ┌───────────────────────┐
                         │  Region Map       │     │  AI Color Assignment  │
                         │  (pixelId→region) │     │  (by region ID)       │
                         └───────────────────┘     └───────────────────────┘
                                  │                          │
                                  └──────────┬───────────────┘
                                             ▼
                                  ┌───────────────────┐
                                  │  Color Map        │
                                  │  (regionId→color) │
                                  └───────────────────┘
```

### Key Concept: 5x5 Grid Positioning

Instead of vague location strings ("top-left", "center"), V3 sends precise grid
coordinates:

```typescript
// Convert pixel coordinates to 5x5 grid position
function getGridPosition(centroid, canvasWidth, canvasHeight) {
  const col = Math.min(
    5,
    Math.max(1, Math.ceil((centroid.x / canvasWidth) * 5)),
  );
  const row = Math.min(
    5,
    Math.max(1, Math.ceil((centroid.y / canvasHeight) * 5)),
  );
  return { row, col }; // 1-5 for both
}
```

Each region sent to AI includes:

- `id` - Unique region ID (from client-side detection)
- `gridRow` - Row position (1-5, where 1=top)
- `gridCol` - Column position (1-5, where 1=left)
- `size` - Size descriptor ("tiny", "small", "medium", "large", "huge")
- `pixelPercentage` - Percentage of canvas area

### Data Flow

1. **Client detects regions** → `detectAllRegions()` in
   `utils/regionDetection.ts`
2. **Convert to V3 format** → Grid positions + size descriptors
3. **Send to AI** → Server action `assignColorsToRegions()`
4. **AI returns assignments** → Each with `regionId` matching input
5. **Build color maps** → Direct 1:1 mapping by ID
6. **Create pre-colored canvas** → For reveal mode

---

## File Structure

### Core Files

| File                                    | Purpose                                           |
| --------------------------------------- | ------------------------------------------------- |
| `hooks/useMagicColorMap.ts`             | Main hook managing color map state and generation |
| `app/actions/analyze-coloring-image.ts` | Server action for AI color assignment             |
| `utils/regionDetection.ts`              | Client-side region detection (flood fill based)   |
| `lib/ai/prompts.ts`                     | AI system prompt and user prompt generation       |
| `lib/ai/schemas.ts`                     | Zod schemas for AI response validation            |

### Supporting Files

| File                                       | Purpose                                     |
| ------------------------------------------ | ------------------------------------------- |
| `components/ColoringArea/ColoringArea.tsx` | Integrates magic tools with coloring canvas |
| `components/ImageCanvas/ImageCanvas.tsx`   | Canvas handling, reveal mode interaction    |
| `components/ToolSelector/ToolSelector.tsx` | Magic reveal/auto tool buttons              |
| `constants.ts`                             | Color palette (ALL_COLORING_COLORS)         |

---

## API: `useMagicColorMap` Hook

```typescript
const {
  state: {
    isLoading, // boolean - AI is analyzing
    isReady, // boolean - Color map ready for use
    error, // string | null - Error message if failed
    loadingMessage, // string | null - Progress message
    colorMap, // Map<number, string> - regionId → hex color
    colorNameMap, // Map<number, string> - regionId → color name
    reasoningMap, // Map<number, string> - regionId → AI reasoning
    coloredRegions, // Set<number> - Regions already filled
  },
  generateColorMap, // (drawingCanvas, boundaryCanvas) => Promise<boolean>
  getColorAtPoint, // (x, y) => string | null
  getRegionIdAtPoint, // (x, y) => number
  markRegionColored, // (regionId) => void
  getRemainingRegionCount, // () => number
  getAllColorsForAutoFill, // () => Array<{ regionId, color, centroid }>
  reset, // () => void
} = useMagicColorMap();
```

---

## User Experience

### Magic Reveal Mode

1. User selects "Magic Reveal" tool (wand icon)
2. System analyzes image (loading overlay with progress)
3. User taps/strokes on regions
4. Each region fills with its AI-assigned color
5. Sparkle sound plays on each reveal

### Magic Auto Mode

1. User selects "Magic Auto" tool
2. System analyzes image (if not already done)
3. Each region fills sequentially via centroid flood-fill (color-as-stroke
   approach)
4. Celebration sound plays

**Note:** Auto-color uses the same flood-fill mechanism as manual coloring,
iterating through each region's centroid point. This ensures consistent fill
behavior and integrates with the existing undo/redo system.

---

## AI Prompt Structure

The AI receives:

1. **System prompt** - Instructions for coloring page analysis
2. **Available palette** - List of hex colors with names
3. **Detected regions** - Array with grid positions and sizes
4. **Image** - The line art as base64

The AI returns:

```typescript
{
  sceneDescription: string; // What the image depicts
  assignments: Array<{
    regionId: number; // Matches input region ID
    element: string; // What this region represents
    suggestedColor: string; // Hex color from palette
    colorName: string; // Human-readable color name
    reasoning: string; // Kid-friendly explanation
  }>;
}
```

---

## Known Issues & Future Improvements

<!-- TODO: Improve Magic Fill prompts - the AI color assignments could be better.
Ideas to explore:
- Better scene understanding before assigning colors
- More context about common coloring page elements (teddy bears, flowers, etc.)
- Consider region adjacency when assigning contrasting colors
- Fine-tune the grid-based location descriptions
- Test with different image types to improve consistency
-->

### Current Limitations

1. **Prompt tuning needed** - AI sometimes assigns unexpected colors
2. **No adjacency awareness** - Adjacent regions may get similar colors
3. **Scene understanding** - Complex scenes may confuse the AI
4. **Small region handling** - Very tiny regions may be missed

### Potential Improvements

1. Better scene classification before color assignment
2. Color contrast rules for adjacent regions
3. Common element recognition (sky, grass, skin tones)
4. User override for individual regions
5. Multiple color scheme options ("Realistic", "Fantasy", "Pastel")

---

## Debug Logging

Console logs are preserved for debugging and future prompt improvements:

**Client-side (useMagicColorMap.ts):**

```
========== MAGIC FILL V3: SENDING TO AI ==========
Sending X regions to AI for color assignment
Sample regions: #1 at grid(2,3) size:medium ...
===================================================

========== MAGIC FILL V3: AI RESPONSE ==========
Scene: [description]
Assignments returned: X
Match rate: 100%
Sample assignments:
  #1: "sky" → Sky Blue (#1E88E5)
  ...
===================================================
```

**Server-side (analyze-coloring-image.ts):**

```
========== MAGIC FILL: REGION-FIRST APPROACH ==========
Total regions to color: X
Sample regions: #1 at (2,3) - medium ...
Duration: Xms
Scene: [description]
Match rate: X%
============================================================
```

---

## Testing Results

Latest test (December 2024):

- **Regions detected:** 58
- **AI assignments:** 58
- **Match rate:** 100%
- **Duration:** ~2-3 seconds

The V3 region-first approach successfully achieves 1:1 mapping between detected
regions and AI color assignments.
