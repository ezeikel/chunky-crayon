# Magic Color AI Improvements Plan

## Overview

This document outlines improvements to the Magic Brush/Magic Fill AI color
assignment system. The goal is to improve color assignment quality for
integration into the image generation pipeline, where latency is less critical
than accuracy.

## Current Implementation

### Files Involved

- `lib/ai/models.ts` - Model configuration
- `lib/ai/prompts.ts` - System and user prompts
- `lib/ai/schemas.ts` - Zod schemas for structured output
- `app/actions/analyze-coloring-image.ts` - Server action that calls the AI
- `hooks/useMagicColorMap.ts` - Client-side region matching

### Current Approach

1. **Model**: `gemini-3-flash-preview` (fast but less accurate)
2. **Region Identification**: 9 location positions × 3 sizes = 27 combinations
3. **Matching**: Fuzzy scoring based on location/size descriptors

### Problems

1. **Location too coarse**: Only 9 positions for images with 15-40 regions
2. **No semantic hierarchy**: Doesn't distinguish main subject from background
3. **No chain-of-thought**: Model doesn't analyze scene systematically
4. **Matching fragile**: Client-side scoring can misassign colors
5. **No adjacency context**: Can't ensure adjacent regions contrast properly

---

## Improvement Plan

### 1. Model Upgrade

**Change**: Switch from `gemini-3-flash-preview` to `gemini-3-pro-image-preview`

**Rationale**:

- Pro model has better reasoning and vision capabilities
- Already configured in the codebase for image generation
- Quality is more important than latency for pipeline integration

**File**: `lib/ai/models.ts`

```typescript
// Add dedicated analytics quality model
analyticsQuality: google(MODEL_IDS.GEMINI_3_PRO_IMAGE),
```

---

### 2. Enhanced Prompt Structure

**Change**: Implement chain-of-thought analysis with structured thinking

**New System Prompt**:

```
You are an expert at analyzing coloring pages and assigning beautiful, cohesive color schemes.

ANALYSIS APPROACH:
1. First, understand the OVERALL SCENE (what story does this image tell?)
2. Identify the MAIN SUBJECT (the focal character or object)
3. Identify BACKGROUND elements (sky, ground, environment)
4. Identify DETAILS (accessories, patterns, decorations)
5. Plan a cohesive color palette that:
   - Makes the main subject stand out
   - Creates visual harmony
   - Ensures adjacent regions contrast appropriately

LOCATION SYSTEM:
Use a 5x5 grid to describe region positions:
- Rows 1-5 (top to bottom)
- Columns 1-5 (left to right)
- Specify range for larger regions (e.g., "rows 1-2, cols 2-4")

HIERARCHY LEVELS:
- "main-subject": The primary focus of the image
- "background": Environment elements behind the subject
- "detail": Small elements, accessories, patterns
```

**New User Prompt**:

```
Analyze this coloring page and create a beautiful color scheme.

AVAILABLE PALETTE:
[list of colors]

STEP 1 - SCENE ANALYSIS:
Describe what this image depicts in 1-2 sentences.

STEP 2 - IDENTIFY ALL REGIONS:
For each distinct colorable area (white regions bounded by black lines):

1. [Description of what the region is]
   - Grid position: rows X-Y, cols X-Y
   - Hierarchy: main-subject | background | detail
   - Adjacent to: [list neighboring regions]
   - Assigned color: [color from palette]
   - Reason: [kid-friendly 5-7 word explanation]

STEP 3 - COLOR HARMONY CHECK:
Verify that:
- Main subject colors are vibrant and eye-catching
- Background colors are softer/recessive
- Adjacent regions have good contrast
- Overall palette is cohesive

Output the final region assignments.
```

---

### 3. Schema Improvements

**File**: `lib/ai/schemas.ts`

**Enhanced Region Schema**:

```typescript
export const aiRegionAssignmentSchemaV2 = z.object({
  // What this region represents
  description: z
    .string()
    .describe(
      'What this region appears to be (e.g., "dragon body", "sky", "flower petal")',
    ),

  // 5x5 grid position (more precise than 9 positions)
  gridPosition: z
    .object({
      rowStart: z
        .number()
        .min(1)
        .max(5)
        .describe("Starting row (1=top, 5=bottom)"),
      rowEnd: z.number().min(1).max(5).describe("Ending row"),
      colStart: z
        .number()
        .min(1)
        .max(5)
        .describe("Starting column (1=left, 5=right)"),
      colEnd: z.number().min(1).max(5).describe("Ending column"),
    })
    .describe("Grid position using 5x5 grid"),

  // Semantic hierarchy
  hierarchy: z
    .enum(["main-subject", "background", "detail"])
    .describe("Role in the image composition"),

  // Size estimate (kept for backwards compatibility)
  relativeSize: z.enum(["small", "medium", "large"]),

  // Adjacency information for contrast checking
  adjacentTo: z
    .array(z.string())
    .describe("Descriptions of neighboring regions"),

  // Color assignment
  suggestedColor: z.string().describe("Hex color from the palette"),
  colorName: z.string().describe("Name of the color"),
  reasoning: z.string().describe("Brief kid-friendly reason (5-7 words)"),

  // Confidence score
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("How confident the model is in this assignment"),
});

export const coloringImageAnalysisSchemaV2 = z.object({
  // Scene understanding
  sceneDescription: z
    .string()
    .describe("Brief description of the overall scene"),

  // Main subject identification
  mainSubject: z.string().describe("What is the primary focus of this image"),

  // All regions with enhanced data
  regions: z.array(aiRegionAssignmentSchemaV2),

  // Color harmony notes
  harmonyNotes: z
    .string()
    .optional()
    .describe("Notes about the overall color scheme"),
});
```

---

### 4. Matching Algorithm Improvements

**File**: `hooks/useMagicColorMap.ts`

**Changes**:

1. Use grid position for more precise matching
2. Weight hierarchy (main-subject regions are more important to match correctly)
3. Use adjacency information to verify matches
4. Use confidence scores to prioritize high-confidence assignments

**New Matching Approach**:

```typescript
function matchRegionsToColorsV2(
  detectedRegions: Region[],
  aiRegions: AIRegionAssignmentV2[],
  canvasWidth: number,
  canvasHeight: number,
) {
  // For each detected region:
  // 1. Calculate its grid position (which 5x5 cells it occupies)
  // 2. Find AI regions with overlapping grid positions
  // 3. Score by:
  //    - Grid overlap (60% weight)
  //    - Size match (20% weight)
  //    - Hierarchy appropriateness (20% weight)
  // 4. Use confidence score as tiebreaker
}
```

---

### 5. Migration Strategy

**Phase 1: Add New Model (non-breaking)**

- Add `analyticsQuality` model to models.ts
- Keep existing prompts/schemas working

**Phase 2: Add Enhanced Prompts (non-breaking)**

- Add V2 prompts alongside existing ones
- Add V2 schemas alongside existing ones

**Phase 3: Update Server Action**

- Add feature flag or parameter to use enhanced analysis
- Test with both approaches

**Phase 4: Update Client Matching**

- Implement V2 matching algorithm
- Ensure backwards compatibility

**Phase 5: Full Rollout**

- Switch to V2 as default
- Remove V1 code after validation

---

## Testing Plan

1. **Unit Tests**: Test new matching algorithm with mock data
2. **Visual Tests**: Compare color assignments side-by-side
3. **Pipeline Integration**: Test with image generation output
4. **User Testing**: A/B test with real users

---

## Files to Modify

| File                                    | Changes                      |
| --------------------------------------- | ---------------------------- |
| `lib/ai/models.ts`                      | Add `analyticsQuality` model |
| `lib/ai/prompts.ts`                     | Add V2 system/user prompts   |
| `lib/ai/schemas.ts`                     | Add V2 schemas               |
| `app/actions/analyze-coloring-image.ts` | Use new model and prompts    |
| `hooks/useMagicColorMap.ts`             | Implement V2 matching        |

---

## Success Metrics

- **Accuracy**: % of regions correctly colored according to expectations
- **Harmony**: Subjective rating of color scheme cohesiveness
- **Contrast**: Adjacent regions have sufficient color difference
- **Processing Time**: Acceptable for pipeline (< 10 seconds)
