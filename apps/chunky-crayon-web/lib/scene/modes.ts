/**
 * Re-export from the shared package. The gateable-mode constant + type
 * + guard live in `@one-colored-pixel/coloring-core` so web + mobile
 * agree on which modes are gateable (scene is never gateable). Kept
 * here for import-path stability — `app/actions/scene.ts` (a
 * `'use server'` module) and the client components both import from
 * this plain module.
 */
export {
  GATEABLE_MODES,
  isGateableMode,
  type GateableMode,
} from '@one-colored-pixel/coloring-core';
