/**
 * Gallery Refresh — Chunky Crayon
 */

import { createGalleryRefresh } from '@one-colored-pixel/coloring-core';

const {
  signalGalleryRefresh,
  getLastRefreshSignal,
  clearRefreshSignal,
  shouldRefresh,
} = createGalleryRefresh('chunky-crayon');

export {
  signalGalleryRefresh,
  getLastRefreshSignal,
  clearRefreshSignal,
  shouldRefresh,
};
