/**
 * Device presets — store-resolution canvas dims + the screen-cutout inset
 * inside the bezel PNG.
 *
 * STORE RES (verified, App Store Connect + Google Play, June 2026 — see
 * the shared research brief `storeSpecs`):
 *   - ipad-13   → 2064 x 2752 portrait. This is the CANONICAL and only
 *                 size the REQUIRED 13" iPad slot accepts. (2048 x 2732 is
 *                 the LEGACY 12.9" iPad Pro size — a DIFFERENT slot — do not
 *                 conflate them; uploading 2048x2732 into the 13" slot risks
 *                 rejection.) If you genuinely need 12.9" output, add it as a
 *                 separate preset, don't repurpose ipad-13.
 *   - iphone-6.9 → 1290 x 2796 portrait (most widely used of the three
 *                 resolutions the 6.9" slot accepts: 1260x2736 /
 *                 1290x2796 / 1320x2868 — brief storeSpecs facts).
 *
 * BEZEL INSET (the screen cutout): per the brief `bezelAssets`, the PNG
 * inset is the alpha bounding box measured ONCE per device with
 * ImageMagick (see scripts/measure-bezel-inset.sh). Until a measured
 * inset exists we DERIVE one from a bezel-padding fraction + the device's
 * screen corner radius so the CSS-frame fallback (and an un-measured PNG)
 * still looks right. When you drop a real bezel PNG in assets/ and measure
 * it, overwrite `screenInset` + `bezelPng` with the measured values.
 *
 * `screenInset` is expressed as fractions of the BEZEL image so it scales
 * to whatever the rendered frame width is. The screenshot is composited
 * into that rect with object-fit: cover and the given corner radius.
 */

export type ScreenInset = {
  /** left edge of the screen cutout, fraction of bezel width [0..1] */
  left: number;
  /** top edge, fraction of bezel height [0..1] */
  top: number;
  /** screen width, fraction of bezel width [0..1] */
  width: number;
  /** screen height, fraction of bezel height [0..1] */
  height: number;
  /** screen corner radius, fraction of bezel width [0..1] */
  radius: number;
};

export type DevicePreset = {
  key: string;
  label: string;
  /** store-resolution output canvas */
  store: { width: number; height: number };
  /** native screen pixel dims this device frame represents (the captured shot fits here) */
  screen: { width: number; height: number };
  /** bezel PNG filename in assets/ (may be absent → CSS frame fallback) */
  bezelPng: string;
  /** measured alpha-bbox inset of the screen cutout inside the bezel PNG */
  screenInset: ScreenInset;
  /** outer corner radius of the device body, fraction of frame width (CSS fallback only) */
  bodyRadius: number;
  /** bezel thickness as a fraction of frame width (CSS fallback only) */
  bezelFrac: number;
  /** does this device have a Dynamic Island / notch? draws one in the CSS fallback */
  dynamicIsland: boolean;
};

export const DEVICES: Record<string, DevicePreset> = {
  "ipad-13": {
    key: "ipad-13",
    label: 'iPad Pro 13" (M4) — App Store required iPad slot (2064x2752)',
    store: { width: 2064, height: 2752 },
    screen: { width: 2064, height: 2752 },
    bezelPng: "ipad-13-portrait.png",
    // Derived inset: iPad bezels are a near-uniform ~3.2% band, square-ish
    // small corners. Replace with measured alpha bbox once a PNG is dropped.
    screenInset: {
      left: 0.032,
      top: 0.024,
      width: 0.936,
      height: 0.952,
      radius: 0.012,
    },
    bodyRadius: 0.045,
    bezelFrac: 0.028,
    dynamicIsland: false,
  },
  "iphone-6.9": {
    key: "iphone-6.9",
    label: 'iPhone 16/17 Pro Max — App Store 6.9" slot',
    store: { width: 1290, height: 2796 },
    screen: { width: 1290, height: 2796 },
    bezelPng: "iphone-6.9-portrait.png",
    // Derived inset: modern iPhone bezels are a thin uniform band with
    // large screen corners + a Dynamic Island. Replace with measured bbox.
    screenInset: {
      left: 0.038,
      top: 0.018,
      width: 0.924,
      height: 0.964,
      radius: 0.058,
    },
    bodyRadius: 0.16,
    bezelFrac: 0.026,
    dynamicIsland: true,
  },
};

export const listDevices = (): DevicePreset[] => Object.values(DEVICES);

export const getDevice = (key: string): DevicePreset => {
  const d = DEVICES[key];
  if (!d) {
    const keys = Object.keys(DEVICES).join(", ");
    throw new Error(`Unknown device "${key}". Known devices: ${keys}`);
  }
  return d;
};
