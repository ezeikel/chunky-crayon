// Storybook stub for `@/app/actions/generate-color-map`. The real
// module imports prompt constants from coloring-core + AI SDK
// clients, none of which bundle for the browser. ColoringArea calls
// generateRegionFillPoints lazily (on-demand fill points for images
// without a region store) — fixture images in stories are already
// backfilled, so the code path never fires.

export const generateRegionFillPoints = async () => ({
  success: false as const,
  fillPoints: [],
  error: 'storybook stub',
});

export const generateGridColorMap = async () => ({
  success: false as const,
  colorMap: {},
  error: 'storybook stub',
});

export const getColorMapForImage = async () => null;
