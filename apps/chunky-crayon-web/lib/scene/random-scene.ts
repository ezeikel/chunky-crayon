/**
 * Re-export from the shared package. Implementation + tests live in
 * `@one-colored-pixel/coloring-core` so the dice roll is identical on
 * web + mobile. Kept here for import-path stability.
 */
export {
  rollRandomScene,
  type RandomSceneResult,
} from '@one-colored-pixel/coloring-core';
