// Storybook stub for `@/lib/ai`. The real module re-exports
// `@/lib/ai/prompts.ts` which lives at module scope and pulls in
// `CC_BRAND_VOICE_CORE` from `@one-colored-pixel/coloring-core`, plus
// AI SDK clients. None of that bundles for the browser. ColoringArea
// is the only consumer in the story tree and it only needs the two
// type imports below — runtime exports are stubbed so nothing crashes
// if the path is ever called.

export type GridColorMap = Record<string, string>;
export type FillPointsData = Array<{
  x: number;
  y: number;
  color: string;
  regionId?: number | null;
}>;

export const models = {} as Record<string, unknown>;
export const prompts = {} as Record<string, unknown>;
export const schemas = {} as Record<string, unknown>;

// Prompt constants re-exported by the real `@/lib/ai` for various
// server actions. Story tree drags some action files via static
// import; they never execute, but the import is hoisted. Empty
// strings are fine — no AI call ever fires in Storybook.
export const GRID_COLOR_MAP_SYSTEM = '';
export const REGION_FILL_POINTS_SYSTEM = '';
export const REGION_GENERATION_SYSTEM = '';
export const REGION_LABEL_SYSTEM = '';
export const REGION_PALETTE_SYSTEM = '';
export const createGridColorMapPrompt = () => '';
export const createRegionFillPointsPrompt = () => '';
export const createRegionGenerationPrompt = () => '';
export const createRegionLabelPrompt = () => '';
export const createRegionPalettePrompt = () => '';
