/**
 * Typed config shape for posters.config.ts.
 *
 * A poster project is: global brand/output settings + an ordered list of
 * per-panel definitions. The `headlines` subcommand drafts headlines and
 * subheads and writes them into headlines.json, which the config reads and
 * merges over the placeholder copy at gen time.
 */

import type { Background } from "./brand";
import type { Transform } from "./template";

export type { Background, Transform };

export type DeviceFrameSpec =
  /** a device preset key (e.g. "ipad-13", "iphone-6.9") */
  | string
  /** no frame — screenshot is composited bare (rare; full-bleed shot) */
  | "none";

export type PanelConfig = {
  /** output filename stem, e.g. "01-home". Also the headlines.json key. */
  name: string;
  /** screenshot filename within marketing/<platform>/<locale>/ */
  screenshot: string;
  /** headline drafted by the headlines step (placeholder until then) */
  headline?: string;
  /** subhead under the headline */
  subhead?: string;
  /** solid color or CSS gradient (CC brand tokens) */
  background: Background;
  /** device frame: a device key, or "none" */
  deviceFrame: DeviceFrameSpec;
  /**
   * Bleed group id. Panels sharing a bleedGroup render against ONE
   * continuous background canvas, then are sliced into per-panel store-res
   * PNGs (cross-panel look). Panels in a group MUST be contiguous in the
   * list and use the same device.
   */
  bleedGroup?: string;
  /**
   * Bleed STYLE for the group (set on any panel in the group; the group's
   * first panel wins). "flat" (default) = each panel's device sits inside
   * its own cell (background bleeds, devices don't). "hero" = devices are
   * tilted and free-positioned across the continuous canvas, overflowing
   * seams (the app-store-screenshots connected-canvas look). Ported geometry.
   */
  bleedLayout?: "flat" | "hero";
  /** tilt / offset / scale of the device frame */
  transform?: Transform;
  /** copy above (default) or below the device */
  copyPosition?: "top" | "bottom";
  /** small brand wordmark / badge text */
  badge?: string;

  // ─── v2 (Duolingo-ABC / Tondo) style fields ──────────────────────────
  /**
   * Render style. "v2" (default) = the locked Tondo look: headline PILL,
   * solid color-block background, upright device, decorative bleed. "v1" =
   * the legacy gradient/tilt template (kept for the bleed/hero paths).
   */
  styleVersion?: "v1" | "v2";
  /** headline pill color (defaults to crayon-orange) — v2 */
  pillColor?: string;
  /** pill vs soft outlined card — v2 */
  pillStyle?: "pill" | "soft";
  /** show the ported request card (typed request) instead of a device — v2 */
  requestPrompt?: string;
  /** show the voice card (mic + spoken request) instead of a device — v2 */
  voicePrompt?: string;
  /** show the device beside a printed sheet (screen-free dual-mode) — v2 */
  printMode?: boolean;
  /**
   * Line-art page PNG to show ON the printed sheet (printMode). Path is
   * relative to tools/posters/ (e.g. "assets/pages/boy-test-lineart.png").
   * Use the SAME page that's colored in the device for the strongest
   * "color on screen or print it" story.
   */
  printPage?: string;
  /** decorative crayons/stars/blobs that bleed over edges — v2 */
  decorations?: import("./template-v2").Decoration[];
};

export type BrandTokens = {
  /** default badge text applied to panels that don't set their own */
  defaultBadge?: string;
  /** default copy position */
  defaultCopyPosition?: "top" | "bottom";
};

export type PostersConfig = {
  /** brand-level defaults */
  brand: BrandTokens;
  /** capture input root, relative to the mobile app dir */
  marketingDir: string;
  /** poster output root, relative to the mobile app dir */
  outDir: string;
  /** ordered panels */
  panels: PanelConfig[];
};

/** identity helper so posters.config.ts gets full inference + autocompletion */
export const defineConfig = (c: PostersConfig): PostersConfig => c;

/**
 * headlines.json shape written by the `posters headlines` step
 * (src/headlines.ts). The config reads this and overlays the drafted copy
 * onto each panel by `name`, so the headline step's output flows into gen
 * without editing posters.config.ts by hand.
 */
export type HeadlinesFile = {
  generatedAt?: string;
  model?: string;
  headlines: Record<string, { headline: string; subhead?: string }>;
};

/**
 * Overlay drafted headlines/subheads from a HeadlinesFile onto panels by
 * name. Panels with no drafted entry keep their placeholder copy. Pure +
 * synchronous so posters.config.ts can call it inline at module eval.
 */
export const applyHeadlines = (
  panels: PanelConfig[],
  file: HeadlinesFile | null | undefined,
): PanelConfig[] => {
  if (!file?.headlines) return panels;
  return panels.map((p) => {
    const drafted = file.headlines[p.name];
    if (!drafted) return p;
    return {
      ...p,
      headline: drafted.headline ?? p.headline,
      subhead: drafted.subhead ?? p.subhead,
    };
  });
};
