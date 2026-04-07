/**
 * Gallery Refresh — Coloring Habitat
 */

import { createGalleryRefresh } from "@one-colored-pixel/coloring-core";

const {
  signalGalleryRefresh,
  getLastRefreshSignal,
  clearRefreshSignal,
  shouldRefresh,
} = createGalleryRefresh("coloring-habitat");

export {
  signalGalleryRefresh,
  getLastRefreshSignal,
  clearRefreshSignal,
  shouldRefresh,
};
