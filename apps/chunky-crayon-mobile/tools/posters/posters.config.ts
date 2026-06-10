/**
 * Poster config for Chunky Crayon mobile App Store posters.
 *
 * The LOCKED v2 (Tondo) deck: 8 panels telling the full story —
 *   1 Ask for any page (request card)   2 Say it out loud (voice card)
 *   3 Colored canvas                     4 Huge library
 *   5 Stickers                           6 Save every masterpiece
 *   7 Color on screen or on paper        8 Calm controls for grown-ups
 *
 * Each panel: a Tondo headline PILL, a solid crayon color-block background
 * (varied across the set), an upright device (or the request/voice card, or
 * device+printed-sheet), and decorative crayons/stars that bleed over edges.
 *
 * Headlines were drafted with the copywriting skill and confirmed accurate
 * ("hundreds" of pages + "ad-free" are both TRUE). The `posters headlines`
 * step can still OVERWRITE them via headlines.json.
 *
 * COPY RULES (hard): never the word "AI"; no em/en dashes; US/UK-neutral
 * spelling; playful but parent-trustworthy; "better screen time" / screen-free
 * dual-mode positioning, no "no screens" overclaim.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  defineConfig,
  applyHeadlines,
  type HeadlinesFile,
  type PanelConfig,
} from "./src/config-types";
import { BRAND, solid } from "./src/brand";

/** Read drafted headlines.json (the `posters headlines` step writes it). */
const loadHeadlines = (): HeadlinesFile | null => {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = join(here, "src", "headlines.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as HeadlinesFile;
  } catch {
    return null;
  }
};

const BADGE = "Chunky Crayon";

const panels: PanelConfig[] = [
  {
    name: "01-request",
    screenshot: "08-scene-builder.png", // unused (request card replaces device) but kept for reference
    requestPrompt: "a friendly dinosaur baking cupcakes",
    headline: "Ask for any coloring page",
    subhead: "Your little one says what they love, and we draw it for them.",
    pillColor: BRAND.crayonOrange,
    background: solid(BRAND.paperCream),
    deviceFrame: "ipad-13",
    badge: BADGE,
    decorations: [
      {
        kind: "crayon",
        color: BRAND.blue,
        cx: 0.9,
        cy: 0.32,
        size: 0.2,
        rotate: 34,
      },
      {
        kind: "crayon",
        color: BRAND.green,
        cx: 0.08,
        cy: 0.6,
        size: 0.17,
        rotate: -22,
      },
      { kind: "star", color: BRAND.yellow, cx: 0.12, cy: 0.3, size: 0.04 },
      { kind: "star", color: BRAND.pink, cx: 0.9, cy: 0.7, size: 0.03 },
    ],
  },
  {
    name: "02-voice",
    screenshot: "08-scene-builder.png",
    voicePrompt: "a rocket ship going to the moon",
    headline: "They just say it out loud",
    subhead: "No typing needed. Tell us what to color and tap go.",
    pillColor: BRAND.blue,
    background: solid(BRAND.peachLight),
    deviceFrame: "ipad-13",
    badge: BADGE,
    decorations: [
      {
        kind: "star",
        color: BRAND.crayonOrange,
        cx: 0.14,
        cy: 0.34,
        size: 0.04,
      },
      {
        kind: "crayon",
        color: BRAND.green,
        cx: 0.9,
        cy: 0.4,
        size: 0.18,
        rotate: 28,
      },
    ],
  },
  {
    name: "03-canvas",
    screenshot: "06-coloring-canvas.png",
    headline: "Chunky tools, big happy mess",
    subhead: "Crayons, fills and gentle taps, all sized for little hands.",
    pillColor: BRAND.green,
    background: solid(BRAND.yellow),
    deviceFrame: "ipad-13",
    badge: BADGE,
    decorations: [
      {
        kind: "blob",
        color: "rgba(255,255,255,0.18)",
        cx: 0.16,
        cy: 0.78,
        r: 0.2,
      },
      {
        kind: "crayon",
        color: BRAND.crayonOrange,
        cx: 0.93,
        cy: 0.3,
        size: 0.2,
        rotate: 38,
      },
    ],
  },
  {
    name: "04-library",
    screenshot: "04-category-animals.png",
    headline: "A new world every day",
    subhead: "Hundreds of hand-picked pages, all safe for little eyes.",
    pillColor: BRAND.blue,
    background: solid(BRAND.green),
    deviceFrame: "ipad-13",
    badge: BADGE,
    decorations: [
      {
        kind: "blob",
        color: "rgba(255,255,255,0.16)",
        cx: 0.85,
        cy: 0.22,
        r: 0.18,
      },
      {
        kind: "crayon",
        color: BRAND.yellow,
        cx: 0.08,
        cy: 0.4,
        size: 0.18,
        rotate: -28,
      },
    ],
  },
  {
    name: "05-stickers",
    screenshot: "09-stickers.png",
    headline: "Stickers to collect and grow",
    subhead: "Every finished page earns a happy little reward.",
    pillColor: BRAND.crayonOrange,
    background: solid(BRAND.purple),
    deviceFrame: "ipad-13",
    badge: BADGE,
    decorations: [
      { kind: "star", color: BRAND.white, cx: 0.12, cy: 0.32, size: 0.04 },
      { kind: "star", color: BRAND.yellow, cx: 0.9, cy: 0.72, size: 0.03 },
    ],
  },
  {
    name: "06-save",
    screenshot: "05-my-artwork.png",
    headline: "Save every masterpiece",
    subhead: "Their finished art stays right here, ready to show grandma.",
    pillColor: BRAND.blue,
    background: solid(BRAND.pink),
    deviceFrame: "ipad-13",
    badge: BADGE,
    decorations: [
      {
        kind: "crayon",
        color: BRAND.green,
        cx: 0.9,
        cy: 0.35,
        size: 0.2,
        rotate: 30,
      },
      { kind: "star", color: BRAND.white, cx: 0.1, cy: 0.32, size: 0.038 },
    ],
  },
  {
    name: "07-print",
    screenshot: "06-coloring-canvas.png",
    printMode: true,
    // the REAL line-art of the same page that's colored in the device — the
    // demo-reel PdfPreviewCard treatment ("color on screen, or print it").
    printPage: "assets/pages/boy-test-lineart.png",
    headline: "Color on screen or on paper",
    subhead: "Print any page to color away from the screen, anytime.",
    pillColor: BRAND.green,
    background: solid(BRAND.paperCream),
    deviceFrame: "ipad-13",
    badge: BADGE,
    decorations: [
      {
        kind: "crayon",
        color: BRAND.crayonOrange,
        cx: 0.92,
        cy: 0.3,
        size: 0.2,
        rotate: 36,
      },
      {
        kind: "crayon",
        color: BRAND.blue,
        cx: 0.07,
        cy: 0.64,
        size: 0.17,
        rotate: -20,
      },
      { kind: "star", color: BRAND.yellow, cx: 0.12, cy: 0.3, size: 0.04 },
    ],
  },
  {
    name: "08-parents",
    screenshot: "11-parent-gate.png",
    headline: "Calm controls for grown-ups",
    subhead: "Quiet, ad-free coloring with simple gates where they matter.",
    pillColor: BRAND.crayonOrange,
    background: solid(BRAND.blue),
    deviceFrame: "ipad-13",
    badge: BADGE,
    decorations: [
      { kind: "star", color: BRAND.white, cx: 0.12, cy: 0.34, size: 0.038 },
      {
        kind: "crayon",
        color: BRAND.yellow,
        cx: 0.9,
        cy: 0.4,
        size: 0.18,
        rotate: 26,
      },
    ],
  },
];

export default defineConfig({
  brand: {
    defaultBadge: BADGE,
    defaultCopyPosition: "top",
  },
  marketingDir: "marketing",
  outDir: "marketing-posters",
  panels: applyHeadlines(panels, loadHeadlines()),
});
