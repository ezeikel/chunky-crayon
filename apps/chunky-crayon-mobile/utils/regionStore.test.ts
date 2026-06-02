import { gzipSync } from "fflate";
import {
  hexToRgb,
  decodeRegionMap,
  parseRegionsJson,
  getRegionIdAt,
  buildPreColoredBytes,
  colorsForVariant,
  type Rgb,
} from "./regionStore";
import type { RegionStoreJson } from "@/types";

describe("hexToRgb", () => {
  it("parses #RRGGBB", () => {
    expect(hexToRgb("#ff8040")).toEqual({ r: 255, g: 128, b: 64 });
  });
  it("parses without leading #", () => {
    expect(hexToRgb("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });
  it("returns null for malformed hex", () => {
    expect(hexToRgb("#fff")).toBeNull();
    expect(hexToRgb("nope")).toBeNull();
  });
});

describe("decodeRegionMap", () => {
  it("round-trips a gzipped Uint16 region map", () => {
    const w = 2;
    const h = 2;
    const ids = new Uint16Array([0, 1, 2, 3]);
    const gz = gzipSync(new Uint8Array(ids.buffer));
    const decoded = decodeRegionMap(gz, w, h);
    expect(Array.from(decoded)).toEqual([0, 1, 2, 3]);
  });
  it("throws on a size mismatch", () => {
    const ids = new Uint16Array([0, 1, 2, 3]); // 4 px
    const gz = gzipSync(new Uint8Array(ids.buffer));
    expect(() => decodeRegionMap(gz, 4, 4)).toThrow(/size mismatch/);
  });
});

describe("getRegionIdAt", () => {
  const w = 3;
  const h = 2;
  // row-major: (0,0)=0 (1,0)=5 (2,0)=5 / (0,1)=7 (1,1)=7 (2,1)=0
  const map = new Uint16Array([0, 5, 5, 7, 7, 0]);
  it("reads the id at a pixel (y*w+x)", () => {
    expect(getRegionIdAt(map, w, h, 1, 0)).toBe(5);
    expect(getRegionIdAt(map, w, h, 0, 1)).toBe(7);
  });
  it("floors fractional coords", () => {
    expect(getRegionIdAt(map, w, h, 1.9, 0.4)).toBe(5);
  });
  it("returns 0 out of bounds", () => {
    expect(getRegionIdAt(map, w, h, -1, 0)).toBe(0);
    expect(getRegionIdAt(map, w, h, 3, 0)).toBe(0);
    expect(getRegionIdAt(map, w, h, 0, 2)).toBe(0);
  });
});

describe("buildPreColoredBytes", () => {
  const w = 2;
  const h = 2;
  // (0,0)=region 0 (none) (1,0)=region 1 / (0,1)=region 2 (1,1)=region 9 (no colour)
  const map = new Uint16Array([0, 1, 2, 9]);
  const colors = new Map<number, Rgb>([
    [1, { r: 255, g: 0, b: 0 }],
    [2, { r: 0, g: 0, b: 255 }],
    // region 9 intentionally absent
  ]);

  it("paints each region's colour and leaves region 0 / uncoloured transparent", () => {
    const rgba = buildPreColoredBytes(map, w, h, colors);
    // px0 region 0 → transparent
    expect(Array.from(rgba.slice(0, 4))).toEqual([0, 0, 0, 0]);
    // px1 region 1 → opaque red
    expect(Array.from(rgba.slice(4, 8))).toEqual([255, 0, 0, 255]);
    // px2 region 2 → opaque blue
    expect(Array.from(rgba.slice(8, 12))).toEqual([0, 0, 255, 255]);
    // px3 region 9 (no colour) → transparent
    expect(Array.from(rgba.slice(12, 16))).toEqual([0, 0, 0, 0]);
  });

  it("produces a w*h*4 buffer", () => {
    expect(buildPreColoredBytes(map, w, h, colors).byteLength).toBe(w * h * 4);
  });
});

describe("parseRegionsJson + colorsForVariant", () => {
  const json: RegionStoreJson = {
    sceneDescription: "scene",
    sourceWidth: 1024,
    sourceHeight: 1024,
    regionPixelCount: 2,
    regions: [
      {
        id: 1,
        bounds: { x: 0, y: 0, width: 10, height: 10 },
        centroid: { x: 5, y: 5 },
        pixelCount: 100,
        label: "sky",
        objectGroup: "background",
        palettes: {
          realistic: { hex: "#88ccff", colorName: "sky blue" },
          pastel: { hex: "#cce6ff", colorName: "pale blue" },
          cute: { hex: "#aaddff", colorName: "baby blue" },
          surprise: { hex: "#ff00ff", colorName: "magenta" },
        },
      },
    ],
  };

  it("parses + indexes by id", () => {
    const parsed = parseRegionsJson(JSON.stringify(json));
    expect(parsed).not.toBeNull();
    expect(parsed!.byId.get(1)?.label).toBe("sky");
  });

  it("returns null for empty / invalid input", () => {
    expect(parseRegionsJson(null)).toBeNull();
    expect(parseRegionsJson("not json")).toBeNull();
    expect(parseRegionsJson("{}")).toBeNull();
  });

  it("colorsForVariant picks the variant's hex per region", () => {
    const parsed = parseRegionsJson(JSON.stringify(json))!;
    expect(colorsForVariant(parsed.byId, "realistic").get(1)).toEqual({
      r: 0x88,
      g: 0xcc,
      b: 0xff,
    });
    expect(colorsForVariant(parsed.byId, "surprise").get(1)).toEqual({
      r: 0xff,
      g: 0x00,
      b: 0xff,
    });
  });
});
