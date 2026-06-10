/**
 * Font embedding for the poster template.
 *
 * The renderer uses Playwright `page.setContent()`, which has NO document
 * origin — so a `file://` or relative @font-face `src` will NOT resolve
 * (brief `playwrightWiring`: "a file:// src only resolves when the page
 * itself is loaded from a file:// URL"). The robust, self-contained choice
 * is to base64-embed each .ttf as a `data:font/ttf;base64,...` src. That is
 * what this module does.
 *
 * Source fonts:
 *   - TONDO — the brand HEADER/display font. .ttf at the worker's
 *     public/fonts/tondo-{bold,light,regular}.ttf (identical to the mobile
 *     app's TondoTrial-*). Used for headlines (Bold) + subheads (Light).
 *   - RooneySans — the BODY/UI font. .ttf in the web app's public/fonts.
 *     Used for small chrome / badges / ported in-app UI cards.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** repo root: tools/posters/src → up 5 → repo root */
const REPO_ROOT = resolve(HERE, "..", "..", "..", "..", "..");
const ROONEY_DIR = join(
  REPO_ROOT,
  "apps",
  "chunky-crayon-web",
  "public",
  "fonts",
);
const TONDO_DIR = join(
  REPO_ROOT,
  "apps",
  "chunky-crayon-worker",
  "public",
  "fonts",
);

type FontFace = {
  family: string;
  weight: number;
  style: "normal" | "italic";
  dir: string;
  file: string;
};

/**
 * Faces the poster template uses. Tondo is the HEADER font (headlines +
 * subheads); RooneySans covers body/chrome and any ported in-app UI cards.
 */
const FACES: FontFace[] = [
  // Tondo (header / display) — the brand header font.
  {
    family: "Tondo",
    weight: 700,
    style: "normal",
    dir: TONDO_DIR,
    file: "tondo-bold.ttf",
  },
  {
    family: "Tondo",
    weight: 400,
    style: "normal",
    dir: TONDO_DIR,
    file: "tondo-regular.ttf",
  },
  {
    family: "Tondo",
    weight: 300,
    style: "normal",
    dir: TONDO_DIR,
    file: "tondo-light.ttf",
  },
  // RooneySans (body / UI) — for badges, chrome, ported in-app cards.
  {
    family: "RooneySans",
    weight: 800,
    style: "normal",
    dir: ROONEY_DIR,
    file: "rooney-sans-heavy.ttf",
  },
  {
    family: "RooneySans",
    weight: 700,
    style: "normal",
    dir: ROONEY_DIR,
    file: "rooney-sans-bold.ttf",
  },
  {
    family: "RooneySans",
    weight: 500,
    style: "normal",
    dir: ROONEY_DIR,
    file: "rooney-sans-medium.ttf",
  },
  {
    family: "RooneySans",
    weight: 400,
    style: "normal",
    dir: ROONEY_DIR,
    file: "rooney-sans-regular.ttf",
  },
];

let cachedCss: string | null = null;

/**
 * Returns the @font-face CSS with every available face inlined as base64.
 * Faces whose .ttf is missing are skipped (template falls back to system
 * sans) and a one-time warning is emitted so a misconfigured dir is visible
 * but never fatal.
 */
export const fontFaceCss = (): string => {
  if (cachedCss != null) return cachedCss;

  const blocks: string[] = [];
  const missing: string[] = [];

  for (const face of FACES) {
    const path = join(face.dir, face.file);
    if (!existsSync(path)) {
      missing.push(face.file);
      continue;
    }
    const b64 = readFileSync(path).toString("base64");
    blocks.push(
      `@font-face {
  font-family: "${face.family}";
  font-weight: ${face.weight};
  font-style: ${face.style};
  font-display: block;
  src: url(data:font/ttf;base64,${b64}) format("truetype");
}`,
    );
  }

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[posters] font(s) not found: ${missing.join(", ")} — falling back to system sans for those.`,
    );
  }

  cachedCss = blocks.join("\n\n");
  return cachedCss;
};

/** HEADER stack — Tondo (brand display/header font) for headlines + subheads. */
export const HEADER_FONT_STACK =
  '"Tondo", "Avenir Next", "Helvetica Neue", Arial, sans-serif';

/** BODY stack — RooneySans for chrome / badges / ported in-app UI. */
export const BODY_FONT_STACK =
  '"RooneySans", "Avenir Next", "Helvetica Neue", Arial, sans-serif';

/**
 * Back-compat alias. Older template code imports FONT_STACK; point it at the
 * HEADER stack so existing headline/subhead rules switch to Tondo with no
 * other edits.
 */
export const FONT_STACK = HEADER_FONT_STACK;

export { ROONEY_DIR, TONDO_DIR };
