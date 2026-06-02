import {
  computePaintableMask,
  countPainted,
  progressPercent,
} from "./measureProgress";

// Helpers to build tiny WxH RGBA_8888 buffers (R,G,B,A per pixel).
const W = 8;
const H = 8;
const make = (fill: [number, number, number, number]): Uint8Array => {
  const buf = new Uint8Array(W * H * 4);
  for (let p = 0; p < W * H; p += 1) {
    buf[p * 4] = fill[0];
    buf[p * 4 + 1] = fill[1];
    buf[p * 4 + 2] = fill[2];
    buf[p * 4 + 3] = fill[3];
  }
  return buf;
};
const setPixel = (
  buf: Uint8Array,
  x: number,
  y: number,
  c: [number, number, number, number],
): void => {
  const i = (y * W + x) * 4;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
  buf[i + 3] = c[3];
};

const WHITE: [number, number, number, number] = [255, 255, 255, 255];
const BLACK: [number, number, number, number] = [0, 0, 0, 255];
const RED: [number, number, number, number] = [220, 30, 30, 255];

describe("computePaintableMask", () => {
  it("an all-white raster: interior pixels are paintable, the border is eroded", () => {
    const lineArt = make(WHITE);
    const { mask, paintable } = computePaintableMask(lineArt, W, H, 1);
    // erosion at stride 1 excludes the 1px border (its neighbours are OOB).
    expect(mask[2 * W + 2]).toBe(1); // an interior pixel
    expect(mask[0 * W + 0]).toBe(0); // corner: OOB neighbours → not paintable
    expect(paintable).toBe((W - 2) * (H - 2)); // interior 6x6
  });

  it("black line pixels + their eroded neighbours are not paintable", () => {
    const lineArt = make(WHITE);
    // a black vertical line down the middle column
    for (let y = 0; y < H; y += 1) setPixel(lineArt, 4, y, BLACK);
    const { mask, paintable } = computePaintableMask(lineArt, W, H, 1);
    expect(mask[2 * W + 4]).toBe(0); // the line itself
    expect(mask[2 * W + 3]).toBe(0); // eroded neighbour left of the line
    expect(mask[2 * W + 5]).toBe(0); // eroded neighbour right of the line
    expect(mask[2 * W + 1]).toBe(1); // interior, away from line + border
    expect(paintable).toBeLessThan((W - 2) * (H - 2));
  });
});

describe("countPainted", () => {
  it("an all-white composite has zero painted", () => {
    const lineArt = make(WHITE);
    const { mask } = computePaintableMask(lineArt, W, H, 1);
    const composite = make(WHITE);
    expect(countPainted(composite, mask, W, H, 1)).toBe(0);
  });

  it("a coloured masked pixel counts; a near-black (line bleed) one does not", () => {
    const lineArt = make(WHITE);
    const { mask } = computePaintableMask(lineArt, W, H, 1);
    const composite = make(WHITE);
    setPixel(composite, 1, 1, RED); // a real fill → painted
    setPixel(composite, 2, 2, BLACK); // line bleed inside the mask → NOT painted
    expect(countPainted(composite, mask, W, H, 1)).toBe(1);
  });

  it("a fully red composite over an all-white line art reads ~all paintable", () => {
    const lineArt = make(WHITE);
    const { mask, paintable } = computePaintableMask(lineArt, W, H, 1);
    const composite = make(RED);
    expect(countPainted(composite, mask, W, H, 1)).toBe(paintable);
  });
});

describe("progressPercent", () => {
  it("paintable 0 → 0 (no divide by zero)", () => {
    expect(progressPercent({ painted: 0, paintable: 0 })).toBe(0);
  });
  it("painted === paintable → 100", () => {
    expect(progressPercent({ painted: 50, paintable: 50 })).toBe(100);
  });
  it("raw >= 99 snaps to 100", () => {
    expect(progressPercent({ painted: 995, paintable: 1000 })).toBe(100);
  });
  it("half coloured → 50", () => {
    expect(progressPercent({ painted: 50, paintable: 100 })).toBe(50);
  });
});
