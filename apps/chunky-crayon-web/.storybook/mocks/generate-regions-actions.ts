// Storybook stub for `@/app/actions/generate-regions`. Real module
// pulls coloring-core's region generation logic + AI SDK clients —
// not browser-bundleable. Story tree only references it via
// ColoringArea's regionStore retry path; fixture images are already
// backfilled so the action never fires.

export const generateRegionStore = async () => ({
  success: false as const,
  error: 'storybook stub',
});

export const checkRegionStoreReady = async () => ({ ready: true as const });

export const requestRegionStoreRegeneration = async () => ({
  ok: true as const,
});
