/**
 * Bezel asset handling.
 *
 * Per the brief `bezelAssets`: Apple Design Resources bezels CANNOT be
 * bundled/redistributed in a tool. The license-safe options are:
 *   1. PommePlate (CC0 1.0) — empty-screen PNG iPhone/iPad mockups. Stale
 *      (archived 2023, no Dynamic Island / current iPad Pro), but CC0 so
 *      it can sit in assets/. The fetch-bezels.sh script pulls these.
 *   2. devices.css (MIT) — pure-CSS frames, no PNGs. This is what the
 *      template.ts CSS-frame fallback is modeled on (cutout == frame
 *      padding).
 *
 * This module loads a device's bezel PNG from assets/ as a data URL. If the
 * PNG is absent (no license-safe asset dropped in yet), it returns null and
 * the template renders the high-quality CSS frame instead — so `gen` NEVER
 * breaks on a missing bezel.
 *
 * INSET: the screen-cutout inset for a PNG bezel is the alpha bounding box,
 * measured ONCE per device with ImageMagick (see
 * scripts/measure-bezel-inset.sh). Until measured, devices.ts ships a
 * derived inset that is close enough for PommePlate-class straight bezels.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { DevicePreset } from "./devices";

const HERE = dirname(fileURLToPath(import.meta.url));
/** tools/posters/src → tools/posters/assets */
export const ASSETS_DIR = resolve(HERE, "..", "assets");

let warnedOnce = false;

/**
 * Load the bezel PNG for a device as a data URL. Returns null when the file
 * is missing → caller falls back to the CSS frame.
 */
export const loadBezelDataUrl = (device: DevicePreset): string | null => {
  const path = join(ASSETS_DIR, device.bezelPng);
  if (!existsSync(path)) {
    if (!warnedOnce) {
      // eslint-disable-next-line no-console
      console.warn(
        `[posters] No bezel PNG at ${ASSETS_DIR} (looked for ${device.bezelPng}). ` +
          `Using the built-in CSS device frame. To use a real bezel, run ` +
          `scripts/fetch-bezels.sh then scripts/measure-bezel-inset.sh.`,
      );
      warnedOnce = true;
    }
    return null;
  }
  const b64 = readFileSync(path).toString("base64");
  return `data:image/png;base64,${b64}`;
};

/** Whether a real bezel PNG exists for a device. */
export const hasBezel = (device: DevicePreset): boolean =>
  existsSync(join(ASSETS_DIR, device.bezelPng));
