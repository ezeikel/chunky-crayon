/**
 * Re-export from the shared package. The gateable-mode constant + type
 * + guard live in `@one-colored-pixel/coloring-core` so web + mobile
 * agree on which modes are gateable (scene is never gateable). Kept
 * here for import-path stability — `app/actions/scene.ts` (a
 * `'use server'` module) and the client components both import from
 * this plain module.
 *
 * Import from the `/scene` subpath, NOT the package barrel: the barrel
 * pulls Node-only deps (sharp, resvg, generate-regions) which leak into
 * the client bundle when a Client Component imports this file, breaking
 * the Turbopack build with `Can't resolve 'child_process'`. The `/scene`
 * entrypoint is Node-free by design.
 */
export {
  GATEABLE_MODES,
  isGateableMode,
  type GateableMode,
} from '@one-colored-pixel/coloring-core/scene';
