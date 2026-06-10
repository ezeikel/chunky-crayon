/**
 * Poster HTML/CSS template.
 *
 * Produces the full HTML string for ONE store-resolution poster panel, or
 * for a BLEED GROUP of N panels laid side by side over a single continuous
 * background (so a gradient / graphic crosses panel seams — the
 * cross-panel "screensdesign" look). The renderer slices a bleed group
 * into per-panel store-res PNGs.
 *
 * The screensdesign look this builds:
 *   - a generous brand-colored background (solid or CSS gradient, CC tokens)
 *   - a big top headline (RooneySans Black) + optional subhead (Bold)
 *   - a framed device below the copy, with the captured screenshot
 *     composited inside the bezel's measured screen cutout (object-fit
 *     cover, rounded), with an optional tilt/offset transform
 *   - room for a small brand badge
 *
 * DEVICE FRAME — two paths:
 *   1. REAL bezel PNG (preferred, user's choice): <img> of the bezel over
 *      the screenshot, screenshot absolutely positioned inside the measured
 *      `screenInset` rect. Set `bezelDataUrl`.
 *   2. CSS frame fallback (when no bezel PNG): a pure-CSS device body with
 *      rounded screen + optional Dynamic Island. Used automatically when
 *      `bezelDataUrl` is null, so a missing bezel never breaks `gen`.
 *      (Brief `bezelAssets`: devices.css MIT is the CSS-frame reference;
 *      cutout = frame padding.)
 */

import type { Background } from "./brand";
import { BRAND, backgroundToCss } from "./brand";
import type { DevicePreset } from "./devices";
import { fontFaceCss, FONT_STACK } from "./fonts";

export type Transform = {
  /** rotation in degrees (tilt) */
  rotate?: number;
  /** horizontal offset in px at store res */
  offsetX?: number;
  /** vertical offset in px at store res */
  offsetY?: number;
  /** scale multiplier, default 1 */
  scale?: number;
};

export type PanelRender = {
  name: string;
  /** store-res screenshot as a data URL (data:image/png;base64,...) */
  screenshotDataUrl: string | null;
  headline?: string;
  subhead?: string;
  /** badge text shown bottom-center (e.g. brand wordmark) */
  badge?: string;
  background: Background;
  device: DevicePreset;
  /** bezel PNG as a data URL, or null → CSS frame fallback */
  bezelDataUrl: string | null;
  transform?: Transform;
  /** put copy block ABOVE the device (default) or BELOW it */
  copyPosition?: "top" | "bottom";
  /** headline color override; defaults to a token chosen for contrast */
  headlineColor?: string;
  /** subhead color override */
  subheadColor?: string;
};

/** A bleed group: panels rendered over ONE continuous background canvas. */
export type BleedRender = {
  /** continuous background spanning all panels */
  background: Background;
  panels: PanelRender[];
  device: DevicePreset;
};

/**
 * A HERO bleed: like BleedRender, but the devices are free-positioned on the
 * continuous N-wide canvas and ALLOWED to overflow panel seams (ported from
 * app-store-screenshots' connected-canvas + getDefaultRects). Each panel
 * contributes its copy (locked to that panel) + a tilted device placed by a
 * normalized rect on the WHOLE stage, so a device straddles the seam between
 * panels. The renderer slices the stage into N store-res PNGs.
 */
export type HeroDevicePlacement = {
  /** which panel this device's screenshot comes from */
  panelIndex: number;
  /** center X as a fraction of the TOTAL stage width [0..1] */
  cx: number;
  /** center Y as a fraction of panel height [0..1] */
  cy: number;
  /** device frame height as a fraction of panel height */
  heightFrac: number;
  /** tilt in degrees */
  rotate: number;
  /** stacking order (higher = on top) */
  z: number;
};

export type HeroBleedRender = {
  background: Background;
  device: DevicePreset;
  /** per-panel copy (headline/subhead/badge), keyed by panel index */
  panels: PanelRender[];
  /** free-positioned tilted devices spanning the continuous canvas */
  placements: HeroDevicePlacement[];
};

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Decide a high-contrast headline color against a background. Gradients
 * and the saturated crayon solids get white; the cream/peach paper tones
 * get text-primary.
 */
const autoHeadlineColor = (bg: Background): string => {
  if (bg.kind === "gradient") return BRAND.white;
  const light = new Set<string>([
    BRAND.paperCream,
    BRAND.bgPeach,
    BRAND.bgCanvas,
    BRAND.white,
    BRAND.yellow,
    BRAND.peachLight,
  ]);
  return light.has(bg.color) ? BRAND.textPrimary : BRAND.white;
};

const autoSubheadColor = (bg: Background, headline: string): string => {
  if (headline === BRAND.white) return "rgba(255,255,255,0.92)";
  return BRAND.textSecondary;
};

/**
 * The device-frame markup. Renders the screenshot inside a real bezel PNG
 * when `bezelDataUrl` is set, else a CSS device body. `frameW`/`frameH` are
 * the rendered frame box in store-res px.
 */
const deviceFrame = (
  panel: PanelRender,
  frameW: number,
  frameH: number,
): string => {
  const { device, bezelDataUrl, screenshotDataUrl, transform } = panel;
  const t = transform ?? {};
  const transformCss = [
    `translate(${t.offsetX ?? 0}px, ${t.offsetY ?? 0}px)`,
    `rotate(${t.rotate ?? 0}deg)`,
    `scale(${t.scale ?? 1})`,
  ].join(" ");

  const shotImg = screenshotDataUrl
    ? `<img class="shot" src="${screenshotDataUrl}" alt="" />`
    : `<div class="shot shot--empty"></div>`;

  if (bezelDataUrl) {
    // Real bezel PNG path. Screenshot is positioned inside the measured
    // alpha-bbox cutout (fractions of the bezel image), object-fit cover.
    const ins = device.screenInset;
    const screenLeft = ins.left * frameW;
    const screenTop = ins.top * frameH;
    const screenW = ins.width * frameW;
    const screenH = ins.height * frameH;
    const screenRadius = ins.radius * frameW;
    return `
      <div class="device" style="width:${frameW}px;height:${frameH}px;transform:${transformCss};">
        <div class="screen-clip" style="
          position:absolute;
          left:${screenLeft}px; top:${screenTop}px;
          width:${screenW}px; height:${screenH}px;
          border-radius:${screenRadius}px;
          overflow:hidden;
          background:${BRAND.bgCanvas};
          z-index:1;
        ">${shotImg}</div>
        <img class="bezel" src="${bezelDataUrl}" alt="" style="
          position:absolute; left:0; top:0;
          width:${frameW}px; height:${frameH}px;
          z-index:2; pointer-events:none;
        " />
      </div>`;
  }

  // CSS-frame fallback (devices.css-style): a rounded body, a bezel band,
  // a rounded screen, and (for iPhone) a Dynamic Island pill.
  const bezel = device.bezelFrac * frameW;
  const bodyR = device.bodyRadius * frameW;
  const screenR = Math.max(0, bodyR - bezel * 0.55);
  const island = device.dynamicIsland
    ? `<div class="island" style="
         position:absolute; top:${bezel * 1.15}px; left:50%;
         transform:translateX(-50%);
         width:${frameW * 0.3}px; height:${frameW * 0.075}px;
         background:#111; border-radius:999px; z-index:3;
       "></div>`
    : "";
  return `
    <div class="device" style="width:${frameW}px;height:${frameH}px;transform:${transformCss};">
      <div class="body" style="
        position:absolute; inset:0;
        background:linear-gradient(155deg,#3a3a3c,#1b1b1d 55%,#2c2c2e);
        border-radius:${bodyR}px;
        box-shadow:0 ${frameW * 0.05}px ${frameW * 0.12}px rgba(0,0,0,0.30),
                   inset 0 0 ${bezel * 0.4}px rgba(255,255,255,0.18);
        padding:${bezel}px;
      ">
        <div class="screen-clip" style="
          position:relative; width:100%; height:100%;
          border-radius:${screenR}px; overflow:hidden;
          background:${BRAND.bgCanvas};
        ">${shotImg}</div>
      </div>
      ${island}
    </div>`;
};

/**
 * Render ONE panel's inner content (copy + device) into a positioned stage.
 * Used both for single panels and for each cell of a bleed group. The
 * background is supplied by the wrapper (so bleed groups share one bg).
 */
const panelContent = (panel: PanelRender, w: number, h: number): string => {
  const hlColor = panel.headlineColor ?? autoHeadlineColor(panel.background);
  const subColor =
    panel.subheadColor ?? autoSubheadColor(panel.background, hlColor);
  const copyPos = panel.copyPosition ?? "top";

  // Frame sizing: fit the device into a sensible portion of the panel,
  // leaving room for the headline. Width-constrained for phones (tall),
  // height-constrained for tablets (squarer).
  const isTablet = panel.device.key.startsWith("ipad");
  const deviceAspect = panel.device.screen.height / panel.device.screen.width;
  // device occupies ~62% of panel height, capped by width
  let frameH = h * (isTablet ? 0.66 : 0.7);
  let frameW = frameH / deviceAspect;
  const maxW = w * (isTablet ? 0.82 : 0.74);
  if (frameW > maxW) {
    frameW = maxW;
    frameH = frameW * deviceAspect;
  }

  const headline = panel.headline
    ? `<h1 class="headline" style="color:${hlColor};">${esc(panel.headline)}</h1>`
    : "";
  const subhead = panel.subhead
    ? `<p class="subhead" style="color:${subColor};">${esc(panel.subhead)}</p>`
    : "";
  const badge = panel.badge
    ? `<div class="badge" style="color:${hlColor};">${esc(panel.badge)}</div>`
    : "";

  const copyBlock = `
    <div class="copy">
      ${headline}
      ${subhead}
    </div>`;
  const deviceBlock = `<div class="device-wrap">${deviceFrame(panel, frameW, frameH)}</div>`;

  const order =
    copyPos === "top"
      ? `${copyBlock}${deviceBlock}`
      : `${deviceBlock}${copyBlock}`;

  return `
    <div class="panel-inner" style="
      width:${w}px; height:${h}px;
      display:flex; flex-direction:column;
      align-items:center; justify-content:space-between;
      box-sizing:border-box;
      padding:${h * 0.06}px ${w * 0.06}px ${h * 0.04}px;
      position:relative;
    ">
      ${order}
      ${badge}
    </div>`;
};

const baseCss = (w: number, h: number): string => `
  ${fontFaceCss()}
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { background:transparent; }
  .stage {
    width:${w}px;
    position:relative;
    overflow:hidden;
    font-family:${FONT_STACK};
  }
  .panel-inner { overflow:hidden; }
  .copy { width:100%; text-align:center; }
  .headline {
    font-family:${FONT_STACK};
    font-weight:900;
    line-height:1.02;
    letter-spacing:-0.02em;
    font-size:${Math.round(w * 0.082)}px;
    text-wrap:balance;
    margin-bottom:${Math.round(h * 0.012)}px;
    text-shadow:0 2px 14px rgba(67,52,45,0.10);
  }
  .subhead {
    font-family:${FONT_STACK};
    font-weight:700;
    line-height:1.18;
    font-size:${Math.round(w * 0.04)}px;
    max-width:86%;
    margin:0 auto;
  }
  .device-wrap {
    flex:1 1 auto;
    width:100%;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .device { position:relative; }
  .shot {
    position:absolute; inset:0;
    width:100%; height:100%;
    object-fit:cover; object-position:top center;
    display:block;
  }
  .shot--empty {
    background:repeating-linear-gradient(45deg, ${BRAND.bgPeach}, ${BRAND.bgPeach} 24px, ${BRAND.paperCream} 24px, ${BRAND.paperCream} 48px);
  }
  .badge {
    font-family:${FONT_STACK};
    font-weight:800;
    font-size:${Math.round(w * 0.03)}px;
    letter-spacing:0.04em;
    opacity:0.92;
    margin-top:${Math.round(h * 0.01)}px;
  }
`;

/** Full HTML for a single poster panel at store resolution. */
export const renderPanelHtml = (panel: PanelRender): string => {
  const { width: w, height: h } = panel.device.store;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
${baseCss(w, h)}
  .stage { height:${h}px; background:${backgroundToCss(panel.background)}; }
</style></head>
<body>
  <div class="stage">
    ${panelContent(panel, w, h)}
  </div>
</body></html>`;
};

/**
 * Full HTML for a BLEED GROUP: N panels laid out horizontally over ONE
 * continuous background canvas (total width = N × store width). The
 * renderer screenshots the whole stage, then slices it into N store-res
 * PNGs at x = i × storeWidth. The shared background means a gradient or
 * graphic crosses every panel seam.
 */
export const renderBleedHtml = (group: BleedRender): string => {
  const { width: w, height: h } = group.device.store;
  const n = group.panels.length;
  const totalW = w * n;
  const cells = group.panels
    .map(
      (p) => `<div class="cell" style="width:${w}px;height:${h}px;">
        ${panelContent(p, w, h)}
      </div>`,
    )
    .join("\n");
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
${baseCss(w, h)}
  .stage {
    height:${h}px;
    width:${totalW}px;
    background:${backgroundToCss(group.background)};
    display:flex; flex-direction:row;
  }
  .cell { position:relative; overflow:hidden; }
</style></head>
<body>
  <div class="stage">
    ${cells}
  </div>
</body></html>`;
};

/**
 * Full HTML for a HERO bleed group. Three layers over the continuous
 * totalW × h canvas:
 *   1. one shared background (gradient/solid crosses every seam)
 *   2. a COPY layer: each panel's headline/subhead/badge locked to its own
 *      panel column (copy must not bleed — only the devices do)
 *   3. a DEVICE layer: tilted device frames absolutely positioned by their
 *      normalized rect on the WHOLE stage, free to overflow seams
 * The renderer slices this into N store-res PNGs at x = i × w.
 */
export const renderHeroBleedHtml = (group: HeroBleedRender): string => {
  const { width: w, height: h } = group.device.store;
  const n = group.panels.length;
  const totalW = w * n;

  // Layer 2 — copy, one absolutely-positioned column per panel.
  const copyLayer = group.panels
    .map((p, i) => {
      const hlColor = p.headlineColor ?? autoHeadlineColor(group.background);
      const subColor =
        p.subheadColor ?? autoSubheadColor(group.background, hlColor);
      const headline = p.headline
        ? `<h1 class="headline" style="color:${hlColor};">${esc(p.headline)}</h1>`
        : "";
      const subhead = p.subhead
        ? `<p class="subhead" style="color:${subColor};">${esc(p.subhead)}</p>`
        : "";
      const badge = p.badge
        ? `<div class="badge" style="color:${hlColor};">${esc(p.badge)}</div>`
        : "";
      // Copy sits in the TOP third of each panel column.
      return `<div class="copy-col" style="
          position:absolute; left:${i * w}px; top:0;
          width:${w}px; height:${h}px;
          display:flex; flex-direction:column; align-items:center;
          padding:${h * 0.07}px ${w * 0.07}px 0; box-sizing:border-box;
          text-align:center; z-index:1;
        ">
        ${headline}${subhead}
        <div style="flex:1 1 auto;"></div>
        ${badge ? `<div style="padding-bottom:${h * 0.04}px;">${badge}</div>` : ""}
      </div>`;
    })
    .join("\n");

  // Layer 3 — tilted devices, free-positioned on the whole stage. Sorted by
  // z so later DOM order = higher stack.
  const deviceAspect = group.device.screen.height / group.device.screen.width;
  const devices = [...group.placements]
    .sort((a, b) => a.z - b.z)
    .map((pl) => {
      const src = group.panels[pl.panelIndex];
      if (!src) return "";
      const frameH = h * pl.heightFrac;
      const frameW = frameH / deviceAspect;
      const left = pl.cx * totalW - frameW / 2;
      const top = pl.cy * h - frameH / 2;
      const panel: PanelRender = {
        ...src,
        transform: { rotate: pl.rotate },
      };
      return `<div style="position:absolute; left:${left}px; top:${top}px; z-index:${10 + pl.z};">
        ${deviceFrame(panel, frameW, frameH)}
      </div>`;
    })
    .join("\n");

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
${baseCss(w, h)}
  .stage {
    height:${h}px;
    width:${totalW}px;
    background:${backgroundToCss(group.background)};
    position:relative;
  }
  .copy-col .headline { text-shadow:0 2px 18px rgba(67,52,45,0.16); }
</style></head>
<body>
  <div class="stage">
    ${copyLayer}
    ${devices}
  </div>
</body></html>`;
};
