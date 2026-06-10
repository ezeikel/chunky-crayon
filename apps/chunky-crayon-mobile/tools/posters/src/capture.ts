/**
 * Capture step for the release kit.
 *
 * Produces the NATIVE-RESOLUTION raw screenshots that `gen` later composites
 * into branded posters. The screens, deep links, and settle hints live here as
 * a typed CAPTURE PLAN so the same recipe drives every device + locale.
 *
 * Why this is half-CLI, half-agent: a Node process can't drive the live device
 * (deep-link navigation + taps go through Argent's MCP tools, which an
 * interactive agent calls). So this module does the two things a CLI does well:
 *   1. `printPlan()` — emit the ordered nav recipe (deep link / taps / settle)
 *      so the agent knows exactly what to do before each grab.
 *   2. `grab()` — given a screen name + a booted device, write the native-res
 *      PNG straight to marketing/<platform>/<locale>/<file> via the platform
 *      CLI (`xcrun simctl io <udid> screenshot` / `adb exec-out screencap`).
 *      Argent's own screenshot is a downscaled preview (~619px) and is NOT
 *      submission-res — we only ever use the platform CLI for the final asset.
 *
 * The iPad sim renders portrait UI 180° rotated (scene-less UIWindow quirk), so
 * grab() exposes a `--rotate 180` flag; iPhone is upright. Read the first grab
 * before trusting orientation.
 *
 * This is CC-specific config today (the PLAN below); the mechanism is generic
 * and will lift into a standalone release-kit later.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export type CaptureStep = {
  /** marketing/<platform>/<locale>/<file> — the filename gen reads. */
  file: string;
  /** human label for the plan printout. */
  label: string;
  /** deep link to navigate to (relative to the app scheme), or null if taps. */
  deepLink: string | null;
  /** ms to wait after nav before grabbing (R2 SVG / animations settle). */
  settleMs: number;
  /** optional extra agent guidance (taps, primed state) shown in the plan. */
  notes?: string;
};

/**
 * The CC capture plan — one entry per raw screen the posters.config panels
 * reference. Filenames MUST match posters.config.ts `screenshot:` values.
 * Deep links confirmed working in project_rn_marketing_capture_skill.
 */
export const CC_CAPTURE_PLAN: CaptureStep[] = [
  {
    file: "01-home.png",
    label: "Home — Colo + greeting + create form",
    deepLink: "/",
    settleMs: 1500,
  },
  {
    file: "02-gallery.png",
    label: "Gallery — category row + feed",
    deepLink: "/gallery",
    settleMs: 1500,
  },
  {
    file: "04-category-animals.png",
    label: "Category — Animals grid (library panel)",
    deepLink: "/category/animals",
    settleMs: 1800,
  },
  {
    file: "05-my-artwork.png",
    label: "My Artwork — saved pages (save panel)",
    deepLink: "/my-artwork",
    settleMs: 1500,
  },
  {
    file: "06-coloring-canvas.png",
    label: "Canvas — a region-backed page mid-color (canvas + print panels)",
    deepLink: null,
    settleMs: 4000,
    notes:
      "Open a REGION-BACKED coloring image (so Magic/Auto Color works, not line art): " +
      "deep-link /coloring-image/<id> for an id with regionMapUrl set, wait ~4s for the R2 SVG, " +
      "then apply a few fills so the page reads as colored. See project_magic_tools_region_store_state_machine.",
  },
  {
    file: "09-stickers.png",
    label: "Stickers — reward grid (stickers panel)",
    deepLink: "/stickers",
    settleMs: 1500,
  },
  {
    file: "08-scene-builder.png",
    label: "Scene builder — curated scene picker (request/voice card source ref)",
    deepLink: null,
    settleMs: 1500,
    notes:
      "Tap the create FAB → the open 'Scene' create mode (curated, safe). Do NOT capture " +
      "Text/Voice/Image modes as a hero — they are parent-gated.",
  },
  {
    file: "11-parent-gate.png",
    label: "Parent gate — the math-question modal (parents panel)",
    deepLink: null,
    settleMs: 1000,
    notes:
      "Trigger the ParentalGate (tap the 'For Grown-ups' header pill, or the gated credits chip). " +
      "Capture while the 'Quick check' math question is showing.",
  },
];

export type GrabOptions = {
  platform: "ios" | "android";
  /** iOS udid or Android serial (from Argent list-devices / boot-device). */
  deviceId: string;
  /** absolute path to write the PNG (marketing/<platform>/<locale>/<file>). */
  outPath: string;
  /** rotate the captured framebuffer (iPad sim renders 180° in portrait). */
  rotateDeg?: 0 | 90 | 180 | 270;
};

/**
 * Grab one native-resolution screenshot via the platform CLI and write it to
 * outPath. iOS: `xcrun simctl io <udid> screenshot`. Android:
 * `adb -s <serial> exec-out screencap -p`. Optional post-rotate (sips on macOS)
 * for the iPad-sim 180° quirk. Returns the path written.
 */
export const grab = (opts: GrabOptions): string => {
  const { platform, deviceId, outPath, rotateDeg = 0 } = opts;
  const dir = dirname(outPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (platform === "ios") {
    execFileSync("xcrun", ["simctl", "io", deviceId, "screenshot", outPath], {
      stdio: ["ignore", "ignore", "inherit"],
    });
  } else {
    // adb writes PNG bytes to stdout; capture and write the file.
    const png = execFileSync(
      "adb",
      ["-s", deviceId, "exec-out", "screencap", "-p"],
      { maxBuffer: 64 * 1024 * 1024 },
    );
    // eslint-disable-next-line global-require
    require("node:fs").writeFileSync(outPath, png);
  }

  if (rotateDeg && rotateDeg !== 0) {
    // sips rotates clockwise; 180 is orientation-agnostic.
    execFileSync("sips", ["-r", String(rotateDeg), outPath], {
      stdio: ["ignore", "ignore", "inherit"],
    });
  }

  return outPath;
};
