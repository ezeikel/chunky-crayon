/**
 * Re-export from the shared package. The implementation + its unit
 * tests now live in `@one-colored-pixel/coloring-core` so web + mobile
 * build scene descriptions identically. Kept here for import-path
 * stability — existing consumers still `import from './build-scene-description'`.
 */
export {
  buildSceneDescription,
  type ScenePicks,
} from '@one-colored-pixel/coloring-core';
