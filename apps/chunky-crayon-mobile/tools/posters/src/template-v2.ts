/**
 * Poster template v2 — the Duolingo-ABC look.
 *
 * Per-panel anatomy (top → bottom):
 *   1. a rounded HEADLINE PILL (solid color card, white text) near the top
 *   2. an UPRIGHT device, centered, screen doing the work (no tilt)
 *   3. a bold SOLID color-block background (one crayon color per panel;
 *      the row is palette-coordinated so panels read as a set)
 *   4. a DECORATIVE bleed layer — the Colo mascot / floating crayon shapes
 *      spilling over the panel edges (this is what "blends", not the device)
 *
 * Type is intentionally LIGHTER than v1: RooneySans Heavy (not Black),
 * looser line-height, generous pill padding — balanced, not cramped.
 *
 * Two style knobs via PanelV2.style:
 *   "pill"  — strict Duolingo-ABC: headline inside a solid rounded pill.
 *   "soft"  — softer crayon variant: headline as a chunky outlined card with
 *             a cream fill + dark text, rounded device card, playful.
 */

import type { Background } from "./brand";
import { BRAND, backgroundToCss } from "./brand";
import type { DevicePreset } from "./devices";
import { fontFaceCss, FONT_STACK } from "./fonts";

export type PanelV2Style = "pill" | "soft";

/** A decorative element that can bleed over panel edges. */
export type Decoration =
  | {
      kind: "blob";
      color: string;
      cx: number;
      cy: number;
      r: number;
      opacity?: number;
    }
  | {
      kind: "crayon";
      color: string;
      cx: number;
      cy: number;
      size: number;
      rotate: number;
    }
  | { kind: "star"; color: string; cx: number; cy: number; size: number };

export type PanelV2 = {
  name: string;
  screenshotDataUrl: string | null;
  headline?: string;
  /** optional subhead under the pill (Tondo Light) */
  subhead?: string;
  /**
   * If set, render a "takes requests" CARD in place of the device — the
   * ported PromptInputCard look (white card + orange-bordered textarea
   * showing a typed request). This sells the request feature directly.
   */
  requestPrompt?: string;
  /**
   * If set, render a VOICE card in place of the device — a mic orb + a
   * speech bubble showing the spoken request. Ported essence of the
   * worker's VoiceConversationCard. Sells the "say it out loud" path.
   */
  voicePrompt?: string;
  /**
   * If set, render the device flanked by a PRINTED PAGE so the panel sells
   * "color on screen OR print it out" (the screen-free / dual-mode angle).
   * The string is shown as a small caption on the printed sheet.
   */
  printMode?: boolean;
  /** the line-art page (data URL) shown on the printed sheet in printMode */
  printPageDataUrl?: string | null;
  /** the headline pill color (defaults to a contrasting crayon token) */
  pillColor?: string;
  /** panel background (solid color block) */
  background: Background;
  device: DevicePreset;
  bezelDataUrl: string | null;
  badge?: string;
  style: PanelV2Style;
  /** decorations that bleed over the edges (mascot, shapes) */
  decorations?: Decoration[];
};

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Pick a readable foreground for text sitting directly on the panel
 * background. Light tokens (cream/yellow/peach/white/peachLight) → dark
 * text; saturated crayon solids and gradients → white. Returns {strong,
 * soft} so headlines/badges use strong and subheads use a softer tone.
 */
const onBackground = (bg: Background): { strong: string; soft: string } => {
  const light = new Set<string>([
    BRAND.paperCream,
    BRAND.bgPeach,
    BRAND.bgCanvas,
    BRAND.white,
    BRAND.yellow,
    BRAND.peachLight,
  ]);
  const isLight = bg.kind === "solid" && light.has(bg.color);
  return isLight
    ? { strong: BRAND.textPrimary, soft: BRAND.textSecondary }
    : { strong: BRAND.white, soft: "rgba(255,255,255,0.92)" };
};

/** Upright device frame (no tilt). Bezel PNG if present, else CSS body. */
const deviceUpright = (
  panel: PanelV2,
  frameW: number,
  frameH: number,
): string => {
  const { device, bezelDataUrl, screenshotDataUrl } = panel;
  const shotImg = screenshotDataUrl
    ? `<img class="shot" src="${screenshotDataUrl}" alt="" />`
    : `<div class="shot shot--empty"></div>`;

  if (bezelDataUrl) {
    const ins = device.screenInset;
    return `
      <div class="device" style="width:${frameW}px;height:${frameH}px;">
        <div class="screen-clip" style="
          position:absolute;
          left:${ins.left * frameW}px; top:${ins.top * frameH}px;
          width:${ins.width * frameW}px; height:${ins.height * frameH}px;
          border-radius:${ins.radius * frameW}px; overflow:hidden;
          background:${BRAND.bgCanvas}; z-index:1;
        ">${shotImg}</div>
        <img class="bezel" src="${bezelDataUrl}" alt="" style="
          position:absolute; inset:0; width:${frameW}px; height:${frameH}px;
          z-index:2; pointer-events:none;" />
      </div>`;
  }

  // CSS device body — a clean light-gray/white iPad-ish body with a soft
  // shadow (lighter than v1's dark slab, to suit the bright color blocks).
  const bezel = device.bezelFrac * frameW * 1.15;
  const bodyR = device.bodyRadius * frameW;
  const screenR = Math.max(0, bodyR - bezel * 0.5);
  const island = device.dynamicIsland
    ? `<div style="position:absolute; top:${bezel * 1.1}px; left:50%;
         transform:translateX(-50%); width:${frameW * 0.28}px;
         height:${frameW * 0.07}px; background:#1b1b1d; border-radius:999px;
         z-index:3;"></div>`
    : "";
  return `
    <div class="device" style="width:${frameW}px;height:${frameH}px;">
      <div style="position:absolute; inset:0;
        background:linear-gradient(160deg,#ffffff,#eceaf0 60%,#e2e0e8);
        border-radius:${bodyR}px;
        box-shadow:0 ${frameW * 0.06}px ${frameW * 0.14}px rgba(40,30,25,0.22),
                   inset 0 0 ${bezel * 0.5}px rgba(255,255,255,0.7);
        padding:${bezel}px;">
        <div class="screen-clip" style="position:relative; width:100%; height:100%;
          border-radius:${screenR}px; overflow:hidden; background:${BRAND.bgCanvas};
        ">${shotImg}</div>
      </div>
      ${island}
    </div>`;
};

/** SVG for the decorative bleed layer (mascot blobs, crayons, stars). */
const decorationsSvg = (decos: Decoration[], w: number, h: number): string => {
  const parts = decos.map((d) => {
    if (d.kind === "blob") {
      return `<circle cx="${d.cx * w}" cy="${d.cy * h}" r="${d.r * w}"
        fill="${d.color}" opacity="${d.opacity ?? 1}" />`;
    }
    if (d.kind === "star") {
      const s = d.size * w;
      const cx = d.cx * w,
        cy = d.cy * h;
      // simple 4-point sparkle
      return `<path d="M${cx} ${cy - s} C ${cx + s * 0.18} ${cy - s * 0.18}, ${cx + s * 0.18} ${cy - s * 0.18}, ${cx + s} ${cy}
        C ${cx + s * 0.18} ${cy + s * 0.18}, ${cx + s * 0.18} ${cy + s * 0.18}, ${cx} ${cy + s}
        C ${cx - s * 0.18} ${cy + s * 0.18}, ${cx - s * 0.18} ${cy + s * 0.18}, ${cx - s} ${cy}
        C ${cx - s * 0.18} ${cy - s * 0.18}, ${cx - s * 0.18} ${cy - s * 0.18}, ${cx} ${cy - s} Z"
        fill="${d.color}" />`;
    }
    // crayon — a rounded rectangle with a triangle tip
    const len = d.size * w,
      wdt = len * 0.32;
    const cx = d.cx * w,
      cy = d.cy * h;
    return `<g transform="translate(${cx} ${cy}) rotate(${d.rotate})">
      <rect x="${-len / 2}" y="${-wdt / 2}" width="${len * 0.78}" height="${wdt}"
        rx="${wdt * 0.3}" fill="${d.color}" />
      <polygon points="${len * 0.28},${-wdt / 2} ${len / 2},0 ${len * 0.28},${wdt / 2}" fill="${d.color}" />
      <rect x="${-len / 2}" y="${-wdt / 2}" width="${wdt * 0.5}" height="${wdt}"
        rx="${wdt * 0.2}" fill="rgba(255,255,255,0.35)" />
    </g>`;
  });
  return `<svg class="decos" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"
    style="position:absolute; inset:0; z-index:0; pointer-events:none; overflow:visible;">
    ${parts.join("\n")}
  </svg>`;
};

/**
 * The "takes requests" card — a faithful port of the worker's
 * PromptInputCard (apps/chunky-crayon-worker/src/video/v2/components/
 * PromptInputCard.tsx): white rounded card, an inner textarea with a 3px
 * crayon-orange border + soft orange glow, the kid's typed request inside,
 * and a chunky "Color it" button beneath. Sized to ~the device footprint.
 */
const requestCard = (prompt: string, cardW: number): string => {
  const pad = Math.round(cardW * 0.07);
  const inner = Math.round(cardW * 0.06);
  const fs = Math.round(cardW * 0.058);
  const radius = Math.round(cardW * 0.06);
  return `
    <div style="width:${cardW}px; background:${BRAND.white};
      border-radius:${radius}px; border:2px solid #F5EDE6;
      box-shadow:0 ${Math.round(cardW * 0.02)}px ${Math.round(cardW * 0.08)}px rgba(40,30,25,0.14);
      padding:${pad}px; display:flex; flex-direction:column; gap:${pad}px;
      font-family:${FONT_STACK};">
      <div style="
        min-height:${Math.round(cardW * 0.42)}px; padding:${inner}px;
        border-radius:${radius}px; background:${BRAND.white};
        border:3px solid ${BRAND.crayonOrange};
        box-shadow:0 0 0 ${Math.round(cardW * 0.012)}px ${BRAND.crayonOrange}33;
        font-weight:400; font-size:${fs}px; line-height:1.3;
        color:${BRAND.textPrimary}; text-align:left;">
        ${esc(prompt)}<span style="display:inline-block; width:3px; height:1em;
          margin-left:3px; vertical-align:text-bottom; background:${BRAND.crayonOrange};"></span>
      </div>
      <div style="align-self:stretch; text-align:center;
        background:${BRAND.crayonOrange}; color:${BRAND.white};
        font-weight:700; font-size:${Math.round(cardW * 0.05)}px;
        padding:${Math.round(cardW * 0.04)}px; border-radius:${radius}px;
        box-shadow:0 ${Math.round(cardW * 0.012)}px 0 ${BRAND.crayonOrangeDark};">
        Color it
      </div>
    </div>`;
};

/**
 * The VOICE card — a mic orb (crayon-orange, with a soft glow ring) over a
 * speech bubble showing what the child said. Ported essence of the worker's
 * VoiceConversationCard (the FA-icon original is Remotion-specific).
 */
const voiceCard = (spoken: string, cardW: number): string => {
  const orb = Math.round(cardW * 0.32);
  const pad = Math.round(cardW * 0.07);
  const radius = Math.round(cardW * 0.06);
  return `
    <div style="width:${cardW}px; display:flex; flex-direction:column;
      align-items:center; gap:${pad}px; font-family:${FONT_STACK};">
      <div style="position:relative; width:${orb}px; height:${orb}px;">
        <div style="position:absolute; inset:${-Math.round(orb * 0.18)}px;
          border-radius:999px; background:${BRAND.crayonOrange}22;"></div>
        <div style="position:absolute; inset:0; border-radius:999px;
          background:${BRAND.crayonOrange};
          box-shadow:0 ${Math.round(orb * 0.06)}px ${Math.round(orb * 0.16)}px ${BRAND.crayonOrange}55;
          display:flex; align-items:center; justify-content:center;">
          <!-- simple mic glyph -->
          <svg width="${orb * 0.42}" height="${orb * 0.42}" viewBox="0 0 24 24" fill="${BRAND.white}">
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M5 11a7 7 0 0 0 14 0" fill="none" stroke="${BRAND.white}" stroke-width="2" stroke-linecap="round"/>
            <rect x="11" y="18" width="2" height="4" rx="1"/>
          </svg>
        </div>
      </div>
      <div style="position:relative; max-width:92%; background:${BRAND.white};
        border-radius:${radius}px; padding:${pad}px ${Math.round(cardW * 0.08)}px;
        box-shadow:0 ${Math.round(cardW * 0.02)}px ${Math.round(cardW * 0.07)}px rgba(40,30,25,0.14);
        font-weight:700; font-size:${Math.round(cardW * 0.062)}px; line-height:1.25;
        color:${BRAND.textPrimary}; text-align:center;">
        &ldquo;${esc(spoken)}&rdquo;
      </div>
    </div>`;
};

/**
 * A printed coloring page — a slightly-tilted white sheet holding the REAL
 * line-art page (the same page that's colored in the device beside it), in
 * the worker's PdfPreviewCard treatment (white card + soft shadow + the page
 * image). `pageDataUrl` is the line-art PNG; falls back to a faint glyph only
 * if no page image is supplied.
 */
const printedSheet = (sheetW: number, pageDataUrl: string | null): string => {
  const sheetH = Math.round(sheetW * 1.3);
  const r = Math.round(sheetW * 0.05);
  const padPx = Math.round(sheetW * 0.06);
  const inner = pageDataUrl
    ? `<img src="${pageDataUrl}" alt="" style="width:100%; height:100%;
        object-fit:contain; border-radius:${Math.round(sheetW * 0.02)}px; display:block;" />`
    : `<svg width="62%" height="62%" viewBox="0 0 100 130" fill="none"
        stroke="#D8CFC4" stroke-width="3" stroke-linecap="round">
        <circle cx="50" cy="42" r="22"/><path d="M28 96 q22 -28 44 0"/>
        <path d="M40 38 q4 -6 8 0 M52 38 q4 -6 8 0"/><path d="M42 52 q8 8 16 0"/></svg>`;
  return `
    <div style="width:${sheetW}px; height:${sheetH}px; background:${BRAND.white};
      border-radius:${r}px; transform:rotate(-7deg); padding:${padPx}px;
      box-shadow:0 ${Math.round(sheetW * 0.05)}px ${Math.round(sheetW * 0.14)}px rgba(40,30,25,0.20),
                 0 ${Math.round(sheetW * 0.012)}px ${Math.round(sheetW * 0.03)}px rgba(40,30,25,0.10);
      display:flex; align-items:center; justify-content:center; box-sizing:border-box;">
      ${inner}
    </div>`;
};

const panelV2Inner = (panel: PanelV2, w: number, h: number): string => {
  const pill = panel.pillColor ?? BRAND.crayonOrange;

  // device sizing — upright, centered, occupies a generous lower band
  const aspect = panel.device.screen.height / panel.device.screen.width;
  let frameW = w * 0.72;
  let frameH = frameW * aspect;
  const maxH = h * 0.6;
  if (frameH > maxH) {
    frameH = maxH;
    frameW = frameH / aspect;
  }

  const decos = panel.decorations?.length
    ? decorationsSvg(panel.decorations, w, h)
    : "";

  const isPill = panel.style === "pill";
  const headlineCard = panel.headline
    ? isPill
      ? `<div class="pill" style="background:${pill};">
           <h1 class="hl hl--white">${esc(panel.headline)}</h1>
         </div>`
      : `<div class="pill pill--soft" style="border-color:${pill};">
           <h1 class="hl hl--dark">${esc(panel.headline)}</h1>
         </div>`
    : "";

  const fg = onBackground(panel.background);
  const subhead = panel.subhead
    ? `<p class="subhead" style="color:${fg.soft};">${esc(panel.subhead)}</p>`
    : "";
  const badge = panel.badge
    ? `<div class="badge" style="color:${fg.strong};">${esc(panel.badge)}</div>`
    : "";

  return `
    <div class="panel" style="width:${w}px; height:${h}px;
      background:${backgroundToCss(panel.background)};">
      ${decos}
      <div class="content" style="padding:${h * 0.055}px ${w * 0.07}px ${h * 0.045}px;">
        ${headlineCard}
        ${subhead}
        <div class="spacer"></div>
        <div class="device-wrap">${
          panel.requestPrompt
            ? requestCard(panel.requestPrompt, Math.round(w * 0.66))
            : panel.voicePrompt
              ? voiceCard(panel.voicePrompt, Math.round(w * 0.66))
              : panel.printMode
                ? `<div style="display:flex; align-items:center; justify-content:center; gap:${Math.round(w * 0.04)}px; width:100%;">
                 ${deviceUpright(panel, frameW * 0.82, frameH * 0.82)}
                 ${printedSheet(Math.round(frameW * 0.5), panel.printPageDataUrl ?? null)}
               </div>`
                : deviceUpright(panel, frameW, frameH)
        }</div>
        <div class="spacer"></div>
        ${badge}
      </div>
    </div>`;
};

const cssV2 = (w: number, h: number): string => `
  ${fontFaceCss()}
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { background:transparent; }
  .panel { position:relative; overflow:hidden; font-family:${FONT_STACK}; }
  .content { position:relative; z-index:2; width:100%; height:100%;
    display:flex; flex-direction:column; align-items:center;
    gap:${Math.round(h * 0.035)}px; }
  /* breathing room: a flexible spacer above AND below the device-wrap so
     the headline/subhead/card aren't squashed at the top with dead space
     below. The two spacers share the slack, vertically centering the trio
     with even margins. */
  .device-wrap { flex:0 1 auto; display:flex; align-items:center;
    justify-content:center; width:100%; margin:${Math.round(h * 0.02)}px 0; }
  .spacer { flex:1 1 auto; }
  .device { position:relative; }
  .shot { position:absolute; inset:0; width:100%; height:100%;
    object-fit:cover; object-position:top center; display:block; }
  .shot--empty { background:${BRAND.bgPeach}; }

  /* HEADLINE PILL — lighter weight, looser, generous padding */
  .pill {
    border-radius:${Math.round(w * 0.07)}px;
    padding:${Math.round(h * 0.028)}px ${Math.round(w * 0.06)}px;
    max-width:88%;
    box-shadow:0 ${Math.round(h * 0.006)}px ${Math.round(h * 0.018)}px rgba(40,30,25,0.14);
  }
  .pill--soft { background:${BRAND.paperCream}; border:${Math.round(w * 0.008)}px solid; }
  .hl {
    font-family:${FONT_STACK};       /* Tondo — the brand header font */
    font-weight:700;                 /* Tondo Bold (its heaviest); reads lighter than RooneySans Black */
    line-height:1.1;
    letter-spacing:0;                /* Tondo is already tight; no negative tracking */
    font-size:${Math.round(w * 0.068)}px;
    text-align:center;
    text-wrap:balance;
  }
  .subhead {
    font-family:${FONT_STACK};
    font-weight:300;                 /* Tondo Light — airy editorial subhead */
    line-height:1.22;
    font-size:${Math.round(w * 0.036)}px;
    max-width:90%; margin:${Math.round(h * 0.012)}px auto 0; text-align:center;
  }
  .hl--white { color:${BRAND.white}; }
  .hl--dark { color:${BRAND.textPrimary}; }
  .badge {
    font-family:${FONT_STACK}; font-weight:700;
    font-size:${Math.round(w * 0.03)}px; letter-spacing:0.03em;
    opacity:0.92; margin-top:${Math.round(h * 0.012)}px;
  }
`;

export const renderPanelV2Html = (panel: PanelV2): string => {
  const { width: w, height: h } = panel.device.store;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
${cssV2(w, h)}
  .stage { width:${w}px; height:${h}px; }
</style></head>
<body><div class="stage">${panelV2Inner(panel, w, h)}</div></body></html>`;
};
