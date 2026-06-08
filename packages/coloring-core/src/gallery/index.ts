/**
 * Gallery-category data — the React-Native-safe subset.
 *
 * Exposed via the `@one-colored-pixel/coloring-core/gallery` subpath so the
 * mobile app (Metro) can import the category catalogue WITHOUT dragging the
 * package's root barrel — which re-exports the AI SDK, sharp, resvg, openai,
 * etc. (Node-only native deps that crash the Metro bundle). Same reasoning
 * as the ./scene subpath.
 *
 * Everything here is pure data + array helpers — zero Node/native deps.
 */

export {
  GALLERY_CATEGORIES,
  getCategoryBySlug,
  getCategoriesForTag,
} from "./categories";
export type { GalleryCategory } from "./categories";
