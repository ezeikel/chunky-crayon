import { CANVAS_STICKERS, type Sticker } from "./types";

/**
 * Web sticker-image cache. The canvas sticker tool stamps a transparent PNG
 * (CANVAS_STICKERS[].imageUrl) onto a <canvas> via ctx.drawImage — but the
 * 2D canvas replay loop is SYNCHRONOUS while images load ASYNC. So we
 * pre-decode every catalog PNG into an HTMLImageElement on first use and
 * resolve them synchronously from this Map at draw time. Placement/replay
 * fall back to fillText(emoji) when an image isn't ready yet or the action is
 * a legacy emoji-only save (no imageUrl).
 *
 * The PNGs are same-origin (`/images/stickers/canvas/*.png` in public/), so
 * drawing them does NOT taint the canvas — makeImageSnapshot / toDataURL save
 * still works. (A cross-origin sticker would need crossOrigin="anonymous" +
 * CORS; bundling same-origin sidesteps that, matching the avatar precedent.)
 */

const cache = new Map<string, HTMLImageElement>();
let preloadStarted = false;

const loadOne = (url: string): void => {
  if (cache.has(url)) return;
  if (typeof window === "undefined" || typeof Image === "undefined") return;
  const img = new Image();
  // Same-origin assets don't strictly need this, but it's harmless and keeps
  // the canvas untainted if the asset ever moves to a CORS-enabled host.
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = url;
  cache.set(url, img);
};

/** Kick off decoding of all catalog sticker PNGs (idempotent). */
export const preloadStickerImages = (): void => {
  if (preloadStarted) return;
  preloadStarted = true;
  for (const s of CANVAS_STICKERS) loadOne(s.imageUrl);
};

/**
 * Return a decoded, ready-to-draw image for a sticker url, or null if it isn't
 * loaded yet / unavailable. Starts loading on first request so an
 * individual url (e.g. a replayed action's imageUrl outside the catalog)
 * still resolves on a later frame.
 */
export const getStickerImage = (
  url: string | undefined,
): HTMLImageElement | null => {
  if (!url) return null;
  const existing = cache.get(url);
  if (existing)
    return existing.complete && existing.naturalWidth > 0 ? existing : null;
  loadOne(url);
  return null;
};

/** Resolve a catalog Sticker by its stable id. */
export const getStickerById = (id: string): Sticker | undefined =>
  CANVAS_STICKERS.find((s) => s.id === id);
