/**
 * Playwright renderer — HTML poster template → store-resolution PNG.
 *
 * Engine: Playwright chromium (brief `playwrightWiring`: reuse the repo's
 * bundled chromium via bare `chromium.launch()`; browsers already cached
 * locally; `pnpm exec playwright install chromium` documented for fresh
 * machines in the README).
 *
 * Single panels render to one PNG. Bleed groups render the N-wide stage
 * once, then slice into N store-res PNGs at x = i × storeWidth (the
 * cross-panel slice). A contact sheet is composited from all outputs for
 * a quick preview.
 */

import { chromium, type Browser, type Page } from "playwright";
import sharp from "sharp";
import { Buffer } from "node:buffer";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** tools/posters/ root (src/ → up one), for resolving asset paths in config. */
const TOOL_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

import type { DevicePreset } from "./devices";
import type { PanelConfig, PostersConfig } from "./config-types";
import type {
  PanelRender,
  BleedRender,
  HeroBleedRender,
  HeroDevicePlacement,
} from "./template";
import {
  renderPanelHtml,
  renderBleedHtml,
  renderHeroBleedHtml,
} from "./template";
import { loadBezelDataUrl } from "./assets";
import { renderPanelV2Html, type PanelV2 } from "./template-v2";

export type RenderContext = {
  config: PostersConfig;
  /** absolute path to the locale's capture dir (…/marketing/<platform>/<locale>) */
  captureDir: string;
  /** absolute path to the output dir for this platform/device/locale */
  outDir: string;
  /** which device preset to render with (overrides per-panel "ipad-13" etc) */
  device: DevicePreset;
};

const ensureDir = (p: string): void => {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
};

/** Read a PNG file into a data URL, or null if missing. */
const fileToDataUrl = (path: string): string | null => {
  if (!existsSync(path)) return null;
  const b64 = readFileSync(path).toString("base64");
  return `data:image/png;base64,${b64}`;
};

/**
 * Build a PanelRender from a PanelConfig: resolve the screenshot + bezel to
 * data URLs and the device preset. `deviceFrame: "none"` → no bezel, no CSS
 * frame (bare composite via the empty/loose path is still framed-less; we
 * pass bezelDataUrl=null AND mark with a sentinel by using a device whose
 * inset == full — simplest is: still frame, but allow "none" to skip).
 */
const toPanelRender = (panel: PanelConfig, ctx: RenderContext): PanelRender => {
  // The --device flag (ctx.device) is authoritative for the render canvas AND
  // the bezel: output is always at ctx.device.store px so `--device iphone-6.9`
  // really produces 1290x2796, not whatever each panel's deviceFrame happens to
  // say. The per-panel `deviceFrame` only signals frame-ON (any device key) vs
  // frame-OFF ("none") — it does NOT pick a different resolution per panel,
  // which would be incoherent within one --device run.
  const device = ctx.device;
  const shotPath = join(ctx.captureDir, panel.screenshot);
  const screenshotDataUrl = fileToDataUrl(shotPath);
  if (!screenshotDataUrl) {
    // eslint-disable-next-line no-console
    console.warn(
      `[posters] screenshot not found: ${shotPath} — panel "${panel.name}" renders with a placeholder.`,
    );
  }
  const bezelDataUrl =
    panel.deviceFrame === "none" ? null : loadBezelDataUrl(device);

  return {
    name: panel.name,
    screenshotDataUrl,
    headline: panel.headline,
    subhead: panel.subhead,
    badge: panel.badge ?? ctx.config.brand.defaultBadge,
    background: panel.background,
    device,
    bezelDataUrl,
    transform: panel.transform,
    copyPosition: panel.copyPosition ?? ctx.config.brand.defaultCopyPosition,
  };
};

/** Map a PanelConfig to the v2 (Tondo) PanelV2 shape. */
const toPanelV2 = (panel: PanelConfig, ctx: RenderContext): PanelV2 => {
  const device = ctx.device;
  const shotPath = join(ctx.captureDir, panel.screenshot);
  const screenshotDataUrl = fileToDataUrl(shotPath);
  if (!screenshotDataUrl && !panel.requestPrompt && !panel.voicePrompt) {
    // eslint-disable-next-line no-console
    console.warn(
      `[posters] screenshot not found: ${shotPath} — panel "${panel.name}" renders with a placeholder.`,
    );
  }
  return {
    name: panel.name,
    screenshotDataUrl,
    headline: panel.headline,
    subhead: panel.subhead,
    requestPrompt: panel.requestPrompt,
    voicePrompt: panel.voicePrompt,
    printMode: panel.printMode,
    printPageDataUrl: panel.printPage
      ? fileToDataUrl(join(TOOL_DIR, panel.printPage))
      : null,
    pillColor: panel.pillColor,
    background: panel.background,
    device,
    bezelDataUrl:
      panel.deviceFrame === "none" ? null : loadBezelDataUrl(device),
    badge: panel.badge ?? ctx.config.brand.defaultBadge,
    style: panel.pillStyle ?? "pill",
    decorations: panel.decorations,
  };
};

/** Render a single panel HTML to a PNG buffer at exact store res. */
const renderSingle = async (page: Page, pr: PanelRender): Promise<Buffer> => {
  const { width, height } = pr.device.store;
  await page.setViewportSize({ width, height });
  await page.setContent(renderPanelHtml(pr), { waitUntil: "networkidle" });
  // fonts are base64-embedded; still wait for font readiness defensively
  await page.evaluate(() => (document as any).fonts?.ready);
  const buf = await page.screenshot({
    clip: { x: 0, y: 0, width, height },
    type: "png",
  });
  return buf as Buffer;
};

/** Render a single v2 (Tondo) panel HTML to a PNG buffer at store res. */
const renderSingleV2 = async (page: Page, panel: PanelV2): Promise<Buffer> => {
  const { width, height } = panel.device.store;
  await page.setViewportSize({ width, height });
  await page.setContent(renderPanelV2Html(panel), { waitUntil: "networkidle" });
  await page.evaluate(() => (document as any).fonts?.ready);
  const buf = await page.screenshot({
    clip: { x: 0, y: 0, width, height },
    type: "png",
  });
  return buf as Buffer;
};

/**
 * Render a bleed group: one N-wide stage, then slice into N store-res
 * PNGs. Returns [{ name, buffer }] in panel order.
 */
const renderBleed = async (
  page: Page,
  group: BleedRender,
): Promise<{ name: string; buffer: Buffer }[]> => {
  const { width, height } = group.device.store;
  const n = group.panels.length;
  await page.setViewportSize({ width: width * n, height });
  await page.setContent(renderBleedHtml(group), { waitUntil: "networkidle" });
  await page.evaluate(() => (document as any).fonts?.ready);
  const out: { name: string; buffer: Buffer }[] = [];
  for (let i = 0; i < n; i += 1) {
    const buf = await page.screenshot({
      clip: { x: i * width, y: 0, width, height },
      type: "png",
    });
    out.push({ name: group.panels[i].name, buffer: buf as Buffer });
  }
  return out;
};

/**
 * Render a HERO bleed group: one N-wide stage with tilted, seam-overflowing
 * devices, sliced into N store-res PNGs. Same slicing as renderBleed.
 */
const renderHeroBleed = async (
  page: Page,
  group: HeroBleedRender,
): Promise<{ name: string; buffer: Buffer }[]> => {
  const { width, height } = group.device.store;
  const n = group.panels.length;
  await page.setViewportSize({ width: width * n, height });
  await page.setContent(renderHeroBleedHtml(group), {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => (document as any).fonts?.ready);
  const out: { name: string; buffer: Buffer }[] = [];
  for (let i = 0; i < n; i += 1) {
    const buf = await page.screenshot({
      clip: { x: i * width, y: 0, width, height },
      type: "png",
    });
    out.push({ name: group.panels[i].name, buffer: buf as Buffer });
  }
  return out;
};

/**
 * Default tilted-device placements for an N-panel hero group, ported from
 * app-store-screenshots' getDefaultRects + connected-canvas overflow. Each
 * panel gets one device; alternating panels straddle the seam toward their
 * neighbour with a gentle opposing tilt, so the row reads as one scene.
 * cx is a fraction of the TOTAL stage width (n panels).
 */
const defaultHeroPlacements = (n: number): HeroDevicePlacement[] => {
  const placements: HeroDevicePlacement[] = [];
  for (let i = 0; i < n; i += 1) {
    // panel center in total-width fraction
    const panelCenter = (i + 0.5) / n;
    // nudge toward the seam: interior panels lean toward the next panel so
    // the device overflows the boundary (Parth's secondary x:-0.06cW idea,
    // generalized). End panels lean inward less.
    const dir = i < n - 1 ? 1 : -1;
    const seamNudge = (0.5 / n) * 0.42 * dir; // ~42% of a half-panel toward seam
    const cx = panelCenter + seamNudge;
    // alternate tilt for a dynamic, overlapping feel
    const rotate = i % 2 === 0 ? -7 : 6;
    placements.push({
      panelIndex: i,
      cx,
      cy: 0.62, // sit in the lower-middle, below the headline band
      heightFrac: 0.64,
      rotate,
      z: i,
    });
  }
  return placements;
};

/** Group contiguous panels by bleedGroup, preserving order. */
const groupPanels = (
  panels: PanelConfig[],
): Array<
  | { kind: "single"; panel: PanelConfig }
  | { kind: "bleed"; id: string; panels: PanelConfig[] }
> => {
  const groups: Array<
    | { kind: "single"; panel: PanelConfig }
    | { kind: "bleed"; id: string; panels: PanelConfig[] }
  > = [];
  let i = 0;
  while (i < panels.length) {
    const p = panels[i];
    if (p.bleedGroup) {
      const id = p.bleedGroup;
      const run: PanelConfig[] = [];
      while (i < panels.length && panels[i].bleedGroup === id) {
        run.push(panels[i]);
        i += 1;
      }
      groups.push({ kind: "bleed", id, panels: run });
    } else {
      groups.push({ kind: "single", panel: p });
      i += 1;
    }
  }
  return groups;
};

export type RenderResult = { name: string; path: string };

/**
 * Render every panel in the config to a numbered store-res PNG, slicing
 * bleed groups. Returns the written paths. Also writes a contact sheet.
 */
export const renderAll = async (
  ctx: RenderContext,
): Promise<RenderResult[]> => {
  ensureDir(ctx.outDir);
  const results: RenderResult[] = [];
  const browser: Browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    const grouped = groupPanels(ctx.config.panels);
    let index = 1;
    for (const g of grouped) {
      if (g.kind === "single") {
        // v2 (Tondo) is the default style; v1 only if explicitly requested.
        const buf =
          g.panel.styleVersion === "v1"
            ? await renderSingle(page, toPanelRender(g.panel, ctx))
            : await renderSingleV2(page, toPanelV2(g.panel, ctx));
        const file = `${String(index).padStart(2, "0")}-${stripIndex(g.panel.name)}.png`;
        const path = join(ctx.outDir, file);
        ensureDir(dirname(path));
        await writeBuffer(path, buf);
        results.push({ name: g.panel.name, path });
        index += 1;
      } else {
        // Bleed group renders at the --device resolution too (see toPanelRender).
        const panels = g.panels.map((p) => toPanelRender(p, ctx));
        const isHero = g.panels[0].bleedLayout === "hero";
        const slices = isHero
          ? await renderHeroBleed(page, {
              background: g.panels[0].background,
              device: ctx.device,
              panels,
              placements: defaultHeroPlacements(panels.length),
            } as HeroBleedRender)
          : await renderBleed(page, {
              background: g.panels[0].background,
              device: ctx.device,
              panels,
            } as BleedRender);
        for (const slice of slices) {
          const file = `${String(index).padStart(2, "0")}-${stripIndex(slice.name)}.png`;
          const path = join(ctx.outDir, file);
          ensureDir(dirname(path));
          await writeBuffer(path, slice.buffer);
          results.push({ name: slice.name, path });
          index += 1;
        }
      }
    }

    // Contact sheet — a downscaled grid of all panels for quick preview.
    await writeContactSheet(page, results, ctx);
  } finally {
    await browser.close();
  }
  return results;
};

/** Strip a leading "NN-" off a panel name so we can re-number consistently. */
const stripIndex = (name: string): string => name.replace(/^\d+[-_]/, "");

const writeBuffer = async (path: string, buf: Buffer): Promise<void> => {
  // Store assets must be FLATTENED RGB with NO alpha channel — Apple's App
  // Store Connect and Google Play both reject/penalize alpha in screenshots.
  // chromium's page.screenshot PNG carries an alpha channel even when the
  // stage is visually opaque, so flatten onto white and re-encode without
  // alpha before writing. (ESM module — top-level fs import, not require().)
  const flat = await sharp(buf)
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  writeFileSync(path, flat);
};

/**
 * Compose a contact sheet (small thumbnails in a grid) into one PNG using
 * an HTML stage of <img> data URLs rendered by the same chromium page.
 */
const writeContactSheet = async (
  page: Page,
  results: RenderResult[],
  ctx: RenderContext,
): Promise<void> => {
  if (results.length === 0) return;
  const cols = Math.min(4, results.length);
  const rows = Math.ceil(results.length / cols);
  const thumbW = 360;
  const aspect = ctx.device.store.height / ctx.device.store.width;
  const thumbH = Math.round(thumbW * aspect);
  const gap = 24;
  const pad = 32;
  const sheetW = cols * thumbW + (cols - 1) * gap + pad * 2;
  const sheetH = rows * thumbH + (rows - 1) * gap + pad * 2 + 64;

  const cells = results
    .map((r) => {
      const url = fileToDataUrl(r.path);
      return `<figure style="margin:0;">
        <img src="${url}" style="width:${thumbW}px;height:${thumbH}px;object-fit:cover;border-radius:14px;box-shadow:0 6px 18px rgba(0,0,0,0.18);display:block;" />
        <figcaption style="font:600 16px sans-serif;color:#43342D;margin-top:8px;text-align:center;">${r.name}</figcaption>
      </figure>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"></head>
  <body style="margin:0;background:#FAF7F0;">
    <div style="padding:${pad}px;">
      <h2 style="font:800 28px sans-serif;color:#43342D;margin:0 0 16px;">Poster contact sheet — ${ctx.device.label}</h2>
      <div style="display:grid;grid-template-columns:repeat(${cols},${thumbW}px);gap:${gap}px;">
        ${cells}
      </div>
    </div>
  </body></html>`;

  await page.setViewportSize({ width: sheetW, height: sheetH });
  await page.setContent(html, { waitUntil: "networkidle" });
  const buf = (await page.screenshot({
    type: "png",
    fullPage: true,
  })) as Buffer;
  await writeBuffer(join(ctx.outDir, "_contact-sheet.png"), buf);
};
